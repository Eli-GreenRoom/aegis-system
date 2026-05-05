"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import {
  contractInputSchema,
  type ContractInput,
} from "@/lib/contracts/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Artist } from "@/lib/artists/repo";
import type { Contract } from "@/lib/contracts/repo";

interface Props {
  contract?: Contract;
  artists: Artist[];
}

function toDtLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDtLocal(s: string): string {
  if (!s) return "";
  return new Date(s).toISOString();
}

export default function ContractForm({ contract, artists }: Props) {
  const router = useRouter();
  const isEdit = !!contract;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContractInput>({
    resolver: zodResolver(contractInputSchema),
    defaultValues: {
      artistId: contract?.artistId ?? artists[0]?.id ?? "",
      status: contract?.status ?? "draft",
      sentAt: toDtLocal(contract?.sentAt ?? null),
      signedAt: toDtLocal(contract?.signedAt ?? null),
      fileUrl: contract?.fileUrl ?? "",
      signedFileUrl: contract?.signedFileUrl ?? "",
      notes: contract?.notes ?? "",
    },
  });

  async function onSubmit(data: ContractInput) {
    setServerError("");
    const url = isEdit ? `/api/contracts/${contract!.id}` : "/api/contracts";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      ...data,
      sentAt: data.sentAt ? fromDtLocal(data.sentAt) : "",
      signedAt: data.signedAt ? fromDtLocal(data.signedAt) : "",
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
    router.push(`/contracts/${body.contract.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!contract) return;
    if (!confirm("Delete this contract? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/contracts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Artist" error={errors.artistId?.message} required>
          <select
            {...register("artistId")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select
            {...register("status")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="void">Void</option>
          </select>
        </Field>

        <Field label="Sent at" error={errors.sentAt?.message}>
          <Input type="datetime-local" step={60} {...register("sentAt")} />
        </Field>
        <Field label="Signed at" error={errors.signedAt?.message}>
          <Input type="datetime-local" step={60} {...register("signedAt")} />
        </Field>

        <div className="col-span-2">
          <Field label="Draft file URL" error={errors.fileUrl?.message}>
            <Input
              {...register("fileUrl")}
              placeholder="https://..."
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Signed file URL" error={errors.signedFileUrl?.message}>
            <Input
              {...register("signedFileUrl")}
              placeholder="https://..."
              autoComplete="off"
            />
          </Field>
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
