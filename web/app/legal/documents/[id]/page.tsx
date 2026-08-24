"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Eye,
  Download,
  User,
  Tag,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { WorkflowTimeline, WorkflowStepItem } from "@/components/shared/workflow-timeline"
import { ActivityTimeline } from "@/components/shared/activity-timeline"
import { EmptyState } from "@/components/shared/empty-state"
import { DocumentReviewPanel } from "@/src/features/legal/components/document-review-panel"
import { DocumentApprovalCard } from "@/src/features/legal/components/document-approval-card"
import { DocumentVersionHistory } from "@/src/features/legal/components/document-version-history"
import { DocumentCommentSection } from "@/src/features/legal/components/document-comment-section"
import { DocumentPreviewModal } from "@/src/features/legal/components/document-preview-modal"
import { useLegal, useLegalDocument } from "@/src/features/legal/context/legal-context"
import { getPriorityVariant, getStatusConfig } from "@/src/features/legal/types/status-helper"

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { document: doc, loading } = useLegalDocument(id)
  const { activities } = useLegal()
  const [previewOpen, setPreviewOpen] = React.useState(false)

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading document workspace...</span>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <EmptyState
        icon={FileText}
        title="Document Not Found"
        description="The requested business document could not be located in the legal registry."
        actionLabel="Back to Document Registry"
        onAction={() => {
          router.push("/legal/documents")
        }}
      />
    )
  }

  const statusCfg = getStatusConfig(doc.status)
  const priorityVariant = getPriorityVariant(doc.priority)
  const activeVersion =
    doc.versions.find((v) => v.version === doc.currentVersion) ?? doc.versions[0]

  // Filter activities for this document
  const docActivities = activities.filter(
    (a) => a.documentId === doc.id || a.documentNumber === doc.documentNumber
  )

  // Construct dynamic stepped workflow timeline
  const workflowSteps: WorkflowStepItem[] = [
    {
      id: "step-1",
      title: "1. Document Uploaded",
      subtitle: `v1.0 by ${doc.uploadedBy.name}`,
      assignee: doc.uploadedBy.department,
      state: "completed",
      timestamp: doc.createdAt.split(" ")[0],
    },
    {
      id: "step-2",
      title: "2. Submitted for Review",
      subtitle: "Formal review request",
      assignee: doc.assignedLegalPic.name,
      state:
        doc.status === "DRAFT"
          ? "upcoming"
          : "completed",
    },
    {
      id: "step-3",
      title: "3. Legal Review",
      subtitle:
        doc.status === "REVISION_REQUIRED"
          ? "Revision Requested"
          : doc.status === "RESUBMITTED"
          ? "Resubmission In Review"
          : doc.status === "UNDER_REVIEW"
          ? "Reviewing Clauses"
          : doc.status === "DRAFT" || doc.status === "SUBMITTED"
          ? "Pending Review"
          : "Review Passed",
      assignee: doc.assignedLegalPic.name,
      state:
        doc.status === "REVISION_REQUIRED"
          ? "warning"
          : doc.status === "UNDER_REVIEW" || doc.status === "RESUBMITTED"
          ? "current"
          : doc.status === "DRAFT" || doc.status === "SUBMITTED"
          ? "upcoming"
          : "completed",
      note: doc.revisionReason,
    },
    {
      id: "step-4",
      title: "4. Executive Approval",
      subtitle:
        doc.status === "PENDING_APPROVAL"
          ? "Awaiting Director Decision"
          : doc.status === "APPROVED"
          ? "Approved & Effective"
          : doc.status === "REJECTED"
          ? "Rejected by Director"
          : "Pending Review Step",
      assignee: doc.approver?.name ?? "Director",
      state:
        doc.status === "APPROVED"
          ? "completed"
          : doc.status === "REJECTED"
          ? "rejected"
          : doc.status === "PENDING_APPROVAL"
          ? "current"
          : "upcoming",
      note: doc.rejectionReason,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/legal" className="hover:underline hover:text-foreground">
              Legal
            </Link>
            <span>/</span>
            <Link href="/legal/documents" className="hover:underline hover:text-foreground">
              Documents
            </Link>
            <span>/</span>
            <span className="font-mono text-foreground font-medium">
              {doc.documentNumber}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
              {doc.title}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Eye className="size-3.5" />
            <span>Document Preview</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => alert(`Downloading ${activeVersion.fileName}...`)}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Download</span>
          </Button>
        </div>
      </div>

      {/* Answer to Question 2: WHAT IS THE CURRENT STATUS & GOVERNANCE? */}
      <Card className="bg-card border shadow-2xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge
              variant={statusCfg.variant}
              label={statusCfg.label}
              size="lg"
            />
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">
                {statusCfg.labelId} &bull; v{doc.currentVersion}.0 Active
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {statusCfg.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">
                Priority
              </span>
              <StatusBadge
                variant={priorityVariant}
                label={doc.priority}
                size="sm"
                showDot={false}
              />
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">
                Document Type
              </span>
              <span className="font-semibold text-foreground">{doc.type}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Stepper Timeline */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Document Workflow Progress
          </h2>
          <span className="text-xs text-muted-foreground">
            Stage {statusCfg.stepIndex + 1} of 4
          </span>
        </div>
        <WorkflowTimeline steps={workflowSteps} orientation="horizontal" />
      </Card>

      {/* Answer to Question 4: WHAT MUST BE DONE NOW? (Review / Approval Action Panels) */}
      <div className="space-y-4">
        <DocumentReviewPanel document={doc} />
        <DocumentApprovalCard document={doc} />
      </div>

      {/* 2-Column Information Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Document Details, Version History & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Answer to Question 1: WHAT IS THIS DOCUMENT? */}
          <Card>
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Document Metadata & Commercial Scope
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {doc.description && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">
                    Description / Scope:
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <span className="text-muted-foreground block">Related Project:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {doc.project}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block">Reference Number:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {doc.documentNumber}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block">Effective Period:</span>
                  <span className="text-foreground">
                    {doc.effectiveDate ?? "Upon Signature"} s/d {doc.expirationDate ?? "Open-ended"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block">Active File:</span>
                  <span className="font-medium text-foreground">
                    {activeVersion.fileName}
                  </span>
                </div>
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="pt-2 border-t flex items-center gap-1.5 flex-wrap">
                  <Tag className="size-3 text-muted-foreground" />
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer to Question 5: WHAT VERSIONS EXIST? */}
          <DocumentVersionHistory
            document={doc}
            onOpenPreview={() => setPreviewOpen(true)}
          />

          {/* Comments & Review Notes Thread */}
          <DocumentCommentSection document={doc} />
        </div>

        {/* Right 1 Col: Answer to Question 3 (WHO IS RESPONSIBLE?) & Full Audit Trail */}
        <div className="space-y-6">
          {/* Stakeholders & Responsibility Matrix */}
          <Card>
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-primary" />
                Stakeholders & Responsibility Matrix
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Uploader / Originator */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  1. Originating Requester
                </span>
                <div className="rounded-lg border bg-muted/20 p-2.5 space-y-0.5">
                  <div className="font-semibold text-foreground">
                    {doc.uploadedBy.name}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {doc.uploadedBy.title} ({doc.uploadedBy.department})
                  </div>
                </div>
              </div>

              {/* Legal Reviewer */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  2. Assigned Legal Reviewer
                </span>
                <div className="rounded-lg border bg-muted/20 p-2.5 space-y-0.5">
                  <div className="font-semibold text-foreground">
                    {doc.assignedLegalPic.name}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {doc.assignedLegalPic.title}
                  </div>
                </div>
              </div>

              {/* Approver */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  3. Executive Approver
                </span>
                <div className="rounded-lg border bg-muted/20 p-2.5 space-y-0.5">
                  <div className="font-semibold text-foreground">
                    {doc.approver?.name ?? "Ir. Suryo Montana, M.B.A."}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {doc.approver?.title ?? "Managing Director & CEO"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit History Log for this Document */}
          <Card>
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4 text-primary" />
                Audit Trail Log
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 max-h-[420px] overflow-y-auto">
              <ActivityTimeline activities={docActivities} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={doc}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
