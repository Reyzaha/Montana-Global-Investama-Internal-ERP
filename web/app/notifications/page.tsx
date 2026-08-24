"use client";

import React from "react";
import { ErpLayout } from "@/components/layout/erp-layout";
import { NotificationCenterView } from "@/src/features/hr/components/notifications/notification-center-view";

export default function NotificationsPage() {
  return (
    <ErpLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notification Center
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            All system updates, document notifications, payroll announcements, and leave approvals.
          </p>
        </div>

        <NotificationCenterView />
      </div>
    </ErpLayout>
  );
}
