"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: string }).error ??
          "Couldn't create workspace. Try again.",
      );
      setLoading(false);
      return;
    }

    router.push("/onboarding/festival" as Route);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
          GreenRoom Stages
        </div>
        <h1 className="text-display text-4xl mb-3 leading-[1.05]">
          Name your workspace
        </h1>
        <p className="text-[--color-fg-muted] mb-8 leading-relaxed">
          A workspace holds your festivals, team, and settings. You can change
          this later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Clockwork Productions"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
