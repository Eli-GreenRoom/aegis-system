"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALLOW_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Couldn't sign in. Try again.");
      setLoading(false);
      return;
    }

    router.push("/lineup");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <BlueprintCorner />
      <div className="w-full max-w-sm relative">
        <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
          GreenRoom Stages
        </div>
        <h1 className="text-display text-4xl mb-10 leading-[1.05]">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in" : "Sign in"}
          </Button>
        </form>

        {ALLOW_SIGNUP && (
          <p className="text-center text-sm text-[--color-fg-muted] mt-8">
            No account?{" "}
            <Link
              href={"/sign-up" as Route}
              className="text-brand underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function BlueprintCorner() {
  return (
    <svg
      aria-hidden
      className="absolute -bottom-12 -right-12 opacity-30 pointer-events-none"
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      stroke="currentColor"
      style={{ color: "var(--color-fg-subtle)" }}
    >
      <rect
        x="40"
        y="40"
        width="240"
        height="240"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      <circle cx="160" cy="160" r="120" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
  );
}
