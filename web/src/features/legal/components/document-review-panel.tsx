"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  UploadCloud,
  FileCheck,
  UserCheck,
} from "lucide-react"
import { LegalDocument } from "../types/document.types"
import { useLegal } from "../context/legal-context"
import { PermissionGate } from "../permissions/permission-gate"
import { LEGAL_PERMISSIONS } from "../permissions/permissions.config"
import { DocumentRevisionDialog } from "./document-revision-dialog"
import { DocumentResubmitDialog } from "./document-resubmit-dialog"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"

export function DocumentReviewPanel({ document: doc }: { document: LegalDocument }) {
  const { startReview, requestRevision, resubmitDocument, passReview, submitForReview } =
    useLegal()

  const [revisionOpen, setRevisionOpen] = React.useState(false)
  const [resubmitOpen, setResubmitOpen] = React.useState(false)
  const [passReviewOpen, setPassReviewOpen] = React.useState(false)
  const [passNotes, setPassNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleStartReview = async () => {
    setLoading(true)
    try {
      await startReview(doc.id)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    setLoading(true)
    try {
      await submitForReview(doc.id)
    } finally {
      setLoading(false)
    }
  }

  const handlePassReviewConfirm = async () => {
    setLoading(true)
    try {
      await passReview(doc.id, passNotes)
      setPassReviewOpen(false)
      setPassNotes("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Draft State Action */}
      {doc.status === "DRAFT" && (
        <Card className="border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Send className="size-4 text-sky-600" />
              Document in Draft State
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              This document is currently a draft. Submit it when you are ready for the Legal department to begin reviewing.
            </p>
            <PermissionGate permission={LEGAL_PERMISSIONS.DOCUMENT_SUBMIT}>
              <Button
                size="sm"
                onClick={handleSubmitForReview}
                disabled={loading}
                className="gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Submit for Review</span>
              </Button>
            </PermissionGate>
          </CardContent>
        </Card>
      )}

      {/* Revision Required Banner */}
      {doc.status === "REVISION_REQUIRED" && (
        <Alert variant="warning">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-sm font-semibold">
            Action Required: Document Revision Requested
          </AlertTitle>
          <AlertDescription className="space-y-3 mt-1">
            <div className="rounded-md bg-amber-100/60 dark:bg-amber-950/60 p-3 text-xs text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
              <p className="font-semibold mb-1">
                Note from Legal PIC ({doc.revisionRequestedBy?.name ?? "Legal Reviewer"}):
              </p>
              <p className="italic leading-relaxed">&ldquo;{doc.revisionReason}&rdquo;</p>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                Please upload an updated draft (v{doc.currentVersion + 1}.0) addressing the legal notes above.
              </span>
              <PermissionGate permission={LEGAL_PERMISSIONS.DOCUMENT_RESUBMIT}>
                <Button
                  size="sm"
                  onClick={() => setResubmitOpen(true)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  <UploadCloud className="size-3.5" />
                  <span>Upload Revised Version</span>
                </Button>
              </PermissionGate>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Legal Review Panel */}
      {(doc.status === "SUBMITTED" ||
        doc.status === "UNDER_REVIEW" ||
        doc.status === "RESUBMITTED") && (
        <Card className="border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <FileCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
                Legal Review Stage
              </CardTitle>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <UserCheck className="size-3" />
                Assigned: {doc.assignedLegalPic.name}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="text-xs text-muted-foreground leading-relaxed">
              {doc.status === "SUBMITTED" &&
                "Document submitted by requester. Legal PIC should review terms, indemnities, liability caps, and compliance."}
              {doc.status === "UNDER_REVIEW" &&
                "Legal review is currently in progress. You may request clause revisions from the requester or pass this review to the Director."}
              {doc.status === "RESUBMITTED" &&
                `Requester has uploaded revised version v${doc.currentVersion}.0. Please verify that all revision points have been properly addressed.`}
            </div>

            {/* Legal Review Actions */}
            <PermissionGate permission={LEGAL_PERMISSIONS.REVIEW_PERFORM}>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                {doc.status === "SUBMITTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartReview}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    Start Reviewing
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRevisionOpen(true)}
                  className="gap-1.5 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                >
                  <AlertTriangle className="size-3.5" />
                  <span>Request Revision</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setPassReviewOpen(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Pass Review & Forward to Director</span>
                </Button>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>
      )}

      {/* Revision Modal */}
      <DocumentRevisionDialog
        open={revisionOpen}
        onOpenChange={setRevisionOpen}
        documentTitle={doc.title}
        documentNumber={doc.documentNumber}
        onSubmit={async (data) => {
          await requestRevision(doc.id, data)
        }}
      />

      {/* Resubmit Modal */}
      <DocumentResubmitDialog
        open={resubmitOpen}
        onOpenChange={setResubmitOpen}
        currentVersion={doc.currentVersion}
        documentTitle={doc.title}
        documentNumber={doc.documentNumber}
        onSubmit={async (data) => {
          await resubmitDocument(doc.id, data)
        }}
      />

      {/* Pass Review Confirmation Modal */}
      <ConfirmationDialog
        open={passReviewOpen}
        onOpenChange={setPassReviewOpen}
        title="Pass Legal Review?"
        description={`Confirm that ${doc.documentNumber} has met all corporate legal standards and is ready for executive approval by Managing Director.`}
        confirmLabel="Pass Review & Escalate"
        variant="success"
        onConfirm={handlePassReviewConfirm}
        loading={loading}
      >
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-medium text-foreground">
            Legal Recommendation / Notes for Director (Optional):
          </label>
          <textarea
            className="w-full rounded-md border p-2 text-xs bg-background outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="e.g. Klausul risiko hukum telah aman. Rekomendasi disetujui untuk penandatanganan."
            value={passNotes}
            onChange={(e) => setPassNotes(e.target.value)}
          />
        </div>
      </ConfirmationDialog>
    </div>
  )
}
