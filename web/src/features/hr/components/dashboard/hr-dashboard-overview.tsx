"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Clock,
  Calendar,
  FileText,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { HrDashboardStats } from "../../repositories/employee.repository";
import {
  mockAttendanceRepository,
  mockEmployeeRepository,
  mockLeaveRepository,
} from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate, getTodayDateString } from "../../utils/date";
import { Attendance } from "../../types/attendance.types";
import { LeaveRequest, LEAVE_TYPE_LABELS } from "../../types/leave.types";

export function HrDashboardOverview() {
  const { storeVersion } = useHrContext();

  const [stats, setStats] = useState<HrDashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingLeaveRequests: 0,
    documentsShared: 0,
    payrollDocuments: 0,
  });

  const [todayAttendances, setTodayAttendances] = useState<Attendance[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockEmployeeRepository.getHrDashboardStats(),
      mockAttendanceRepository.getAllAttendance({ date: getTodayDateString() }),
      mockLeaveRepository.getAllLeaveRequests({ status: "PENDING" }),
    ])
      .then(([dashStats, allAtt, allLeaves]) => {
        if (isMounted) {
          setStats(dashStats);
          setTodayAttendances(allAtt);
          setPendingLeaves(allLeaves);
        }
      })
      .catch((err) => console.error("Failed to load HR dashboard stats:", err));

    return () => {
      isMounted = false;
    };
  }, [storeVersion]);

  const summaryCards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      description: "Active system employees",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      link: "/hr/employees",
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      description: "Recorded on-time attendance",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      link: "/hr/attendance",
    },
    {
      title: "Late Today",
      value: stats.lateToday,
      description: "Check-in exceeding tolerance",
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      link: "/hr/attendance",
    },
    {
      title: "Absent Today",
      value: stats.absentToday,
      description: "No check-in record",
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      link: "/hr/attendance",
    },
    {
      title: "Pending Leaves",
      value: stats.pendingLeaveRequests,
      description: "Awaiting approval",
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      link: "/hr/leave",
    },
    {
      title: "Documents Shared",
      value: stats.documentsShared,
      description: "Handbooks & policies",
      icon: FileText,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      link: "/hr/documents",
    },
    {
      title: "Payroll Published",
      value: stats.payrollDocuments,
      description: "Distributed payslips",
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-600/10",
      link: "/hr/payroll",
    },
  ];

  return (
    <div className="grid gap-6">
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="overflow-hidden border-border/80 shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`flex size-8 items-center justify-center rounded-lg ${card.bgColor} ${card.color}`}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{card.description}</p>
                  {card.link && (
                    <a
                      href={card.link}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
                    >
                      View
                      <ArrowRight className="size-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two Column Section: Quick Actions & Live Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Today's Attendance & Pending Leaves */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Leave Requests Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Pending Leave Requests</CardTitle>
                <CardDescription className="text-xs">
                  Requests submitted by employees requiring HR review.
                </CardDescription>
              </div>
              <a href="/hr/leave" className="text-xs text-primary font-medium hover:underline">
                View All ({stats.pendingLeaveRequests}) →
              </a>
            </CardHeader>

            <CardContent>
              {pendingLeaves.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No pending leave requests"
                  description="All submitted leave or permission requests have been reviewed."
                />
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden bg-card">
                  {pendingLeaves.slice(0, 3).map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{leave.employeeName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {LEAVE_TYPE_LABELS[leave.type]}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {formatDisplayDate(leave.startDate)} – {formatDisplayDate(leave.endDate)}: {leave.description}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        render={<a href="/hr/leave" />}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Live Attendance Feed */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Today&apos;s Live Attendance</CardTitle>
                <CardDescription className="text-xs">
                  Live operational check-ins recorded for {formatDisplayDate(getTodayDateString())}.
                </CardDescription>
              </div>
              <a href="/hr/attendance" className="text-xs text-primary font-medium hover:underline">
                Attendance Table →
              </a>
            </CardHeader>

            <CardContent>
              {todayAttendances.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No attendance records yet today"
                  description="Check-in records will populate here in real-time as employees check in."
                />
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden bg-card">
                  {todayAttendances.slice(0, 5).map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <span className="font-semibold text-foreground block">{att.employeeName}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {att.locationName} • In: {att.checkInAt || "-"} • Out: {att.checkOutAt || "-"}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          att.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : att.status === "LATE"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        }`}
                      >
                        {att.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Quick Operations Hub */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">HR Operations Hub</CardTitle>
              <CardDescription className="text-xs">
                Direct shortcuts for core HRIS administrative workflows.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-2 text-xs">
              <a
                href="/hr/attendance-settings"
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="size-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">Attendance Settings</span>
                    <span className="text-[11px] text-muted-foreground">Schedules & Geofencing</span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>

              <a
                href="/hr/documents"
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">Share Documents</span>
                    <span className="text-[11px] text-muted-foreground">Distribute to employees</span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>

              <a
                href="/hr/payroll"
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="size-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">Publish Payslips</span>
                    <span className="text-[11px] text-muted-foreground">Distribute monthly salary slips</span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>

              <a
                href="/hr/employees"
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="size-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">Employee Directory</span>
                    <span className="text-[11px] text-muted-foreground">Staff profiles and roles</span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
