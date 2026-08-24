"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrAttendanceManagement } from "@/src/features/hr/components/attendance/hr-attendance-management";

export default function HrAttendancePage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Attendance Monitoring
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitor real-time employee attendance, check-ins, check-outs, and GPS location compliance.
          </p>
        </div>

        <HrAttendanceManagement />
      </div>
    </ErpLayout>
  );
}
