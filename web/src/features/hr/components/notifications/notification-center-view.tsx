"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  FileText,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Info,
  CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Notification } from "../../types/notification.types";
import { mockNotificationRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function NotificationCenterView() {
  const { currentUser, storeVersion } = useHrContext();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;
    mockNotificationRepository
      .getUserNotifications(currentUser.id)
      .then((list) => {
        if (isMounted) setNotifications(list);
      })
      .catch((err) => console.error("Failed to load notifications:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await mockNotificationRepository.markAsRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await mockNotificationRepository.markAllAsRead(currentUser.id);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterType === "UNREAD") return !n.isRead;
    if (filterType === "DOCUMENTS") return n.type === "DOCUMENT_SHARED";
    if (filterType === "PAYROLL") return n.type === "PAYROLL_AVAILABLE";
    if (filterType === "LEAVE")
      return (
        n.type === "LEAVE_APPROVED" ||
        n.type === "LEAVE_REJECTED" ||
        n.type === "LEAVE_REQUEST_SUBMITTED"
      );
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_SHARED":
        return <FileText className="size-5 text-blue-500 shrink-0" />;
      case "PAYROLL_AVAILABLE":
        return <Wallet className="size-5 text-emerald-500 shrink-0" />;
      case "LEAVE_APPROVED":
        return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />;
      case "LEAVE_REJECTED":
        return <XCircle className="size-5 text-destructive shrink-0" />;
      case "LEAVE_REQUEST_SUBMITTED":
        return <Clock className="size-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="size-5 text-primary shrink-0" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">Notification Center</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-1">
            System notices, document deliveries, leave statuses, and cross-department updates.
          </CardDescription>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
            <CheckCheck className="mr-1.5 size-3.5" />
            Mark All as Read
          </Button>
        )}
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: "ALL", label: "All Notifications" },
            { id: "UNREAD", label: `Unread (${unreadCount})` },
            { id: "DOCUMENTS", label: "Documents" },
            { id: "PAYROLL", label: "Payroll" },
            { id: "LEAVE", label: "Leave & Permissions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterType === tab.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="There are no notifications in this view."
          />
        ) : (
          <div className="rounded-lg border divide-y overflow-hidden">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-4 p-4 transition-colors ${
                  item.isRead ? "bg-card" : "bg-primary/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getNotifIcon(item.type)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{item.title}</span>
                      {!item.isRead && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    <span className="text-[11px] text-muted-foreground/80 mt-1.5 block">
                      {formatDisplayDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                {!item.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs shrink-0"
                    onClick={() => handleMarkAsRead(item.id)}
                  >
                    <Check className="mr-1 size-3.5" />
                    Mark Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
