"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { signOut } from "@/lib/auth-client";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  FileSignature,
  FolderOpen,
  HardHat,
  Hotel,
  LogOut,
  Plane,
  PlaneLanding,
  ScrollText,
  Settings,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";

const PLANNING_ITEMS = [
  { label: "Lineup", href: "/lineup", icon: CalendarDays },
  { label: "Artists", href: "/artists", icon: Users },
  { label: "Crew", href: "/crew", icon: HardHat },
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "Hotels", href: "/hotels", icon: Hotel },
  { label: "Ground", href: "/ground", icon: Car },
  { label: "Riders", href: "/riders", icon: ScrollText },
  { label: "Contracts", href: "/contracts", icon: FileSignature },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Guestlist", href: "/guestlist", icon: Ticket },
  { label: "Documents", href: "/documents", icon: FolderOpen },
] as const;

const FESTIVAL_ITEMS = [
  { label: "Now", href: "/festival/now", icon: Activity },
  { label: "Pickups", href: "/festival/pickups", icon: Car },
  { label: "Arrivals", href: "/festival/arrivals", icon: PlaneLanding },
  { label: "Issues", href: "/festival/issues", icon: AlertTriangle },
  { label: "Roadsheets", href: "/festival/roadsheets", icon: User },
] as const;

interface Props {
  userEmail: string;
  festivalMode: boolean;
}

export default function Sidebar({ userEmail, festivalMode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  // Planning submenu is collapsed by default in festival mode, expanded
  // otherwise.
  const [planningOpen, setPlanningOpen] = useState(!festivalMode);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  const items = festivalMode ? FESTIVAL_ITEMS : PLANNING_ITEMS;

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen border-r border-[--color-border] bg-[--color-surface]">
      {/* Wordmark */}
      <Link
        href={(festivalMode ? "/festival/now" : "/lineup") as Route}
        className="h-14 flex items-center px-5 border-b border-[--color-border] shrink-0"
      >
        <span className="text-display text-[17px] leading-none text-[--color-fg]">
          GreenRoom
        </span>
        <span
          className={`ml-2 text-[9px] font-semibold border rounded-md px-[5px] py-[2px] leading-none uppercase tracking-[0.12em] ${
            festivalMode
              ? "text-mint border-[--color-brand]/60"
              : "text-brand border-brand/40"
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {festivalMode ? "Live" : "Stages"}
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-px overflow-y-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href as Route}
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

        {/* In festival mode, planning modules are still reachable under a
            collapsible "Planning" section so the operator can edit / fix
            things if needed. */}
        {festivalMode && (
          <>
            <button
              type="button"
              onClick={() => setPlanningOpen((v) => !v)}
              className="mt-3 flex items-center gap-2.5 px-3 py-[7px] text-[11px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {planningOpen ? (
                <ChevronDown className="w-[12px] h-[12px]" />
              ) : (
                <ChevronRight className="w-[12px] h-[12px]" />
              )}
              <span>Planning</span>
            </button>
            {planningOpen &&
              PLANNING_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href as Route}
                    className={[
                      "relative flex items-center gap-2.5 pl-7 pr-3 py-[5px] text-[12px] rounded-md transition-colors",
                      active
                        ? "text-[--color-fg] bg-[--color-surface-raised]"
                        : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface-raised]/60",
                    ].join(" ")}
                  >
                    <Icon className="w-[13px] h-[13px] shrink-0" />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
          </>
        )}

        {/* Settings always visible at the bottom of the nav. */}
        <Link
          href="/settings"
          className={[
            "mt-3 relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-md transition-colors",
            isActive("/settings")
              ? "text-[--color-fg] bg-[--color-surface-raised]"
              : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface-raised]/60",
          ].join(" ")}
        >
          <Settings className="w-[15px] h-[15px] shrink-0" />
          <span className="flex-1">Settings</span>
        </Link>
      </nav>

      {/* User + sign out */}
      <div className="shrink-0 px-2 pb-4 pt-3 border-t border-[--color-border] space-y-1">
        <div
          className="px-3 py-1 text-[11px] text-[--color-fg-subtle] truncate"
          title={userEmail}
        >
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
