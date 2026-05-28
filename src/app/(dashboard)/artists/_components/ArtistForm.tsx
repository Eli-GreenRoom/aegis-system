"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import {
  artistInputSchema,
  slugify,
  type ArtistInput,
} from "@/lib/artists/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";
import type { Artist } from "@/lib/artists/repo";

interface Props {
  artist?: Artist;
  festivalLocation?: string | null;
  /** When supplied (modal use), called with the newly-created artist
   *  instead of redirecting to its detail page. */
  onCreated?: (artist: Artist) => void;
  /** When supplied, Cancel calls this instead of router.back(). Required
   *  for modal/sheet hosts so Cancel doesn't navigate away. */
  onCancel?: () => void;
  /** Optional initial name for create flows triggered with a known string. */
  initialName?: string;
}

export default function ArtistForm({
  artist,
  festivalLocation,
  onCreated,
  onCancel,
  initialName,
}: Props) {
  const router = useRouter();
  const isEdit = !!artist;
  const [serverError, setServerError] = useState("");
  const [archiving, setArchiving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ArtistInput>({
    resolver: zodResolver(artistInputSchema),
    defaultValues: {
      name: artist?.name ?? initialName ?? "",
      slug: artist?.slug
        ? artist.slug
        : initialName
          ? slugify(initialName)
          : "",
      legalName: artist?.legalName ?? "",
      nationality: artist?.nationality ?? "",
      email: artist?.email ?? "",
      phone: artist?.phone ?? "",
      agency: artist?.agency ?? "",
      agentEmail: artist?.agentEmail ?? "",
      instagram: artist?.instagram ?? "",
      soundcloud: artist?.soundcloud ?? "",
      color: artist?.color ?? "",
      local: artist?.local ?? false,
      visaStatus: artist?.visaStatus ?? "",
      pressKitUrl: artist?.pressKitUrl ?? "",
      passportFileUrl: artist?.passportFileUrl ?? "",
      comments: artist?.comments ?? "",
      needsFlight: artist?.needsFlight ?? true,
      needsHotel: artist?.needsHotel ?? true,
      needsGround: artist?.needsGround ?? true,
      needsContract: artist?.needsContract ?? true,
      needsPayment: artist?.needsPayment ?? true,
      needsRider: artist?.needsRider ?? true,
    },
  });

  function autoSlug() {
    const name = getValues("name");
    if (!isEdit && !dirtyFields.slug && name) {
      setValue("slug", slugify(name), { shouldValidate: true });
    }
  }

  async function onSubmit(data: ArtistInput) {
    setServerError("");
    const url = isEdit ? `/api/artists/${artist!.id}` : "/api/artists";
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
    if (onCreated && !isEdit) {
      onCreated(body.artist);
      return;
    }
    router.push(`/artists/${body.artist.id}` as Route);
    router.refresh();
  }

  async function onArchive() {
    if (!artist) return;
    if (!confirm(`Archive ${artist.name}? You can restore later.`)) return;
    setArchiving(true);
    const res = await fetch(`/api/artists/${artist.id}`, { method: "DELETE" });
    setArchiving(false);
    if (!res.ok) {
      setServerError("Couldn't archive.");
      return;
    }
    router.push("/artists");
    router.refresh();
  }

  async function onUnarchive() {
    if (!artist) return;
    setArchiving(true);
    const res = await fetch(`/api/artists/${artist.id}?action=unarchive`, {
      method: "DELETE",
    });
    setArchiving(false);
    if (!res.ok) {
      setServerError("Couldn't restore.");
      return;
    }
    router.refresh();
  }

  const needsCheckboxes = (
    <div className="space-y-2">
      <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted]">
        Logistics requirements
      </p>
      <p className="text-[11px] text-[--color-fg-subtle]">
        Uncheck modules this artist does not need. Unchecked = N/A on the
        readiness grid and excluded from gap counts.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {(
          [
            { id: "needsFlight", label: "Flight" },
            { id: "needsHotel", label: "Hotel" },
            { id: "needsGround", label: "Ground transport" },
            { id: "needsContract", label: "Contract" },
            { id: "needsPayment", label: "Payment" },
            { id: "needsRider", label: "Rider" },
          ] as const
        ).map(({ id, label }) => (
          <label
            key={id}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              id={id}
              type="checkbox"
              {...register(id)}
              className="rounded border border-[--color-border-strong] bg-[--color-surface]"
            />
            <span className="text-[13px] text-[--color-fg]">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      {/* Day-1 required fields. On create the logistics requirements show
       *  here too so the operator can uncheck N/A modules up-front. */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message} required>
          <Input {...register("name")} onBlur={autoSlug} autoComplete="off" />
        </Field>
        <Field label="Slug" error={errors.slug?.message} required>
          <Input {...register("slug")} autoComplete="off" />
        </Field>
      </div>

      {!isEdit && needsCheckboxes}

      <details className="rounded-md border border-[--color-border] bg-[--color-surface]/40 px-4 py-3">
        <summary className="cursor-pointer text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-muted] select-none">
          More details (optional)
        </summary>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Field label="Legal name" error={errors.legalName?.message}>
            <Input {...register("legalName")} autoComplete="off" />
          </Field>
          <Field label="Nationality" error={errors.nationality?.message}>
            <Input {...register("nationality")} autoComplete="off" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} autoComplete="off" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} autoComplete="off" />
          </Field>
          <Field label="Agency" error={errors.agency?.message}>
            <Input {...register("agency")} autoComplete="off" />
          </Field>
          <Field label="Agent email" error={errors.agentEmail?.message}>
            <Input
              type="email"
              {...register("agentEmail")}
              autoComplete="off"
            />
          </Field>
          <Field label="Instagram" error={errors.instagram?.message}>
            <Input {...register("instagram")} autoComplete="off" />
          </Field>
          <Field label="Soundcloud" error={errors.soundcloud?.message}>
            <Input {...register("soundcloud")} autoComplete="off" />
          </Field>
          <Field label="Color (#RRGGBB)" error={errors.color?.message}>
            <Input
              {...register("color")}
              placeholder="#E5B85A"
              autoComplete="off"
            />
          </Field>
          <Field label="Visa status" error={errors.visaStatus?.message}>
            <select
              {...register("visaStatus")}
              className="w-full rounded-[--radius-md] border border-white/10 bg-white/4 px-3 py-2 text-sm text-[--color-fg]"
            >
              <option value="">-</option>
              <option value="not_needed">Not needed</option>
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
                  entityType="artist"
                  entityId={artist?.id}
                  tags={["passport"]}
                />
              )}
            />
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-4">
          <input
            id="local"
            type="checkbox"
            {...register("local")}
            className="rounded-md border border-[--color-border-strong] bg-[--color-surface]"
          />
          <Label
            htmlFor="local"
            className="text-[12px]! normal-case! tracking-normal! text-[--color-fg]"
          >
            Local artist{festivalLocation ? ` (${festivalLocation})` : ""}
          </Label>
        </div>

        {/* On edit, the logistics requirements stay inside "More details"
         *  so the edit page keeps its tidy two-column layout. On create
         *  they're surfaced above next to name + slug. */}
        {isEdit && <div className="pt-4">{needsCheckboxes}</div>}

        <div className="pt-4">
          <Field label="Comments" error={errors.comments?.message}>
            <textarea
              {...register("comments")}
              rows={4}
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
            />
          </Field>
        </div>
      </details>

      {serverError && <p className="text-sm text-coral">{serverError}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : isEdit ? "Save" : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <div className="flex-1" />
        {isEdit && !artist?.archivedAt && (
          <Button
            type="button"
            variant="danger"
            onClick={onArchive}
            disabled={archiving}
          >
            {archiving ? "Archiving" : "Archive"}
          </Button>
        )}
        {isEdit && artist?.archivedAt && (
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
