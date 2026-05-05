"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { z } from "zod";
import { crewInputSchema } from "@/lib/crew/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import type { CrewMember } from "@/lib/crew/repo";

interface Props {
  member?: CrewMember;
}

/**
 * Form-only superset: days come from a comma-separated text input and get
 * split before submit.
 */
const formSchema = crewInputSchema.omit({ days: true }).extend({
  daysText: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s) return undefined;
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length === 0 ? undefined : parts;
}

function joinCsv(arr: unknown): string {
  return Array.isArray(arr) ? (arr as string[]).join(", ") : "";
}

export default function CrewForm({ member }: Props) {
  const router = useRouter();
  const isEdit = !!member;
  const [serverError, setServerError] = useState("");
  const [archiving, setArchiving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member?.name ?? "",
      role: member?.role ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      nationality: member?.nationality ?? "",
      comments: member?.comments ?? "",
      daysText: joinCsv(member?.days),
      visaStatus: member?.visaStatus ?? "",
      pressKitUrl: member?.pressKitUrl ?? "",
      passportFileUrl: member?.passportFileUrl ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError("");
    const url = isEdit ? `/api/crew/${member!.id}` : "/api/crew";
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      nationality: data.nationality,
      comments: data.comments,
      days: splitCsv(data.daysText),
      visaStatus: data.visaStatus,
      pressKitUrl: data.pressKitUrl,
      passportFileUrl: data.passportFileUrl,
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
    router.push(`/crew/${body.crew.id}` as Route);
    router.refresh();
  }

  async function onArchive() {
    if (!member) return;
    if (!confirm(`Archive ${member.name}? You can restore later.`)) return;
    setArchiving(true);
    const res = await fetch(`/api/crew/${member.id}`, { method: "DELETE" });
    setArchiving(false);
    if (!res.ok) {
      setServerError("Couldn't archive.");
      return;
    }
    router.push("/crew");
    router.refresh();
  }

  async function onUnarchive() {
    if (!member) return;
    setArchiving(true);
    const res = await fetch(`/api/crew/${member.id}?action=unarchive`, {
      method: "DELETE",
    });
    setArchiving(false);
    if (!res.ok) {
      setServerError("Couldn't restore.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message} required>
          <Input {...register("name")} autoComplete="off" />
        </Field>
        <Field label="Role" error={errors.role?.message} required>
          <Input
            {...register("role")}
            placeholder="Tour manager, photographer, videographer..."
            autoComplete="off"
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="off" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input {...register("phone")} autoComplete="off" />
        </Field>
        <Field label="Nationality" error={errors.nationality?.message}>
          <Input {...register("nationality")} autoComplete="off" />
        </Field>
        <Field label="Days (comma separated)" error={errors.daysText?.message}>
          <Input
            {...register("daysText")}
            placeholder="Friday, Saturday, Sunday"
            autoComplete="off"
          />
        </Field>
        <Field label="Visa status" error={errors.visaStatus?.message}>
          <select
            {...register("visaStatus")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Press kit URL" error={errors.pressKitUrl?.message}>
          <Input
            {...register("pressKitUrl")}
            placeholder="https://drive.google.com/..."
            autoComplete="off"
          />
        </Field>
        <Field label="Passport file" error={errors.passportFileUrl?.message}>
          <Controller
            control={control}
            name="passportFileUrl"
            render={({ field }) => (
              <FileUpload
                value={field.value ?? ""}
                onChange={field.onChange}
                entityType="crew"
                entityId={member?.id}
                tags={["passport"]}
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
        {isEdit && !member?.archivedAt && (
          <Button
            type="button"
            variant="danger"
            onClick={onArchive}
            disabled={archiving}
          >
            {archiving ? "Archiving" : "Archive"}
          </Button>
        )}
        {isEdit && member?.archivedAt && (
          <Button
            type="button"
            variant="secondary"
            onClick={onUnarchive}
            disabled={archiving}
          >
            {archiving ? "Restoring" : "Restore"}
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
