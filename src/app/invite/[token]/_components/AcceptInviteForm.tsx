"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";

interface AcceptInviteFormProps {
  token: string;
  workspaceName: string;
  role: string;
}

export function AcceptInviteForm({
  token,
  workspaceName,
  role,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/team/invite/${token}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/lineup" as Route);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
          GreenRoom Stages
        </div>
        <h1 className="text-display text-4xl leading-[1.05] mb-3">
          {workspaceName}
        </h1>
        <p className="text-sm text-[--color-fg-muted] mb-8">
          You&apos;ve been invited to join as {role}.
        </p>

        {error && <p className="text-sm text-coral mb-4">{error}</p>}

        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={handleAccept}
        >
          {busy ? "Accepting…" : "Accept invite"}
        </Button>
      </div>
    </main>
  );
}
