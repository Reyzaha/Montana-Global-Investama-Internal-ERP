"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Building,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmployeeProfile } from "../../types/employee.types";
import {
  mockAttendanceRepository,
  mockDocumentRepository,
  mockEmployeeRepository,
  mockLeaveRepository,
  mockPayrollRepository,
} from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate } from "../../utils/date";

export function HrEmployeeDirectory() {
  const { storeVersion } = useHrContext();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  // Detail Modal State
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfile | null>(null);
  const [empStats, setEmpStats] = useState<{
    todayAttendance: string;
    totalLeaves: number;
    totalDocs: number;
    totalPayrolls: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    mockEmployeeRepository
      .getAllEmployees()
      .then((allEmps) => {
        if (isMounted) setEmployees(allEmps);
      })
      .catch((err) => console.error("Failed to load employees:", err));

    return () => {
      isMounted = false;
    };
  }, [storeVersion]);

  const handleOpenDetail = async (emp: EmployeeProfile) => {
    setSelectedEmp(emp);
    try {
      const [todayAtt, leaves, docs, payrolls] = await Promise.all([
        mockAttendanceRepository.getTodayAttendance(emp.id),
        mockLeaveRepository.getUserLeaveRequests(emp.id),
        mockDocumentRepository.getUserDocuments(emp.id),
        mockPayrollRepository.getUserPayrollDocuments(emp.id),
      ]);

      setEmpStats({
        todayAttendance: todayAtt?.status ? todayAtt.status.replace("_", " ") : "Not Checked In",
        totalLeaves: leaves.length,
        totalDocs: docs.length,
        totalPayrolls: payrolls.length,
      });
    } catch (err) {
      console.error("Failed to load employee details:", err);
    }
  };

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  const filteredEmployees = employees.filter((emp) => {
    if (selectedDepartment !== "ALL" && emp.department !== selectedDepartment) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.username.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">MGI Employee Directory</CardTitle>
              <CardDescription className="text-xs">
                Manage and review staff profiles, roles, assigned departments, and operational records.
              </CardDescription>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 max-w-lg">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.username}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building className="size-3.5 text-primary" />
                        <span>{emp.department}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {emp.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {emp.joinDate ? formatDisplayDate(emp.joinDate) : "Jan 2024"}
                    </TableCell>

                    <TableCell>
                      {emp.isActive ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleOpenDetail(emp)}
                      >
                        <Eye className="mr-1 size-3.5" />
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      <Dialog open={Boolean(selectedEmp)} onOpenChange={(open) => !open && setSelectedEmp(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
                {selectedEmp?.name.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">{selectedEmp?.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedEmp?.position || selectedEmp?.role} • {selectedEmp?.department}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedEmp && (
            <div className="grid gap-4 py-2 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Email:</span>
                  <span className="font-semibold text-foreground">{selectedEmp.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedEmp.role}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium text-foreground">{selectedEmp.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined Montana:</span>
                  <span className="text-foreground">
                    {selectedEmp.joinDate ? formatDisplayDate(selectedEmp.joinDate) : "Jan 2024"}
                  </span>
                </div>
              </div>

              {/* Quick Operational Activity Stats */}
              <div>
                <span className="font-semibold text-foreground mb-2 block">HRIS Activity Summary</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2.5 bg-card">
                    <span className="text-muted-foreground text-[11px] block">Today&apos;s Attendance</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {empStats?.todayAttendance || "Not Checked In"}
                    </span>
                  </div>

                  <div className="rounded border p-2.5 bg-card">
                    <span className="text-muted-foreground text-[11px] block">Leave Requests</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {empStats?.totalLeaves ?? 0} submitted
                    </span>
                  </div>

                  <div className="rounded border p-2.5 bg-card">
                    <span className="text-muted-foreground text-[11px] block">Shared Documents</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {empStats?.totalDocs ?? 0} available
                    </span>
                  </div>

                  <div className="rounded border p-2.5 bg-card">
                    <span className="text-muted-foreground text-[11px] block">Published Payslips</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {empStats?.totalPayrolls ?? 0} records
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setSelectedEmp(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
