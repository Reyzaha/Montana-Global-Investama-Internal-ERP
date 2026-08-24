import { PriorityLevel } from "./document.types"
import { UserReference } from "./user.types"

export type TaskCategory =
  | "PENDING_REVIEW"
  | "REVISION_REQUIRED"
  | "PENDING_APPROVAL"
  | "COMPLETED"

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED"

export interface LegalTask {
  id: string
  title: string
  documentId: string
  documentTitle: string
  project: string
  category: TaskCategory
  requester: UserReference
  assignee: UserReference
  priority: PriorityLevel
  status: TaskStatus
  dueDate: string
  actionUrl: string
  actionLabel: string
  createdAt: string
  completedAt?: string
}

export interface TaskFilter {
  category?: TaskCategory | "ALL"
  priority?: PriorityLevel | "ALL"
  search?: string
}
