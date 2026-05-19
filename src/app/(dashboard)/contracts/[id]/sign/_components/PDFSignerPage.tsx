"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/ui/SignaturePad";

const RENDER_SCALE = 1.5;
const DEFAULT_WIDTH_PCT = 0.28;
const MIN_WIDTH_PCT = 0.08;

interface PageInfo {
  dataUrl: string;
  pdfW: number;
  pdfH: number;
  cssW: number;
  cssH: number;
}

interface Placement {
  pageIndex: number;
  xPct: number; // centre
  yPct: number; // centre
}

type Op =
  | {
      type: "drag";
      pageIndex: number;
      startCX: number;
      startCY: number;
      startXPct: number;
      startYPct: number;
      pageW: number;
      pageH: number;
    }
  | {
      type: "resize";
      pageIndex: number;
      startCX: number;
      startWidthPct: number;
      leftPct: number;
      pageW: number;
    };

interface Props {
  contractId: string;
  artistId: string;
  fileUrl: string;
  savedSignatureUrl: string | null;
  signerName: string | null;
}

export default function PDFSignerPage({
  contractId,
  artistId,
  fileUrl,
  savedSignatureUrl,
  signerName,
}: Props) {
  const router = useRouter();

  // Signature
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigMode, setSigMode] = useState<
    "loading" | "saved" | "draw" | "ready"
  >(savedSignatureUrl ? "loading" : "draw");

  // PDF
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [pdfError, setPdfError] = useState("");

  // Placement
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [widthPct, setWidthPct] = useState(DEFAULT_WIDTH_PCT);
  const [cursor, setCursor] = useState<Placement | null>(null);

  // Interaction
  const opRef = useRef<Op | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // ── Load saved signature ──────────────────────────────────────────
  useEffect(() => {
    if (!savedSignatureUrl) return;
    fetch(savedSignatureUrl)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        setSigDataUrl(dataUrl);
        setSigMode("ready");
      })
      .catch(() => setSigMode("draw"));
  }, [savedSignatureUrl]);

  // ── Load PDF ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjs.getDocument(fileUrl).promise;
        const result: PageInfo[] = [];

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const vp1 = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport: vp })
            .promise;
          if (cancelled) return;
          result.push({
            dataUrl: canvas.toDataURL("image/jpeg", 0.9),
            pdfW: vp1.width,
            pdfH: vp1.height,
            cssW: vp.width,
            cssH: vp.height,
          });
          setPages([...result]);
        }
      } catch (err) {
        if (!cancelled)
          setPdfError(
            err instanceof Error ? err.message : "Failed to load PDF",
          );
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // ── Global mouse events ───────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const op = opRef.current;
      if (!op) return;
      if (op.type === "drag") {
        setPlacement((p) =>
          p
            ? {
                ...p,
                xPct: clamp(
                  op.startXPct + (e.clientX - op.startCX) / op.pageW,
                  0.01,
                  0.99,
                ),
                yPct: clamp(
                  op.startYPct + (e.clientY - op.startCY) / op.pageH,
                  0.01,
                  0.99,
                ),
              }
            : p,
        );
      } else {
        const newW = Math.max(
          MIN_WIDTH_PCT,
          op.startWidthPct + (e.clientX - op.startCX) / op.pageW,
        );
        setWidthPct(newW);
        setPlacement((p) => (p ? { ...p, xPct: op.leftPct + newW / 2 } : p));
      }
    };
    const onUp = () => {
      opRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Page interaction ──────────────────────────────────────────────
  function onPageMove(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    if (opRef.current || placement || !sigDataUrl) return;
    const r = e.currentTarget.getBoundingClientRect();
    setCursor({
      pageIndex: idx,
      xPct: (e.clientX - r.left) / r.width,
      yPct: (e.clientY - r.top) / r.height,
    });
  }

  function onPageLeave() {
    if (!opRef.current) setCursor(null);
  }

  function onPageClick(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    if (placement || !sigDataUrl) return;
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPlacement({
      pageIndex: idx,
      xPct: (e.clientX - r.left) / r.width,
      yPct: (e.clientY - r.top) / r.height,
    });
    setCursor(null);
  }

  function onSigDrag(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    e.preventDefault();
    const el = pageRefs.current[idx];
    if (!el || !placement) return;
    const r = el.getBoundingClientRect();
    opRef.current = {
      type: "drag",
      pageIndex: idx,
      startCX: e.clientX,
      startCY: e.clientY,
      startXPct: placement.xPct,
      startYPct: placement.yPct,
      pageW: r.width,
      pageH: r.height,
    };
  }

  function onResizeDrag(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    e.preventDefault();
    const el = pageRefs.current[idx];
    if (!el || !placement) return;
    const r = el.getBoundingClientRect();
    opRef.current = {
      type: "resize",
      pageIndex: idx,
      startCX: e.clientX,
      startWidthPct: widthPct,
      leftPct: placement.xPct - widthPct / 2,
      pageW: r.width,
    };
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSign() {
    if (!sigDataUrl || !placement) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: sigDataUrl,
          placement: {
            pageIndex: placement.pageIndex,
            xPct: placement.xPct,
            yPct: placement.yPct,
            widthPct,
          },
          signerName: signerName ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Signing failed.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push(`/artists/${artistId}`), 1800);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full bg-mint/15 flex items-center justify-center">
          <span className="text-mint text-2xl">✓</span>
        </div>
        <p className="text-[15px] font-medium text-[--color-fg]">
          Contract signed
        </p>
        <p className="text-[13px] text-[--color-fg-muted]">
          Returning to artist page…
        </p>
      </div>
    );
  }

  const hasSignature = !!sigDataUrl && sigMode === "ready";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Top action bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[--color-border] shrink-0 flex-wrap">
        {/* Signature source */}
        {sigMode === "loading" && (
          <span className="text-xs text-[--color-fg-muted]">
            Loading signature…
          </span>
        )}
        {sigMode === "draw" && (
          <div className="flex-1 max-w-lg">
            <SignaturePad
              onSave={(d) => {
                setSigDataUrl(d);
                setSigMode("ready");
              }}
              onCancel={() => router.back()}
              saveLabel="Use this signature"
            />
          </div>
        )}
        {hasSignature && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[--color-fg-muted]">Signature:</span>
            <div className="bg-white rounded px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sigDataUrl!}
                alt="sig"
                className="h-8 object-contain"
                draggable={false}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSigDataUrl(null);
                setSigMode("draw");
                setPlacement(null);
              }}
              className="text-xs text-[--color-fg-muted] hover:text-[--color-fg] transition-colors"
            >
              Change
            </button>
          </div>
        )}

        <div className="flex-1" />

        {error && <span className="text-xs text-coral">{error}</span>}

        {hasSignature && (
          <div className="flex items-center gap-2">
            {placement && (
              <button
                type="button"
                onClick={() => setPlacement(null)}
                className="text-xs text-[--color-fg-muted] hover:text-[--color-fg] px-3 py-1.5 rounded-md border border-[--color-border] transition-colors"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleSign}
              disabled={!placement || submitting}
              className="text-sm font-medium px-4 py-1.5 rounded-md bg-[--color-brand] text-[#0E0E10] hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {submitting ? "Signing…" : "Sign & Complete"}
            </button>
          </div>
        )}
      </div>

      {/* PDF area */}
      {hasSignature && (
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#4a4a4a] p-6 flex flex-col items-center gap-5">
          {pdfError && <p className="text-coral text-sm py-8">{pdfError}</p>}
          {pages.length === 0 && !pdfError && (
            <p className="text-[#ccc] text-sm py-8">Loading document…</p>
          )}

          {!placement && pages.length > 0 && (
            <p className="text-[#ddd] text-[12px] text-center pb-1">
              Click anywhere on the document to place your signature
            </p>
          )}

          {pages.map((page, idx) => {
            const isHover = cursor?.pageIndex === idx;
            const isPlaced = placement?.pageIndex === idx;
            const pos = isPlaced ? placement : isHover ? cursor : null;
            const sigW = widthPct * page.cssW;

            return (
              <div key={idx}>
                <div
                  className="text-[11px] text-[#bbb] text-center mb-1"
                  style={{ fontFamily: "monospace" }}
                >
                  {idx + 1}
                </div>
                <div
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  style={{
                    position: "relative",
                    cursor: placement ? "default" : "crosshair",
                    userSelect: "none",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
                    display: "inline-block",
                  }}
                  onMouseMove={(e) => onPageMove(idx, e)}
                  onMouseLeave={onPageLeave}
                  onClick={(e) => onPageClick(idx, e)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.dataUrl}
                    alt={`Page ${idx + 1}`}
                    style={{
                      display: "block",
                      width: page.cssW,
                      maxWidth: "85vw",
                    }}
                    draggable={false}
                  />

                  {pos && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${pos.xPct * 100}%`,
                        top: `${pos.yPct * 100}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: isPlaced ? "auto" : "none",
                        cursor: isPlaced ? "move" : "none",
                        opacity: isPlaced ? 1 : 0.65,
                        display: "inline-block",
                      }}
                      onMouseDown={
                        isPlaced ? (e) => onSigDrag(e, idx) : undefined
                      }
                    >
                      {/* Signature image */}
                      <div
                        style={{
                          border: isPlaced
                            ? "1.5px solid #E5B85A"
                            : "1.5px dashed rgba(229,184,90,0.5)",
                          borderRadius: 3,
                          padding: 3,
                          background: isPlaced
                            ? "rgba(255,255,255,0.95)"
                            : "rgba(255,255,255,0.6)",
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sigDataUrl!}
                          alt="Signature"
                          style={{
                            display: "block",
                            width: sigW,
                            maxWidth: "none",
                          }}
                          draggable={false}
                        />

                        {/* Resize handle — bottom-right corner */}
                        {isPlaced && (
                          <div
                            onMouseDown={(e) => onResizeDrag(e, idx)}
                            style={{
                              position: "absolute",
                              right: -5,
                              bottom: -5,
                              width: 10,
                              height: 10,
                              background: "#E5B85A",
                              borderRadius: 2,
                              cursor: "se-resize",
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
