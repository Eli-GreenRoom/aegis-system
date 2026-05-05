"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { riderInputSchema, type RiderInput } from "@/lib/riders/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import type { Artist } from "@/lib/artists/repo";
import type { Rider } from "@/lib/riders/repo";

interface Props {
  artists: Artist[];
  rider?: Rider;
}

function toDtLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RiderForm({ artists, rider }: Props) {
  const router = useRouter();
  const isEdit = !!rider;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RiderInput>({
    resolver: zodResolver(riderInputSchema),
    defaultValues: {
      artistId: rider?.artistId ?? artists[0]?.id ?? "",
      kind: rider?.kind ?? "hospitality",
      fileUrl: rider?.fileUrl ?? "",
      receivedAt: toDtLocal(rider?.receivedAt ?? null),
      confirmed: rider?.confirmed ?? false,
    },
  });

  async function onSubmit(data: RiderInput) {
    setServerError("");
    const url = isEdit ? `/api/riders/${rider!.id}` : "/api/riders";
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

    router.push("/riders");
    router.refresh();
  }

  async function onDelete() {
    if (!rider) return;
    if (!confirm("Delete this rider? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/riders/${rider.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/riders");
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

        <Field label="Kind" error={errors.kind?.message} required>
          <select
            {...register("kind")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="hospitality">Hospitality</option>
            <option value="technical">Technical</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field label="Rider file" error={errors.fileUrl?.message}>
            <Controller
              control={control}
              name="fileUrl"
              render={({ field }) => (
                <FileUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  entityType="rider"
                  tags={["rider"]}
                />
              )}
            />
          </Field>
        </div>

        <Field label="Received at" error={errors.receivedAt?.message}>
          <Input type="datetime-local" step={60} {...register("receivedAt")} />
        </Field>

        <div className="flex items-end gap-2">
          <input
            id="confirmed"
            type="checkbox"
            {...register("confirmed")}
            className="rounded-md border border-[--color-border-strong] bg-[--color-surface]"
          />
          <Label
            htmlFor="confirmed"
            className="!text-[12px] !normal-case !tracking-normal text-[--color-fg]"
          >
            Confirmed
          </Label>
        </div>
      </div>

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
