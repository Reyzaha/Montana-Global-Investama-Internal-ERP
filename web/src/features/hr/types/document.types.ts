export interface DocumentRecipient {
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  deliveredAt: string;
  readAt: string | null;
}

export interface HrDocument {
  id: string;
  title: string;
  type: string; // e.g. "Policy", "Handbook", "Form", "Announcement", "Contract"
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
  recipients: DocumentRecipient[];
}

export interface ShareDocumentInput {
  title: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
  uploadedBy: string;
  recipientUserIds: string[];
}
