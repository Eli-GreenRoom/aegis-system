import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getAppSession();
  if (session) redirect("/home");

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <div className="text-mono text-xs uppercase tracking-[0.2em] text-brand mb-6">
          GreenRoom Stages
        </div>
        <h1 className="text-display text-4xl mb-3 leading-[1.1]">
          The festival, organised.
        </h1>
        <p className="text-[--color-fg-muted] mb-10 leading-relaxed">
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
            className="border border-[--color-border] px-4 py-2 rounded-md text-mono text-[--color-fg-muted]"
          >
            /api/health
          </a>
        </div>
        <div className="mt-16 text-mono text-xs text-[--color-fg-subtle]">
          Aranoon Village, Batroun
        </div>
      </div>
    </main>
  );
}
