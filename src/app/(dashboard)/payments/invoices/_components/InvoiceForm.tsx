"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { z } from "zod";
import { invoiceInputSchema } from "@/lib/payments/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import AIParseDialog from "@/components/ui/AIParseDialog";
import type { Invoice } from "@/lib/payments/repo";

interface Props {
  invoice?: Invoice;
}

const formSchema = invoiceInputSchema
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

const COMMON_ISSUER_KINDS = [
  "agency",
  "artist",
  "hotel",
  "vendor",
  "freight",
  "catering",
  "production",
  "venue",
];

export default function InvoiceForm({ invoice }: Props) {
  const router = useRouter();
  const isEdit = !!invoice;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: invoice?.number ?? "",
      issuerKind: invoice?.issuerKind ?? "",
      issueDate: invoice?.issueDate ?? "",
      dueDate: invoice?.dueDate ?? "",
      amount:
        invoice?.amountCents != null
          ? (invoice.amountCents / 100).toFixed(2)
          : "",
      currency: (invoice?.currency as "USD" | "EUR" | undefined) ?? "USD",
      fileUrl: invoice?.fileUrl ?? "",
      status: invoice?.status ?? "received",
      comments: invoice?.comments ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit
      ? `/api/invoices/${invoice!.id}`
      : "/api/invoices";
    const method = isEdit ? "PATCH" : "POST";

    const amountCents = Math.round(Number(data.amount) * 100);

    const payload = {
      number: data.number,
      issuerKind: data.issuerKind,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      amountCents,
      currency: data.currency,
      fileUrl: data.fileUrl,
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
    router.push(`/payments/invoices/${body.invoice.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!invoice) return;
    if (!confirm("Delete this invoice? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/payments/invoices");
    router.refresh();
  }

  function applyParsed(p: Record<string, unknown>) {
    if (typeof p.invoiceNumber === "string")
      setValue("number", p.invoiceNumber, { shouldValidate: true });
    if (typeof p.issuerKind === "string")
      setValue("issuerKind", p.issuerKind, { shouldValidate: true });
    if (typeof p.issueDate === "string")
      setValue("issueDate", p.issueDate, { shouldValidate: true });
    if (typeof p.dueDate === "string")
      setValue("dueDate", p.dueDate, { shouldValidate: true });
    if (typeof p.amount === "number")
      setValue("amount", p.amount.toFixed(2), { shouldValidate: true });
    if (p.currency === "USD" || p.currency === "EUR")
      setValue("currency", p.currency, { shouldValidate: true });
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
        <Field label="Number" error={errors.number?.message}>
          <Input {...register("number")} placeholder="INV-001" />
        </Field>
        <Field label="Issuer kind" error={errors.issuerKind?.message} required>
          <Input
            {...register("issuerKind")}
            list="issuer-kinds"
            placeholder="agency, hotel, vendor..."
          />
          <datalist id="issuer-kinds">
            {COMMON_ISSUER_KINDS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Field>

        <Field label="Issue date" error={errors.issueDate?.message}>
          <Input type="date" {...register("issueDate")} />
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
            <option value="received">Received</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field label="Invoice file" error={errors.fileUrl?.message}>
            <Controller
              control={control}
              name="fileUrl"
              render={({ field }) => (
                <FileUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  entityType="invoice"
                  entityId={invoice?.id}
                  tags={["invoice"]}
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

      {aiOpen && (
        <AIParseDialog
          title="Parse invoice with AI"
          endpoint="/api/ai/parse-invoice"
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
