"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrDashboardOverview } from "@/src/features/hr/components/dashboard/hr-dashboard-overview";

export default function HrDashboardPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            HR Operations Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Centralized Human Resources Management System for PT Montana Global Investama.
          </p>
        </div>

        <HrDashboardOverview />
      </div>
    </ErpLayout>
  );
}
