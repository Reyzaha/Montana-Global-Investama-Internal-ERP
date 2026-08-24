import { EmployeeProfile } from "../types/employee.types";

export interface HrDashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingLeaveRequests: number;
  documentsShared: number;
  payrollDocuments: number;
}

export interface EmployeeRepository {
  getAllEmployees(): Promise<EmployeeProfile[]>;
  getEmployeeById(id: string): Promise<EmployeeProfile | null>;
  getHrDashboardStats(): Promise<HrDashboardStats>;
}
