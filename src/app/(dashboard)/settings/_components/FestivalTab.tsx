"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Preset colors for stage picker
const STAGE_COLOR_PRESETS = [
  "#E5B85A",
  "#7C9EFF",
  "#A78BFA",
  "#F472B6",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#64748b",
];

interface StageRow {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number;
  activeDates: string[] | null;
}

interface FestivalTabProps {
  festivalId: string;
  festivalName: string;
  startDate: string;
  endDate: string;
  location: string | null;
  description: string | null;
  stages: StageRow[];
  canEdit: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Generate all YYYY-MM-DD dates in [start, end] inclusive. */
function datesInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const cur = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (cur <= last) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- Stage form (add / edit) ----------

interface StageFormState {
  name: string;
  slug: string;
  color: string;
  activeDates: string[];
}

function StageForm({
  initial,
  festivalDates,
  onSave,
  onCancel,
  busy,
  error,
}: {
  initial: StageFormState;
  festivalDates: string[];
  onSave: (s: StageFormState) => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const [form, setForm] = useState<StageFormState>(initial);
  const [slugManual, setSlugManual] = useState(false);

  function setName(v: string) {
    setForm((f) => ({
      ...f,
      name: v,
      slug: slugManual ? f.slug : slugify(v),
    }));
  }

  function toggleDate(d: string) {
    setForm((f) => {
      const cur = f.activeDates;
      return {
        ...f,
        activeDates: cur.includes(d)
          ? cur.filter((x) => x !== d)
          : [...cur, d].sort(),
      };
    });
  }

  return (
    <div className="space-y-4 rounded-md border border-[--color-border] bg-[--color-surface]/40 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="stage-name">Name</Label>
          <Input
            id="stage-name"
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main Stage"
            maxLength={120}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stage-slug">Slug</Label>
          <Input
            id="stage-slug"
            value={form.slug}
            onChange={(e) => {
              setSlugManual(true);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
            placeholder="main-stage"
          />
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2 items-center">
          {STAGE_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                background: c,
                borderColor: form.color === c ? "white" : "transparent",
                outline:
                  form.color === c ? "2px solid var(--color-brand)" : "none",
              }}
            />
          ))}
          <Input
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            placeholder="#RRGGBB"
            className="w-28 font-mono text-xs"
            maxLength={7}
          />
          {form.color && /^#[0-9A-Fa-f]{6}$/.test(form.color) && (
            <span
              className="inline-block w-6 h-6 rounded-full border border-[--color-border]"
              style={{ background: form.color }}
            />
          )}
        </div>
      </div>

      {/* Active dates */}
      {festivalDates.length > 0 && (
        <div className="space-y-2">
          <Label>
            Active dates{" "}
            <span className="text-[--color-fg-muted] font-normal">
              (leave all unselected = active every day)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {festivalDates.map((d) => {
              const on = form.activeDates.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDate(d)}
                  className={`rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                    on
                      ? "bg-brand/20 border-brand text-brand"
                      : "border-[--color-border] text-[--color-fg-muted] hover:border-[--color-border-strong]"
                  }`}
                >
                  {formatDate(d)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-coral">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy || !form.name.trim() || !form.slug.trim()}
          onClick={() => onSave(form)}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------- Main FestivalTab ----------

export function FestivalTab({
  festivalId,
  festivalName: initialName,
  startDate: initialStart,
  endDate: initialEnd,
  location: initialLocation,
  description: initialDescription,
  stages: initialStages,
  canEdit,
}: FestivalTabProps) {
  // Festival fields
  const [name, setName] = useState(initialName);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [location, setLocation] = useState(initialLocation ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [festBusy, setFestBusy] = useState(false);
  const [festError, setFestError] = useState("");
  const [festSaved, setFestSaved] = useState(false);

  // Stages list
  const [stages, setStages] = useState<StageRow[]>(initialStages);
  const [addingStage, setAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const festivalDates = datesInRange(startDate, endDate);

  async function saveFestival(e: React.FormEvent) {
    e.preventDefault();
    setFestError("");
    setFestSaved(false);
    if (endDate < startDate) {
      setFestError("End date must be on or after start date.");
      return;
    }
    setFestBusy(true);
    const res = await fetch(`/api/festivals/${festivalId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        startDate,
        endDate,
        location: location || null,
        description: description || null,
      }),
    });
    setFestBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFestError(body.error ?? "Couldn't save festival.");
      return;
    }
    setFestSaved(true);
    setTimeout(() => setFestSaved(false), 3000);
  }

  async function addStage(form: StageFormState) {
    setStageBusy(true);
    setStageError("");
    const res = await fetch("/api/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        color: form.color || undefined,
        activeDates: form.activeDates,
        sortOrder: stages.length,
      }),
    });
    setStageBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStageError(body.error ?? "Couldn't add stage.");
      return;
    }
    const body = await res.json();
    setStages((prev) => [...prev, body.stage as StageRow]);
    setAddingStage(false);
    setStageError("");
  }

  async function editStage(id: string, form: StageFormState) {
    setStageBusy(true);
    setStageError("");
    const res = await fetch(`/api/stages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        color: form.color || undefined,
        activeDates: form.activeDates,
      }),
    });
    setStageBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStageError(body.error ?? "Couldn't update stage.");
      return;
    }
    const body = await res.json();
    setStages((prev) =>
      prev.map((s) => (s.id === id ? (body.stage as StageRow) : s)),
    );
    setEditingStageId(null);
    setStageError("");
  }

  async function removeStage(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/stages/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <section className="space-y-10">
      {/* Festival details */}
      <div className="space-y-4">
        <h2 className="text-[--color-fg] text-sm font-medium">
          Festival details
        </h2>
        <form onSubmit={saveFestival} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label htmlFor="fest-name">Name</Label>
            <Input
              id="fest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fest-start">Start date</Label>
              <Input
                id="fest-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fest-end">End date</Label>
              <Input
                id="fest-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fest-loc">Location</Label>
            <Input
              id="fest-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              maxLength={200}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fest-desc">Description</Label>
            <textarea
              id="fest-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this festival"
              maxLength={2000}
              rows={3}
              disabled={!canEdit}
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] placeholder:text-[--color-fg-muted] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand] disabled:opacity-50 resize-none"
            />
          </div>
          {festError && <p className="text-xs text-coral">{festError}</p>}
          {festSaved && <p className="text-xs text-brand">Changes saved.</p>}
          {canEdit && (
            <Button type="submit" disabled={festBusy}>
              {festBusy ? "Saving…" : "Save festival"}
            </Button>
          )}
        </form>
      </div>

      {/* Stages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[--color-fg] text-sm font-medium">Stages</h2>
          {canEdit && !addingStage && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAddingStage(true);
                setStageError("");
              }}
            >
              Add stage
            </Button>
          )}
        </div>

        {/* Existing stages */}
        <ul className="space-y-2">
          {stages.map((stage) =>
            editingStageId === stage.id ? (
              <li key={stage.id}>
                <StageForm
                  initial={{
                    name: stage.name,
                    slug: stage.slug,
                    color: stage.color ?? "",
                    activeDates: (stage.activeDates as string[] | null) ?? [],
                  }}
                  festivalDates={festivalDates}
                  onSave={(form) => editStage(stage.id, form)}
                  onCancel={() => {
                    setEditingStageId(null);
                    setStageError("");
                  }}
                  busy={stageBusy}
                  error={stageError}
                />
              </li>
            ) : (
              <li
                key={stage.id}
                className="flex items-center justify-between gap-4 rounded-md border border-[--color-border] px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {stage.color && /^#[0-9A-Fa-f]{6}$/i.test(stage.color) && (
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ background: stage.color }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-[--color-fg] truncate">
                      {stage.name}
                    </p>
                    <p className="text-xs text-[--color-fg-muted] font-mono">
                      {stage.slug}
                      {stage.activeDates &&
                        (stage.activeDates as string[]).length > 0 && (
                          <span className="ml-2">
                            {(stage.activeDates as string[])
                              .map(formatDate)
                              .join(", ")}
                          </span>
                        )}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs px-2 py-1"
                      onClick={() => {
                        setEditingStageId(stage.id);
                        setStageError("");
                        setAddingStage(false);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-coral hover:text-coral px-2 py-1"
                      disabled={removingId === stage.id}
                      onClick={() => removeStage(stage.id)}
                    >
                      {removingId === stage.id ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>

        {/* Add stage form */}
        {addingStage && (
          <StageForm
            initial={{ name: "", slug: "", color: "", activeDates: [] }}
            festivalDates={festivalDates}
            onSave={addStage}
            onCancel={() => {
              setAddingStage(false);
              setStageError("");
            }}
            busy={stageBusy}
            error={stageError}
          />
        )}
      </div>
    </section>
  );
}
