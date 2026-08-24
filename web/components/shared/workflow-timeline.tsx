"use client"

import * as React from "react"
import { Check, Clock, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type WorkflowStepState =
  | "completed"
  | "current"
  | "upcoming"
  | "warning"
  | "rejected"

export interface WorkflowStepItem {
  id: string
  title: string
  subtitle?: string
  assignee?: string
  state: WorkflowStepState
  timestamp?: string
  note?: string
}

export interface WorkflowTimelineProps {
  steps: WorkflowStepItem[]
  orientation?: "horizontal" | "vertical"
  className?: string
}

export function WorkflowTimeline({
  steps,
  orientation = "horizontal",
  className,
}: WorkflowTimelineProps) {
  if (orientation === "horizontal") {
    return (
      <div className={cn("w-full overflow-x-auto pb-2", className)}>
        <ol className="flex items-center min-w-max w-full">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const isCompleted = step.state === "completed"
            const isCurrent = step.state === "current"
            const isWarning = step.state === "warning"
            const isRejected = step.state === "rejected"

            return (
              <li
                key={step.id}
                className={cn(
                  "relative flex flex-1 items-center",
                  !isLast && "pr-6 sm:pr-8"
                )}
              >
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isCompleted &&
                          "bg-emerald-600 text-white dark:bg-emerald-500",
                        isCurrent &&
                          "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40 animate-pulse",
                        isWarning &&
                          "bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/40",
                        isRejected &&
                          "bg-rose-600 text-white ring-4 ring-rose-100 dark:ring-rose-900/40",
                        step.state === "upcoming" &&
                          "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-4 stroke-[2.5]" />
                      ) : isRejected ? (
                        <XCircle className="size-4 stroke-[2.5]" />
                      ) : isWarning ? (
                        <AlertTriangle className="size-3.5 stroke-[2.5]" />
                      ) : isCurrent ? (
                        <Clock className="size-3.5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {!isLast && (
                      <div
                        className={cn(
                          "hidden sm:block h-0.5 w-full flex-1 transition-colors",
                          isCompleted
                            ? "bg-emerald-500/50 dark:bg-emerald-500/30"
                            : "bg-border"
                        )}
                      />
                    )}
                  </div>

                  <div className="pr-2">
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        isCurrent && "text-blue-600 dark:text-blue-400 font-bold",
                        isWarning && "text-amber-700 dark:text-amber-400",
                        isRejected && "text-rose-600 dark:text-rose-400",
                        step.state === "upcoming" && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </div>
                    {step.assignee && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {step.assignee}
                      </div>
                    )}
                    {step.timestamp && (
                      <div className="text-[10px] text-muted-foreground/75 mt-0.5">
                        {step.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  // Vertical timeline
  return (
    <div className={cn("relative space-y-4", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const isCompleted = step.state === "completed"
        const isCurrent = step.state === "current"
        const isWarning = step.state === "warning"
        const isRejected = step.state === "rejected"

        return (
          <div key={step.id} className="relative flex gap-3">
            {/* Line connector */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-3.5 top-7 -bottom-4 w-0.5",
                  isCompleted ? "bg-emerald-400 dark:bg-emerald-600/50" : "bg-border"
                )}
                aria-hidden="true"
              />
            )}

            {/* Icon Node */}
            <div
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                isCompleted && "bg-emerald-600 text-white dark:bg-emerald-500",
                isCurrent &&
                  "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40",
                isWarning &&
                  "bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/40",
                isRejected &&
                  "bg-rose-600 text-white ring-4 ring-rose-100 dark:ring-rose-900/40",
                step.state === "upcoming" &&
                  "bg-muted text-muted-foreground border border-border"
              )}
            >
              {isCompleted ? (
                <Check className="size-4 stroke-[2.5]" />
              ) : isRejected ? (
                <XCircle className="size-4 stroke-[2.5]" />
              ) : isWarning ? (
                <AlertTriangle className="size-3.5 stroke-[2.5]" />
              ) : isCurrent ? (
                <Clock className="size-3.5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isCurrent && "text-blue-600 dark:text-blue-400 font-bold",
                    isWarning && "text-amber-700 dark:text-amber-400",
                    isRejected && "text-rose-600 dark:text-rose-400",
                    step.state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.timestamp && (
                  <span className="text-[10px] text-muted-foreground">
                    {step.timestamp}
                  </span>
                )}
              </div>
              {step.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.subtitle}
                </p>
              )}
              {step.assignee && (
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Responsible: {step.assignee}
                </p>
              )}
              {step.note && (
                <div className="mt-1.5 rounded-md bg-muted/60 p-2 text-xs text-foreground italic border-l-2 border-primary/50">
                  &ldquo;{step.note}&rdquo;
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
