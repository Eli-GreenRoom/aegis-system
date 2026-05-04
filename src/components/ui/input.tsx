import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-[--color-border-strong] bg-[--color-surface] px-3 py-2 text-sm text-[--color-fg] placeholder:text-[--color-fg-subtle] focus:border-brand focus:outline-none focus:ring-1 focus:ring-[--color-brand] disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
