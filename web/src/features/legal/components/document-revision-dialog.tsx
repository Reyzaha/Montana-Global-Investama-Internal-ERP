"use client"

import * as React from "react"
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"

export interface DocumentRevisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentTitle?: string
  documentNumber: string
  onSubmit: (data: { reason: string; clauses?: string; notes?: string }) => Promise<void>
}

export function DocumentRevisionDialog({
  open,
  onOpenChange,
  documentNumber,
  onSubmit,
}: DocumentRevisionDialogProps) {
  const [reason, setReason] = React.useState("")
  const [clauses, setClauses] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError("Please specify the main reason for revision.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await onSubmit({
        reason: reason.trim(),
        clauses: clauses.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
      setReason("")
      setClauses("")
      setNotes("")
    } catch {
      setError("Failed to submit revision request.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              <DialogTitle>Request Document Revision</DialogTitle>
            </div>
            <DialogDescription>
              Return <strong>{documentNumber}</strong> to the requester with detailed correction instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-left">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Reason for Revision <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Pasal 5 ayat 2 mengenai klausul ganti rugi perlu diselaraskan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Target Clauses / Articles (Optional)
              </label>
              <Input
                placeholder="e.g. Pasal 3.2, Pasal 5.1, Lampiran II"
                value={clauses}
                onChange={(e) => setClauses(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Detailed Legal Guidance & Instructions
              </label>
              <Textarea
                placeholder="Berikan arahan klausul pengganti atau referensi peraturan yang harus diperbaiki oleh PIC pengaju..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={loading || !reason.trim()}
            >
              {loading ? "Submitting..." : "Send Revision Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
