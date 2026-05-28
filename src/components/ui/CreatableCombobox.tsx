"use client";

import { useState, useRef, useEffect } from "react";

export interface ComboOption {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (id: string) => void;
  /** Called after a new option is created. Receives the new option so the
   *  caller can merge it into its local list (so the dropdown shows it). */
  onCreate?: (query: string) => Promise<ComboOption | null>;
  placeholder?: string;
  /** Text inside the dropdown when no options match. Ignored when
   *  onCreate is provided and the query is non-empty (the Create row
   *  takes precedence). */
  emptyText?: string;
}

export default function CreatableCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Search or create...",
  emptyText = "No matches",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered =
    query.length === 0
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            (o.sublabel ?? "").toLowerCase().includes(query.toLowerCase()),
        );

  const showCreate =
    !!onCreate &&
    query.trim().length > 0 &&
    !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  const totalItems = filtered.length + (showCreate ? 1 : 0);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(o: ComboOption) {
    onChange(o.id);
    setQuery("");
    setOpen(false);
    setFocused(0);
  }

  async function runCreate() {
    if (!onCreate) return;
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      if (!created) return;
      onChange(created.id);
      setQuery("");
      setOpen(false);
      setFocused(0);
    } finally {
      setCreating(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focused < filtered.length) {
        if (filtered[focused]) pick(filtered[focused]);
      } else if (showCreate) {
        void runCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        {!open && selected ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm text-[--color-fg] truncate block">
              {selected.label}
            </span>
            {selected.sublabel && (
              <span className="text-[10px] text-[--color-fg-subtle] truncate block">
                {selected.sublabel}
              </span>
            )}
          </div>
        ) : (
          <input
            autoFocus={open}
            className="flex-1 bg-transparent text-sm text-[--color-fg] outline-none placeholder:text-[--color-fg-subtle] min-w-0"
            placeholder={selected ? selected.label : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocused(0);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
          />
        )}
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-[--color-border] shadow-xl overflow-y-auto"
          style={{
            background: "var(--color-surface-raised)",
            maxHeight: "220px",
          }}
        >
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-[12px] text-[--color-fg-subtle]">
              {emptyText}
            </p>
          )}
          {filtered.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => pick(o)}
              className={`w-full text-left px-3 py-2 transition-colors ${
                i === focused
                  ? "bg-white/[0.07] text-[--color-fg]"
                  : "hover:bg-white/4 text-[--color-fg]"
              }`}
            >
              <span className="text-sm block">{o.label}</span>
              {o.sublabel && (
                <span className="text-[10px] text-[--color-fg-subtle] block">
                  {o.sublabel}
                </span>
              )}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={() => void runCreate()}
              className={`w-full text-left px-3 py-2 transition-colors border-t border-[--color-border] ${
                focused === filtered.length
                  ? "bg-white/[0.07]"
                  : "hover:bg-white/4"
              }`}
            >
              <span className="text-[12px] text-brand">
                {creating ? "Creating..." : `+ Create "${query.trim()}"`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
