"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/FileUpload";

interface Props {
  memberId: string;
  name: string | null;
  email: string;
  signatureUrl: string | null;
}

interface FormValues {
  name: string;
  signatureUrl: string;
}

export function ProfileTab({
  memberId,
  name,
  email,
  signatureUrl: initialSig,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: name ?? "",
      signatureUrl: initialSig ?? "",
    },
  });

  const currentSig = watch("signatureUrl");

  async function onSubmit(data: FormValues) {
    setError("");
    setSaved(false);
    const res = await fetch("/api/team/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name || undefined,
        signatureUrl: data.signatureUrl || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-[--color-fg] text-sm font-medium">My Profile</h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-[--color-fg-muted] px-3 py-2 rounded-md border border-[--color-border] bg-[--color-surface]/40">
            {email}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            {...register("name")}
            placeholder="Your name"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Signature</Label>
          <p className="text-xs text-[--color-fg-muted] mt-1">
            Upload a PNG or JPEG of your handwritten signature. It will be
            available to use when signing contracts.
          </p>
        </div>

        <Controller
          control={control}
          name="signatureUrl"
          render={({ field }) => (
            <FileUpload
              value={field.value ?? ""}
              onChange={field.onChange}
              entityType="signature"
              entityId={memberId}
              tags={["signature"]}
              accept="image/png,image/jpeg,image/jpg"
            />
          )}
        />

        {currentSig && (
          <div className="rounded-md border border-[--color-border] bg-white p-4 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSig}
              alt="Signature preview"
              className="max-h-24 max-w-xs object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save profile"}
        </Button>
        {saved && <span className="text-xs text-mint">Saved</span>}
      </div>
    </form>
  );
}
