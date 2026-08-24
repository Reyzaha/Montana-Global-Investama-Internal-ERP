"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  Upload,
  FileText,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PayrollDocument } from "../../types/payroll.types";
import { EmployeeProfile } from "../../types/employee.types";
import { mockEmployeeRepository, mockPayrollRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function HrPayrollManagement() {
  const { currentUser, storeVersion } = useHrContext();

  const [payrolls, setPayrolls] = useState<PayrollDocument[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // Upload Modal State
  const [openModal, setOpenModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [period, setPeriod] = useState("August 2026");
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = () => {
    Promise.all([
      mockPayrollRepository.getAllPayrollDocuments(),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allPayrolls, allEmps]) => {
        setPayrolls(allPayrolls);
        setEmployees(allEmps);
        if (allEmps.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(allEmps[0].id);
        }
      })
      .catch((err) => console.error("Failed to load payroll records:", err));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockPayrollRepository.getAllPayrollDocuments(),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allPayrolls, allEmps]) => {
        if (isMounted) {
          setPayrolls(allPayrolls);
          setEmployees(allEmps);
          setSelectedEmployeeId((prev) => prev || (allEmps[0]?.id ?? ""));
        }
      })
      .catch((err) => console.error("Failed to load payroll records:", err));

    return () => {
      isMounted = false;
    };
  }, [storeVersion]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!period.trim()) {
      setError("Payroll period is required.");
      return;
    }

    if (!fileName.trim()) {
      setError("Payslip document file is required.");
      return;
    }

    setSubmitting(true);
    try {
      await mockPayrollRepository.uploadPayrollDocument({
        employeeId: selectedEmployeeId,
        period: period.trim(),
        fileName: fileName.trim(),
        fileUrl: `/payroll/${fileName.trim()}`,
        fileSize: "520 KB",
        description: description.trim() || undefined,
        publishedBy: currentUser.id,
      });

      setOpenModal(false);
      setFileName("");
      setDescription("");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish payroll document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoFillFileName = () => {
    const targetEmp = employees.find((e) => e.id === selectedEmployeeId);
    const slug = targetEmp ? targetEmp.name.toLowerCase().replace(/\s+/g, "-") : "employee";
    const periodSlug = period.toLowerCase().replace(/\s+/g, "-");
    setFileName(`payslip-${slug}-${periodSlug}.pdf`);
  };

  return (
    <div className="grid gap-6">
      {/* Header and Upload Action */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">HR Payroll Documents Distribution</CardTitle>
            <CardDescription className="text-xs">
              Upload and publish monthly salary slips and tax documents directly to employee workspaces.
            </CardDescription>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="mr-1.5 size-4" />
                Upload & Publish Payslip
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Publish Employee Payslip</DialogTitle>
                <DialogDescription className="text-xs">
                  Upload confidential salary statement for a specific employee and period.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUploadSubmit} className="grid gap-4 py-2 text-xs">
                <div className="grid gap-1.5">
                  <label className="font-medium">Target Employee *</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      setSelectedEmployeeId(e.target.value);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department} • {emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="font-medium">Payroll Period *</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="August 2026">August 2026</option>
                    <option value="July 2026">July 2026</option>
                    <option value="June 2026">June 2026</option>
                    <option value="May 2026">May 2026</option>
                    <option value="April 2026">April 2026</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="font-medium">Payslip File Name *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. payslip-august-2026.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      required
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs px-2.5"
                      onClick={handleAutoFillFileName}
                    >
                      <FileText className="size-3.5 mr-1" />
                      Generate Name
                    </Button>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="font-medium">Note / Remarks (Optional)</label>
                  <Textarea
                    placeholder="Optional message (e.g. Includes annual performance bonus)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {error && (
                  <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                    {error}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Publishing..." : "Publish Payslip"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {payrolls.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No payroll documents published yet"
              description="Uploaded employee salary statements and tax slips will be listed here."
              actionLabel="Upload First Payslip"
              onAction={() => setOpenModal(true)}
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Published Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{pay.employeeName || "Employee"}</span>
                          <span className="text-xs text-muted-foreground">
                            {pay.employeeDepartment || "General"} • {pay.employeeEmail}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {pay.period}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-primary" />
                          <span className="text-xs font-medium">{pay.fileName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDisplayDateTime(pay.publishedAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        {pay.isRead ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Opened by Employee
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Delivered
                          </Badge>
                        )}
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
