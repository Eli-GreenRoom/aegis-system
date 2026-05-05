"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Display label, e.g. "Parse invoice with AI". */
  title: string;
  /** Endpoint to POST `{text}` to. */
  endpoint: "/api/ai/parse-invoice" | "/api/ai/parse-flight";
  /** Called when the operator clicks "Apply" on a parse result. The
   *  parent form decides which fields to map and how. */
  onApply: (parsed: Record<string, unknown>) => void;
  onClose: () => void;
}

/**
 * Reusable AI-parse dialog. Paste an email body or extracted PDF text,
 * hit Parse, see the structured JSON, click Apply to fill the parent
 * form. The AI never writes to the DB - this dialog only returns the
 * parsed shape to the parent's `onApply`. Operator submits the parent
 * form normally to persist.
 */
export default function AIParseDialog({
  title,
  endpoint,
  onApply,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runParse() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Parse failed (${res.status})`);
        return;
      }
      const body = await res.json();
      setParsed(body.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  }

  function applyAndClose() {
    if (!parsed) return;
    onApply(parsed);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-[--color-bg]/70 flex items-center justify-center px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-md border border-[--color-border-strong] bg-[--color-surface] p-5 space-y-4 max-h-[90vh] overflow-auto"
      >
        <h2 className="text-[15px] text-[--color-fg]">{title}</h2>

        {!parsed ? (
          <>
            <p className="text-xs text-[--color-fg-muted]">
              Paste the email body or the document text. Claude extracts the
              structured fields; you confirm before saving.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste here..."
              className="w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand]"
            />
            {error && <p className="text-xs text-coral">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={runParse}
                disabled={busy || text.trim().length < 20}
              >
                {busy ? "Parsing..." : "Parse"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <span className="text-mono text-[10px] text-[--color-fg-subtle] ml-auto">
                {text.length}/50000
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[--color-fg-muted]">
              Review the extracted fields. Click <span className="text-brand">Apply</span> to
              fill the form below; you can still edit anything before saving.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(parsed).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-mono text-[10px] uppercase tracking-[0.16em] text-[--color-fg-subtle] self-center">
                    {k}
                  </dt>
                  <dd className="text-[--color-fg] text-mono text-xs break-all">
                    {v === null || v === undefined ? (
                      <span className="text-[--color-fg-subtle]">null</span>
                    ) : typeof v === "object" ? (
                      <pre className="text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(v, null, 2)}
                      </pre>
                    ) : (
                      String(v)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center gap-2 pt-2">
              <Button type="button" onClick={applyAndClose}>
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setParsed(null);
                  setError("");
                }}
              >
                Re-parse
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
