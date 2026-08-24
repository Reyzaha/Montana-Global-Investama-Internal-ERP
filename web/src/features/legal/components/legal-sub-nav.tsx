"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Scale,
  LayoutDashboard,
  FileText,
  CheckSquare,
  HelpCircle,
  History,
  Plus,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLegal } from "../context/legal-context"
import { PermissionGate } from "../permissions/permission-gate"
import { LEGAL_PERMISSIONS } from "../permissions/permissions.config"
import { cn } from "@/lib/utils"

export function LegalSubNav({ onNewRequest }: { onNewRequest?: () => void }) {
  const pathname = usePathname()
  const { stats } = useLegal()

  const navItems = [
    {
      label: "Overview",
      href: "/legal",
      icon: LayoutDashboard,
      isActive: pathname === "/legal",
    },
    {
      label: "Documents",
      href: "/legal/documents",
      icon: FileText,
      count: stats.totalDocuments,
      isActive: pathname.startsWith("/legal/documents"),
    },
    {
      label: "Work Queue",
      href: "/legal/tasks",
      icon: CheckSquare,
      count: stats.activeTasksCount,
      countVariant: stats.activeTasksCount > 0 ? "warning" : "neutral",
      isActive: pathname.startsWith("/legal/tasks"),
    },
    {
      label: "Collaboration Requests",
      href: "/legal/requests",
      icon: HelpCircle,
      count: stats.incomingRequestsCount,
      isActive: pathname.startsWith("/legal/requests"),
    },
    {
      label: "Audit Trail",
      href: "/legal/activity",
      icon: History,
      isActive: pathname === "/legal/activity",
    },
  ]

  return (
    <div className="border-b bg-card px-6 py-2.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Workspace Title & Section Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Scale className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Legal Workspace
              </h2>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Corporate Governance & Contracts
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              PT Montana Global Investama &bull; Enterprise Legal Review & Document Management
            </p>
          </div>
        </div>

        {/* Global Action CTA Buttons */}
        <div className="flex items-center gap-2">
          {onNewRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewRequest}
              className="gap-1.5 text-xs h-8 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Request</span>
            </Button>
          )}

          <PermissionGate permission={LEGAL_PERMISSIONS.DOCUMENT_UPLOAD}>
            <Link href="/legal/documents/new">
              <Button size="sm" className="gap-1.5 text-xs h-8 cursor-pointer">
                <Upload className="size-3.5" />
                <span>Upload Document</span>
              </Button>
            </Link>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <nav aria-label="Legal Navigation" className="mt-3 flex items-center gap-1 border-t pt-2 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                item.isActive
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-none",
                    item.countVariant === "warning"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
