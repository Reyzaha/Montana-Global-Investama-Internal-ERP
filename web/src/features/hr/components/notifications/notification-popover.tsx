"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  FileText,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notification } from "../../types/notification.types";
import { mockNotificationRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function NotificationPopover() {
  const { currentUser, storeVersion } = useHrContext();

  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_SHARED":
        return <FileText className="size-4 text-blue-500 shrink-0" />;
      case "PAYROLL_AVAILABLE":
        return <Wallet className="size-4 text-emerald-500 shrink-0" />;
      case "LEAVE_APPROVED":
        return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
      case "LEAVE_REJECTED":
        return <XCircle className="size-4 text-destructive shrink-0" />;
      case "LEAVE_REQUEST_SUBMITTED":
        return <Clock className="size-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="size-4 text-primary shrink-0" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9">
          <Bell className="size-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border-border">
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Bell className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">You&apos;re all caught up</p>
              <p className="mt-0.5 text-[11px]">No new notifications at this time.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={(e) => !notif.isRead && handleMarkAsRead(notif.id, e)}
                className={`flex items-start gap-3 p-3 text-xs transition-colors hover:bg-muted/40 cursor-pointer ${
                  notif.isRead ? "opacity-75" : "bg-primary/[0.03] font-medium"
                }`}
              >
                <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-foreground truncate block">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {formatDisplayDateTime(notif.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t text-center bg-muted/10">
          <a
            href="/notifications"
            className="text-[11px] text-primary hover:underline font-medium block py-0.5"
          >
            View all notifications →
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
