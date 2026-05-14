"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { flightInputSchema, type FlightInput } from "@/lib/flights/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import AIParseDialog from "@/components/ui/AIParseDialog";
import type { Flight } from "@/lib/flights/repo";
import type { Person } from "@/lib/people";

interface Props {
  flight?: Flight;
  people: Person[];
}

function toDtLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  // datetime-local needs YYYY-MM-DDTHH:MM (local time, no TZ).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDtLocal(s: string): string {
  // Treat the value as local time, convert to ISO so the server stores UTC.
  if (!s) return "";
  const d = new Date(s);
  return d.toISOString();
}

export default function FlightForm({ flight, people }: Props) {
  const router = useRouter();
  const isEdit = !!flight;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FlightInput>({
    resolver: zodResolver(flightInputSchema),
    defaultValues: {
      personKind: flight?.personKind ?? "artist",
      personId: flight?.personId ?? people[0]?.id ?? "",
      direction: flight?.direction ?? "inbound",
      fromAirport: flight?.fromAirport ?? "",
      toAirport: flight?.toAirport ?? "",
      airline: flight?.airline ?? "",
      flightNumber: flight?.flightNumber ?? "",
      scheduledDt: toDtLocal(flight?.scheduledDt ?? null),
      actualDt: toDtLocal(flight?.actualDt ?? null),
      status: flight?.status ?? "scheduled",
      pnr: flight?.pnr ?? "",
      ticketUrl: flight?.ticketUrl ?? "",
      confirmationEmailUrl: flight?.confirmationEmailUrl ?? "",
      seat: flight?.seat ?? "",
      delayMinutes: flight?.delayMinutes ?? null,
      comments: flight?.comments ?? "",
    },
  });

  async function onSubmit(data: FlightInput) {
    setServerError("");
    const url = isEdit ? `/api/flights/${flight!.id}` : "/api/flights";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      ...data,
      scheduledDt: data.scheduledDt ? fromDtLocal(data.scheduledDt) : "",
      actualDt: data.actualDt ? fromDtLocal(data.actualDt) : "",
      // RHF gives NaN when the numeric input is empty; coerce to null so the
      // server clears the column rather than rejecting the value.
      delayMinutes:
        data.delayMinutes == null || Number.isNaN(data.delayMinutes)
          ? null
          : data.delayMinutes,
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
    router.push(`/flights/${body.flight.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!flight) return;
    if (!confirm("Delete this flight? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/flights/${flight.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/flights");
    router.refresh();
  }

  // Person picker is a single dropdown that encodes "kind:id" then we split.
  // Avoids two coupled fields in the form.
  function setPerson(value: string) {
    const [kind, id] = value.split(":") as ["artist" | "crew", string];
    // RHF setValue isn't imported; piggyback via hidden inputs + onChange below.
    return { kind, id };
  }

  const personOptions = people.map((p) => ({
    value: `${p.kind}:${p.id}`,
    label: `${p.name} (${p.kind})${p.agency ? ` - ${p.agency}` : ""}`,
  }));

  function applyParsed(p: Record<string, unknown>) {
    if (typeof p.airline === "string")
      setValue("airline", p.airline, { shouldValidate: true });
    if (typeof p.flightNumber === "string")
      setValue("flightNumber", p.flightNumber, { shouldValidate: true });
    if (typeof p.fromAirport === "string")
      setValue("fromAirport", p.fromAirport, { shouldValidate: true });
    if (typeof p.toAirport === "string")
      setValue("toAirport", p.toAirport, { shouldValidate: true });
    if (typeof p.scheduledDt === "string")
      setValue("scheduledDt", toDtLocal(p.scheduledDt), {
        shouldValidate: true,
      });
    if (typeof p.pnr === "string")
      setValue("pnr", p.pnr, { shouldValidate: true });
    if (typeof p.seat === "string")
      setValue("seat", p.seat, { shouldValidate: true });
    if (p.direction === "inbound" || p.direction === "outbound")
      setValue("direction", p.direction, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      {!isEdit && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAiOpen(true)}
          >
            Parse with AI
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Person"
          error={errors.personKind?.message ?? errors.personId?.message}
          required
        >
          <select
            defaultValue={`${flight?.personKind ?? "artist"}:${flight?.personId ?? people[0]?.id ?? ""}`}
            onChange={(e) => {
              const { kind, id } = setPerson(e.target.value);
              // Update both hidden fields using the registered controls.
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

        <Field label="Direction" error={errors.direction?.message} required>
          <select
            {...register("direction")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="inbound">Arrival</option>
            <option value="outbound">Departure</option>
          </select>
        </Field>

        <Field label="Airline" error={errors.airline?.message}>
          <Input {...register("airline")} placeholder="MEA, Wizz Air..." />
        </Field>
        <Field label="Flight no." error={errors.flightNumber?.message}>
          <Input {...register("flightNumber")} placeholder="ME202" />
        </Field>

        <Field label="From (IATA)" error={errors.fromAirport?.message}>
          <Input {...register("fromAirport")} placeholder="CDG" />
        </Field>
        <Field label="To (IATA)" error={errors.toAirport?.message}>
          <Input {...register("toAirport")} placeholder="BEY" />
        </Field>

        <Field label="Scheduled" error={errors.scheduledDt?.message}>
          <Input type="datetime-local" step={60} {...register("scheduledDt")} />
        </Field>
        <Field label="Actual" error={errors.actualDt?.message}>
          <Input type="datetime-local" step={60} {...register("actualDt")} />
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select
            {...register("status")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="not_needed">Not needed</option>
            <option value="scheduled">Scheduled</option>
            <option value="boarded">Boarded</option>
            <option value="in_air">In air</option>
            <option value="landed">Landed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>

        <Field label="Delay (min)" error={errors.delayMinutes?.message}>
          <Input
            type="number"
            min={0}
            step={5}
            placeholder="45"
            {...register("delayMinutes", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
        </Field>

        <Field label="PNR" error={errors.pnr?.message}>
          <Input {...register("pnr")} placeholder="ABC123" />
        </Field>

        <Field label="Seat" error={errors.seat?.message}>
          <Input {...register("seat")} placeholder="14A" />
        </Field>
        <Field label="Ticket file" error={errors.ticketUrl?.message}>
          <Controller
            control={control}
            name="ticketUrl"
            render={({ field }) => (
              <FileUpload
                value={field.value ?? ""}
                onChange={field.onChange}
                entityType="flight"
                entityId={flight?.id}
                tags={["ticket"]}
              />
            )}
          />
        </Field>
        <Field
          label="Confirmation email"
          error={errors.confirmationEmailUrl?.message}
        >
          <Controller
            control={control}
            name="confirmationEmailUrl"
            render={({ field }) => (
              <FileUpload
                value={field.value ?? ""}
                onChange={field.onChange}
                entityType="flight"
                entityId={flight?.id}
                tags={["confirmation"]}
              />
            )}
          />
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

      {aiOpen && (
        <AIParseDialog
          title="Parse flight confirmation with AI"
          endpoint="/api/ai/parse-flight"
          onApply={applyParsed}
          onClose={() => setAiOpen(false)}
        />
      )}
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
