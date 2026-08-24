"use client"

import * as React from "react"
import { LucideIcon, FileText, CheckCircle2, MessageSquare, AlertCircle, RefreshCw, Send, ShieldCheck, Ban } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface ActivityEvent {
  id: string
  action: string
  description?: string
  actor: {
    name: string
    department?: string
    role?: string
    avatar?: string
  }
  timestamp: string
  eventType?:
    | "upload"
    | "submit"
    | "review"
    | "revision"
    | "resubmit"
    | "approval"
    | "reject"
    | "comment"
  metadata?: Record<string, unknown>
}

export interface ActivityTimelineProps {
  activities: ActivityEvent[]
  className?: string
  maxItems?: number
}

const eventIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  upload: { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/50" },
  submit: { icon: Send, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/50" },
  review: { icon: ShieldCheck, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50" },
  revision: { icon: AlertCircle, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/50" },
  resubmit: { icon: RefreshCw, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50" },
  approval: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" },
  reject: { icon: Ban, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/50" },
  comment: { icon: MessageSquare, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/50" },
}

export function ActivityTimeline({
  activities,
  className,
  maxItems,
}: ActivityTimelineProps) {
  const displayedActivities = maxItems ? activities.slice(0, maxItems) : activities

  if (!displayedActivities.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
        No activity recorded yet.
      </div>
    )
  }

  return (
    <div className={cn("relative space-y-4", className)}>
      {displayedActivities.map((act, index) => {
        const isLast = index === displayedActivities.length - 1
        const iconConfig = act.eventType ? eventIconMap[act.eventType] : eventIconMap.upload
        const Icon = iconConfig?.icon ?? FileText
        const initials = act.actor.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()

        return (
          <div key={act.id} className="relative flex items-start gap-3 text-sm">
            {/* Timeline connector */}
            {!isLast && (
              <span
                className="absolute left-4 top-8 -bottom-4 w-px bg-border"
                aria-hidden="true"
              />
            )}

            {/* Event Icon or Actor Avatar */}
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-xs">
              <Icon className={cn("size-4", iconConfig?.color.split(" ")[0])} />
            </div>

            {/* Content Body */}
            <div className="flex-1 space-y-1 rounded-lg border bg-card/60 p-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[9px] bg-muted font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-xs text-foreground">
                    {act.actor.name}
                  </span>
                  {act.actor.department && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {act.actor.department}
                    </span>
                  )}
                </div>
                <time className="text-[11px] text-muted-foreground">
                  {act.timestamp}
                </time>
              </div>

              <p className="text-xs font-medium text-foreground">
                {act.action}
              </p>

              {act.description && (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {act.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
