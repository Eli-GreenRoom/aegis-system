"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DocumentEntityType } from "@/lib/documents/schema";

interface Props {
  /**
   * Current proxy URL stored on the parent entity. Empty string means
   * nothing uploaded yet. The component lets you upload a new file (which
   * replaces the value) or paste an external URL (kept verbatim - useful
   * for press kits and ticket links that aren't ours to host).
   */
  value: string;
  onChange: (url: string) => void;

  /** Audit metadata: which entity table this attaches to and an optional row id. */
  entityType: DocumentEntityType;
  entityId?: string | null;

  /** Free-form labels persisted on the documents row. */
  tags?: string[];

  /** Override the default `accept` attribute (e.g. images only). */
  accept?: string;

  /** Display label for the field (passed via the parent's <Field>). */
  placeholder?: string;
}

const ACCEPT_DEFAULT = "application/pdf,image/*";

export default function FileUpload({
  value,
  onChange,
  entityType,
  entityId,
  tags,
  accept,
  placeholder,
}: Props) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isProxyUrl = /^\/api\/documents\/[0-9a-f-]{36}$/i.test(value);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("entityType", entityType);
    if (entityId) form.append("entityId", entityId);
    if (tags && tags.length > 0) form.append("tags", tags.join(","));

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Upload failed (${res.status})`);
        return;
      }
      const body = await res.json();
      onChange(body.document.proxyUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clear() {
    onChange("");
    setError("");
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-2">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-mono text-xs text-brand underline-offset-4 hover:underline break-all"
          >
            {isProxyUrl ? "uploaded file" : value}
          </a>
          <Button type="button" variant="ghost" onClick={clear}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className={`inline-flex items-center justify-center h-9 px-3 text-mono text-[11px] uppercase tracking-[0.14em] rounded-md border border-[--color-border-strong] text-[--color-fg-muted] hover:text-brand hover:border-brand/40 cursor-pointer ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? "Uploading" : "Upload"}
          </label>
          <input
            ref={fileRef}
            id={id}
            type="file"
            className="hidden"
            accept={accept ?? ACCEPT_DEFAULT}
            onChange={onPick}
            disabled={uploading}
          />
          <span className="text-[--color-fg-subtle] text-xs">or</span>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "https://..."}
            className="flex-1 rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg]"
          />
        </div>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
