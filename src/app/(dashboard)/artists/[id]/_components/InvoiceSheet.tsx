"use client";

/**
 * InvoiceSheet - slide-over for adding an invoice + linked payment from
 * the artist cockpit.
 *
 * Flow:
 *  1. Upload the PDF (or skip and fill manually).
 *  2. Optionally hit "Parse with AI" to auto-fill fields from pasted text.
 *  3. Fill / confirm fields.
 *  4. Submit -> POST /api/invoices -> POST /api/payments (linked).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/FileUpload";

const ISSUER_KINDS = [
  "agency",
  "artist",
  "hotel",
  "vendor",
  "freight",
  "catering",
  "production",
  "venue",
];

const formSchema = z.object({
  // Invoice fields
  number: z.string().trim().max(100).optional().or(z.literal("")),
  issuerKind: z.string().trim().min(1, "Required").max(80),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  amount: z
    .union([z.string(), z.number()])
    .refine(
      (v) =>
        (typeof v === "number" && v >= 0) ||
        (typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v) && v !== ""),
      { message: "Valid amount required" },
    ),
  currency: z.enum(["USD", "EUR"]),
  fileUrl: z.string().optional().or(z.literal("")),
  comments: z.string().trim().max(4000).optional().or(z.literal("")),
  // Payment fields
  description: z.string().trim().min(1, "Required").max(500),
  paymentDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  artistId: string;
  artistName: string;
  onSuccess: () => void;
}

export default function InvoiceSheet({
  artistId,
  artistName,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiParsed, setAiParsed] = useState<Record<string, unknown> | null>(
    null,
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      issuerKind: "agency",
      issueDate: "",
      dueDate: "",
      amount: "",
      currency: "USD",
      fileUrl: "",
      comments: "",
      description: `${artistName} - fee`,
      paymentDueDate: "",
    },
  });

  const watchedDueDate = watch("dueDate");

  async function runAiParse() {
    setAiError("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAiError(body.error ?? `Parse failed (${res.status})`);
        return;
      }
      const body = await res.json();
      setAiParsed(body.parsed);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setAiLoading(false);
    }
  }

  function applyParsed(p: Record<string, unknown>) {
    if (typeof p.invoiceNumber === "string")
      setValue("number", p.invoiceNumber, { shouldValidate: true });
    if (typeof p.issuerKind === "string")
      setValue("issuerKind", p.issuerKind, { shouldValidate: true });
    if (typeof p.issueDate === "string")
      setValue("issueDate", p.issueDate, { shouldValidate: true });
    if (typeof p.dueDate === "string") {
      setValue("dueDate", p.dueDate, { shouldValidate: true });
      setValue("paymentDueDate", p.dueDate, { shouldValidate: true });
    }
    if (typeof p.amount === "number")
      setValue("amount", p.amount.toFixed(2), { shouldValidate: true });
    if (p.currency === "USD" || p.currency === "EUR")
      setValue("currency", p.currency, { shouldValidate: true });
    if (typeof p.vendor === "string" && p.vendor) {
      setValue("description", `${p.vendor} - ${artistName} fee`, {
        shouldValidate: true,
      });
    }
    setAiOpen(false);
    setAiParsed(null);
    setAiText("");
  }

  async function onSubmit(data: FormValues) {
    setServerError("");
    const amountCents = Math.round(Number(data.amount) * 100);

    // Step 1: create invoice
    const invoiceRes = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        number: data.number || undefined,
        issuerKind: data.issuerKind,
        issueDate: data.issueDate || undefined,
        dueDate: data.dueDate || undefined,
        amountCents,
        currency: data.currency,
        fileUrl: data.fileUrl || undefined,
        comments: data.comments || undefined,
        status: "received",
      }),
    });
    if (!invoiceRes.ok) {
      const body = await invoiceRes.json().catch(() => ({}));
      setServerError(body.error ?? "Couldn't create invoice.");
      return;
    }
    const { invoice } = await invoiceRes.json();

    // Step 2: create linked payment
    const paymentRes = await fetch("/api/payments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        artistId,
        invoiceId: invoice.id,
        description: data.description,
        dueDate: data.paymentDueDate || data.dueDate || undefined,
        amountCents,
        currency: data.currency,
        status: "pending",
      }),
    });
    if (!paymentRes.ok) {
      const body = await paymentRes.json().catch(() => ({}));
      setServerError(
        body.error ?? "Invoice saved but payment creation failed.",
      );
      return;
    }

    router.refresh();
    onSuccess();
  }

  return (
    <div className="space-y-5 pb-4">
      {/* AI parse panel */}
      {aiOpen ? (
        <div className="rounded-md border border-[--color-border-strong] bg-[--color-surface] p-4 space-y-3">
          <p className="text-[12px] text-[--color-fg-muted]">
            Paste the invoice email or extracted PDF text. Haiku will extract
            the fields and fill the form.
          </p>
          {!aiParsed ? (
            <>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={8}
                placeholder="Paste invoice text here..."
                className="w-full rounded-md border border-[--color-border-strong] bg-[--color-bg] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none"
              />
              {aiError && <p className="text-xs text-coral">{aiError}</p>}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={runAiParse}
                  loading={aiLoading}
                  disabled={aiText.trim().length < 20}
                >
                  {aiLoading ? "Parsing..." : "Parse"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAiOpen(false);
                    setAiText("");
                    setAiError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[--color-fg-muted]">
                Review extracted fields. Click{" "}
                <span className="text-brand">Apply</span> to fill the form.
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {Object.entries(aiParsed)
                  .filter(([, v]) => v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-mono text-[10px] uppercase tracking-[0.14em] text-[--color-fg-subtle] self-center">
                        {k}
                      </dt>
                      <dd className="text-[--color-fg] text-mono text-xs break-all">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="flex items-center gap-2 pt-1">
                <Button type="button" onClick={() => applyParsed(aiParsed)}>
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAiParsed(null);
                    setAiError("");
                  }}
                >
                  Re-parse
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAiOpen(false);
                    setAiParsed(null);
                    setAiText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAiOpen(true)}
          >
            Parse with AI
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Invoice section */}
        <fieldset className="space-y-3">
          <legend className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] mb-2">
            Invoice
          </legend>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Number" error={errors.number?.message}>
              <Input {...register("number")} placeholder="INV-001" />
            </Field>
            <Field label="Issuer" error={errors.issuerKind?.message} required>
              <Input
                {...register("issuerKind")}
                list="issuer-kinds-sheet"
                placeholder="agency, hotel..."
              />
              <datalist id="issuer-kinds-sheet">
                {ISSUER_KINDS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </Field>

            <Field label="Issue date" error={errors.issueDate?.message}>
              <Input type="date" {...register("issueDate")} />
            </Field>
            <Field label="Invoice due date" error={errors.dueDate?.message}>
              <Input type="date" {...register("dueDate")} />
            </Field>

            <Field label="Amount" error={errors.amount?.message} required>
              <Input
                type="text"
                inputMode="decimal"
                {...register("amount")}
                placeholder="5000.00"
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
          </div>

          <Field label="Invoice file" error={errors.fileUrl?.message}>
            <Controller
              control={control}
              name="fileUrl"
              render={({ field }) => (
                <FileUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  entityType="invoice"
                  tags={["invoice"]}
                />
              )}
            />
          </Field>
        </fieldset>

        {/* Payment section */}
        <fieldset className="space-y-3 pt-2 border-t border-white/6">
          <legend className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] mb-2">
            Payment
          </legend>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field
                label="Description"
                error={errors.description?.message}
                required
              >
                <Input
                  {...register("description")}
                  placeholder="Agency fee - deposit"
                />
              </Field>
            </div>
            <Field
              label="Payment due date"
              error={errors.paymentDueDate?.message}
            >
              <Input
                type="date"
                {...register("paymentDueDate")}
                placeholder={watchedDueDate ?? ""}
              />
            </Field>
          </div>
        </fieldset>

        {serverError && <p className="text-sm text-coral">{serverError}</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create invoice + payment"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onSuccess}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
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
