"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Ban,
  AlertOctagon,
} from "lucide-react"
import { LegalDocument } from "../types/document.types"
import { useLegal } from "../context/legal-context"
import { PermissionGate } from "../permissions/permission-gate"
import { LEGAL_PERMISSIONS } from "../permissions/permissions.config"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function DocumentApprovalCard({ document: doc }: { document: LegalDocument }) {
  const { approveDocument, rejectDocument } = useLegal()
  const [approveOpen, setApproveOpen] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [approvalNotes, setApprovalNotes] = React.useState("")
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [rejectError, setRejectError] = React.useState("")

  const handleApprove = async () => {
    setLoading(true)
    try {
      await approveDocument(doc.id, {
        decision: "APPROVED",
        notes: approvalNotes || undefined,
      })
      setApproveOpen(false)
      setApprovalNotes("")
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      setRejectError("Rejection reason is mandatory.")
      return
    }

    setLoading(true)
    setRejectError("")
    try {
      await rejectDocument(doc.id, {
        decision: "REJECTED",
        reason: rejectionReason.trim(),
      })
      setRejectOpen(false)
      setRejectionReason("")
    } finally {
      setLoading(false)
    }
  }

  // If Pending Approval
  if (doc.status === "PENDING_APPROVAL") {
    return (
      <>
        <Card className="border-purple-500/40 bg-purple-50/20 dark:bg-purple-950/20 shadow-xs">
          <CardHeader className="py-3 px-5 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Executive Approval Required
              </CardTitle>
            </div>
            <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 px-2 py-0.5 text-xs font-semibold">
              Pending Director Decision
            </span>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Authorized Approver: </span>
                <span className="font-semibold text-foreground">
                  {doc.approver?.name ?? "Ir. Suryo Montana, M.B.A."} ({doc.approver?.title ?? "Managing Director"})
                </span>
              </div>
              <div className="text-muted-foreground">
                Version under review: <strong className="text-foreground">v{doc.currentVersion}.0</strong>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Legal review has been completed and verified. Final corporate executive authority is required to execute this contract.
            </p>

            <PermissionGate
              anyPermissions={[
                LEGAL_PERMISSIONS.APPROVAL_APPROVE,
                LEGAL_PERMISSIONS.APPROVAL_REJECT,
              ]}
              fallback={
                <div className="rounded bg-muted/50 p-2.5 text-xs text-muted-foreground italic border">
                  Only Director / Executive Approvers can sign or reject this document. (Switch persona to Director at top to test).
                </div>
              }
            >
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 cursor-pointer"
                >
                  <Ban className="size-3.5 mr-1" />
                  <span>Reject Document</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  <span>Approve & Authorize</span>
                </Button>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>

        {/* Approval Modal */}
        <ConfirmationDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          title="Approve Document?"
          description={`Provide formal executive approval for ${doc.documentNumber} (${doc.title}). This will mark the document as formally approved and legally binding.`}
          confirmLabel="Authorize & Approve"
          variant="success"
          onConfirm={handleApprove}
          loading={loading}
        >
          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-foreground">
              Approval Notes / Execution Memo (Optional):
            </label>
            <Textarea
              placeholder="e.g. Disetujui untuk penandatanganan dan implementasi operasional..."
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
        </ConfirmationDialog>

        {/* Rejection Modal with Mandatory Reason */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogPopup className="sm:max-w-md">
            <form onSubmit={handleReject} className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <AlertOctagon className="size-5" />
                  <DialogTitle>Reject Document</DialogTitle>
                </div>
                <DialogDescription>
                  Please provide the formal reason for rejecting <strong>{doc.documentNumber}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2 text-left">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Rejection <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="e.g. Struktur biaya Capex melebihi batas toleransi IRR 14% sesuai hasil rapat Direksi..."
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
                {rejectError && (
                  <p className="text-xs font-medium text-destructive">
                    {rejectError}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={loading || !rejectionReason.trim()}
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </DialogFooter>
            </form>
          </DialogPopup>
        </Dialog>
      </>
    )
  }

  // If Approved
  if (doc.status === "APPROVED") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-2xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-foreground">
                Document Formally Approved & Effective
              </h4>
              <p className="text-xs text-muted-foreground">
                Approved by {doc.approvedBy?.name ?? "Director"} on {doc.approvedAt ?? doc.updatedAt}.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <span>Version executed: v{doc.currentVersion}.0</span>
                <span>&bull;</span>
                <span>Effective: {doc.effectiveDate ?? "Immediate"}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
            COMPLIANT & ACTIVE
          </div>
        </CardContent>
      </Card>
    )
  }

  // If Rejected
  if (doc.status === "REJECTED") {
    return (
      <Card className="border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20 shadow-2xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
              <XCircle className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-semibold text-sm text-destructive">
                Document Formally Rejected
              </h4>
              <p className="text-xs text-foreground font-medium">
                Reason: &ldquo;{doc.rejectionReason}&rdquo;
              </p>
              <p className="text-[11px] text-muted-foreground">
                Rejected by {doc.rejectionBy?.name ?? "Director"} on {doc.rejectedAt ?? doc.updatedAt}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
