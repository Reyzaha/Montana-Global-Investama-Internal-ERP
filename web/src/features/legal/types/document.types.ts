import { UserReference } from "./user.types"

export const DOCUMENT_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVISION_REQUIRED: "REVISION_REQUIRED",
  RESUBMITTED: "RESUBMITTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS]

export const DOCUMENT_TYPE = {
  CONTRACT: "Contract",
  NDA: "NDA (Non-Disclosure Agreement)",
  MOU: "MoU (Memorandum of Understanding)",
  LEASE_AGREEMENT: "Lease Agreement",
  POWER_OF_ATTORNEY: "Power of Attorney (Surat Kuasa)",
  VENDOR_AGREEMENT: "Vendor Agreement",
  CORPORATE_RESOLUTION: "Corporate Resolution",
  COMPLIANCE: "Compliance & Regulatory Document",
} as const

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE]

export const PRIORITY_LEVEL = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const

export type PriorityLevel = (typeof PRIORITY_LEVEL)[keyof typeof PRIORITY_LEVEL]

export interface DocumentVersion {
  version: number
  fileName: string
  fileSize: number // in bytes
  fileType: string
  fileUrl?: string
  uploadedBy: UserReference
  uploadedAt: string
  changeSummary?: string
  clauseChanges?: string[]
}

export interface DocumentComment {
  id: string
  author: UserReference
  content: string
  createdAt: string
  versionTarget: number
  isInternalLegalOnly?: boolean
}

export interface LegalDocument {
  id: string
  documentNumber: string
  title: string
  type: DocumentType
  project: string
  description?: string
  status: DocumentStatus
  priority: PriorityLevel
  currentVersion: number
  versions: DocumentVersion[]
  uploadedBy: UserReference
  assignedLegalPic: UserReference
  approver?: UserReference
  tags?: string[]
  effectiveDate?: string
  expirationDate?: string
  revisionReason?: string
  revisionRequestedBy?: UserReference
  revisionRequestedAt?: string
  rejectionReason?: string
  rejectionBy?: UserReference
  rejectedAt?: string
  approvedBy?: UserReference
  approvedAt?: string
  comments: DocumentComment[]
  createdAt: string
  updatedAt: string
}

export interface CreateDocumentInput {
  title: string
  type: DocumentType
  project: string
  description?: string
  priority?: PriorityLevel
  assignedLegalPicId?: string
  tags?: string[]
  effectiveDate?: string
  expirationDate?: string
  file: {
    name: string
    size: number
    type: string
  }
  submitImmediately?: boolean
}

export interface RequestRevisionInput {
  reason: string
  clauses?: string
  notes?: string
}

export interface ResubmitDocumentInput {
  file: {
    name: string
    size: number
    type: string
  }
  changeSummary: string
  responseNotes?: string
}

export interface ApprovalInput {
  decision: "APPROVED" | "REJECTED"
  notes?: string
  reason?: string // Required if REJECTED
}

export interface DocumentFilter {
  search?: string
  status?: DocumentStatus | "ALL"
  type?: DocumentType | "ALL"
  priority?: PriorityLevel | "ALL"
  project?: string
  assignedToMe?: boolean
}
