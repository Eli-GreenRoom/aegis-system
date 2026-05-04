"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  CalendarDays,
  Users,
  HardHat,
  Plane,
  Hotel,
  Car,
  ScrollText,
  FileSignature,
  Wallet,
  Ticket,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Lineup",     href: "/lineup",     icon: CalendarDays },
  { label: "Artists",    href: "/artists",    icon: Users },
  { label: "Crew",       href: "/crew",       icon: HardHat },
  { label: "Flights",    href: "/flights",    icon: Plane },
  { label: "Hotels",     href: "/hotels",     icon: Hotel },
  { label: "Ground",     href: "/ground",     icon: Car },
  { label: "Riders",     href: "/riders",     icon: ScrollText },
  { label: "Contracts",  href: "/contracts",  icon: FileSignature },
  { label: "Payments",   href: "/payments",   icon: Wallet },
  { label: "Guestlist",  href: "/guestlist",  icon: Ticket },
  { label: "Documents",  href: "/documents",  icon: FolderOpen },
  { label: "Settings",   href: "/settings",   icon: Settings },
] as const;

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen border-r border-[--color-border] bg-[--color-surface]">
      {/* Wordmark */}
      <Link
        href="/lineup"
        className="h-14 flex items-center px-5 border-b border-[--color-border] shrink-0"
      >
        <span className="text-display text-[17px] leading-none text-[--color-fg]">
          Aegis
        </span>
        <span
          className="ml-2 text-[9px] font-semibold text-brand border border-brand/40 rounded-md px-[5px] py-[2px] leading-none uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Ops
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-px overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-md transition-colors",
                active
                  ? "text-[--color-fg] bg-[--color-surface-raised]"
                  : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface-raised]/60",
              ].join(" ")}
            >
              {active && (
                <span className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-brand" />
              )}
              <Icon className="w-[15px] h-[15px] shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="shrink-0 px-2 pb-4 pt-3 border-t border-[--color-border] space-y-1">
        <div className="px-3 py-1 text-[11px] text-[--color-fg-subtle] truncate" title={userEmail}>
          {userEmail}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-[7px] text-[13px] text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface-raised]/60 rounded-md w-full transition-colors text-left"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
