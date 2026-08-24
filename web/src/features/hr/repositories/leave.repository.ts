import {
  CreateLeaveInput,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  ReviewLeaveInput,
} from "../types/leave.types";

export interface LeaveRepository {
  createLeaveRequest(input: CreateLeaveInput): Promise<LeaveRequest>;
  getUserLeaveRequests(userId: string): Promise<LeaveRequest[]>;
  getAllLeaveRequests(filters?: {
    status?: LeaveStatus;
    type?: LeaveType;
    employeeId?: string;
  }): Promise<LeaveRequest[]>;
  reviewLeaveRequest(input: ReviewLeaveInput): Promise<LeaveRequest>;
}
