import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-[--color-brand-fg] hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-transparent border border-[--color-border-strong] text-[--color-fg] hover:bg-[--color-surface-raised]",
  ghost:
    "bg-transparent text-[--color-fg-muted] hover:text-[--color-fg]",
  danger:
    "bg-[--color-brand-coral] text-[--color-brand-cream] hover:opacity-90",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
