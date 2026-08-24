"use client";

import React, { useEffect, useState } from "react";
import { Calendar, FileText, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveRequest, LEAVE_TYPE_LABELS } from "../../types/leave.types";
import { mockLeaveRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate, formatDisplayDateTime } from "../../utils/date";
import { LeaveRequestModal } from "./leave-request-modal";

export function UserLeaveHistoryTable() {
  const { currentUser, storeVersion } = useHrContext();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const loadRequests = () => {
    mockLeaveRepository
      .getUserLeaveRequests(currentUser.id)
      .then((records) => setRequests(records))
      .catch((err) => console.error("Failed to load user leave requests:", err));
  };

  useEffect(() => {
    let isMounted = true;
    mockLeaveRepository
      .getUserLeaveRequests(currentUser.id)
      .then((records) => {
        if (isMounted) setRequests(records);
      })
      .catch((err) => console.error("Failed to load user leave requests:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const getStatusBadge = (status: string) => {
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
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">My Permission & Leave Requests</CardTitle>
          <CardDescription className="text-xs">
            Review status and history of your submitted permissions (Sakit, Cuti, Izin).
          </CardDescription>
        </div>

        <LeaveRequestModal onRequestCreated={loadRequests} />
      </CardHeader>

      <CardContent>
        {requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No leave requests submitted"
            description="You have not submitted any permission, sick, or annual leave requests."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason & Details</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{LEAVE_TYPE_LABELS[req.type]}</span>
                        {req.attachmentName && (
                          <span className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                            <FileText className="size-3" />
                            {req.attachmentName}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {req.startDate === req.endDate ? (
                          formatDisplayDate(req.startDate)
                        ) : (
                          `${formatDisplayDate(req.startDate)} – ${formatDisplayDate(req.endDate)}`
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <p className="text-xs text-foreground line-clamp-2">{req.description}</p>
                      {req.status === "REJECTED" && req.reviewComment && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded bg-destructive/10 p-2 text-xs text-destructive border border-destructive/20">
                          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Rejection Reason: </span>
                            {req.reviewComment}
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDisplayDateTime(req.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      {getStatusBadge(req.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
