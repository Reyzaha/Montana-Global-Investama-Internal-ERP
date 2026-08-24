import {
  ApprovalInput,
  CreateDocumentInput,
  DocumentComment,
  DocumentFilter,
  LegalDocument,
  RequestRevisionInput,
  ResubmitDocumentInput,
} from "../types/document.types"
import { LegalTask, TaskFilter } from "../types/task.types"
import { CreateLegalRequestInput, LegalRequest } from "../types/request.types"
import { LegalActivity } from "../types/activity.types"
import { UserReference } from "../types/user.types"

export interface LegalDashboardStats {
  totalDocuments: number
  pendingReviewCount: number
  revisionRequiredCount: number
  pendingApprovalCount: number
  approvedCount: number
  rejectedCount: number
  draftCount: number
  activeTasksCount: number
  incomingRequestsCount: number
}

export interface LegalDocumentRepository {
  getDocuments(filter?: DocumentFilter): Promise<LegalDocument[]>
  getDocumentById(id: string): Promise<LegalDocument | null>
  createDocument(
    input: CreateDocumentInput,
    user: UserReference
  ): Promise<LegalDocument>
  submitForReview(id: string, user: UserReference): Promise<LegalDocument>
  startReview(id: string, user: UserReference): Promise<LegalDocument>
  requestRevision(
    id: string,
    input: RequestRevisionInput,
    user: UserReference
  ): Promise<LegalDocument>
  resubmitDocument(
    id: string,
    input: ResubmitDocumentInput,
    user: UserReference
  ): Promise<LegalDocument>
  passReview(
    id: string,
    notes?: string,
    user?: UserReference
  ): Promise<LegalDocument>
  approveDocument(
    id: string,
    input: ApprovalInput,
    user: UserReference
  ): Promise<LegalDocument>
  rejectDocument(
    id: string,
    input: ApprovalInput,
    user: UserReference
  ): Promise<LegalDocument>
  addComment(
    documentId: string,
    content: string,
    user: UserReference,
    isInternalOnly?: boolean
  ): Promise<DocumentComment>

  getTasks(filter?: TaskFilter): Promise<LegalTask[]>
  getRequests(): Promise<LegalRequest[]>
  createRequest(
    input: CreateLegalRequestInput,
    user: UserReference
  ): Promise<LegalRequest>
  getActivities(documentId?: string): Promise<LegalActivity[]>
  getDashboardStats(): Promise<LegalDashboardStats>
}
