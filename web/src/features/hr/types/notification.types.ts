export type NotificationType =
  | "DOCUMENT_SHARED"
  | "PAYROLL_AVAILABLE"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "COLLABORATION_REQUEST"
  | "LEGAL_REVIEW_REQUEST"
  | "FINANCE_APPROVAL_REQUEST"
  | "PROJECT_TASK_ASSIGNED"
  | "SYSTEM";

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedEntityType?: "DOCUMENT" | "PAYROLL" | "LEAVE" | "PROJECT" | "LEGAL" | string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}
