"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrEmployeeDirectory } from "@/src/features/hr/components/employees/hr-employee-directory";

export default function HrEmployeesPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Employee Directory & Roles
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage company personnel, departmental assignments, and role access privileges.
          </p>
        </div>

        <HrEmployeeDirectory />
      </div>
    </ErpLayout>
  );
}
