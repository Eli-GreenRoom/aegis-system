"use client";

import { useEffect } from "react";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-6 py-16 flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
      <p className="text-[13px] text-[--color-fg-muted]">
        Couldn&apos;t load home. Try again.
      </p>
      <button
        onClick={reset}
        className="text-[13px] px-4 py-2 rounded-md border border-[--color-border] text-[--color-fg-muted] hover:text-[--color-fg] hover:border-[--color-border-strong] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
