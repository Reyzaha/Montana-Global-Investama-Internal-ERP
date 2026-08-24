import {
  Attendance,
  AttendanceLocation,
  AttendanceStatus,
  CheckInInput,
  CheckOutInput,
  WorkSchedule,
} from "../types/attendance.types";

export interface AttendanceRepository {
  getTodayAttendance(userId: string): Promise<Attendance | null>;
  checkIn(input: CheckInInput): Promise<Attendance>;
  checkOut(input: CheckOutInput): Promise<Attendance>;
  getAttendanceHistory(userId: string): Promise<Attendance[]>;
  getAllAttendance(filters?: {
    date?: string;
    employeeId?: string;
    status?: AttendanceStatus;
  }): Promise<Attendance[]>;
  getWorkSchedule(): Promise<WorkSchedule>;
  updateWorkSchedule(schedule: Partial<WorkSchedule>): Promise<WorkSchedule>;
  getAttendanceLocations(): Promise<AttendanceLocation[]>;
  saveAttendanceLocation(
    location: Partial<AttendanceLocation> & { name: string; latitude: number; longitude: number; radiusMeters: number },
  ): Promise<AttendanceLocation>;
  deleteAttendanceLocation(id: string): Promise<void>;
}
