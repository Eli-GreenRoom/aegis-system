"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { z } from "zod";
import { paymentInputSchema } from "@/lib/payments/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import type { Invoice, Payment } from "@/lib/payments/repo";
import type { Artist } from "@/lib/artists/repo";
import type { Vendor } from "@/lib/ground/repo";

interface Props {
  payment?: Payment;
  artists: Artist[];
  vendors: Vendor[];
  invoices: Invoice[];
}

// Form-shape: amount in display units (USD/EUR), not cents.
const formSchema = paymentInputSchema
  .omit({ amountCents: true })
  .extend({
    amount: z
      .union([z.string(), z.number()])
      .refine(
        (v: unknown) =>
          (typeof v === "number" && v >= 0) ||
          (typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v) && v !== ""),
        { message: "must be a non-negative number with up to 2 decimals" }
      ),
  });

type FormValues = z.infer<typeof formSchema>;

export default function PaymentForm({
  payment,
  artists,
  vendors,
  invoices,
}: Props) {
  const router = useRouter();
  const isEdit = !!payment;
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
      description: payment?.description ?? "",
      artistId: payment?.artistId ?? "",
      vendorId: payment?.vendorId ?? "",
      invoiceId: payment?.invoiceId ?? "",
      dueDate: payment?.dueDate ?? "",
      amount:
        payment?.amountCents != null
          ? (payment.amountCents / 100).toFixed(2)
          : "",
      currency: (payment?.currency as "USD" | "EUR" | undefined) ?? "USD",
      status: payment?.status ?? "pending",
      paidAt:
        payment?.paidAt instanceof Date
          ? payment.paidAt.toISOString()
          : (payment?.paidAt ?? ""),
      paidVia: payment?.paidVia ?? "",
      popUrl: payment?.popUrl ?? "",
      comments: payment?.comments ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit ? `/api/payments/${payment!.id}` : "/api/payments";
    const method = isEdit ? "PATCH" : "POST";

    const amountCents = Math.round(Number(data.amount) * 100);

    const payload = {
      description: data.description,
      artistId: data.artistId,
      vendorId: data.vendorId,
      invoiceId: data.invoiceId,
      dueDate: data.dueDate,
      amountCents,
      currency: data.currency,
      status: data.status,
      paidAt: data.paidAt,
      paidVia: data.paidVia,
      popUrl: data.popUrl,
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
    router.push(`/payments/${body.payment.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!payment) return;
    if (!confirm("Delete this payment? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/payments/${payment.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/payments");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Description" error={errors.description?.message} required>
            <Input
              {...register("description")}
              placeholder="Hiroko Yamamura - deposit"
            />
          </Field>
        </div>

        <Field label="Artist (optional)" error={errors.artistId?.message}>
          <select
            {...register("artistId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendor (optional)" error={errors.vendorId?.message}>
          <select
            {...register("vendorId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Invoice (optional)" error={errors.invoiceId?.message}>
          <select
            {...register("invoiceId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.number ?? i.issuerKind}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date" error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </Field>

        <Field label="Amount" error={errors.amount?.message} required>
          <Input
            type="text"
            inputMode="decimal"
            {...register("amount")}
            placeholder="2500.00"
          />
        </Field>
        <Field label="Currency" error={errors.currency?.message} required>
          <select
            {...register("currency")}
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
            <option value="pending">Pending</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
        </Field>
        <Field label="Paid via" error={errors.paidVia?.message}>
          <Input {...register("paidVia")} placeholder="Wire, BLF, cash..." />
        </Field>

        <div className="col-span-2">
          <Field label="Proof of payment" error={errors.popUrl?.message}>
            <Controller
              control={control}
              name="popUrl"
              render={({ field }) => (
                <FileUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  entityType="payment"
                  entityId={payment?.id}
                  tags={["pop"]}
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
