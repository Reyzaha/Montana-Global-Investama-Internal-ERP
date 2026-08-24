"use client"

import * as React from "react"
import Link from "next/link"
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Upload,
  CheckSquare,
  HelpCircle,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { ActivityTimeline } from "@/components/shared/activity-timeline"
import { EmptyState } from "@/components/shared/empty-state"
import { useLegal } from "@/src/features/legal/context/legal-context"
import { usePermissions } from "@/src/features/legal/permissions/permission-context"
import { getPriorityVariant, getStatusConfig } from "@/src/features/legal/types/status-helper"
import { LegalDocument } from "@/src/features/legal/types/document.types"
import { LegalTask } from "@/src/features/legal/types/task.types"

export default function LegalDashboardPage() {
  const { stats, documents, tasks, activities } = useLegal()
  const { currentUser } = usePermissions()

  // Filter tasks requiring action
  const actionableTasks = tasks
    .filter((t) => t.status !== "COMPLETED")
    .slice(0, 5)

  // Recent 5 documents
  const recentDocs = documents.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome & Section Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Legal Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Welcome back, <strong>{currentUser.name}</strong> ({currentUser.title}). Here is your legal workspace status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/legal/documents/new">
            <Button size="sm" className="gap-1.5 text-xs h-8 cursor-pointer">
              <Upload className="size-3.5" />
              <span>Register Document</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Link href="/legal/documents">
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments}
            description="Active legal registry"
            icon={FileText}
            iconColor="text-blue-600 bg-blue-50 dark:bg-blue-950/50"
          />
        </Link>
        <Link href="/legal/tasks?category=PENDING_REVIEW">
          <StatCard
            title="Pending Review"
            value={stats.pendingReviewCount}
            description="Awaiting Legal PIC"
            icon={Clock}
            iconColor="text-sky-600 bg-sky-50 dark:bg-sky-950/50"
          />
        </Link>
        <Link href="/legal/tasks?category=REVISION_REQUIRED">
          <StatCard
            title="Revision Required"
            value={stats.revisionRequiredCount}
            description="Action with requester"
            icon={AlertTriangle}
            iconColor="text-amber-600 bg-amber-50 dark:bg-amber-950/50"
          />
        </Link>
        <Link href="/legal/tasks?category=PENDING_APPROVAL">
          <StatCard
            title="Pending Approval"
            value={stats.pendingApprovalCount}
            description="Executive director sign-off"
            icon={ShieldCheck}
            iconColor="text-purple-600 bg-purple-50 dark:bg-purple-950/50"
          />
        </Link>
        <Link href="/legal/documents?status=APPROVED">
          <StatCard
            title="Approved"
            value={stats.approvedCount}
            description="Active & legally binding"
            icon={CheckCircle2}
            iconColor="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50"
          />
        </Link>
      </div>

      {/* Work Queue & Recent Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Queue Card */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Actionable Work Queue ({actionableTasks.length})
              </CardTitle>
            </div>
            <Link
              href="/legal/tasks"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-0 divide-y flex-1">
            {actionableTasks.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState
                  icon={CheckCircle2}
                  title="Work Queue Clear"
                  description="There are no pending review, revision, or approval tasks assigned right now."
                />
              </div>
            ) : (
              actionableTasks.map((task: LegalTask) => {
                const priorityVariant = getPriorityVariant(task.priority)
                return (
                  <div
                    key={task.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge
                          variant={priorityVariant}
                          label={task.priority}
                          size="sm"
                          showDot={false}
                        />
                        <span className="text-xs font-semibold text-foreground truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {task.project}
                        </span>
                        <span>&bull;</span>
                        <span>Assignee: {task.assignee.name.split(" ")[0]}</span>
                        <span>&bull;</span>
                        <span>Due: {task.dueDate}</span>
                      </div>
                    </div>

                    <Link href={task.actionUrl} className="shrink-0 self-end sm:self-center">
                      <Button size="xs" variant="outline" className="text-xs gap-1 cursor-pointer">
                        <span>{task.actionLabel}</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Collaboration Snapshot */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Incoming Requests
              </CardTitle>
            </div>
            <Link
              href="/legal/requests"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>All Requests</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-5 space-y-3 flex-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Business Development, Projects, and Finance teams collaborate with Legal for contract reviews and NDA drafting.
            </p>

            <div className="rounded-lg bg-muted/40 p-3.5 border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Open Requests:</span>
                <span className="font-bold text-foreground">
                  {stats.incomingRequestsCount} items
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Projects:</span>
                <span className="font-bold text-foreground">5 Projects</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg Response Time:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  1.2 Days
                </span>
              </div>
            </div>

            <Link href="/legal/requests" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs cursor-pointer">
                Manage Collaboration Requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Recent Business Documents
              </CardTitle>
            </div>
            <Link
              href="/legal/documents"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>View Registry</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 pl-5">Document & Ref Number</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Version</th>
                  <th className="p-3 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentDocs.map((doc: LegalDocument) => {
                  const statusCfg = getStatusConfig(doc.status)
                  return (
                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-5">
                        <Link
                          href={`/legal/documents/${doc.id}`}
                          className="font-semibold text-foreground hover:text-primary hover:underline line-clamp-1"
                        >
                          {doc.title}
                        </Link>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {doc.documentNumber}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {doc.type}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge
                          variant={statusCfg.variant}
                          label={statusCfg.label}
                          size="sm"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono text-muted-foreground">
                          v{doc.currentVersion}.0
                        </span>
                      </td>
                      <td className="p-3 pr-5 text-right whitespace-nowrap">
                        <Link
                          href={`/legal/documents/${doc.id}`}
                          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          <span>Open</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Audit Activity Feed */}
        <Card>
          <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Recent Activity Log
              </CardTitle>
            </div>
            <Link
              href="/legal/activity"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-5 max-h-[380px] overflow-y-auto">
            <ActivityTimeline activities={activities} maxItems={4} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
