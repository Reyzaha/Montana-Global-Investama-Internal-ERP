"use client";

import React, { useEffect, useState } from "react";
import { Wallet, FileText, Download, Eye, Calendar, Lock } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { PayrollDocument } from "../../types/payroll.types";
import { mockPayrollRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function UserPayrollList() {
  const { currentUser, storeVersion } = useHrContext();

  const [payrolls, setPayrolls] = useState<PayrollDocument[]>([]);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollDocument | null>(null);

  const loadPayroll = () => {
    mockPayrollRepository
      .getUserPayrollDocuments(currentUser.id)
      .then((userPayrolls) => setPayrolls(userPayrolls))
      .catch((err) => console.error("Failed to load user payroll documents:", err));
  };

  useEffect(() => {
    let isMounted = true;
    mockPayrollRepository
      .getUserPayrollDocuments(currentUser.id)
      .then((userPayrolls) => {
        if (isMounted) setPayrolls(userPayrolls);
      })
      .catch((err) => console.error("Failed to load user payroll documents:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const handleOpenPayroll = async (item: PayrollDocument) => {
    setViewingPayroll(item);
    try {
      await mockPayrollRepository.markPayrollAsRead(item.id);
    } catch (err) {
      console.error("Failed to mark payroll as read:", err);
    }
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold">My Payroll Documents</CardTitle>
              <CardDescription className="text-xs">
                Monthly official payslips and salary statements issued by Montana HR.
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Lock className="size-3 text-primary" />
            Confidential
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {payrolls.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payroll documents available"
            description="Your monthly payslip documents will appear here once published by HR."
          />
        ) : (
          <div className="grid gap-3">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Payroll Period</TableHead>
                    <TableHead>Document File</TableHead>
                    <TableHead>Published Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-primary" />
                          <span className="font-semibold text-sm">{item.period}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-foreground">{item.fileName}</span>
                          <span className="text-[11px] text-muted-foreground">({item.fileSize || "450 KB"})</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDisplayDateTime(item.publishedAt)}
                      </TableCell>

                      <TableCell>
                        {item.isRead ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Viewed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                            New Payslip
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => handleOpenPayroll(item)}
                        >
                          <Eye className="mr-1 size-3.5" />
                          View Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Payslip Viewer Modal */}
      <Dialog open={Boolean(viewingPayroll)} onOpenChange={(open) => !open && setViewingPayroll(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <DialogTitle className="text-base font-semibold">
                Payslip — {viewingPayroll?.period}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Confidential salary statement for {viewingPayroll?.employeeName} ({viewingPayroll?.employeeDepartment})
            </DialogDescription>
          </DialogHeader>

          {viewingPayroll && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee Name:</span>
                  <span className="font-semibold text-foreground">{viewingPayroll.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium text-foreground">{viewingPayroll.employeeDepartment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-medium text-foreground">{viewingPayroll.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published By:</span>
                  <span className="text-foreground">{viewingPayroll.publishedByName || "HR Department"}</span>
                </div>
              </div>

              {viewingPayroll.description && (
                <div className="rounded-md bg-muted/40 p-2.5 border">
                  <span className="text-muted-foreground block mb-0.5">HR Note:</span>
                  <p className="text-foreground">{viewingPayroll.description}</p>
                </div>
              )}

              {/* Secure Document Preview Box */}
              <div className="rounded-lg border border-dashed p-6 text-center bg-card">
                <FileText className="mx-auto size-12 text-primary/70 mb-2" />
                <p className="font-semibold text-sm text-foreground">{viewingPayroll.fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: Encrypted PDF • Size: {viewingPayroll.fileSize || "450 KB"}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      alert(`Downloading confidential payslip ${viewingPayroll.fileName}...`);
                    }}
                    className="text-xs"
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Download Payslip
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewingPayroll(null);
                loadPayroll();
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
