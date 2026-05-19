"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

const RENDER_SCALE = 1.5;
const SIG_WIDTH_FRAC = 0.26; // signature width as fraction of page width

interface PageInfo {
  dataUrl: string;
  pdfW: number;
  pdfH: number;
  cssW: number;
  cssH: number;
}

export interface SigPlacement {
  pageIndex: number;
  xPct: number; // 0-1 from left, centre of signature
  yPct: number; // 0-1 from top, centre of signature
}

interface Props {
  fileUrl: string;
  signatureDataUrl: string;
  loading?: boolean;
  onSign: (placement: SigPlacement) => void;
  onChangeSig: () => void;
  onCancel: () => void;
}

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
  const [placement, setPlacement] = useState<SigPlacement | null>(null);
  const [cursor, setCursor] = useState<SigPlacement | null>(null);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<{
    pageIndex: number;
    startCX: number;
    startCY: number;
    startXPct: number;
    startYPct: number;
    pageW: number;
    pageH: number;
  } | null>(null);

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
      const dx = (e.clientX - d.startCX) / d.pageW;
      const dy = (e.clientY - d.startCY) / d.pageH;
      setPlacement({
        pageIndex: d.pageIndex,
        xPct: clamp(d.startXPct + dx, 0.02, 0.98),
        yPct: clamp(d.startYPct + dy, 0.02, 0.98),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function handlePageMove(idx: number, e: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current || placement) return;
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
    if (placement) return;
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPlacement({
      pageIndex: idx,
      xPct: (e.clientX - r.left) / r.width,
      yPct: (e.clientY - r.top) / r.height,
    });
    setCursor(null);
  }

  function handleSigMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    e.preventDefault();
    const el = pageRefs.current[idx];
    if (!el || !placement) return;
    const r = el.getBoundingClientRect();
    dragRef.current = {
      pageIndex: idx,
      startCX: e.clientX,
      startCY: e.clientY,
      startXPct: placement.xPct,
      startYPct: placement.yPct,
      pageW: r.width,
      pageH: r.height,
    };
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Instructions bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(236,236,238,0.08)",
          marginBottom: "12px",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--color-fg-muted, #888)" }}>
          {placement
            ? "Drag to reposition. When ready, click Sign Contract."
            : "Click anywhere on the document to place your signature."}
        </p>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {placement && (
            <button
              type="button"
              onClick={() => setPlacement(null)}
              style={{
                fontSize: "12px",
                color: "var(--color-fg-muted, #888)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset
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

        {pages.map((page, idx) => {
          const isHover = cursor?.pageIndex === idx;
          const isPlaced = placement?.pageIndex === idx;
          const pos = isPlaced ? placement : isHover ? cursor : null;
          const sigW = SIG_WIDTH_FRAC * page.cssW;

          return (
            <div key={idx}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#bbb",
                  textAlign: "center",
                  marginBottom: "4px",
                  fontFamily: "monospace",
                }}
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
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  display: "inline-block",
                }}
                onMouseMove={(e) => handlePageMove(idx, e)}
                onMouseLeave={handlePageLeave}
                onClick={(e) => handlePageClick(idx, e)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.dataUrl}
                  alt={`Page ${idx + 1}`}
                  style={{
                    display: "block",
                    width: page.cssW,
                    maxWidth: "80vw",
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
                      border: isPlaced
                        ? "1.5px solid #E5B85A"
                        : "1.5px dashed rgba(229,184,90,0.55)",
                      borderRadius: "3px",
                      padding: "3px",
                      background: isPlaced
                        ? "rgba(255,255,255,0.94)"
                        : "rgba(255,255,255,0.6)",
                      opacity: isPlaced ? 1 : 0.7,
                    }}
                    onMouseDown={
                      isPlaced ? (e) => handleSigMouseDown(e, idx) : undefined
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  </div>
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
          onClick={() => placement && onSign(placement)}
          disabled={!placement || loading}
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
