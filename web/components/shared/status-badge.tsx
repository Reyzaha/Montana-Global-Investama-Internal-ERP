"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type StatusVariant =
  | "draft"
  | "submitted"
  | "in-progress"
  | "warning"
  | "pending"
  | "success"
  | "danger"
  | "neutral"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant
  label: string
  showDot?: boolean
  size?: "sm" | "md" | "lg"
}

const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
  draft: {
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  submitted: {
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  "in-progress": {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500 animate-pulse",
  },
  warning: {
    badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  pending: {
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    dot: "bg-purple-500",
  },
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  danger: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  neutral: {
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
}

const sizeStyles = {
  sm: "text-[11px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
  lg: "text-sm px-3 py-1.5 gap-2",
}

export function StatusBadge({
  variant = "neutral",
  label,
  showDot = true,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const styles = variantStyles[variant] ?? variantStyles.neutral

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border whitespace-nowrap leading-none transition-colors",
        styles.badge,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            styles.dot
          )}
        />
      )}
      {label}
    </span>
  )
}
