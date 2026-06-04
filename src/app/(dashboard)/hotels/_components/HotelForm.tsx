"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { hotelInputSchema, type HotelInput } from "@/lib/hotels/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Hotel } from "@/lib/hotels/repo";

interface Props {
  hotel?: Hotel;
}

export default function HotelForm({ hotel }: Props) {
  const router = useRouter();
  const isEdit = !!hotel;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HotelInput>({
    resolver: zodResolver(hotelInputSchema),
    defaultValues: {
      name: hotel?.name ?? "",
      location: hotel?.location ?? "",
      address: hotel?.address ?? "",
      contactName: hotel?.contactName ?? "",
      contactEmail: hotel?.contactEmail ?? "",
      contactPhone: hotel?.contactPhone ?? "",
      notes: hotel?.notes ?? "",
      minsToAirport: hotel?.minsToAirport ?? null,
      minsFromAirport: hotel?.minsFromAirport ?? null,
      minsToVenue: hotel?.minsToVenue ?? null,
    },
  });

  async function onSubmit(data: HotelInput) {
    setServerError("");
    const url = isEdit ? `/api/hotels/${hotel!.id}` : "/api/hotels";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Couldn't save. Try again.");
      return;
    }

    const body = await res.json();
    router.push(`/hotels/${body.hotel.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!hotel) return;
    if (
      !confirm(
        `Delete ${hotel.name}? This is permanent. Room blocks and bookings on this hotel will not be deleted.`,
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/hotels/${hotel.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/hotels");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message} required>
          <Input {...register("name")} autoComplete="off" />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <Input
            {...register("location")}
            placeholder="Byblos"
            autoComplete="off"
          />
        </Field>
        <div className="col-span-2">
          <Field label="Address" error={errors.address?.message}>
            <Input {...register("address")} autoComplete="off" />
          </Field>
        </div>
        <Field label="Contact name" error={errors.contactName?.message}>
          <Input {...register("contactName")} autoComplete="off" />
        </Field>
        <Field label="Contact email" error={errors.contactEmail?.message}>
          <Input
            type="email"
            {...register("contactEmail")}
            autoComplete="off"
          />
        </Field>
        <Field label="Contact phone" error={errors.contactPhone?.message}>
          <Input {...register("contactPhone")} autoComplete="off" />
        </Field>

        <div className="col-span-2 pt-2 border-t border-[--color-border]">
          <p className="text-xs font-medium text-[--color-fg-muted] mb-3">
            Travel times — used to suggest ground transport pickup times
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Airport → Hotel (min)"
              error={errors.minsFromAirport?.message}
            >
              <Input
                type="number"
                min={0}
                max={600}
                step={5}
                placeholder="30"
                {...register("minsFromAirport", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </Field>
            <Field
              label="Hotel → Venue (min)"
              error={errors.minsToVenue?.message}
            >
              <Input
                type="number"
                min={0}
                max={600}
                step={5}
                placeholder="20"
                {...register("minsToVenue", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </Field>
            <Field
              label="Hotel → Airport (min)"
              error={errors.minsToAirport?.message}
            >
              <Input
                type="number"
                min={0}
                max={600}
                step={5}
                placeholder="30"
                {...register("minsToAirport", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
            </Field>
          </div>
        </div>
      </div>

      <Field label="Notes" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
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
