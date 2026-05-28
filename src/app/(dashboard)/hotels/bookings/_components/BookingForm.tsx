"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { z } from "zod";
import { hotelBookingBaseSchema } from "@/lib/hotels/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import CreatableCombobox from "@/components/ui/CreatableCombobox";
import type { Booking, Hotel, RoomBlock } from "@/lib/hotels/repo";
import type { Person } from "@/lib/people";

interface Props {
  booking?: Booking;
  hotels: Hotel[];
  blocks: RoomBlock[];
  people: Person[];
  defaultPerson?: { id: string; kind: "artist" | "crew" };
  /** Prefill values when opened from a context that already has them
   *  (e.g. the artist cockpit knows the flight dates). */
  prefill?: { checkin?: string; checkout?: string };
  onSuccess?: () => void;
}

// Form-shape: credits dropped from UI (kept on the schema/DB but ignored
// here — money tracking lives on payments, not hotels).
const formSchema = hotelBookingBaseSchema
  .omit({ creditsAmountCents: true, creditsCurrency: true })
  .refine((v) => v.checkin <= v.checkout, {
    message: "checkout must be on or after checkin",
    path: ["checkout"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function BookingForm({
  booking,
  hotels,
  blocks,
  people,
  defaultPerson,
  prefill,
  onSuccess,
}: Props) {
  const router = useRouter();
  const isEdit = !!booking;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Local hotels list so inline-created hotels show up immediately.
  const [localHotels, setLocalHotels] = useState<Hotel[]>(hotels);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelId: booking?.hotelId ?? hotels[0]?.id ?? "",
      roomBlockId: booking?.roomBlockId ?? "",
      personKind: booking?.personKind ?? defaultPerson?.kind ?? "artist",
      personId: booking?.personId ?? defaultPerson?.id ?? people[0]?.id ?? "",
      roomType: booking?.roomType ?? "",
      checkin: booking?.checkin ?? prefill?.checkin ?? "",
      checkout: booking?.checkout ?? prefill?.checkout ?? "",
      bookingNumber: booking?.bookingNumber ?? "",
      status: booking?.status ?? "booked",
      confirmationUrl: booking?.confirmationUrl ?? "",
      comments: booking?.comments ?? "",
    },
  });

  // Filter blocks to the selected hotel. useWatch (vs watch()) is the
  // React-hook-form API the React Compiler can reason about.
  const selectedHotelId = useWatch({ control, name: "hotelId" });
  const blocksForHotel = blocks.filter((b) => b.hotelId === selectedHotelId);

  // If exactly one block exists for the selected hotel, auto-pick it. Skip
  // on edit (the operator's prior choice wins).
  useEffect(() => {
    if (isEdit) return;
    if (blocksForHotel.length === 1) {
      setValue("roomBlockId", blocksForHotel[0]!.id);
    }
  }, [blocksForHotel, isEdit, setValue]);

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit
      ? `/api/hotel-bookings/${booking!.id}`
      : "/api/hotel-bookings";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      hotelId: data.hotelId,
      roomBlockId: data.roomBlockId,
      personKind: data.personKind,
      personId: data.personId,
      roomType: data.roomType,
      checkin: data.checkin,
      checkout: data.checkout,
      bookingNumber: data.bookingNumber,
      status: data.status,
      confirmationUrl: data.confirmationUrl,
      comments: data.comments,
    };

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Couldn't save. Try again.");
      return;
    }

    const body = await res.json();
    if (onSuccess) {
      router.refresh();
      onSuccess();
      return;
    }
    router.push(`/hotels/bookings/${body.booking.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!booking) return;
    if (!confirm("Delete this booking? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/hotel-bookings/${booking.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/hotels/bookings");
    router.refresh();
  }

  function setPerson(value: string) {
    const [kind, id] = value.split(":");
    return { kind, id };
  }

  const personOptions = people.map((p) => ({
    value: `${p.kind}:${p.id}`,
    label: `${p.name} (${p.kind})${p.agency ? ` - ${p.agency}` : ""}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Person"
          error={errors.personKind?.message ?? errors.personId?.message}
          required
        >
          <select
            defaultValue={`${booking?.personKind ?? defaultPerson?.kind ?? "artist"}:${booking?.personId ?? defaultPerson?.id ?? people[0]?.id ?? ""}`}
            onChange={(e) => {
              const { kind, id } = setPerson(e.target.value);
              const form = e.currentTarget.form!;
              (
                form.elements.namedItem("personKind") as HTMLInputElement
              ).value = kind;
              (form.elements.namedItem("personId") as HTMLInputElement).value =
                id;
            }}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {personOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="hidden" {...register("personKind")} />
          <input type="hidden" {...register("personId")} />
        </Field>

        <Field label="Hotel" error={errors.hotelId?.message} required>
          <Controller
            control={control}
            name="hotelId"
            render={({ field }) => (
              <CreatableCombobox
                options={localHotels.map((h) => ({
                  id: h.id,
                  label: h.name,
                  sublabel: h.location,
                }))}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Search or create hotel..."
                emptyText="No hotels found"
                onCreate={async (name) => {
                  const res = await fetch("/api/hotels", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name }),
                  });
                  if (!res.ok) return null;
                  const { hotel } = await res.json();
                  setLocalHotels((prev) => [...prev, hotel]);
                  return {
                    id: hotel.id,
                    label: hotel.name,
                    sublabel: hotel.location,
                  };
                }}
              />
            )}
          />
        </Field>

        <Field label="Room block" error={errors.roomBlockId?.message}>
          <select
            {...register("roomBlockId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">walk-up (no block)</option>
            {blocksForHotel.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label ?? b.roomType} ({b.roomType})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Room type" error={errors.roomType?.message}>
          <Input {...register("roomType")} placeholder="Deluxe sea view" />
        </Field>

        <Field label="Check-in" error={errors.checkin?.message} required>
          <Input type="date" {...register("checkin")} />
        </Field>
        <Field label="Check-out" error={errors.checkout?.message} required>
          <Input type="date" {...register("checkout")} />
        </Field>

        <Field label="Booking number" error={errors.bookingNumber?.message}>
          <Input {...register("bookingNumber")} placeholder="BSM-001" />
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select
            {...register("status")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="not_needed">Not needed</option>
            <option value="tentative">Tentative</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="no_show">No show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field label="Confirmation" error={errors.confirmationUrl?.message}>
            <Controller
              control={control}
              name="confirmationUrl"
              render={({ field }) => (
                <FileUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  entityType="hotel_booking"
                  entityId={booking?.id}
                  tags={["confirmation"]}
                />
              )}
            />
          </Field>
        </div>
      </div>

      <Field label="Comments" error={errors.comments?.message}>
        <textarea
          {...register("comments")}
          rows={4}
          className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
        />
      </Field>

      {serverError && <p className="text-sm text-coral">{serverError}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : isEdit ? "Save" : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <div className="flex-1" />
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-brand ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
