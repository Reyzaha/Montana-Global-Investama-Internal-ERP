"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { UserLeaveHistoryTable } from "@/src/features/hr/components/leave/user-leave-history-table";

export default function LeavePage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Permissions & Leave
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Request permission (Sakit, Cuti, Izin) and track approval statuses.
          </p>
        </div>

        <UserLeaveHistoryTable />
      </div>
    </ErpLayout>
  );
}
