"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { AttendanceSettings } from "@/src/features/hr/components/attendance/attendance-settings";

export default function HrAttendanceSettingsPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Attendance Rules & Geofence Settings
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure work schedules, office sites, GPS coordinates, and enforced radius limits (50m - 1000m).
          </p>
        </div>

        <AttendanceSettings />
      </div>
    </ErpLayout>
  );
}
