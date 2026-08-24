"use client"

import * as React from "react"
import {
  Search,
  Shield,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ActivityTimeline } from "@/components/shared/activity-timeline"
import { EmptyState } from "@/components/shared/empty-state"
import { useLegal } from "@/src/features/legal/context/legal-context"
import { LegalEventType } from "@/src/features/legal/types/activity.types"

const EVENT_TYPE_OPTIONS: { label: string; value: LegalEventType | "ALL" }[] = [
  { label: "All Audit Events", value: "ALL" },
  { label: "Document Uploads", value: "upload" },
  { label: "Submissions", value: "submit" },
  { label: "Legal Reviews", value: "review" },
  { label: "Revision Requests", value: "revision" },
  { label: "Resubmissions", value: "resubmit" },
  { label: "Executive Approvals", value: "approval" },
  { label: "Rejections", value: "reject" },
  { label: "Comments & Notes", value: "comment" },
]

export default function LegalActivityPage() {
  const { activities } = useLegal()
  const [search, setSearch] = React.useState("")
  const [selectedEventType, setSelectedEventType] = React.useState<LegalEventType | "ALL">("ALL")

  const filteredActivities = React.useMemo(() => {
    let result = [...activities]

    if (selectedEventType !== "ALL") {
      result = result.filter((a) => a.eventType === selectedEventType)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.action.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          a.actor.name.toLowerCase().includes(q) ||
          (a.documentTitle && a.documentTitle.toLowerCase().includes(q)) ||
          (a.documentNumber && a.documentNumber.toLowerCase().includes(q))
      )
    }

    return result
  }, [activities, selectedEventType, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Legal Audit Trail & Activity Log
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Immutable chronological record of contract uploads, legal reviews, revision dispatches, and executive authorizations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search audit trail by actor, action, document number, or notes..."
              className="pl-8 text-xs h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              value={selectedEventType}
              onChange={(e) =>
                setSelectedEventType(e.target.value as LegalEventType | "ALL")
              }
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Activities Timeline Container */}
      <Card>
        <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Event Log Stream ({filteredActivities.length})
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            ISO/IEC Compliance Ready
          </span>
        </CardHeader>

        <CardContent className="p-6">
          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Audit Records Found"
              description="No activity records match your current search and filter parameters."
              actionLabel="Clear Filter"
              onAction={() => {
                setSearch("")
                setSelectedEventType("ALL")
              }}
            />
          ) : (
            <ActivityTimeline activities={filteredActivities} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
