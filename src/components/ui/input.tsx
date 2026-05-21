import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          "w-full rounded-[--radius-md] border bg-white/4 px-3 py-2 text-[13px] text-[--color-fg] placeholder:text-[--color-fg-subtle] transition-colors focus:bg-white/6 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-[--color-danger]/60 focus:border-[--color-danger] focus:ring-[--color-danger]/30"
            : "border-white/10 focus:border-[--color-brand]/50 focus:ring-[--color-brand-glow]",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[11px] text-[--color-danger]">{error}</p>
      )}
    </div>
  ),
);
Input.displayName = "Input";
