"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Search,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { useLegal } from "@/src/features/legal/context/legal-context"
import { LegalTask, TaskCategory } from "@/src/features/legal/types/task.types"
import { PriorityLevel } from "@/src/features/legal/types/document.types"
import { getPriorityVariant } from "@/src/features/legal/types/status-helper"

const TASK_TABS: { label: string; category: TaskCategory | "ALL" }[] = [
  { label: "All Tasks", category: "ALL" },
  { label: "Pending Review", category: "PENDING_REVIEW" },
  { label: "Revision Required", category: "REVISION_REQUIRED" },
  { label: "Pending Approval", category: "PENDING_APPROVAL" },
  { label: "Completed", category: "COMPLETED" },
]

function LegalTasksContent() {
  const searchParams = useSearchParams()
  const categoryParam = (searchParams.get("category") as TaskCategory | null) ?? "ALL"

  const { tasks, stats } = useLegal()
  const [selectedTab, setSelectedTab] = React.useState<TaskCategory | "ALL">(categoryParam)
  const [search, setSearch] = React.useState("")
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityLevel | "ALL">("ALL")

  const effectiveTab = selectedTab ?? categoryParam

  const filteredTasks = React.useMemo(() => {
    let result = [...tasks]

    if (effectiveTab !== "ALL") {
      result = result.filter((t) => t.category === effectiveTab)
    }

    if (priorityFilter !== "ALL") {
      result = result.filter((t) => t.priority === priorityFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.documentTitle.toLowerCase().includes(q) ||
          t.project.toLowerCase().includes(q) ||
          t.assignee.name.toLowerCase().includes(q) ||
          t.requester.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [tasks, effectiveTab, priorityFilter, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Legal Work Queue & Tasks
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage actionable legal reviews, revision uploads, and executive approval tasks.
          </p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, document, project, or assignee..."
                className="pl-8 text-xs h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Priority Filter */}
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | "ALL")}
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Task Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t text-xs">
            {TASK_TABS.map((tab) => {
              const isSelected = effectiveTab === tab.category
              const count =
                tab.category === "ALL"
                  ? tasks.length
                  : tab.category === "PENDING_REVIEW"
                  ? stats.pendingReviewCount
                  : tab.category === "REVISION_REQUIRED"
                  ? stats.revisionRequiredCount
                  : tab.category === "PENDING_APPROVAL"
                  ? stats.pendingApprovalCount
                  : tasks.filter((t) => t.category === "COMPLETED").length

              return (
                <button
                  key={tab.category}
                  onClick={() => setSelectedTab(tab.category)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No Tasks Found"
          description="There are no tasks matching your selected category and filter."
          actionLabel="Clear Filter"
          onAction={() => {
            setSelectedTab("ALL")
            setPriorityFilter("ALL")
            setSearch("")
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task: LegalTask) => {
            const priorityVariant = getPriorityVariant(task.priority)
            const isCompleted = task.status === "COMPLETED"

            return (
              <Card
                key={task.id}
                className={`transition-all duration-150 hover:border-primary/40 shadow-2xs ${
                  isCompleted ? "opacity-75 bg-muted/20" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        variant={priorityVariant}
                        label={task.priority}
                        size="sm"
                        showDot={false}
                      />
                      <span className="font-semibold text-sm text-foreground">
                        {task.title}
                      </span>
                      {isCompleted && (
                        <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
                          Completed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      <strong className="text-foreground">Document: </strong>
                      {task.documentTitle}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground">Project:</span>{" "}
                        {task.project}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        Assignee: <strong>{task.assignee.name}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Due: {task.dueDate}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <Link href={task.actionUrl}>
                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        className="text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <span>{task.actionLabel}</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LegalTasksPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading tasks queue...
        </div>
      }
    >
      <LegalTasksContent />
    </React.Suspense>
  )
}
