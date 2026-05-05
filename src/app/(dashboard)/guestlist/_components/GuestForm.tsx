"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import {
  guestlistInputSchema,
  type GuestlistInput,
} from "@/lib/guestlist/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Artist } from "@/lib/artists/repo";
import type { GuestlistEntry } from "@/lib/guestlist/repo";

interface Props {
  entry?: GuestlistEntry;
  artists: Artist[];
}

export default function GuestForm({ entry, artists }: Props) {
  const router = useRouter();
  const isEdit = !!entry;
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestlistInput>({
    resolver: zodResolver(guestlistInputSchema),
    defaultValues: {
      category: entry?.category ?? "dj_guest",
      hostArtistId: entry?.hostArtistId ?? "",
      name: entry?.name ?? "",
      email: entry?.email ?? "",
      phone: entry?.phone ?? "",
      day: (entry?.day as "friday" | "saturday" | "sunday" | undefined) ?? "",
      inviteSent: entry?.inviteSent ?? false,
      checkedIn: entry?.checkedIn ?? false,
      comments: entry?.comments ?? "",
    },
  });

  async function onSubmit(data: GuestlistInput) {
    setServerError("");
    const url = isEdit ? `/api/guestlist/${entry!.id}` : "/api/guestlist";
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
    router.push(`/guestlist/${body.entry.id}` as Route);
    router.refresh();
  }

  async function onDelete() {
    if (!entry) return;
    if (!confirm("Delete this entry? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/guestlist/${entry.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setServerError("Couldn't delete.");
      return;
    }
    router.push("/guestlist");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message} required>
          <Input {...register("name")} autoComplete="off" />
        </Field>

        <Field label="Category" error={errors.category?.message} required>
          <select
            {...register("category")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="dj_guest">DJ guest</option>
            <option value="competition_winner">Competition winner</option>
            <option value="free_list">Free list</option>
            <option value="international">International</option>
            <option value="general_admission">General admission</option>
          </select>
        </Field>

        <Field label="Host artist" error={errors.hostArtistId?.message}>
          <select
            {...register("hostArtistId")}
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

        <Field label="Day" error={errors.day?.message}>
          <select
            {...register("day")}
            className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          >
            <option value="">-</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="off" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input {...register("phone")} autoComplete="off" />
        </Field>

        <div className="flex items-end gap-2">
          <input
            id="inviteSent"
            type="checkbox"
            {...register("inviteSent")}
            className="rounded-md border border-[--color-border-strong] bg-[--color-surface]"
          />
          <Label
            htmlFor="inviteSent"
            className="!text-[12px] !normal-case !tracking-normal text-[--color-fg]"
          >
            Invite sent
          </Label>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="checkedIn"
            type="checkbox"
            {...register("checkedIn")}
            className="rounded-md border border-[--color-border-strong] bg-[--color-surface]"
          />
          <Label
            htmlFor="checkedIn"
            className="!text-[12px] !normal-case !tracking-normal text-[--color-fg]"
          >
            Checked in
          </Label>
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
