"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  endpoint: "/api/ai/parse-invoice" | "/api/ai/parse-flight";
  /** Multipart endpoint accepting PDF/image. When provided, shown as the
   *  primary upload zone. For invoice mode set fileOnly=true to hide
   *  the text fallback entirely. */
  pdfEndpoint?: "/api/ai/parse-flight-pdf" | "/api/ai/parse-invoice-pdf";
  /** When true, hides the text paste area — file upload is the only input. */
  fileOnly?: boolean;
  onApply: (
    parsed: Record<string, unknown> | Record<string, unknown>[],
    sourceFile?: File,
  ) => void;
  onClose: () => void;
}

export default function AIParseDialog({
  title,
  endpoint,
  pdfEndpoint,
  fileOnly,
  onApply,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<
    Record<string, unknown> | Record<string, unknown>[] | null
  >(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  async function runFileParse(file: File) {
    if (!pdfEndpoint) return;
    setError("");
    setBusy(true);
    setUploadedFile(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(pdfEndpoint, { method: "POST", body: fd });
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
    onApply(parsed, uploadedFile ?? undefined);
    onClose();
  }

  const acceptAttr = fileOnly
    ? "application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "application/pdf,.pdf";

  const dropZoneHint = fileOnly
    ? "PDF or image (jpg, png, webp)"
    : "Airline ticket PDF — Claude extracts both legs";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border border-[--color-border-strong] bg-[--color-bg] shadow-2xl p-6 space-y-5 max-h-[88vh] overflow-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[--color-fg]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[--color-fg-muted] hover:text-[--color-fg] transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!parsed ? (
          <>
            {/* File upload zone */}
            {pdfEndpoint && (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[--color-border-strong] bg-[--color-surface]/30 px-4 py-8 cursor-pointer hover:border-[--color-brand]/50 hover:bg-[--color-surface]/50 transition-colors">
                <span className="text-2xl text-[--color-fg-muted]">↑</span>
                <span className="text-sm font-medium text-[--color-fg]">
                  {busy && uploadedFile
                    ? "Parsing…"
                    : "Drop file or click to upload"}
                </span>
                {uploadedFile ? (
                  <span className="text-mono text-[11px] text-[--color-brand]">
                    {uploadedFile.name}
                  </span>
                ) : (
                  <span className="text-xs text-[--color-fg-muted]">
                    {dropZoneHint}
                  </span>
                )}
                <input
                  type="file"
                  accept={acceptAttr}
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void runFileParse(f);
                  }}
                />
              </label>
            )}

            {/* Text fallback — hidden in fileOnly mode */}
            {!fileOnly && (
              <div className="relative">
                {pdfEndpoint && (
                  <div className="absolute inset-x-0 -top-2.5 flex justify-center">
                    <span className="bg-[--color-bg] px-2 text-[10px] uppercase tracking-widest text-[--color-fg-muted]">
                      or paste text
                    </span>
                  </div>
                )}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={pdfEndpoint ? 6 : 10}
                  placeholder="Paste email body or confirmation text…"
                  className="w-full rounded-lg border border-[--color-border-strong] bg-[--color-surface]/40 px-3 py-2.5 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-[--color-brand] focus:outline-none focus:ring-1 focus:ring-[--color-brand] resize-none"
                />
                <span className="absolute bottom-2 right-3 text-mono text-[10px] text-[--color-fg-subtle]">
                  {text.length}/50 000
                </span>
              </div>
            )}

            {error && (
              <p className="rounded-md bg-coral/10 border border-coral/30 px-3 py-2 text-xs text-coral">
                {error}
              </p>
            )}

            {/* Text parse button — only shown when text area is visible */}
            {!fileOnly && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={runParse}
                  loading={busy}
                  disabled={text.trim().length < 20 || busy}
                >
                  {busy ? "Parsing…" : "Parse"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            )}

            {fileOnly && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-[--color-fg-muted]">
              Review the extracted fields — click{" "}
              <span className="text-[--color-brand]">Apply</span> to fill the
              form. You can edit anything before saving.
            </p>
            {Array.isArray(parsed) ? (
              <div className="space-y-3">
                {parsed.map((leg, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[--color-border] bg-[--color-surface]/40 p-4"
                  >
                    <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-[--color-fg-subtle] mb-3">
                      Leg {idx + 1}
                      {typeof leg.direction === "string"
                        ? ` · ${leg.direction}`
                        : ""}
                    </p>
                    <ParsedFields fields={leg} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[--color-border] bg-[--color-surface]/40 p-4">
                <ParsedFields fields={parsed} />
              </div>
            )}
            {error && (
              <p className="rounded-md bg-coral/10 border border-coral/30 px-3 py-2 text-xs text-coral">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
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
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ParsedFields({ fields }: { fields: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {Object.entries(fields).map(([k, v]) => (
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
  );
}
