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
import { FileUpload, UploadedFileInfo } from "@/components/shared/file-upload"
import { UploadCloud } from "lucide-react"

export interface DocumentResubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: number
  documentTitle?: string
  documentNumber: string
  onSubmit: (data: {
    file: { name: string; size: number; type: string }
    changeSummary: string
    responseNotes?: string
  }) => Promise<void>
}

export function DocumentResubmitDialog({
  open,
  onOpenChange,
  currentVersion,
  documentNumber,
  onSubmit,
}: DocumentResubmitDialogProps) {
  const nextVersion = currentVersion + 1
  const [selectedFile, setSelectedFile] = React.useState<UploadedFileInfo | null>(null)
  const [changeSummary, setChangeSummary] = React.useState("")
  const [responseNotes, setResponseNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError("Please select or drop the revised document file.")
      return
    }
    if (!changeSummary.trim()) {
      setError("Please summarize the changes made in this version.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await onSubmit({
        file: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        },
        changeSummary: changeSummary.trim(),
        responseNotes: responseNotes.trim() || undefined,
      })
      onOpenChange(false)
      setSelectedFile(null)
      setChangeSummary("")
      setResponseNotes("")
    } catch {
      setError("Failed to resubmit new version.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <UploadCloud className="size-5" />
              <DialogTitle>Upload Revised Version (v{nextVersion}.0)</DialogTitle>
            </div>
            <DialogDescription>
              Resubmitting <strong>{documentNumber}</strong> for Legal verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Revised Document File <span className="text-destructive">*</span>
              </label>
              <FileUpload
                value={selectedFile}
                onFileSelect={(file) => setSelectedFile(file)}
                helperText="Upload the updated draft with revisions addressed (.pdf, .docx)"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Summary of Changes <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Klausul ganti rugi Pasal 5 ayat 2 disesuaikan sesuai arahan Legal PIC..."
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Notes for Legal Reviewer (Optional)
              </label>
              <Textarea
                placeholder="Tuliskan klarifikasi tambahan terkait poin-poin yang telah direvisi..."
                rows={3}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
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
              disabled={loading || !selectedFile || !changeSummary.trim()}
            >
              {loading ? "Submitting..." : `Resubmit as v${nextVersion}.0`}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
