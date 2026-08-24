export type HrPermission =
  | "hr.dashboard.view"
  | "hr.employee.view"
  | "hr.employee.manage"
  | "hr.attendance.view"
  | "hr.attendance.settings.manage"
  | "hr.leave.view"
  | "hr.leave.approve"
  | "hr.leave.reject"
  | "hr.document.upload"
  | "hr.document.share"
  | "hr.document.view"
  | "hr.payroll.upload"
  | "hr.payroll.publish"
  | "hr.payroll.view";

export type EmployeePermission =
  | "attendance.checkin"
  | "attendance.checkout"
  | "attendance.view"
  | "leave.create"
  | "leave.view"
  | "document.view"
  | "payroll.view"
  | "notification.view"
  | "notification.read";

export type SystemPermission = HrPermission | EmployeePermission;

export const HR_PERMISSIONS: HrPermission[] = [
  "hr.dashboard.view",
  "hr.employee.view",
  "hr.employee.manage",
  "hr.attendance.view",
  "hr.attendance.settings.manage",
  "hr.leave.view",
  "hr.leave.approve",
  "hr.leave.reject",
  "hr.document.upload",
  "hr.document.share",
  "hr.document.view",
  "hr.payroll.upload",
  "hr.payroll.publish",
  "hr.payroll.view",
];

export const EMPLOYEE_BASE_PERMISSIONS: EmployeePermission[] = [
  "attendance.checkin",
  "attendance.checkout",
  "attendance.view",
  "leave.create",
  "leave.view",
  "document.view",
  "payroll.view",
  "notification.view",
  "notification.read",
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  HR: [...HR_PERMISSIONS, ...EMPLOYEE_BASE_PERMISSIONS],
  IT: [...EMPLOYEE_BASE_PERMISSIONS],
  LEGAL: [...EMPLOYEE_BASE_PERMISSIONS],
  FINANCE: [...EMPLOYEE_BASE_PERMISSIONS],
  BUSINESS_DEVELOPMENT: [...EMPLOYEE_BASE_PERMISSIONS],
  CEO: [...EMPLOYEE_BASE_PERMISSIONS],
  EMPLOYEE: [...EMPLOYEE_BASE_PERMISSIONS],
};

export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role.toUpperCase()] ?? EMPLOYEE_BASE_PERMISSIONS;
  return permissions.includes(permission);
}
