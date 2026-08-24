"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrPayrollManagement } from "@/src/features/hr/components/payroll/hr-payroll-management";

export default function HrPayrollPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Payroll Document Publishing
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload and publish confidential monthly payslips directly to employee accounts.
          </p>
        </div>

        <HrPayrollManagement />
      </div>
    </ErpLayout>
  );
}
