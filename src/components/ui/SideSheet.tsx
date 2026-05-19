"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** Optional fixed footer (e.g. submit/cancel buttons rendered by parent). */
  footer?: React.ReactNode;
  /** Override default width. */
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Right-aligned slide-in panel. ESC to close, click-outside to close,
 * body scroll locked while open. Portal-rendered so it escapes any
 * stacking context the trigger sits inside.
 */
export default function SideSheet({
  open,
  onClose,
  title,
  subtitle,
  footer,
  widthClass = "w-full sm:max-w-[560px]",
  children,
}: Props) {
  // ESC + scroll lock — only while open.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/72 cursor-default"
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full ${widthClass} bg-[--color-surface] border-l border-[--color-border-strong] shadow-elevated flex flex-col animate-[sidesheet-slide_220ms_ease-out]`}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[--color-border]">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[--color-fg] truncate">
              {title}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-[12px] text-[--color-fg-muted] truncate">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[--color-fg-subtle] hover:text-[--color-fg] transition-colors text-[18px] leading-none -m-1 p-1"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <footer className="border-t border-[--color-border] px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
