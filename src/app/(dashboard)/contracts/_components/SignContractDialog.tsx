"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/ui/SignaturePad";
import PDFSigningModal, {
  type Placement,
} from "@/components/ui/PDFSigningModal";

interface Props {
  contractId: string;
  fileUrl: string;
  savedSignatureUrl?: string | null;
}

export default function SignContractDialog({
  contractId,
  fileUrl,
  savedSignatureUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Sign Contract</Button>
      {open &&
        createPortal(
          <SignModal
            contractId={contractId}
            fileUrl={fileUrl}
            savedSignatureUrl={savedSignatureUrl}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function SignModal({
  contractId,
  fileUrl,
  savedSignatureUrl,
  onClose,
}: {
  contractId: string;
  fileUrl: string;
  savedSignatureUrl?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "draw" | "place">(
    savedSignatureUrl ? "loading" : "draw",
  );
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Convert saved signature proxy URL → base64 data URL
  useEffect(() => {
    if (!savedSignatureUrl) return;
    fetchAsDataUrl(savedSignatureUrl)
      .then((dataUrl) => {
        setSigDataUrl(dataUrl);
        setStep("place");
      })
      .catch(() => {
        // fall back to draw mode if fetch fails
        setStep("draw");
      });
  }, [savedSignatureUrl]);

  async function handleSign(placements: Placement[]) {
    if (!sigDataUrl) return;
    if (placements.length === 0) {
      setError("Add at least one signature before saving.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: sigDataUrl, placements }),
      });
      if (!res.ok) {
        // Surface server message clearly so the operator knows what went
        // wrong (blob upload, PDF processing, etc.) instead of leaving the
        // button greyed-out with no signal.
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Signing failed (HTTP ${res.status}).`);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error while signing.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDrawn(dataUrl: string) {
    setSigDataUrl(dataUrl);
    setStep("place");
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.72)",
  };

  // Loading saved signature
  if (step === "loading") {
    return (
      <div style={overlayStyle}>
        <div style={{ color: "#ccc", fontSize: "14px" }}>
          Loading signature…
        </div>
      </div>
    );
  }

  // Draw step
  if (step === "draw") {
    return (
      <div
        style={overlayStyle}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            background: "var(--color-surface, #15151A)",
            border: "1px solid rgba(236,236,238,0.08)",
            borderRadius: "8px",
            padding: "24px",
            width: "min(560px, 95vw)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-fg, #e8e8ea)",
              marginBottom: "4px",
            }}
          >
            Draw your signature
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-fg-muted, #888)",
              marginBottom: "16px",
            }}
          >
            Draw below, then place it on the contract.
          </p>
          <SignaturePad
            onSave={handleDrawn}
            onCancel={onClose}
            saveLabel="Continue →"
          />
        </div>
      </div>
    );
  }

  // Place step — full-screen PDF modal
  return (
    <div style={overlayStyle}>
      <div
        style={{
          background: "var(--color-surface, #15151A)",
          border: "1px solid rgba(236,236,238,0.08)",
          borderRadius: "8px",
          padding: "24px",
          width: "min(1100px, 96vw)",
          height: "min(90vh, 900px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-fg, #e8e8ea)",
            }}
          >
            Sign Contract
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              color: "var(--color-fg-muted, #888)",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <p
            style={{
              fontSize: "12px",
              color: "#E73E54",
              marginBottom: "8px",
              flexShrink: 0,
            }}
          >
            {error}
          </p>
        )}

        <PDFSigningModal
          fileUrl={fileUrl}
          signatureDataUrl={sigDataUrl!}
          loading={loading}
          onSign={handleSign}
          onChangeSig={() => {
            setSigDataUrl(null);
            setStep("draw");
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
