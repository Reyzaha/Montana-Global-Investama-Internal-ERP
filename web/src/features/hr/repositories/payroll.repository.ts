import { PayrollDocument, UploadPayrollInput } from "../types/payroll.types";

export interface PayrollRepository {
  uploadPayrollDocument(input: UploadPayrollInput): Promise<PayrollDocument>;
  getAllPayrollDocuments(): Promise<PayrollDocument[]>;
  getUserPayrollDocuments(userId: string): Promise<PayrollDocument[]>;
  markPayrollAsRead(id: string): Promise<void>;
}
