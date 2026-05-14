"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { signOut } from "@/lib/auth-client";
import {
  Activity,
  AlertTriangle,
  Car,
  ChevronDown,
  ChevronRight,
  FileSignature,
  FolderOpen,
  HardHat,
  Hotel,
  LayoutDashboard,
  LogOut,
  Plane,
  PlaneLanding,
  ScrollText,
  Settings,
  Ticket,
  User,
  Users,
  CalendarDays,
  Wallet,
} from "lucide-react";

const MAIN_ITEMS = [
  { label: "Home", href: "/home", icon: LayoutDashboard },
  { label: "Lineup", href: "/lineup", icon: CalendarDays },
  { label: "Artists", href: "/artists", icon: Users },
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "Hotels", href: "/hotels", icon: Hotel },
  { label: "Ground", href: "/ground", icon: Car },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Guestlist", href: "/guestlist", icon: Ticket },
] as const;

const MORE_ITEMS = [
  { label: "Crew", href: "/crew", icon: HardHat },
  { label: "Riders", href: "/riders", icon: ScrollText },
  { label: "Contracts", href: "/contracts", icon: FileSignature },
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const anyMoreActive = MORE_ITEMS.some((item) => isActive(item.href));
  const [moreOpen, setMoreOpen] = useState(anyMoreActive);
  const [planningOpen, setPlanningOpen] = useState(!festivalMode);

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen border-r border-[--color-border] bg-[--color-surface]">
      {/* Wordmark */}
      <Link
        href={(festivalMode ? "/festival/now" : "/home") as Route}
        className="h-12 flex items-center px-5 border-b border-[--color-border] shrink-0"
      >
        <span className="text-[13px] font-bold tracking-tight text-[--color-fg] leading-none">
          Green<span className="text-brand">[Room]</span>
        </span>
        <span
          className="ml-1.5 text-[9px] font-semibold border rounded-xs px-1.25 py-0.5 leading-none uppercase tracking-[0.12em] text-brand border-[--color-brand]/40"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {festivalMode ? "Live" : "Stages"}
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-px overflow-y-auto">
        {festivalMode ? (
          <>
            {FESTIVAL_ITEMS.map(({ label, href, icon: Icon }) => (
              <NavItem
                key={href}
                label={label}
                href={href}
                icon={Icon}
                active={isActive(href)}
              />
            ))}

            {/* Planning submenu — still reachable in festival mode */}
            <button
              type="button"
              onClick={() => setPlanningOpen((v) => !v)}
              className="mt-3 flex items-center gap-2.5 px-3 py-[6px] text-[11px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {planningOpen ? (
                <ChevronDown className="w-[12px] h-[12px]" />
              ) : (
                <ChevronRight className="w-[12px] h-[12px]" />
              )}
              Planning
            </button>
            {planningOpen &&
              MAIN_ITEMS.map(({ label, href, icon: Icon }) => (
                <NavItem
                  key={href}
                  label={label}
                  href={href}
                  icon={Icon}
                  active={isActive(href)}
                  dense
                />
              ))}
          </>
        ) : (
          <>
            {MAIN_ITEMS.map(({ label, href, icon: Icon }) => (
              <NavItem
                key={href}
                label={label}
                href={href}
                icon={Icon}
                active={isActive(href)}
              />
            ))}

            {/* More — Crew, Riders, Contracts, Documents */}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="mt-2 flex items-center gap-2.5 px-3 py-[6px] text-[11px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {moreOpen ? (
                <ChevronDown className="w-[12px] h-[12px]" />
              ) : (
                <ChevronRight className="w-[12px] h-[12px]" />
              )}
              More
            </button>
            {moreOpen &&
              MORE_ITEMS.map(({ label, href, icon: Icon }) => (
                <NavItem
                  key={href}
                  label={label}
                  href={href}
                  icon={Icon}
                  active={isActive(href)}
                  dense
                />
              ))}
          </>
        )}

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

function NavItem({
  label,
  href,
  icon: Icon,
  active,
  dense,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  dense?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={[
        "relative flex items-center gap-2.5 rounded-md transition-colors",
        dense ? "pl-7 pr-3 py-[5px] text-[12px]" : "px-3 py-[7px] text-[13px]",
        active
          ? "text-[--color-fg] bg-[--color-surface-raised]"
          : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-[--color-surface-raised]/60",
      ].join(" ")}
    >
      {active && (
        <span className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-brand" />
      )}
      <Icon
        className={
          dense ? "w-[13px] h-[13px] shrink-0" : "w-[15px] h-[15px] shrink-0"
        }
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
