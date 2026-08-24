import { AttendanceLocation, WorkSchedule } from "../types/attendance.types";

/**
 * Safety bounds for attendance radius configuration (in meters).
 * Requirement 11: Minimum 50m, Maximum 1000m.
 */
export const MIN_ATTENDANCE_RADIUS = 50;
export const MAX_ATTENDANCE_RADIUS = 1000;

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  id: "sched-standard",
  name: "Office Standard",
  timezone: "WIB (UTC+7)",
  days: [1, 2, 3, 4, 5], // Monday - Friday
  checkInTime: "08:00",
  checkOutTime: "17:00",
  lateThresholdMinutes: 15,
  isActive: true,
};

export const DEFAULT_ATTENDANCE_LOCATIONS: AttendanceLocation[] = [
  {
    id: "loc-head-office",
    name: "Head Office (SCBD Jakarta)",
    latitude: -6.2255,
    longitude: 106.8095,
    radiusMeters: 100,
    isActive: true,
    address: "Sudirman Central Business District (SCBD) Lot 28, Jakarta Selatan",
  },
  {
    id: "loc-branch-balikpapan",
    name: "Branch Office Balikpapan",
    latitude: -1.2654,
    longitude: 116.8312,
    radiusMeters: 150,
    isActive: true,
    address: "Jl. Jenderal Sudirman No. 88, Balikpapan, Kalimantan Timur",
  },
];
