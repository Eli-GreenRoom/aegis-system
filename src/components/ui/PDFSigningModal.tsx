"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

const RENDER_SCALE = 1.5;
const SIG_WIDTH_FRAC = 0.26; // signature width as fraction of page width
const TEXT_WIDTH_FRAC = 0.2;

interface PageInfo {
  dataUrl: string;
  pdfW: number;
  pdfH: number;
  cssW: number;
  cssH: number;
}

/** A single placement on the PDF. Operator can add many before signing. */
export type Placement =
  | {
      kind: "signature";
      pageIndex: number;
      xPct: number;
      yPct: number;
    }
  | {
      kind: "text";
      pageIndex: number;
      xPct: number;
      yPct: number;
      text: string;
    };

/** Backwards-compatible alias kept for any caller still importing the old name. */
export type SigPlacement = Placement;

interface Props {
  fileUrl: string;
  signatureDataUrl: string;
  loading?: boolean;
  /** Operator pressed "Sign Contract". Receives every placement to embed. */
  onSign: (placements: Placement[]) => void;
  onChangeSig: () => void;
  onCancel: () => void;
}

type ToolMode = "signature" | "text";

export default function PDFSigningModal({
  fileUrl,
  signatureDataUrl,
  loading,
  onSign,
  onChangeSig,
  onCancel,
}: Props) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState("");
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [mode, setMode] = useState<ToolMode>("signature");
  const [cursor, setCursor] = useState<{
    pageIndex: number;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<{
    idx: number;
    startCX: number;
    startCY: number;
    startXPct: number;
    startYPct: number;
    pageW: number;
    pageH: number;
  } | null>(null);
  // Set while a placement is being dragged. The synthetic page click fires
  // AFTER mouseup releases the drag, so checking dragRef in handlePageClick
  // is too late - we'd add a stray new placement. didDragRef survives one
  // click cycle so the page handler can ignore that click.
  const didDragRef = useRef(false);

  // Render PDF pages
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
            dataUrl: canvas.toDataURL("image/jpeg", 0.88),
            pdfW: vp1.width,
            pdfH: vp1.height,
            cssW: vp.width,
            cssH: vp.height,
          });
          setPages([...result]);
        }
        if (!cancelled) setPdfLoading(false);
      } catch (err) {
        if (!cancelled) {
          setPdfError(
            err instanceof Error ? err.message : "Failed to load PDF",
          );
          setPdfLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Global drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      didDragRef.current = true;
      const dx = (e.clientX - d.startCX) / d.pageW;
      const dy = (e.clientY - d.startCY) / d.pageH;
      const nextX = clamp(d.startXPct + dx, 0.02, 0.98);
      const nextY = clamp(d.startYPct + dy, 0.02, 0.98);
      setPlacements((prev) =>
        prev.map((p, i) =>
          i === d.idx ? { ...p, xPct: nextX, yPct: nextY } : p,
        ),
      );
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function handlePageMove(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setCursor({
      pageIndex: idx,
      xPct: (e.clientX - r.left) / r.width,
      yPct: (e.clientY - r.top) / r.height,
    });
  }

  function handlePageLeave() {
    if (!dragRef.current) setCursor(null);
  }

  function handlePageClick(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    // Synthetic click from the end of a drag - swallow it so we don't drop
    // a stray new placement when the operator just finished repositioning.
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (dragRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - r.left) / r.width;
    const yPct = (e.clientY - r.top) / r.height;
    if (mode === "signature") {
      setPlacements((prev) => [
        ...prev,
        { kind: "signature", pageIndex: idx, xPct, yPct },
      ]);
    } else {
      const text = window.prompt("Text to place on the contract:") ?? "";
      if (!text.trim()) return;
      setPlacements((prev) => [
        ...prev,
        { kind: "text", pageIndex: idx, xPct, yPct, text: text.trim() },
      ]);
    }
    setCursor(null);
  }

  function handlePlacementMouseDown(
    e: React.MouseEvent,
    pageIdx: number,
    placementIdx: number,
  ) {
    e.stopPropagation();
    e.preventDefault();
    const el = pageRefs.current[pageIdx];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = placements[placementIdx];
    if (!p) return;
    dragRef.current = {
      idx: placementIdx,
      startCX: e.clientX,
      startCY: e.clientY,
      startXPct: p.xPct,
      startYPct: p.yPct,
      pageW: r.width,
      pageH: r.height,
    };
    setIsDragging(true);
  }

  function removePlacement(idx: number) {
    setPlacements((prev) => prev.filter((_, i) => i !== idx));
  }

  const sigCount = placements.filter((p) => p.kind === "signature").length;
  const textCount = placements.filter((p) => p.kind === "text").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(236,236,238,0.08)",
          marginBottom: "12px",
          flexShrink: 0,
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <ModeButton
            active={mode === "signature"}
            onClick={() => setMode("signature")}
            label="Signature"
          />
          <ModeButton
            active={mode === "text"}
            onClick={() => setMode("text")}
            label="Text"
          />
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-fg-muted, #888)",
              marginLeft: "8px",
            }}
          >
            {placements.length === 0
              ? mode === "signature"
                ? "Click anywhere to drop your signature."
                : "Click anywhere to drop a text label."
              : `${sigCount} signature${sigCount === 1 ? "" : "s"} · ${textCount} text${textCount === 1 ? "" : "s"} placed`}
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {placements.length > 0 && (
            <button
              type="button"
              onClick={() => setPlacements([])}
              style={{
                fontSize: "12px",
                color: "var(--color-fg-muted, #888)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset all
            </button>
          )}
          <button
            type="button"
            onClick={onChangeSig}
            style={{
              fontSize: "12px",
              color: "var(--color-fg-muted, #888)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Change signature
          </button>
        </div>
      </div>

      {/* PDF scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "auto",
          background: "#5a5a5a",
          borderRadius: "4px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          minHeight: 0,
        }}
      >
        {pdfLoading && pages.length === 0 && (
          <div style={{ color: "#ccc", fontSize: "14px", padding: "60px 0" }}>
            Loading document…
          </div>
        )}
        {pdfError && (
          <div
            style={{ color: "#E73E54", fontSize: "13px", padding: "40px 0" }}
          >
            {pdfError}
          </div>
        )}

        {pages.map((page, pageIdx) => {
          const cursorOnThisPage = cursor?.pageIndex === pageIdx && !isDragging;
          const sigW = SIG_WIDTH_FRAC * page.cssW;

          return (
            <div key={pageIdx}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#bbb",
                  textAlign: "center",
                  marginBottom: "4px",
                  fontFamily: "monospace",
                }}
              >
                {pageIdx + 1}
              </div>
              <div
                ref={(el) => {
                  pageRefs.current[pageIdx] = el;
                }}
                style={{
                  position: "relative",
                  cursor: "crosshair",
                  userSelect: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  display: "inline-block",
                }}
                onMouseMove={(e) => handlePageMove(pageIdx, e)}
                onMouseLeave={handlePageLeave}
                onClick={(e) => handlePageClick(pageIdx, e)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.dataUrl}
                  alt={`Page ${pageIdx + 1}`}
                  style={{
                    display: "block",
                    width: page.cssW,
                    maxWidth: "80vw",
                  }}
                  draggable={false}
                />

                {/* Cursor preview */}
                {cursorOnThisPage && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${cursor!.xPct * 100}%`,
                      top: `${cursor!.yPct * 100}%`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                      border: "1.5px dashed rgba(229,184,90,0.55)",
                      borderRadius: "3px",
                      padding: "3px",
                      background: "rgba(255,255,255,0.6)",
                      opacity: 0.7,
                    }}
                  >
                    {mode === "signature" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureDataUrl}
                        alt=""
                        style={{
                          display: "block",
                          width: sigW,
                          maxWidth: "none",
                        }}
                        draggable={false}
                      />
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 6px",
                          fontSize: "11px",
                          color: "#333",
                        }}
                      >
                        text
                      </span>
                    )}
                  </div>
                )}

                {/* Existing placements on this page */}
                {placements.map((p, i) =>
                  p.pageIndex !== pageIdx ? null : (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${p.xPct * 100}%`,
                        top: `${p.yPct * 100}%`,
                        transform: "translate(-50%, -50%)",
                        cursor: "move",
                        border: "1.5px solid #E5B85A",
                        borderRadius: "3px",
                        padding: "3px",
                        background: "rgba(255,255,255,0.94)",
                      }}
                      onMouseDown={(e) =>
                        handlePlacementMouseDown(e, pageIdx, i)
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.kind === "signature" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signatureDataUrl}
                          alt="Signature"
                          style={{
                            display: "block",
                            width: sigW,
                            maxWidth: "none",
                          }}
                          draggable={false}
                        />
                      ) : (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 6px",
                            fontSize: `${0.022 * page.cssW}px`,
                            color: "#111",
                            whiteSpace: "nowrap",
                            maxWidth: `${TEXT_WIDTH_FRAC * page.cssW}px`,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.text}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePlacement(i);
                        }}
                        style={{
                          position: "absolute",
                          top: -10,
                          right: -10,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid #E73E54",
                          background: "#15151A",
                          color: "#E73E54",
                          fontSize: "12px",
                          lineHeight: "18px",
                          padding: 0,
                          cursor: "pointer",
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(236,236,238,0.08)",
          marginTop: "12px",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={() => onSign(placements)}
          disabled={placements.length === 0 || loading}
        >
          {loading ? "Signing…" : "Sign Contract"}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: "11px",
        padding: "4px 10px",
        borderRadius: "4px",
        border: "1px solid",
        borderColor: active ? "#E5B85A" : "rgba(236,236,238,0.18)",
        background: active ? "rgba(229,184,90,0.16)" : "transparent",
        color: active ? "#E5B85A" : "var(--color-fg-muted, #888)",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontFamily: "monospace",
      }}
    >
      {label}
    </button>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
