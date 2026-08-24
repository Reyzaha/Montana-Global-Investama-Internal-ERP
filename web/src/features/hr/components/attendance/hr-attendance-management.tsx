"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Clock,
  RefreshCw,
  Building2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Attendance, AttendanceStatus } from "../../types/attendance.types";
import { EmployeeProfile } from "../../types/employee.types";
import { mockAttendanceRepository, mockEmployeeRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate, getTodayDateString } from "../../utils/date";

export function HrAttendanceManagement() {
  const { storeVersion } = useHrContext();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // Filters
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = () => {
    Promise.all([
      mockAttendanceRepository.getAllAttendance({
        date: selectedDate || undefined,
        employeeId: selectedEmployeeId !== "ALL" ? selectedEmployeeId : undefined,
        status: selectedStatus !== "ALL" ? (selectedStatus as AttendanceStatus) : undefined,
      }),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allAtt, allEmps]) => {
        setAttendances(allAtt);
        setEmployees(allEmps);
      })
      .catch((err) => console.error("Failed to load HR attendance records:", err));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockAttendanceRepository.getAllAttendance({
        date: selectedDate || undefined,
        employeeId: selectedEmployeeId !== "ALL" ? selectedEmployeeId : undefined,
        status: selectedStatus !== "ALL" ? (selectedStatus as AttendanceStatus) : undefined,
      }),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allAtt, allEmps]) => {
        if (isMounted) {
          setAttendances(allAtt);
          setEmployees(allEmps);
        }
      })
      .catch((err) => console.error("Failed to load HR attendance records:", err));

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedEmployeeId, selectedStatus, storeVersion]);

  const filteredAttendances = attendances.filter((att) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (att.employeeName && att.employeeName.toLowerCase().includes(q)) ||
      (att.employeeDepartment && att.employeeDepartment.toLowerCase().includes(q)) ||
      (att.locationName && att.locationName.toLowerCase().includes(q))
    );
  });

  // Calculate stats
  const presentCount = attendances.filter(
    (a) => a.status === "CHECKED_IN" || a.status === "COMPLETED",
  ).length;
  const lateCount = attendances.filter((a) => a.status === "LATE").length;
  const absentCount = attendances.filter((a) => a.status === "ABSENT").length;

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Completed
          </Badge>
        );
      case "CHECKED_IN":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            Checked In
          </Badge>
        );
      case "LATE":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            Late
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            Absent
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Tracked Today</CardDescription>
            <CardTitle className="text-2xl font-bold">{attendances.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Recorded logs for {formatDisplayDate(selectedDate)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-emerald-600 dark:text-emerald-400">
              Present on Time
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {presentCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Checked in within standard schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-amber-600 dark:text-amber-400">
              Late Check-In
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {lateCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Exceeded threshold tolerance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-destructive">
              Absent
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              {absentCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No attendance record submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Employee Attendance Monitoring</CardTitle>
              <CardDescription className="text-xs">
                Real-time operational check-in, check-out, and GPS compliance records.
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" onClick={loadData} className="w-fit">
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employee or site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="COMPLETED">Completed</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAttendances.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No attendance records found"
              description="No check-in or check-out logs match the selected filters or date."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedEmployeeId("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
                setSelectedDate(getTodayDateString());
              }}
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Location & Coordinates</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendances.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{record.employeeName || "Employee"}</span>
                          <span className="text-xs text-muted-foreground">{record.employeeDepartment || "Staff"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {record.scheduleName || "08:00 - 17:00"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{record.checkInAt || "-"}</span>
                          {record.checkInDistance !== null && (
                            <span className="text-[11px] text-muted-foreground">
                              {record.checkInDistance}m from radius
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{record.checkOutAt || "-"}</span>
                          {record.checkOutDistance !== null && (
                            <span className="text-[11px] text-muted-foreground">
                              {record.checkOutDistance}m from radius
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Building2 className="size-3.5 text-primary" />
                            {record.locationName || "Configured Site"}
                          </div>
                          {record.checkInLatitude && record.checkInLongitude && (
                            <span className="text-[11px]">
                              Lat: {record.checkInLatitude.toFixed(4)}, Lon: {record.checkInLongitude.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(record.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
