import { HrDocument, ShareDocumentInput } from "../types/document.types";

export interface DocumentRepository {
  shareDocument(input: ShareDocumentInput): Promise<HrDocument>;
  getAllSharedDocuments(): Promise<HrDocument[]>;
  getUserDocuments(userId: string): Promise<HrDocument[]>;
  markDocumentAsRead(documentId: string, userId: string): Promise<void>;
}
