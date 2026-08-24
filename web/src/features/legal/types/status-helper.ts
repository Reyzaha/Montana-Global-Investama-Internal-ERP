import { DOCUMENT_STATUS, DocumentStatus, PriorityLevel } from "./document.types"
import { StatusVariant } from "@/components/shared/status-badge"

export interface StatusConfig {
  label: string
  labelId: string
  variant: StatusVariant
  description: string
  stepIndex: number
}

export const STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
  [DOCUMENT_STATUS.DRAFT]: {
    label: "Draft",
    labelId: "Draf Dokumen",
    variant: "draft",
    description: "Document is being prepared and has not been submitted.",
    stepIndex: 0,
  },
  [DOCUMENT_STATUS.SUBMITTED]: {
    label: "Submitted",
    labelId: "Diajukan",
    variant: "submitted",
    description: "Document submitted for Legal review.",
    stepIndex: 1,
  },
  [DOCUMENT_STATUS.UNDER_REVIEW]: {
    label: "Under Review",
    labelId: "Sedang Ditinjau Legal",
    variant: "in-progress",
    description: "Legal PIC is actively reviewing clauses, risks, and compliance.",
    stepIndex: 2,
  },
  [DOCUMENT_STATUS.REVISION_REQUIRED]: {
    label: "Revision Required",
    labelId: "Perlu Revisi",
    variant: "warning",
    description: "Legal PIC requested specific clause modifications before approval.",
    stepIndex: 2,
  },
  [DOCUMENT_STATUS.RESUBMITTED]: {
    label: "Resubmitted",
    labelId: "Diajukan Ulang",
    variant: "submitted",
    description: "Updated version has been uploaded by the requester for re-review.",
    stepIndex: 3,
  },
  [DOCUMENT_STATUS.PENDING_APPROVAL]: {
    label: "Pending Approval",
    labelId: "Menunggu Persetujuan Direksi",
    variant: "pending",
    description: "Legal review passed. Awaiting final executive approval from Director.",
    stepIndex: 4,
  },
  [DOCUMENT_STATUS.APPROVED]: {
    label: "Approved",
    labelId: "Disetujui",
    variant: "success",
    description: "Document has been formally approved and is effective.",
    stepIndex: 5,
  },
  [DOCUMENT_STATUS.REJECTED]: {
    label: "Rejected",
    labelId: "Ditolak",
    variant: "danger",
    description: "Document was rejected during final review or approval.",
    stepIndex: 5,
  },
}

export function getStatusConfig(status: DocumentStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG[DOCUMENT_STATUS.DRAFT]
}

export function getPriorityVariant(priority: PriorityLevel): StatusVariant {
  switch (priority) {
    case "URGENT":
      return "danger"
    case "HIGH":
      return "warning"
    case "MEDIUM":
      return "in-progress"
    case "LOW":
    default:
      return "neutral"
  }
}
