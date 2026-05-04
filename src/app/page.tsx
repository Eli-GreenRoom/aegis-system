export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <div className="text-xs uppercase tracking-widest text-brand mb-4">
          Aegis System
        </div>
        <h1 className="text-3xl font-semibold mb-2">
          Operations backend for Aegis Festival
        </h1>
        <p className="text-[--color-fg-muted] mb-8 leading-relaxed">
          Lineup, travel, hotels, riders, contracts, payments, guestlists. One
          dashboard. Festival-day mode for the weekend itself.
        </p>
        <div className="flex gap-3 text-sm">
          <a
            href="/sign-in"
            className="bg-brand text-[--color-brand-fg] px-4 py-2 rounded-md font-medium"
          >
            Sign in
          </a>
          <a
            href="/api/health"
            className="border border-[--color-border] px-4 py-2 rounded-md text-mono"
          >
            /api/health
          </a>
        </div>
        <div className="mt-12 text-xs text-[--color-fg-subtle] text-mono">
          Phase 0 — scaffold. See HANDOFF.md for the build plan.
        </div>
      </div>
    </main>
  );
}
