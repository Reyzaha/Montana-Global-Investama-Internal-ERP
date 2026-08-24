"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { UserDashboardOverview } from "@/src/features/hr/components/dashboard/user-dashboard-overview";

export default function DashboardPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <UserDashboardOverview />
      </div>
    </ErpLayout>
  );
}