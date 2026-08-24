"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  User,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { LegalDocument } from "../types/document.types"
import { getPriorityVariant, getStatusConfig } from "../types/status-helper"

export function DocumentCard({ doc }: { doc: LegalDocument }) {
  const statusCfg = getStatusConfig(doc.status)
  const priorityVariant = getPriorityVariant(doc.priority)

  return (
    <Card className="group flex flex-col justify-between hover:border-primary/50 transition-all duration-150 shadow-2xs hover:shadow-xs">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        {/* Badges row */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge
            variant={statusCfg.variant}
            label={statusCfg.label}
            size="sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Layers className="size-3" />
              v{doc.currentVersion}.0
            </span>
            <StatusBadge
              variant={priorityVariant}
              label={doc.priority}
              showDot={false}
              size="sm"
            />
          </div>
        </div>

        {/* Title and ID */}
        <div className="space-y-1">
          <Link
            href={`/legal/documents/${doc.id}`}
            className="font-semibold text-sm text-foreground line-clamp-2 hover:text-primary transition-colors group-hover:underline"
          >
            {doc.title}
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{doc.documentNumber}</span>
            <span>&bull;</span>
            <span>{doc.type}</span>
          </div>
        </div>

        {/* Project Tag */}
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground border">
          <span className="font-medium text-foreground">Project: </span>
          {doc.project}
        </div>

        {/* Metadata footer */}
        <div className="mt-auto pt-3 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <User className="size-3.5 shrink-0 text-muted-foreground/75" />
            <span className="truncate">{doc.uploadedBy.name}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end truncate">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground/75" />
            <span>{doc.createdAt.split(" ")[0]}</span>
          </div>
        </div>
      </CardContent>

      <div className="border-t bg-muted/20 px-5 py-2.5 flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {doc.assignedLegalPic.name.split(" ")[0]} (PIC)
        </span>
        <Link
          href={`/legal/documents/${doc.id}`}
          className="text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
        >
          <span>Open Document</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  )
}
