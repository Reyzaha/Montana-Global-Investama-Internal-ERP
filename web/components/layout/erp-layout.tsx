"use client";

import React from "react";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HrProvider } from "@/src/features/hr/context/hr-context";
import { RoleSwitcher } from "./role-switcher";
import { NotificationPopover } from "@/src/features/hr/components/notifications/notification-popover";

interface ErpLayoutProps {
  children: React.ReactNode;
}

export function ErpLayout({ children }: ErpLayoutProps) {
  return (
    <HrProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background/95 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <SidebarTrigger />

              <Separator orientation="vertical" className="mr-2 h-4" />

              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  MGI ERP
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  • PT Montana Global Investama
                </span>
              </div>
            </div>

            {/* Topbar Right Actions: Notifications & Role Switcher */}
            <div className="flex items-center gap-2">
              <NotificationPopover />
              <Separator orientation="vertical" className="h-4" />
              <RoleSwitcher />
            </div>
          </header>

          <main className="flex flex-1 flex-col bg-muted/20">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </HrProvider>
  );
}