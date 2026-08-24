"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { HrDocumentDistribution } from "@/src/features/hr/components/documents/hr-document-distribution";

export default function HrDocumentsPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Document Distribution
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Distribute employee handbooks, company policies, and official guidelines to target staff.
          </p>
        </div>

        <HrDocumentDistribution />
      </div>
    </ErpLayout>
  );
}
