"use client"

import * as React from "react"
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    isPositive?: boolean
  }
  onClick?: () => void
  isActive?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary bg-primary/10",
  trend,
  onClick,
  isActive = false,
  className,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all duration-150 relative overflow-hidden",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.99]",
        isActive && "border-primary ring-1 ring-primary",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </div>
          </div>
          <div className={cn("flex size-10 items-center justify-center rounded-lg shrink-0", iconColor)}>
            <Icon className="size-5" />
          </div>
        </div>

        {(description || trend) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center font-medium",
                  trend.isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="size-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="size-3.5 mr-0.5" />
                )}
                {trend.value}
              </span>
            )}
            {description && <span className="truncate">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
