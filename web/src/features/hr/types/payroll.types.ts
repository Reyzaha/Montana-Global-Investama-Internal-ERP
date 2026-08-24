export interface PayrollDocument {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeDepartment?: string;
  period: string; // e.g. "August 2026", "July 2026"
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
  publishedAt: string;
  publishedBy: string;
  publishedByName?: string;
  isRead?: boolean;
}

export interface UploadPayrollInput {
  employeeId: string;
  period: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
  publishedBy: string;
}
