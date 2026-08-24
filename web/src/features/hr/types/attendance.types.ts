export type AttendanceStatus =
  | "NOT_STARTED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "LATE"
  | "ABSENT";

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeDepartment?: string;
  date: string; // Format: YYYY-MM-DD
  scheduleId?: string;
  scheduleName?: string;
  checkInAt: string | null; // Format: HH:mm or ISO
  checkOutAt: string | null;
  locationId: string | null;
  locationName?: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInDistance: number | null; // in meters
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutDistance: number | null;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  address?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  timezone: string;
  days: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  checkInTime: string; // "08:00"
  checkOutTime: string; // "17:00"
  lateThresholdMinutes: number; // 15
  isActive: boolean;
}

export interface CheckInInput {
  employeeId: string;
  latitude: number;
  longitude: number;
  note?: string;
}

export interface CheckOutInput {
  employeeId: string;
  latitude: number;
  longitude: number;
  note?: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  location?: AttendanceLocation;
  distanceMeters: number;
  errorMessage?: string;
}
