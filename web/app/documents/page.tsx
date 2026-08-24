"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { UserDocumentList } from "@/src/features/hr/components/documents/user-document-list";

export default function DocumentsPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Documents
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Company handbooks, policies, and official documentation distributed to you by HR.
          </p>
        </div>

        <UserDocumentList />
      </div>
    </ErpLayout>
  );
}
