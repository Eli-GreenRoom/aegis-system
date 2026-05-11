"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/permissions";
import type { PermissionMap } from "@/lib/permissions";

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  inviteToken: string | null;
  acceptedAt: Date | null;
}

interface SettingsTabsProps {
  workspaceId: string;
  workspaceName: string;
  festivalName?: string;
  role: string;
  memberId: string;
  permissions: PermissionMap;
  members: MemberRow[];
}

type Tab = "workspace" | "team";

export function SettingsTabs({
  workspaceName,
  memberId,
  permissions,
  members: initialMembers,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>("workspace");
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Remove member state
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteUrl("");
    setInviteBusy(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviteBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setInviteError(body.error ?? "Couldn't send invite.");
      return;
    }
    const body = await res.json();
    setInviteUrl(body.inviteUrl ?? "");
    setInviteEmail("");
    // Add pending member to local list
    if (body.member) {
      setMembers((prev) => [...prev, body.member as MemberRow]);
    }
    // Auto-clear after 30s
    setTimeout(() => setInviteUrl(""), 30_000);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabBtn = (t: Tab, label: string) =>
    tab === t
      ? `text-[--color-fg] border-b border-brand pb-1`
      : `text-[--color-fg-muted] pb-1`;

  return (
    <div className="px-6 py-6 max-w-2xl">
      {/* Tab strip */}
      <div className="flex gap-6 mb-8 border-b border-[--color-border]">
        <button
          type="button"
          className={`text-sm pb-2 -mb-px ${tabBtn("workspace", "Workspace")}`}
          onClick={() => setTab("workspace")}
        >
          Workspace
        </button>
        <button
          type="button"
          className={`text-sm pb-2 -mb-px ${tabBtn("team", "Team")}`}
          onClick={() => setTab("team")}
        >
          Team
        </button>
      </div>

      {/* Workspace tab */}
      {tab === "workspace" && (
        <section className="space-y-4">
          <h2 className="text-[--color-fg] text-sm font-medium">Workspace</h2>
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <p
              id="ws-name"
              className="text-sm text-[--color-fg] px-3 py-2 rounded-md border border-[--color-border] bg-[--color-surface]/40"
            >
              {workspaceName}
            </p>
          </div>
          <p className="text-sm text-[--color-fg-muted] mt-4">
            Workspace settings editing coming in a later update.
          </p>
        </section>
      )}

      {/* Team tab */}
      {tab === "team" && (
        <section className="space-y-8">
          {/* Invite form */}
          {permissions["workspace.team"] && (
            <div className="space-y-4">
              <h2 className="text-[--color-fg] text-sm font-medium">
                Invite a team member
              </h2>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(
                          e.target.value as "admin" | "member" | "viewer",
                        )
                      }
                      className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                {inviteError && (
                  <p className="text-xs text-coral">{inviteError}</p>
                )}
                <Button type="submit" disabled={inviteBusy}>
                  {inviteBusy ? "Sending…" : "Invite"}
                </Button>
              </form>

              {/* Invite URL copy box */}
              {inviteUrl && (
                <div className="space-y-1">
                  <Label>Invite link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteUrl} className="flex-1" />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopy}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-xs text-[--color-fg-muted]">
                    Share this link to let them join. Expires after use.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Member list */}
          <div className="space-y-2">
            <h2 className="text-[--color-fg] text-sm font-medium">
              Team members
            </h2>
            <ul className="divide-y divide-[--color-border]">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    {m.status === "pending" ? (
                      <>
                        <p className="text-sm text-[--color-fg-muted]">
                          Invite pending
                        </p>
                        <p className="text-xs text-[--color-fg-muted]">
                          {m.email}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[--color-fg] truncate">
                          {m.name ?? m.email}
                          {m.id === memberId && (
                            <span className="ml-2 text-xs text-[--color-fg-muted]">
                              (you)
                            </span>
                          )}
                        </p>
                        {m.name && (
                          <p className="text-xs text-[--color-fg-muted]">
                            {m.email}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[--color-fg-muted]">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    <StatusBadge status={m.status} />
                    {permissions["workspace.team"] && m.id !== memberId && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-coral hover:text-coral px-2 py-1"
                        disabled={removingId === m.id}
                        onClick={() => handleRemove(m.id)}
                      >
                        {removingId === m.id ? "Removing…" : "Remove"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="text-xs text-brand font-medium uppercase tracking-wide">
        Active
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="text-xs text-coral font-medium uppercase tracking-wide">
        Suspended
      </span>
    );
  }
  return (
    <span className="text-xs text-[--color-fg-muted] font-medium uppercase tracking-wide">
      Pending
    </span>
  );
}
