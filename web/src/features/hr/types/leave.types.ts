export type LeaveType = "SICK" | "ANNUAL_LEAVE" | "PERMISSION";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  SICK: "Sakit",
  ANNUAL_LEAVE: "Cuti",
  PERMISSION: "Izin",
};

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeDepartment?: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
  attachmentName?: string;
  attachmentUrl?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface CreateLeaveInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  description: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface ReviewLeaveInput {
  requestId: string;
  reviewerId: string;
  status: "APPROVED" | "REJECTED";
  reviewComment?: string; // Mandatory when REJECTED
}
