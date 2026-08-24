"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrLeaveManagement } from "@/src/features/hr/components/leave/hr-leave-management";

export default function HrLeavePage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Leave & Permission Approvals
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Review, approve, or reject employee requests for Sakit, Cuti, and Izin.
          </p>
        </div>

        <HrLeaveManagement />
      </div>
    </ErpLayout>
  );
}
