"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALLOW_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ALLOW_SIGNUP) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
            GreenRoom Stages
          </div>
          <h1 className="text-display text-4xl mb-6 leading-[1.05]">
            Signup is closed.
          </h1>
          <p className="text-[--color-fg-muted] mb-8 leading-relaxed">
            This dashboard is invite-only. If you should have access, ask the
            festival owner for an invite.
          </p>
          <Link
            href={"/sign-in" as Route}
            className="text-mono text-xs uppercase tracking-[0.18em] text-brand"
          >
            &larr; Sign in
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signUp.email({ email, password, name });

    if (error) {
      setError(error.message ?? "Couldn't create account. Try again.");
      setLoading(false);
      return;
    }

    router.push("/lineup");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-3">
          GreenRoom Stages
        </div>
        <h1 className="text-display text-4xl mb-10 leading-[1.05]">
          Create account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-[--color-fg-muted] mt-8">
          Already have one?{" "}
          <Link
            href={"/sign-in" as Route}
            className="text-brand underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
