"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { UserPayrollList } from "@/src/features/hr/components/payroll/user-payroll-list";

export default function PayrollPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Payroll
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Monthly confidential salary statements and tax slips published by Montana HR.
          </p>
        </div>

        <UserPayrollList />
      </div>
    </ErpLayout>
  );
}
