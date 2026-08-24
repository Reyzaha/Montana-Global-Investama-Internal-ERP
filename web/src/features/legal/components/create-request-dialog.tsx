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
import { HelpCircle } from "lucide-react"
import { LegalRequestType } from "../types/request.types"
import { Department } from "../types/user.types"
import { PriorityLevel } from "../types/document.types"
import { useLegal } from "../context/legal-context"
import { usePermissions } from "../permissions/permission-context"

const REQUEST_TYPES: LegalRequestType[] = [
  "Contract Review",
  "Drafting NDA",
  "MoU Preparation",
  "Legal Opinion & Advisory",
  "Dispute Consultation",
  "Regulatory & Compliance Audit",
  "Power of Attorney (Surat Kuasa)",
]

const DEPARTMENTS: Department[] = [
  "Business Development",
  "Finance & Accounting",
  "Project & Investment",
  "HR & GA",
  "IT",
]

export function CreateRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { createRequest } = useLegal()
  const { currentUser } = usePermissions()

  const [title, setTitle] = React.useState("")
  const [requestType, setRequestType] = React.useState<LegalRequestType>("Contract Review")
  const [department, setDepartment] = React.useState<Department>(currentUser.department)
  const [relatedProject, setRelatedProject] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<PriorityLevel>("MEDIUM")
  const [targetDate, setTargetDate] = React.useState("2026-08-30")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !relatedProject.trim() || !description.trim()) {
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await createRequest({
        title: title.trim(),
        requestType,
        department,
        relatedProject: relatedProject.trim(),
        description: description.trim(),
        priority,
        targetDate,
      })
      onOpenChange(false)
      setTitle("")
      setRelatedProject("")
      setDescription("")
    } catch {
      setError("Failed to create request.")
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
              <HelpCircle className="size-5" />
              <DialogTitle>Submit Cross-Department Legal Request</DialogTitle>
            </div>
            <DialogDescription>
              Request contract review, NDA drafting, or legal opinion from the Legal team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-left text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Request Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Review Perjanjian Pengadaan Sparepart Heavy Equipment..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Request Type</label>
                <select
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as LegalRequestType)}
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Origin Department</label>
                <select
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Related Project <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Sangatta Mining Phase 2"
                  value={relatedProject}
                  onChange={(e) => setRelatedProject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Priority</label>
                <select
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Target Completion Date</label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Detailed Requirement Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Jelaskan latar belakang permohonan, pihak-pihak terkait, dan poin khusus yang perlu diperhatikan oleh tim Legal..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
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
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Submitting..." : "Submit Legal Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
