import { UserReference } from "./user.types"

export type LegalEventType =
  | "upload"
  | "submit"
  | "review"
  | "revision"
  | "resubmit"
  | "approval"
  | "reject"
  | "comment"

export interface LegalActivity {
  id: string
  documentId?: string
  documentNumber?: string
  documentTitle?: string
  action: string
  description?: string
  actor: UserReference
  timestamp: string
  eventType: LegalEventType
  metadata?: Record<string, unknown>
}
