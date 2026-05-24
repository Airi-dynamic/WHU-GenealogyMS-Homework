"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent",
  secondary: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border-transparent",
  danger:    "bg-red-500 text-white hover:bg-red-600 border-transparent",
  ghost:     "bg-transparent text-zinc-700 hover:bg-zinc-100 border-transparent",
  outline:   "bg-transparent text-zinc-700 hover:bg-zinc-50 border-zinc-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 h-7",
  md: "text-sm px-4 py-2 h-9",
  lg: "text-base px-6 py-2.5 h-11",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
