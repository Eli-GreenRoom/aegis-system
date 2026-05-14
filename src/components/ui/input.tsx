import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[--radius-md] border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-[13px] text-[--color-fg] placeholder:text-[--color-fg-subtle] transition-colors focus:border-[--color-brand]/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[--color-brand]/20 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
