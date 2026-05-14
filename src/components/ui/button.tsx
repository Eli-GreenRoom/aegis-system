import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "sm" | "xs";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-[--color-brand-fg] hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand]/50 disabled:opacity-50",
  secondary:
    "bg-[--color-surface-raised] border border-white/[0.12] text-[--color-fg] hover:bg-[--color-surface-overlay] hover:border-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50",
  ghost:
    "bg-transparent text-[--color-fg-muted] hover:text-[--color-fg] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50",
  danger:
    "bg-[--color-danger]/10 border border-[--color-danger]/20 text-[--color-danger] hover:bg-[--color-danger]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-danger]/40 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  default: "h-8 px-3.5 text-[13px] gap-1.5",
  sm: "h-7 px-3 text-[12px] gap-1",
  xs: "h-6 px-2 text-[11px] gap-1",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-[--radius-md] font-medium transition-all disabled:cursor-not-allowed select-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
