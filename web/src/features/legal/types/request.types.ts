import { PriorityLevel } from "./document.types"
import { Department, UserReference } from "./user.types"

export type LegalRequestType =
  | "Contract Review"
  | "Drafting NDA"
  | "MoU Preparation"
  | "Legal Opinion & Advisory"
  | "Dispute Consultation"
  | "Regulatory & Compliance Audit"
  | "Power of Attorney (Surat Kuasa)"

export type LegalRequestStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"

export interface LegalRequest {
  id: string
  requestNumber: string
  title: string
  requester: UserReference
  department: Department
  requestType: LegalRequestType
  relatedProject: string
  relatedDocumentId?: string
  relatedDocumentTitle?: string
  description: string
  priority: PriorityLevel
  status: LegalRequestStatus
  assignedLegalPic: UserReference
  targetDate: string
  createdAt: string
  updatedAt: string
  resolutionNotes?: string
}

export interface CreateLegalRequestInput {
  title: string
  requestType: LegalRequestType
  department: Department
  relatedProject: string
  relatedDocumentId?: string
  description: string
  priority: PriorityLevel
  targetDate: string
}
