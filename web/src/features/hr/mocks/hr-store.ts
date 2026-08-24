import {
  DEFAULT_ATTENDANCE_LOCATIONS,
  DEFAULT_WORK_SCHEDULE,
  MAX_ATTENDANCE_RADIUS,
  MIN_ATTENDANCE_RADIUS,
} from "../constants/attendance.constants";
import {
  Attendance,
  AttendanceLocation,
  AttendanceStatus,
  CheckInInput,
  CheckOutInput,
  WorkSchedule,
} from "../types/attendance.types";
import {
  CreateLeaveInput,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  ReviewLeaveInput,
} from "../types/leave.types";
import { HrDocument, ShareDocumentInput } from "../types/document.types";
import { PayrollDocument, UploadPayrollInput } from "../types/payroll.types";
import { Notification } from "../types/notification.types";
import { EmployeeProfile } from "../types/employee.types";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { LeaveRepository } from "../repositories/leave.repository";
import { DocumentRepository } from "../repositories/document.repository";
import { PayrollRepository } from "../repositories/payroll.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { EmployeeRepository, HrDashboardStats } from "../repositories/employee.repository";
import {
  getCurrentTimeString,
  getTodayDateString,
  isCheckInLate,
} from "../utils/date";
import { validateAttendanceLocation } from "../utils/geolocation";

export const INITIAL_TEST_EMPLOYEES: EmployeeProfile[] = [
  {
    id: "usr-hr",
    username: "hrtest1@tes.com",
    name: "HR Lead (Test)",
    role: "HR",
    department: "Human Resources",
    position: "HR Manager & People Operations",
    joinDate: "2024-01-15",
    isActive: true,
  },
  {
    id: "usr-it",
    username: "ittes1@tes.com",
    name: "IT Specialist (Test)",
    role: "IT",
    department: "IT",
    position: "Senior Systems Engineer",
    joinDate: "2024-02-01",
    isActive: true,
  },
  {
    id: "usr-legal",
    username: "legaltes1@tes.com",
    name: "Legal Counsel (Test)",
    role: "LEGAL",
    department: "Legal",
    position: "Corporate Legal Specialist",
    joinDate: "2024-03-10",
    isActive: true,
  },
  {
    id: "usr-finance",
    username: "financetes1@tes.com",
    name: "Finance Lead (Test)",
    role: "FINANCE",
    department: "Finance & Accounting",
    position: "Financial Controller",
    joinDate: "2024-01-20",
    isActive: true,
  },
  {
    id: "usr-bd",
    username: "busnistes1@tes.com",
    name: "Business Development Lead (Test)",
    role: "BUSINESS_DEVELOPMENT",
    department: "Business Development",
    position: "Business Development Manager",
    joinDate: "2024-04-05",
    isActive: true,
  },
  {
    id: "usr-ceo",
    username: "ceotes1@tes.com",
    name: "Chief Executive Officer (Test)",
    role: "CEO",
    department: "Executive",
    position: "Managing Director & CEO",
    joinDate: "2023-01-01",
    isActive: true,
  },
];

interface HrStoreState {
  employees: EmployeeProfile[];
  schedule: WorkSchedule;
  locations: AttendanceLocation[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  documents: HrDocument[];
  payrollDocuments: PayrollDocument[];
  notifications: Notification[];
}

const STORAGE_KEY = "mgi_hris_store_v1";

function getInitialState(): HrStoreState {
  return {
    employees: [...INITIAL_TEST_EMPLOYEES],
    schedule: { ...DEFAULT_WORK_SCHEDULE },
    locations: [...DEFAULT_ATTENDANCE_LOCATIONS],
    attendances: [], // 0 dummy data
    leaveRequests: [], // 0 dummy data
    documents: [], // 0 dummy data
    payrollDocuments: [], // 0 dummy data
    notifications: [], // 0 dummy data
  };
}

class InMemoryHrStore {
  private state: HrStoreState = getInitialState();
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.state = {
            ...getInitialState(),
            ...parsed,
            // Ensure employees always include our standard test accounts
            employees: INITIAL_TEST_EMPLOYEES,
          };
        }
      } catch (e) {
        console.warn("Failed to load HRIS store from localStorage:", e);
      }
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn("Failed to save HRIS store to localStorage:", e);
      }
    }
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public resetAllData() {
    this.state = getInitialState();
    this.persist();
  }

  // --- Attendance ---
  async getTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = getTodayDateString();
    return (
      this.state.attendances.find(
        (a) => (a.employeeId === userId || a.employeeId === this.resolveUserId(userId)) && a.date === today,
      ) || null
    );
  }

  async checkIn(input: CheckInInput): Promise<Attendance> {
    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();
    const employee = this.getEmployee(input.employeeId);

    // Validate location
    const validation = validateAttendanceLocation(
      input.latitude,
      input.longitude,
      this.state.locations,
    );

    if (!validation.isValid) {
      throw new Error(
        validation.errorMessage || "You are outside the allowed attendance radius.",
      );
    }

    const isLate = isCheckInLate(
      currentTime,
      this.state.schedule.checkInTime,
      this.state.schedule.lateThresholdMinutes,
    );

    const status: AttendanceStatus = isLate ? "LATE" : "CHECKED_IN";

    const existingIndex = this.state.attendances.findIndex(
      (a) => a.employeeId === employee.id && a.date === today,
    );

    const record: Attendance = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeDepartment: employee.department,
      date: today,
      scheduleId: this.state.schedule.id,
      scheduleName: this.state.schedule.name,
      checkInAt: currentTime,
      checkOutAt: null,
      locationId: validation.location?.id || null,
      locationName: validation.location?.name || "Unknown Office",
      checkInLatitude: input.latitude,
      checkInLongitude: input.longitude,
      checkInDistance: validation.distanceMeters,
      checkOutLatitude: null,
      checkOutLongitude: null,
      checkOutDistance: null,
      status,
      note: input.note,
    };

    if (existingIndex >= 0) {
      this.state.attendances[existingIndex] = {
        ...this.state.attendances[existingIndex],
        ...record,
      };
    } else {
      this.state.attendances.unshift(record);
    }

    this.persist();
    return record;
  }

  async checkOut(input: CheckOutInput): Promise<Attendance> {
    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();
    const employee = this.getEmployee(input.employeeId);

    const existingIndex = this.state.attendances.findIndex(
      (a) => a.employeeId === employee.id && a.date === today,
    );

    if (existingIndex < 0) {
      throw new Error("No check-in record found for today. Please check in first.");
    }

    const validation = validateAttendanceLocation(
      input.latitude,
      input.longitude,
      this.state.locations,
    );

    if (!validation.isValid) {
      throw new Error(
        validation.errorMessage || "You are outside the allowed attendance radius for checkout.",
      );
    }

    const updated: Attendance = {
      ...this.state.attendances[existingIndex],
      checkOutAt: currentTime,
      checkOutLatitude: input.latitude,
      checkOutLongitude: input.longitude,
      checkOutDistance: validation.distanceMeters,
      status: "COMPLETED",
      note: input.note || this.state.attendances[existingIndex].note,
    };

    this.state.attendances[existingIndex] = updated;
    this.persist();
    return updated;
  }

  async getAttendanceHistory(userId: string): Promise<Attendance[]> {
    const employee = this.getEmployee(userId);
    return this.state.attendances.filter((a) => a.employeeId === employee.id);
  }

  async getAllAttendance(filters?: {
    date?: string;
    employeeId?: string;
    status?: AttendanceStatus;
  }): Promise<Attendance[]> {
    return this.state.attendances.filter((a) => {
      if (filters?.date && a.date !== filters.date) return false;
      if (filters?.employeeId && a.employeeId !== filters.employeeId) return false;
      if (filters?.status && a.status !== filters.status) return false;
      return true;
    });
  }

  async getWorkSchedule(): Promise<WorkSchedule> {
    return { ...this.state.schedule };
  }

  async updateWorkSchedule(schedule: Partial<WorkSchedule>): Promise<WorkSchedule> {
    this.state.schedule = {
      ...this.state.schedule,
      ...schedule,
    };
    this.persist();
    return { ...this.state.schedule };
  }

  async getAttendanceLocations(): Promise<AttendanceLocation[]> {
    return [...this.state.locations];
  }

  async saveAttendanceLocation(
    location: Partial<AttendanceLocation> & {
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    },
  ): Promise<AttendanceLocation> {
    if (
      location.radiusMeters < MIN_ATTENDANCE_RADIUS ||
      location.radiusMeters > MAX_ATTENDANCE_RADIUS
    ) {
      throw new Error(
        `Radius must be between ${MIN_ATTENDANCE_RADIUS} and ${MAX_ATTENDANCE_RADIUS} meters.`,
      );
    }

    if (location.id) {
      const idx = this.state.locations.findIndex((l) => l.id === location.id);
      if (idx >= 0) {
        this.state.locations[idx] = {
          ...this.state.locations[idx],
          ...location,
        };
        this.persist();
        return this.state.locations[idx];
      }
    }

    const newLocation: AttendanceLocation = {
      id: `loc-${Date.now()}`,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      isActive: location.isActive ?? true,
      address: location.address || "",
    };

    this.state.locations.push(newLocation);
    this.persist();
    return newLocation;
  }

  async deleteAttendanceLocation(id: string): Promise<void> {
    this.state.locations = this.state.locations.filter((l) => l.id !== id);
    this.persist();
  }

  // --- Leave / Permissions ---
  async createLeaveRequest(input: CreateLeaveInput): Promise<LeaveRequest> {
    const employee = this.getEmployee(input.employeeId);
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeEmail: employee.username,
      employeeDepartment: employee.department,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      attachmentName: input.attachmentName,
      attachmentUrl: input.attachmentUrl,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    this.state.leaveRequests.unshift(newRequest);

    // Create Notification for HR
    const hrEmployees = this.state.employees.filter((e) => e.role === "HR");
    hrEmployees.forEach((hr) => {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientId: hr.id,
        type: "LEAVE_REQUEST_SUBMITTED",
        title: "New Leave Request",
        message: `${employee.name} submitted a ${input.type} request (${input.startDate} to ${input.endDate}).`,
        relatedEntityType: "LEAVE",
        relatedEntityId: newRequest.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    this.persist();
    return newRequest;
  }

  async getUserLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    const employee = this.getEmployee(userId);
    return this.state.leaveRequests.filter((r) => r.employeeId === employee.id);
  }

  async getAllLeaveRequests(filters?: {
    status?: LeaveStatus;
    type?: LeaveType;
    employeeId?: string;
  }): Promise<LeaveRequest[]> {
    return this.state.leaveRequests.filter((r) => {
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.type && r.type !== filters.type) return false;
      if (filters?.employeeId && r.employeeId !== filters.employeeId) return false;
      return true;
    });
  }

  async reviewLeaveRequest(input: ReviewLeaveInput): Promise<LeaveRequest> {
    const idx = this.state.leaveRequests.findIndex((r) => r.id === input.requestId);
    if (idx < 0) {
      throw new Error("Leave request not found.");
    }

    if (input.status === "REJECTED" && (!input.reviewComment || input.reviewComment.trim() === "")) {
      throw new Error("Rejection reason is required when rejecting a request.");
    }

    const reviewer = this.getEmployee(input.reviewerId);
    const updated: LeaveRequest = {
      ...this.state.leaveRequests[idx],
      status: input.status,
      reviewedBy: reviewer.id,
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString(),
      reviewComment: input.reviewComment,
    };

    this.state.leaveRequests[idx] = updated;

    // Send Notification to Employee
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId: updated.employeeId,
      type: input.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      title: input.status === "APPROVED" ? "Leave Request Approved" : "Leave Request Rejected",
      message:
        input.status === "APPROVED"
          ? `Your ${updated.type} request from ${updated.startDate} to ${updated.endDate} has been approved.`
          : `Your ${updated.type} request was rejected. Reason: ${input.reviewComment}`,
      relatedEntityType: "LEAVE",
      relatedEntityId: updated.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    this.persist();
    return updated;
  }

  // --- Document Distribution ---
  async shareDocument(input: ShareDocumentInput): Promise<HrDocument> {
    const uploader = this.getEmployee(input.uploadedBy);
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const recipients = input.recipientUserIds.map((userId) => {
      const emp = this.getEmployee(userId);
      return {
        documentId: docId,
        userId: emp.id,
        userName: emp.name,
        userEmail: emp.username,
        deliveredAt: nowIso,
        readAt: null,
      };
    });

    const newDoc: HrDocument = {
      id: docId,
      title: input.title,
      type: input.type || "Company Policy",
      fileName: input.fileName,
      fileUrl: input.fileUrl || "/documents/sample.pdf",
      fileSize: input.fileSize || "1.2 MB",
      description: input.description,
      uploadedBy: uploader.id,
      uploadedByName: uploader.name,
      createdAt: nowIso,
      recipients,
    };

    this.state.documents.unshift(newDoc);

    // Notify all recipients
    recipients.forEach((rec) => {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientId: rec.userId,
        type: "DOCUMENT_SHARED",
        title: "New document from HR",
        message: `HR shared a document with you: "${input.title}" (${input.fileName}).`,
        relatedEntityType: "DOCUMENT",
        relatedEntityId: newDoc.id,
        isRead: false,
        createdAt: nowIso,
      });
    });

    this.persist();
    return newDoc;
  }

  async getAllSharedDocuments(): Promise<HrDocument[]> {
    return [...this.state.documents];
  }

  async getUserDocuments(userId: string): Promise<HrDocument[]> {
    const employee = this.getEmployee(userId);
    return this.state.documents.filter((doc) =>
      doc.recipients.some((r) => r.userId === employee.id),
    );
  }

  async markDocumentAsRead(documentId: string, userId: string): Promise<void> {
    const employee = this.getEmployee(userId);
    const doc = this.state.documents.find((d) => d.id === documentId);
    if (doc) {
      const recipient = doc.recipients.find((r) => r.userId === employee.id);
      if (recipient && !recipient.readAt) {
        recipient.readAt = new Date().toISOString();
        this.persist();
      }
    }
  }

  // --- Payroll ---
  async uploadPayrollDocument(input: UploadPayrollInput): Promise<PayrollDocument> {
    const targetEmployee = this.getEmployee(input.employeeId);
    const uploader = this.getEmployee(input.publishedBy);
    const nowIso = new Date().toISOString();

    const payroll: PayrollDocument = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: targetEmployee.id,
      employeeName: targetEmployee.name,
      employeeEmail: targetEmployee.username,
      employeeDepartment: targetEmployee.department,
      period: input.period,
      fileName: input.fileName,
      fileUrl: input.fileUrl || "/payroll/payslip.pdf",
      fileSize: input.fileSize || "450 KB",
      description: input.description,
      publishedAt: nowIso,
      publishedBy: uploader.id,
      publishedByName: uploader.name,
      isRead: false,
    };

    this.state.payrollDocuments.unshift(payroll);

    // Notify employee
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId: targetEmployee.id,
      type: "PAYROLL_AVAILABLE",
      title: "Payroll Available",
      message: `Your payroll document for ${input.period} is now available.`,
      relatedEntityType: "PAYROLL",
      relatedEntityId: payroll.id,
      isRead: false,
      createdAt: nowIso,
    });

    this.persist();
    return payroll;
  }

  async getAllPayrollDocuments(): Promise<PayrollDocument[]> {
    return [...this.state.payrollDocuments];
  }

  async getUserPayrollDocuments(userId: string): Promise<PayrollDocument[]> {
    const employee = this.getEmployee(userId);
    return this.state.payrollDocuments.filter((p) => p.employeeId === employee.id);
  }

  async markPayrollAsRead(id: string): Promise<void> {
    const pay = this.state.payrollDocuments.find((p) => p.id === id);
    if (pay) {
      pay.isRead = true;
      this.persist();
    }
  }

  // --- Generic Notifications ---
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const employee = this.getEmployee(userId);
    return this.state.notifications.filter((n) => n.recipientId === employee.id);
  }

  async createNotification(
    notification: Omit<Notification, "id" | "createdAt" | "isRead">,
  ): Promise<Notification> {
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.state.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  async markAsRead(id: string): Promise<void> {
    const notif = this.state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.persist();
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const employee = this.getEmployee(userId);
    this.state.notifications.forEach((n) => {
      if (n.recipientId === employee.id) {
        n.isRead = true;
      }
    });
    this.persist();
  }

  // --- Employees & Dashboard Stats ---
  async getAllEmployees(): Promise<EmployeeProfile[]> {
    return [...this.state.employees];
  }

  async getEmployeeById(id: string): Promise<EmployeeProfile | null> {
    return this.state.employees.find((e) => e.id === id || e.username === id) || null;
  }

  async getHrDashboardStats(): Promise<HrDashboardStats> {
    const today = getTodayDateString();
    const todayAttendances = this.state.attendances.filter((a) => a.date === today);

    const presentToday = todayAttendances.filter(
      (a) => a.status === "CHECKED_IN" || a.status === "COMPLETED",
    ).length;

    const lateToday = todayAttendances.filter((a) => a.status === "LATE").length;

    const absentToday = todayAttendances.filter((a) => a.status === "ABSENT").length;

    const pendingLeaveRequests = this.state.leaveRequests.filter(
      (l) => l.status === "PENDING",
    ).length;

    const documentsShared = this.state.documents.length;
    const payrollDocuments = this.state.payrollDocuments.length;

    return {
      totalEmployees: this.state.employees.length,
      presentToday,
      absentToday,
      lateToday,
      pendingLeaveRequests,
      documentsShared,
      payrollDocuments,
    };
  }

  // --- Helper Helpers ---
  private resolveUserId(identifier: string): string {
    const emp = this.state.employees.find(
      (e) => e.id === identifier || e.username.toLowerCase() === identifier.toLowerCase(),
    );
    return emp ? emp.id : identifier;
  }

  private getEmployee(identifier: string): EmployeeProfile {
    const emp = this.state.employees.find(
      (e) => e.id === identifier || e.username.toLowerCase() === identifier.toLowerCase(),
    );
    if (!emp) {
      // Fallback virtual employee
      return {
        id: identifier,
        username: identifier,
        name: identifier,
        role: "EMPLOYEE",
        department: "General",
        isActive: true,
      };
    }
    return emp;
  }
}

// Global Singleton Instance
export const mockHrStore = new InMemoryHrStore();

// Export Implementations matching Repository Interfaces
export const mockAttendanceRepository: AttendanceRepository = {
  getTodayAttendance: (userId) => mockHrStore.getTodayAttendance(userId),
  checkIn: (input) => mockHrStore.checkIn(input),
  checkOut: (input) => mockHrStore.checkOut(input),
  getAttendanceHistory: (userId) => mockHrStore.getAttendanceHistory(userId),
  getAllAttendance: (filters) => mockHrStore.getAllAttendance(filters),
  getWorkSchedule: () => mockHrStore.getWorkSchedule(),
  updateWorkSchedule: (schedule) => mockHrStore.updateWorkSchedule(schedule),
  getAttendanceLocations: () => mockHrStore.getAttendanceLocations(),
  saveAttendanceLocation: (loc) => mockHrStore.saveAttendanceLocation(loc),
  deleteAttendanceLocation: (id) => mockHrStore.deleteAttendanceLocation(id),
};

export const mockLeaveRepository: LeaveRepository = {
  createLeaveRequest: (input) => mockHrStore.createLeaveRequest(input),
  getUserLeaveRequests: (userId) => mockHrStore.getUserLeaveRequests(userId),
  getAllLeaveRequests: (filters) => mockHrStore.getAllLeaveRequests(filters),
  reviewLeaveRequest: (input) => mockHrStore.reviewLeaveRequest(input),
};

export const mockDocumentRepository: DocumentRepository = {
  shareDocument: (input) => mockHrStore.shareDocument(input),
  getAllSharedDocuments: () => mockHrStore.getAllSharedDocuments(),
  getUserDocuments: (userId) => mockHrStore.getUserDocuments(userId),
  markDocumentAsRead: (docId, userId) => mockHrStore.markDocumentAsRead(docId, userId),
};

export const mockPayrollRepository: PayrollRepository = {
  uploadPayrollDocument: (input) => mockHrStore.uploadPayrollDocument(input),
  getAllPayrollDocuments: () => mockHrStore.getAllPayrollDocuments(),
  getUserPayrollDocuments: (userId) => mockHrStore.getUserPayrollDocuments(userId),
  markPayrollAsRead: (id) => mockHrStore.markPayrollAsRead(id),
};

export const mockNotificationRepository: NotificationRepository = {
  getUserNotifications: (userId) => mockHrStore.getUserNotifications(userId),
  createNotification: (notif) => mockHrStore.createNotification(notif),
  markAsRead: (id) => mockHrStore.markAsRead(id),
  markAllAsRead: (userId) => mockHrStore.markAllAsRead(userId),
};

export const mockEmployeeRepository: EmployeeRepository = {
  getAllEmployees: () => mockHrStore.getAllEmployees(),
  getEmployeeById: (id) => mockHrStore.getEmployeeById(id),
  getHrDashboardStats: () => mockHrStore.getHrDashboardStats(),
};
