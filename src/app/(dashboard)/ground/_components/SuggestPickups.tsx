"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SuggestedPickup } from "@/lib/ground/suggest";
import type { Person } from "@/lib/people";

interface Props {
  people: Person[];
  defaultPerson?: { id: string; kind: "artist" | "crew" };
  initialSuggestions?: SuggestedPickup[];
  initialHotelName?: string | null;
  /** Called after transfers are created — used by the side panel to refresh. */
  onSuccess?: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  airport: "Airport",
  hotel: "Hotel",
  stage: "Venue",
};

interface StepState {
  pickup: SuggestedPickup;
  pickupDtLocal: string;
  status: "pending" | "confirmed" | "skipped";
  editing: boolean;
}

function buildSteps(suggestions: SuggestedPickup[]): StepState[] {
  return suggestions.map((s) => ({
    pickup: s,
    pickupDtLocal: s.pickupDtLocal.slice(0, 16),
    status: "pending",
    editing: false,
  }));
}

export default function SuggestPickups({
  people,
  defaultPerson,
  initialSuggestions,
  initialHotelName,
  onSuccess,
}: Props) {
  const router = useRouter();

  const initialPerson = defaultPerson
    ? `${defaultPerson.kind}:${defaultPerson.id}`
    : people[0]
      ? `${people[0].kind}:${people[0].id}`
      : "";

  const [selectedPerson, setSelectedPerson] = useState(initialPerson);
  const [steps, setSteps] = useState<StepState[]>(
    initialSuggestions ? buildSteps(initialSuggestions) : [],
  );
  const [hotelName, setHotelName] = useState<string | null>(initialHotelName ?? null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fetchedOnMount = useRef(false);

  async function fetchSuggestions(personValue: string) {
    setError("");
    const [kind, id] = personValue.split(":");
    if (!id) return;
    setLoading(true);
    setSteps([]);
    setStepIndex(0);
    setDone(false);
    try {
      const res = await fetch(
        `/api/ground/suggest?personId=${id}&personKind=${kind}`,
      );
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Couldn't load."); return; }
      setSteps(buildSteps(body.suggestions as SuggestedPickup[]));
      setHotelName(body.hotelName ?? null);
    } catch {
      setError("Couldn't load suggestions.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount when no server-side suggestions were provided
  // (side-panel usage). useEffect is safe here because fetchSuggestions
  // is async — setState only fires after the await, not synchronously.
  useEffect(() => {
    if (!initialSuggestions && initialPerson && !fetchedOnMount.current) {
      fetchedOnMount.current = true;
      void fetchSuggestions(initialPerson);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(index: number, update: Partial<StepState>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  }

  function confirm(index: number) {
    patch(index, { status: "confirmed", editing: false });
    advance(index);
  }

  function skip(index: number) {
    patch(index, { status: "skipped", editing: false });
    advance(index);
  }

  function advance(fromIndex: number) {
    const next = fromIndex + 1;
    if (next >= steps.length) setDone(true);
    else setStepIndex(next);
  }

  function goBack() {
    if (stepIndex === 0) return;
    patch(stepIndex - 1, { status: "pending" });
    setStepIndex(stepIndex - 1);
    setDone(false);
  }

  async function createConfirmed() {
    const [kind, id] = selectedPerson.split(":");
    const confirmed = steps.filter((s) => s.status === "confirmed");
    if (confirmed.length === 0) {
      if (onSuccess) { onSuccess(); } else { router.push("/ground"); }
      return;
    }
    setSaving(true);
    setError("");
    try {
      const results = await Promise.all(
        confirmed.map((s) =>
          fetch("/api/pickups", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              personKind: kind,
              personId: id,
              routeFrom: s.pickup.routeFrom,
              routeTo: s.pickup.routeTo,
              pickupDt: new Date(s.pickupDtLocal).toISOString(),
              linkedFlightId: s.pickup.linkedFlightId ?? undefined,
              status: "scheduled",
            }),
          }).then((r) => r.json()),
        ),
      );
      if (onSuccess) {
        router.refresh();
        onSuccess();
      } else {
        const firstId = results[0]?.pickup?.id;
        router.push(firstId ? `/ground/${firstId}` : "/ground");
        router.refresh();
      }
    } catch {
      setError("Some pickups couldn't be saved.");
    } finally {
      setSaving(false);
    }
  }

  const current = steps[stepIndex];
  const confirmedCount = steps.filter((s) => s.status === "confirmed").length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return <p className="text-sm text-[--color-fg-muted]">Loading transfers…</p>;
  }

  // ── No suggestions ───────────────────────────────────────────────────────
  if (steps.length === 0) {
    return (
      <div className="space-y-3">
        <PersonRow people={people} value={selectedPerson} onChange={(v) => { setSelectedPerson(v); void fetchSuggestions(v); }} />
        <p className="text-sm text-[--color-fg-muted] py-2">
          No suggestions — add flights and a hotel booking first.
        </p>
      </div>
    );
  }

  // ── Summary screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="space-y-4">
        <PersonRow people={people} value={selectedPerson} onChange={(v) => { setSelectedPerson(v); void fetchSuggestions(v); }} />

        <div className="space-y-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[--color-border] last:border-0">
              <span className={`text-base leading-none ${s.status === "confirmed" ? "text-[--color-brand]" : "text-[--color-fg-subtle]"}`}>
                {s.status === "confirmed" ? "✓" : "—"}
              </span>
              <div className="flex-1">
                <span className={`text-sm ${s.status === "skipped" ? "line-through text-[--color-fg-muted]" : "text-[--color-fg]"}`}>
                  {ROUTE_LABELS[s.pickup.routeFrom]} → {ROUTE_LABELS[s.pickup.routeTo]}
                </span>
                {s.status === "confirmed" && (
                  <p className="text-mono text-[11px] text-[--color-fg-muted]">{s.pickupDtLocal}</p>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-[--color-fg-muted] hover:text-[--color-fg]"
                onClick={() => { patch(i, { status: "pending" }); setStepIndex(i); setDone(false); }}
              >
                edit
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" onClick={createConfirmed} disabled={saving}>
            {saving ? "Creating…" : confirmedCount === 0 ? "Done" : `Create ${confirmedCount} transfer${confirmedCount === 1 ? "" : "s"}`}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setStepIndex(0); setDone(false); setSteps(buildSteps(steps.map((s) => s.pickup))); }}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  // ── Step wizard ──────────────────────────────────────────────────────────
  if (!current) return null;

  return (
    <div className="space-y-4">
      <PersonRow people={people} value={selectedPerson} onChange={(v) => { setSelectedPerson(v); void fetchSuggestions(v); }} />

      {/* Step dots */}
      <div className="flex gap-1.5 items-center">
        {steps.map((s, i) => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-colors ${
            i < stepIndex
              ? s.status === "confirmed" ? "bg-[--color-brand]" : "bg-[--color-border-strong]"
              : i === stepIndex ? "bg-[--color-brand]/40" : "bg-[--color-border]"
          }`} />
        ))}
      </div>

      {/* Card */}
      <div className="rounded-xl border border-[--color-border-strong] bg-[--color-surface]/50 overflow-hidden">

        {/* Title row */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-[10px] text-mono uppercase tracking-widest text-[--color-fg-muted] mb-1">
            {stepIndex + 1} / {steps.length}{hotelName ? ` · ${hotelName}` : ""}
          </p>
          <p className="text-xl font-semibold text-[--color-fg]">
            {ROUTE_LABELS[current.pickup.routeFrom]}
            <span className="text-[--color-fg-muted] font-normal mx-2">→</span>
            {ROUTE_LABELS[current.pickup.routeTo]}
          </p>
          <p className="text-xs text-[--color-fg-muted] mt-1">{current.pickup.reason}</p>
        </div>

        {/* Time — big tap target, editable inline */}
        <div className="px-5 pb-4">
          {current.editing ? (
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                step={60}
                value={current.pickupDtLocal}
                onChange={(e) => patch(stepIndex, { pickupDtLocal: e.target.value })}
                className="max-w-55 text-sm"
                autoFocus
              />
              <button
                type="button"
                className="text-xs text-[--color-brand] hover:underline"
                onClick={() => patch(stepIndex, { editing: false })}
              >
                done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => patch(stepIndex, { editing: true })}
              className="group flex items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-surface] px-4 py-2.5 hover:border-[--color-brand]/50 transition-colors"
            >
              <span className="text-sm font-mono text-[--color-fg]">
                {current.pickupDtLocal}
              </span>
              <span className="text-[10px] text-[--color-fg-subtle] group-hover:text-[--color-brand] transition-colors">
                edit
              </span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 flex items-center gap-2">
          {stepIndex > 0 && (
            <button type="button" onClick={goBack} className="text-xs text-[--color-fg-muted] hover:text-[--color-fg] mr-auto">
              ← back
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="ghost" onClick={() => skip(stepIndex)}>
              Skip
            </Button>
            <Button type="button" onClick={() => confirm(stepIndex)}>
              {stepIndex === steps.length - 1 ? "Confirm & finish" : "Confirm →"}
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}

function PersonRow({
  people,
  value,
  onChange,
}: {
  people: Person[];
  value: string;
  onChange: (v: string) => void;
}) {
  // Render as pill buttons instead of a dropdown when ≤6 people
  if (people.length <= 6) {
    return (
      <div className="flex flex-wrap gap-2">
        {people.map((p) => {
          const v = `${p.kind}:${p.id}`;
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                active
                  ? "bg-[--color-brand] border-[--color-brand] text-[--color-brand-fg]"
                  : "border-[--color-border-strong] text-[--color-fg-muted] hover:border-[--color-brand]/50 hover:text-[--color-fg]"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
    >
      {people.map((p) => (
        <option key={`${p.kind}:${p.id}`} value={`${p.kind}:${p.id}`}>
          {p.name} ({p.kind})
        </option>
      ))}
    </select>
  );
}
