"use client";

import { useState } from "react";
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
import type { Booking, Hotel, RoomBlock } from "@/lib/hotels/repo";
import type { Person } from "@/lib/people";

interface Props {
  booking?: Booking;
  hotels: Hotel[];
  blocks: RoomBlock[];
  people: Person[];
}

// Form-shape: credits in whole USD/EUR (display unit), not cents.
const formSchema = hotelBookingBaseSchema
  .omit({ creditsAmountCents: true })
  .extend({
    creditsAmount: z
      .union([z.string(), z.number()])
      .optional()
      .refine(
        (v: unknown) =>
          v === undefined ||
          v === "" ||
          (typeof v === "number" && v >= 0) ||
          (typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v)),
        { message: "must be a non-negative number with up to 2 decimals" }
      ),
  })
  .refine((v) => v.checkin <= v.checkout, {
    message: "checkout must be on or after checkin",
    path: ["checkout"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function BookingForm({ booking, hotels, blocks, people }: Props) {
  const router = useRouter();
  const isEdit = !!booking;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelId: booking?.hotelId ?? hotels[0]?.id ?? "",
      roomBlockId: booking?.roomBlockId ?? "",
      personKind: booking?.personKind ?? "artist",
      personId: booking?.personId ?? people[0]?.id ?? "",
      roomType: booking?.roomType ?? "",
      checkin: booking?.checkin ?? "",
      checkout: booking?.checkout ?? "",
      bookingNumber: booking?.bookingNumber ?? "",
      creditsAmount:
        booking?.creditsAmountCents != null
          ? (booking.creditsAmountCents / 100).toFixed(2)
          : "",
      creditsCurrency: (booking?.creditsCurrency as "USD" | "EUR" | undefined) ?? "USD",
      status: booking?.status ?? "booked",
      confirmationUrl: booking?.confirmationUrl ?? "",
      comments: booking?.comments ?? "",
    },
  });

  // Filter blocks to the selected hotel. useWatch (vs watch()) is the
  // React-hook-form API the React Compiler can reason about.
  const selectedHotelId = useWatch({ control, name: "hotelId" });
  const blocksForHotel = blocks.filter((b) => b.hotelId === selectedHotelId);

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit
      ? `/api/hotel-bookings/${booking!.id}`
      : "/api/hotel-bookings";
    const method = isEdit ? "PATCH" : "POST";

    const creditsAmountCents =
      data.creditsAmount === undefined || data.creditsAmount === ""
        ? null
        : Math.round(Number(data.creditsAmount) * 100);

    const payload = {
      hotelId: data.hotelId,
      roomBlockId: data.roomBlockId,
      personKind: data.personKind,
      personId: data.personId,
      roomType: data.roomType,
      checkin: data.checkin,
      checkout: data.checkout,
      bookingNumber: data.bookingNumber,
      creditsAmountCents,
      creditsCurrency: creditsAmountCents != null ? data.creditsCurrency : "",
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
            defaultValue={`${booking?.personKind ?? "artist"}:${booking?.personId ?? people[0]?.id ?? ""}`}
            onChange={(e) => {
              const { kind, id } = setPerson(e.target.value);
              const form = e.currentTarget.form!;
              (form.elements.namedItem("personKind") as HTMLInputElement).value = kind;
              (form.elements.namedItem("personId") as HTMLInputElement).value = id;
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
          <select
            {...register("hotelId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
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
            <option value="tentative">Tentative</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="no_show">No show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>

        <Field label="Credits" error={errors.creditsAmount?.message}>
          <Input
            type="text"
            inputMode="decimal"
            {...register("creditsAmount")}
            placeholder="0.00"
          />
        </Field>
        <Field label="Credits currency" error={errors.creditsCurrency?.message}>
          <select
            {...register("creditsCurrency")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field
            label="Confirmation"
            error={errors.confirmationUrl?.message}
          >
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
