"use client"

import * as React from "react"
import { FileText, Download, User, Calendar, CheckCircle2, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LegalDocument, DocumentVersion } from "../types/document.types"

export function DocumentVersionHistory({
  document: doc,
  onOpenPreview,
}: {
  document: LegalDocument
  onOpenPreview?: () => void
}) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Sorted versions from newest to oldest
  const sortedVersions = [...doc.versions].sort((a, b) => b.version - a.version)

  return (
    <Card>
      <CardHeader className="py-4 px-5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Version History ({doc.versions.length})
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            Current: v{doc.currentVersion}.0
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y">
        {sortedVersions.map((ver: DocumentVersion) => {
          const isLatest = ver.version === doc.currentVersion
          return (
            <div
              key={ver.version}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isLatest ? "bg-muted/30" : "hover:bg-muted/15"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <FileText className="size-4.5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {ver.fileName}
                    </span>
                    <span className="rounded bg-primary/10 text-primary font-bold px-1.5 py-0.2 text-[10px]">
                      v{ver.version}.0
                    </span>
                    {isLatest && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-medium">
                        <CheckCircle2 className="size-3" />
                        Active Version
                      </span>
                    )}
                  </div>

                  {ver.changeSummary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ver.changeSummary}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {ver.uploadedBy.name} ({ver.uploadedBy.department})
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {ver.uploadedAt}
                    </span>
                    <span>&bull;</span>
                    <span>{formatSize(ver.fileSize)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {isLatest && onOpenPreview && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={onOpenPreview}
                    className="text-xs cursor-pointer"
                  >
                    Preview
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => alert(`Downloading v${ver.version}.0: ${ver.fileName}`)}
                >
                  <Download className="size-3" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
