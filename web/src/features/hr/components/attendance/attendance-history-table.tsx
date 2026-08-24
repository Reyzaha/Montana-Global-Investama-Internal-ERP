"use client";

import React, { useEffect, useState } from "react";
import { MapPin, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Attendance } from "../../types/attendance.types";
import { mockAttendanceRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDate } from "../../utils/date";

export function AttendanceHistoryTable() {
  const { currentUser, storeVersion } = useHrContext();
  const [history, setHistory] = useState<Attendance[]>([]);

  useEffect(() => {
    let isMounted = true;
    mockAttendanceRepository
      .getAttendanceHistory(currentUser.id)
      .then((records) => {
        if (isMounted) setHistory(records);
      })
      .catch((err) => console.error("Failed to load attendance history:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Present
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
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <CardTitle className="text-base font-semibold">Attendance History</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing records for {currentUser.name}
        </span>
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="No attendance records yet"
            description="Your daily check-in and check-out logs will appear here once recorded."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {formatDisplayDate(record.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {record.scheduleName || "08:00 - 17:00"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{record.checkInAt || "-"}</span>
                        {record.checkInDistance !== null && (
                          <span className="text-[11px] text-muted-foreground">
                            {record.checkInDistance}m from office
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{record.checkOutAt || "-"}</span>
                        {record.checkOutDistance !== null && (
                          <span className="text-[11px] text-muted-foreground">
                            {record.checkOutDistance}m from office
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate max-w-[180px]">{record.locationName || "Office"}</span>
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
  );
}
