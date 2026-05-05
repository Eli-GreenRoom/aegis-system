"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route as TypedRoute } from "next";
import { z } from "zod";
import { pickupInputSchema } from "@/lib/ground/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Pickup, Vendor } from "@/lib/ground/repo";
import type { Person } from "@/lib/people";

interface Props {
  pickup?: Pickup;
  people: Person[];
  vendors: Vendor[];
}

// Form-shape: pickupDt is a datetime-local string; cost in whole USD.
const formSchema = pickupInputSchema
  .omit({ pickupDt: true, costAmountCents: true })
  .extend({
    pickupDtLocal: z.string().min(1, "required"),
    costUsd: z
      .union([z.string(), z.number()])
      .optional()
      .refine(
        (v) =>
          v === undefined ||
          v === "" ||
          (typeof v === "number" && v >= 0) ||
          (typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v)),
        { message: "must be a non-negative number with up to 2 decimals" }
      ),
  });

type FormValues = z.infer<typeof formSchema>;

function toDtLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PickupForm({ pickup, people, vendors }: Props) {
  const router = useRouter();
  const isEdit = !!pickup;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personKind: pickup?.personKind ?? "artist",
      personId: pickup?.personId ?? people[0]?.id ?? "",
      routeFrom: pickup?.routeFrom ?? "airport",
      routeFromDetail: pickup?.routeFromDetail ?? "",
      routeTo: pickup?.routeTo ?? "hotel",
      routeToDetail: pickup?.routeToDetail ?? "",
      linkedFlightId: pickup?.linkedFlightId ?? "",
      pickupDtLocal: toDtLocal(pickup?.pickupDt ?? null),
      vehicleType: pickup?.vehicleType ?? "",
      vendorId: pickup?.vendorId ?? "",
      driverName: pickup?.driverName ?? "",
      driverPhone: pickup?.driverPhone ?? "",
      costUsd:
        pickup?.costAmountCents != null
          ? (pickup.costAmountCents / 100).toFixed(2)
          : "",
      costCurrency: (pickup?.costCurrency as "USD" | "EUR" | undefined) ?? "USD",
      status: pickup?.status ?? "scheduled",
      comments: pickup?.comments ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit ? `/api/pickups/${pickup!.id}` : "/api/pickups";
    const method = isEdit ? "PATCH" : "POST";

    const costAmountCents =
      data.costUsd === undefined || data.costUsd === ""
        ? null
        : Math.round(Number(data.costUsd) * 100);

    const payload = {
      personKind: data.personKind,
      personId: data.personId,
      routeFrom: data.routeFrom,
      routeFromDetail: data.routeFromDetail,
      routeTo: data.routeTo,
      routeToDetail: data.routeToDetail,
      linkedFlightId: data.linkedFlightId,
      pickupDt: new Date(data.pickupDtLocal).toISOString(),
      vehicleType: data.vehicleType,
      vendorId: data.vendorId,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      costAmountCents,
      costCurrency: costAmountCents != null ? data.costCurrency : "",
      status: data.status,
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
    router.push(`/ground/${body.pickup.id}` as TypedRoute);
    router.refresh();
  }

  async function onDelete() {
    if (!pickup) return;
    if (!confirm("Delete this pickup? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/pickups/${pickup.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/ground");
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
        <Field label="Person" error={errors.personKind?.message ?? errors.personId?.message} required>
          <select
            defaultValue={`${pickup?.personKind ?? "artist"}:${pickup?.personId ?? people[0]?.id ?? ""}`}
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

        <Field label="Pickup time" error={errors.pickupDtLocal?.message} required>
          <Input type="datetime-local" step={60} {...register("pickupDtLocal")} />
        </Field>

        <Field label="From" error={errors.routeFrom?.message} required>
          <select
            {...register("routeFrom")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="airport">Airport</option>
            <option value="hotel">Hotel</option>
            <option value="stage">Stage</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="To" error={errors.routeTo?.message} required>
          <select
            {...register("routeTo")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="airport">Airport</option>
            <option value="hotel">Hotel</option>
            <option value="stage">Stage</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="From detail" error={errors.routeFromDetail?.message}>
          <Input {...register("routeFromDetail")} placeholder="Beirut Airport, Terminal A" />
        </Field>
        <Field label="To detail" error={errors.routeToDetail?.message}>
          <Input {...register("routeToDetail")} placeholder="Byblos Sur Mer" />
        </Field>

        <Field label="Vehicle" error={errors.vehicleType?.message}>
          <Input {...register("vehicleType")} placeholder="Sedan, van, mini-bus..." />
        </Field>
        <Field label="Vendor" error={errors.vendorId?.message}>
          <select
            {...register("vendorId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.service})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Driver" error={errors.driverName?.message}>
          <Input {...register("driverName")} />
        </Field>
        <Field label="Driver phone" error={errors.driverPhone?.message}>
          <Input {...register("driverPhone")} />
        </Field>

        <Field label="Cost" error={errors.costUsd?.message}>
          <Input
            type="text"
            inputMode="decimal"
            {...register("costUsd")}
            placeholder="80.00"
          />
        </Field>
        <Field label="Currency" error={errors.costCurrency?.message}>
          <select
            {...register("costCurrency")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select
            {...register("status")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="scheduled">Scheduled</option>
            <option value="dispatched">Dispatched</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>

        <Field label="Linked flight ID" error={errors.linkedFlightId?.message}>
          <Input {...register("linkedFlightId")} placeholder="(optional UUID)" />
        </Field>
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
