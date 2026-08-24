"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  Search,
  Check,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveRequest, LeaveStatus, LeaveType, LEAVE_TYPE_LABELS } from "../../types/leave.types";
import { EmployeeProfile } from "../../types/employee.types";
import { mockEmployeeRepository, mockLeaveRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate, formatDisplayDateTime } from "../../utils/date";

export function HrLeaveManagement() {
  const { currentUser, storeVersion } = useHrContext();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Dialog State
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewMode, setReviewMode] = useState<"APPROVE" | "REJECT" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = () => {
    Promise.all([
      mockLeaveRepository.getAllLeaveRequests({
        status: statusFilter !== "ALL" ? (statusFilter as LeaveStatus) : undefined,
        type: typeFilter !== "ALL" ? (typeFilter as LeaveType) : undefined,
        employeeId: employeeFilter !== "ALL" ? employeeFilter : undefined,
      }),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allReqs, allEmps]) => {
        setRequests(allReqs);
        setEmployees(allEmps);
      })
      .catch((err) => console.error("Failed to load leave requests:", err));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockLeaveRepository.getAllLeaveRequests({
        status: statusFilter !== "ALL" ? (statusFilter as LeaveStatus) : undefined,
        type: typeFilter !== "ALL" ? (typeFilter as LeaveType) : undefined,
        employeeId: employeeFilter !== "ALL" ? employeeFilter : undefined,
      }),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allReqs, allEmps]) => {
        if (isMounted) {
          setRequests(allReqs);
          setEmployees(allEmps);
        }
      })
      .catch((err) => console.error("Failed to load leave requests:", err));

    return () => {
      isMounted = false;
    };
  }, [statusFilter, typeFilter, employeeFilter, storeVersion]);

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.employeeDepartment && r.employeeDepartment.toLowerCase().includes(q))
    );
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewMode) return;
    setReviewError("");

    if (reviewMode === "REJECT" && (!rejectReason || rejectReason.trim() === "")) {
      setReviewError("Please provide a reason for rejecting this leave request.");
      return;
    }

    setSubmittingReview(true);
    try {
      await mockLeaveRepository.reviewLeaveRequest({
        requestId: selectedRequest.id,
        reviewerId: currentUser.id,
        status: reviewMode === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewComment: reviewMode === "REJECT" ? rejectReason.trim() : undefined,
      });
      setSelectedRequest(null);
      setReviewMode(null);
      setRejectReason("");
      loadData();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Failed to review leave request.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            Rejected
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="grid gap-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-amber-600 dark:text-amber-400">
              Pending Requests
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Requires HR review and decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-emerald-600 dark:text-emerald-400">
              Approved
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total approved permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-destructive">
              Rejected
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              {rejectedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Declined requests with feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Employee Leave & Permission Management</CardTitle>
              <CardDescription className="text-xs">
                Review, approve, or reject employee requests for Sakit, Cuti, or Izin.
              </CardDescription>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employee or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Types (Sakit / Cuti / Izin)</option>
                <option value="SICK">Sakit</option>
                <option value="ANNUAL_LEAVE">Cuti</option>
                <option value="PERMISSION">Izin</option>
              </select>
            </div>

            <div>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
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
          </div>
        </CardHeader>

        <CardContent>
          {filteredRequests.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leave requests found"
              description="There are currently no employee leave or permission requests matching your filter."
              actionLabel="Reset Filters"
              onAction={() => {
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setEmployeeFilter("ALL");
                setSearchQuery("");
              }}
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{req.employeeName || "Employee"}</span>
                          <span className="text-xs text-muted-foreground">{req.employeeDepartment || "General"}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {LEAVE_TYPE_LABELS[req.type]}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-medium">
                        {req.startDate === req.endDate ? (
                          formatDisplayDate(req.startDate)
                        ) : (
                          `${formatDisplayDate(req.startDate)} – ${formatDisplayDate(req.endDate)}`
                        )}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <p className="text-xs line-clamp-2">{req.description}</p>
                        {req.attachmentName && (
                          <span className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                            <FileText className="size-3" />
                            {req.attachmentName}
                          </span>
                        )}
                        {req.status === "REJECTED" && req.reviewComment && (
                          <span className="text-[11px] text-destructive block mt-1">
                            Reason: {req.reviewComment}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDisplayDateTime(req.createdAt)}
                      </TableCell>

                      <TableCell>{getStatusBadge(req.status)}</TableCell>

                      <TableCell className="text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewMode("APPROVE");
                              }}
                            >
                              <Check className="mr-1 size-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewMode("REJECT");
                                setRejectReason("");
                              }}
                            >
                              <X className="mr-1 size-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Reviewed by {req.reviewedByName || "HR"}
                          </span>
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

      {/* Review Confirmation Dialog */}
      <Dialog
        open={Boolean(selectedRequest && reviewMode)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setReviewMode(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {reviewMode === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest && (
                <span>
                  {LEAVE_TYPE_LABELS[selectedRequest.type]} request submitted by{" "}
                  <strong>{selectedRequest.employeeName}</strong> ({formatDisplayDate(selectedRequest.startDate)} to{" "}
                  {formatDisplayDate(selectedRequest.endDate)}).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="rounded-md bg-muted/40 p-3 border">
                <span className="text-muted-foreground block mb-1">Employee Reason:</span>
                <p className="font-medium text-foreground">{selectedRequest.description}</p>
                {selectedRequest.attachmentName && (
                  <p className="mt-2 text-primary font-semibold flex items-center gap-1">
                    <FileText className="size-3.5" />
                    Attachment: {selectedRequest.attachmentName}
                  </p>
                )}
              </div>

              {reviewMode === "REJECT" && (
                <div className="grid gap-1.5">
                  <label className="font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3.5" />
                    Rejection Reason (Mandatory) *
                  </label>
                  <Textarea
                    placeholder="Provide clear reason why this request cannot be approved..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>
              )}

              {reviewError && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                  {reviewError}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRequest(null);
                setReviewMode(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={reviewMode === "APPROVE" ? "default" : "destructive"}
              disabled={submittingReview}
              onClick={handleReviewSubmit}
            >
              {submittingReview
                ? "Processing..."
                : reviewMode === "APPROVE"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
