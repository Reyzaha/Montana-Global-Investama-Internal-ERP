"use client"

import * as React from "react"
import Link from "next/link"
import {
  HelpCircle,
  Plus,
  Search,
  Building,
  User,
  ArrowRight,
  FileText,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { CreateRequestDialog } from "@/src/features/legal/components/create-request-dialog"
import { useLegal } from "@/src/features/legal/context/legal-context"
import { LegalRequest } from "@/src/features/legal/types/request.types"
import { getPriorityVariant } from "@/src/features/legal/types/status-helper"

export default function LegalRequestsPage() {
  const { requests } = useLegal()
  const [modalOpen, setModalOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [deptFilter, setDeptFilter] = React.useState("ALL")

  const filteredRequests = React.useMemo(() => {
    let result = [...requests]

    if (deptFilter !== "ALL") {
      result = result.filter((r) => r.department === deptFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.requestNumber.toLowerCase().includes(q) ||
          r.relatedProject.toLowerCase().includes(q) ||
          r.requester.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [requests, deptFilter, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Cross-Department Collaboration Requests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Incoming legal advisory, contract drafting, and review requests from business units.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 text-xs h-8 cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>New Legal Request</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by request title, project, or requester..."
              className="pl-8 text-xs h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Origin Departments</option>
              <option value="Business Development">Business Development</option>
              <option value="Finance & Accounting">Finance & Accounting</option>
              <option value="Project & Investment">Project & Investment</option>
              <option value="HR & GA">HR & GA</option>
              <option value="IT">IT</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No Requests Found"
          description="There are currently no legal collaboration requests matching your filter."
          actionLabel="Submit New Request"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req: LegalRequest) => {
            const priorityVariant = getPriorityVariant(req.priority)
            return (
              <Card key={req.id} className="shadow-2xs hover:border-primary/40 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {req.requestNumber}
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {req.requestType}
                        </span>
                        <StatusBadge
                          variant={priorityVariant}
                          label={req.priority}
                          size="sm"
                          showDot={false}
                        />
                        <span className="rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 text-[11px] font-medium">
                          {req.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground pt-0.5">
                        {req.title}
                      </h3>
                    </div>

                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div>Target: <strong>{req.targetDate}</strong></div>
                      <div className="text-[11px]">Submitted: {req.createdAt.split(" ")[0]}</div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {req.description}
                  </p>

                  <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Building className="size-3.5 text-muted-foreground" />
                        {req.department}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <User className="size-3.5 text-muted-foreground" />
                        PIC: {req.requester.name}
                      </span>
                      <span>&bull;</span>
                      <span>Project: <strong>{req.relatedProject}</strong></span>
                    </div>

                    {req.relatedDocumentId && (
                      <Link
                        href={`/legal/documents/${req.relatedDocumentId}`}
                        className="text-primary hover:underline font-semibold flex items-center gap-1 self-end sm:self-center"
                      >
                        <FileText className="size-3.5" />
                        <span>View Linked Document</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Request Modal */}
      <CreateRequestDialog open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
