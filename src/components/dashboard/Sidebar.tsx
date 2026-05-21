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
  Menu,
  Plane,
  PlaneLanding,
  ScrollText,
  Settings,
  Ticket,
  User,
  Users,
  CalendarDays,
  Wallet,
  X,
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

// Primary items shown in the mobile bottom nav (4 items + overflow drawer).
const MOBILE_MAIN = [
  { label: "Home", href: "/home", icon: LayoutDashboard },
  { label: "Lineup", href: "/lineup", icon: CalendarDays },
  { label: "Artists", href: "/artists", icon: Users },
  { label: "Flights", href: "/flights", icon: Plane },
] as const;

const MOBILE_FESTIVAL = [
  { label: "Now", href: "/festival/now", icon: Activity },
  { label: "Pickups", href: "/festival/pickups", icon: Car },
  { label: "Arrivals", href: "/festival/arrivals", icon: PlaneLanding },
  { label: "Issues", href: "/festival/issues", icon: AlertTriangle },
] as const;

interface Props {
  userEmail: string;
  festivalMode: boolean;
}

export default function Sidebar({ userEmail, festivalMode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const mobileItems = festivalMode ? MOBILE_FESTIVAL : MOBILE_MAIN;

  return (
    <>
      {/* ── Desktop rail (md+) ───────────────────────────────────────── */}
      <aside className="hidden md:flex w-55 shrink-0 flex-col h-screen border-r border-[--color-border] bg-[--color-surface]">
        <Link
          href={(festivalMode ? "/festival/now" : "/home") as Route}
          className="h-12 flex items-center px-5 border-b border-[--color-border] shrink-0"
        >
          <Wordmark festivalMode={festivalMode} />
        </Link>

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
              <button
                type="button"
                onClick={() => setPlanningOpen((v) => !v)}
                className="mt-3 flex items-center gap-2.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {planningOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
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
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="mt-2 flex items-center gap-2.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {moreOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
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
              "mt-3 relative flex items-center gap-2.5 px-3 py-1.75 text-[13px] rounded-md transition-colors",
              isActive("/settings")
                ? "text-[--color-fg] bg-[linear-gradient(90deg,rgba(52,211,153,0.16),transparent_60%)] shadow-[0_0_6px_var(--color-brand-glow)]"
                : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-white/4",
            ].join(" ")}
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <Settings className="w-3.75 h-3.75 shrink-0" />
            <span className="flex-1">Settings</span>
          </Link>
        </nav>

        <div className="shrink-0 px-2 pb-4 pt-3 border-t border-[--color-border] space-y-1">
          <div
            className="px-3 py-1 text-[11px] text-[--color-fg-subtle] truncate"
            title={userEmail}
          >
            {userEmail}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-1.75 text-[13px] text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-white/4 rounded-[--radius-md] w-full transition-colors text-left"
          >
            <LogOut className="w-3.75 h-3.75 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav (<md) ───────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-[--color-border] bg-[--color-surface]/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href as Route}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "text-brand"
                  : "text-[--color-fg-subtle] hover:text-[--color-fg-muted]",
              ].join(" ")}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {active && (
                <span className="absolute top-0 inset-x-0 h-0.5 rounded-b-full bg-brand shadow-[0_0_6px_var(--color-brand-glow)] w-8 mx-auto" />
              )}
              <Icon className="w-4.5 h-4.5" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* More button opens full drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] uppercase tracking-[0.12em] text-[--color-fg-subtle] hover:text-[--color-fg-muted] transition-colors"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <Menu className="w-4.5 h-4.5" />
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile full-screen drawer ─────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-[--color-border] bg-[--color-surface] p-4"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <Wordmark festivalMode={festivalMode} />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-[--color-fg-muted] hover:text-[--color-fg]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(festivalMode
                ? [...FESTIVAL_ITEMS, ...MAIN_ITEMS]
                : [...MAIN_ITEMS, ...MORE_ITEMS]
              ).map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href as Route}
                    onClick={() => setDrawerOpen(false)}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-lg p-3 text-[10px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-[linear-gradient(135deg,rgba(52,211,153,0.16),transparent)] text-brand border border-[--color-brand]/20"
                        : "text-[--color-fg-muted] hover:bg-white/4 border border-transparent",
                    ].join(" ")}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                );
              })}

              <Link
                href="/settings"
                onClick={() => setDrawerOpen(false)}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-lg p-3 text-[10px] uppercase tracking-[0.12em] transition-colors",
                  isActive("/settings")
                    ? "bg-[linear-gradient(135deg,rgba(52,211,153,0.16),transparent)] text-brand border border-[--color-brand]/20"
                    : "text-[--color-fg-muted] hover:bg-white/4 border border-transparent",
                ].join(" ")}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-[--color-border] flex items-center justify-between">
              <span className="text-[11px] text-[--color-fg-subtle] truncate max-w-[70%]">
                {userEmail}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-[11px] text-[--color-fg-muted] hover:text-[--color-fg] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Wordmark({ festivalMode }: { festivalMode: boolean }) {
  return (
    <>
      <span className="text-[13px] font-bold tracking-tight text-[--color-fg] leading-none">
        Green<span className="text-brand">[Room]</span>
      </span>
      {festivalMode ? (
        <span
          className="ml-1.5 text-[9px] font-semibold rounded-xs px-1.25 py-0.5 leading-none uppercase tracking-[0.12em] pill-coral glow-coral"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Live
        </span>
      ) : (
        <span
          className="ml-1.5 text-[9px] font-semibold border rounded-xs px-1.25 py-0.5 leading-none uppercase tracking-[0.12em] text-brand border-[--color-brand]/40"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Stages
        </span>
      )}
    </>
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
          ? "text-[--color-fg] bg-[linear-gradient(90deg,rgba(52,211,153,0.16),transparent_60%)] shadow-[0_0_6px_var(--color-brand-glow)]"
          : "text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-white/4",
      ].join(" ")}
    >
      {active && (
        <span className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-brand shadow-[0_0_6px_var(--color-brand-glow)]" />
      )}
      <Icon
        className={dense ? "w-3.25 h-3.25 shrink-0" : "w-3.75 h-3.75 shrink-0"}
      />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
