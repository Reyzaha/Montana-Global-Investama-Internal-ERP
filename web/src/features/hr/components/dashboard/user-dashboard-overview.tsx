"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Wallet,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useHrContext } from "../../context/hr-context";
import { UserAttendanceWidget } from "../attendance/user-attendance-widget";
import { LeaveRequestModal } from "../leave/leave-request-modal";
import { AttendanceHistoryTable } from "../attendance/attendance-history-table";
import {
  mockDocumentRepository,
  mockNotificationRepository,
  mockPayrollRepository,
} from "../../mocks/hr-store";
import { HrDocument } from "../../types/document.types";
import { PayrollDocument } from "../../types/payroll.types";
import { Notification } from "../../types/notification.types";
import { formatDisplayDateTime } from "../../utils/date";

export function UserDashboardOverview() {
  const { currentUser, storeVersion } = useHrContext();

  const [userDocs, setUserDocs] = useState<HrDocument[]>([]);
  const [userPayrolls, setUserPayrolls] = useState<PayrollDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadUserData = () => {
    Promise.all([
      mockDocumentRepository.getUserDocuments(currentUser.id),
      mockPayrollRepository.getUserPayrollDocuments(currentUser.id),
      mockNotificationRepository.getUserNotifications(currentUser.id),
    ])
      .then(([docs, pays, notifs]) => {
        setUserDocs(docs);
        setUserPayrolls(pays);
        setNotifications(notifs);
      })
      .catch((err) => console.error("Failed to load user dashboard data:", err));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockDocumentRepository.getUserDocuments(currentUser.id),
      mockPayrollRepository.getUserPayrollDocuments(currentUser.id),
      mockNotificationRepository.getUserNotifications(currentUser.id),
    ])
      .then(([docs, pays, notifs]) => {
        if (isMounted) {
          setUserDocs(docs);
          setUserPayrolls(pays);
          setNotifications(notifs);
        }
      })
      .catch((err) => console.error("Failed to load user dashboard data:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  return (
    <div className="grid gap-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Employee Workspace
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Good Morning, {currentUser.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {currentUser.position || currentUser.role} • {currentUser.department} Division
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LeaveRequestModal onRequestCreated={loadUserData} />
        </div>
      </div>

      {/* Grid Layout: Left Attendance + Right Notifications / Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 1 Col: Attendance Widget */}
        <div className="lg:col-span-1 space-y-6">
          <UserAttendanceWidget onAttendanceUpdated={loadUserData} />
        </div>

        {/* Right 2 Cols: Notifications & My Documents & Payroll */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Important Notifications</CardTitle>
                {unreadNotifs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadNotifs.length} new
                  </Badge>
                )}
              </div>
              <a href="/notifications" className="text-xs text-primary font-medium hover:underline">
                View All →
              </a>
            </CardHeader>

            <CardContent>
              {notifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="You're all caught up"
                  description="No new HR announcements, payslips, or leave updates at this moment."
                />
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden bg-card">
                  {notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start justify-between gap-3 p-3 text-xs ${
                        notif.isRead ? "opacity-80" : "bg-primary/[0.02] font-medium"
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{notif.title}</span>
                        <p className="text-muted-foreground mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                          {formatDisplayDateTime(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.isRead && (
                        <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Cards: My Documents & My Payroll */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* My Documents Card */}
            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                  My Documents
                </CardTitle>
                <FileText className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userDocs.length}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {userDocs.length === 0
                    ? "No documents shared yet"
                    : `${userDocs.length} company documents available`}
                </p>
                <div className="mt-3 pt-2 border-t">
                  <a
                    href="/documents"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Open Documents
                    <ArrowRight className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* My Payroll Card */}
            <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                  My Payroll
                </CardTitle>
                <Wallet className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userPayrolls.length}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {userPayrolls.length === 0
                    ? "No payslips published yet"
                    : `Latest: ${userPayrolls[0]?.period || "Available"}`}
                </p>
                <div className="mt-3 pt-2 border-t">
                  <a
                    href="/payroll"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    View Payslips
                    <ArrowRight className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Attendance History Section */}
      <AttendanceHistoryTable />
    </div>
  );
}
