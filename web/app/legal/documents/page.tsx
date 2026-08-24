"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText,
  Search,
  LayoutGrid,
  List,
  Upload,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { DocumentCard } from "@/src/features/legal/components/document-card"
import { useLegal } from "@/src/features/legal/context/legal-context"
import {
  DOCUMENT_TYPE,
  DocumentStatus,
  LegalDocument,
} from "@/src/features/legal/types/document.types"
import { getPriorityVariant, getStatusConfig } from "@/src/features/legal/types/status-helper"
import { PermissionGate } from "@/src/features/legal/permissions/permission-gate"
import { LEGAL_PERMISSIONS } from "@/src/features/legal/permissions/permissions.config"

const STATUS_FILTERS: { label: string; value: DocumentStatus | "ALL" }[] = [
  { label: "All Status", value: "ALL" },
  { label: "Pending Review", value: "UNDER_REVIEW" },
  { label: "Revision Required", value: "REVISION_REQUIRED" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Draft", value: "DRAFT" },
  { label: "Rejected", value: "REJECTED" },
]

export default function DocumentRegistryPage() {
  const router = useRouter()
  const { documents } = useLegal()

  const [search, setSearch] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState<DocumentStatus | "ALL">("ALL")
  const [selectedType, setSelectedType] = React.useState<string>("ALL")
  const [selectedPriority, setSelectedPriority] = React.useState<string>("ALL")
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table")
  const [sortBy, setSortBy] = React.useState<"newest" | "title" | "status">("newest")
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 8

  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    let result = [...documents]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          d.project.toLowerCase().includes(q) ||
          d.uploadedBy.name.toLowerCase().includes(q) ||
          (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
      )
    }

    if (selectedStatus !== "ALL") {
      result = result.filter((d) => d.status === selectedStatus)
    }

    if (selectedType !== "ALL") {
      result = result.filter((d) => d.type === selectedType)
    }

    if (selectedPriority !== "ALL") {
      result = result.filter((d) => d.priority === selectedPriority)
    }

    // Sort
    if (sortBy === "newest") {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === "status") {
      result.sort((a, b) => a.status.localeCompare(b.status))
    }

    return result
  }, [documents, search, selectedStatus, selectedType, selectedPriority, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1
  const paginatedDocuments = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredDocuments.slice(start, start + itemsPerPage)
  }, [filteredDocuments, currentPage])

  return (
    <div className="space-y-6">
      {/* Header Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Legal Document Registry
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Central repository of contracts, agreements, corporate resolutions, and compliance documents.
          </p>
        </div>

        <PermissionGate permission={LEGAL_PERMISSIONS.DOCUMENT_UPLOAD}>
          <Link href="/legal/documents/new">
            <Button size="sm" className="gap-1.5 text-xs h-8 cursor-pointer">
              <Upload className="size-3.5" />
              <span>Upload Document</span>
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Filter & Search Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, contract number, project, tags..."
                className="pl-8 text-xs h-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Types</option>
                {Object.values(DOCUMENT_TYPE).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "title" | "status")}
              >
                <option value="newest">Sort: Newest</option>
                <option value="title">Sort: Title (A-Z)</option>
                <option value="status">Sort: Status</option>
              </select>

              {/* Grid / Table Toggle */}
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon-xs"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon-xs"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Status Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t text-xs">
            <span className="text-muted-foreground mr-1 shrink-0">Status:</span>
            {STATUS_FILTERS.map((pill) => {
              const isSelected = selectedStatus === pill.value
              return (
                <button
                  key={pill.value}
                  onClick={() => {
                    setSelectedStatus(pill.value)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Document Listing */}
      {paginatedDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Found"
          description="No business documents match your current filter and search criteria."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch("")
            setSelectedStatus("ALL")
            setSelectedType("ALL")
            setSelectedPriority("ALL")
          }}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedDocuments.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        /* High-Density ERP Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Document Title & Ref ID</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Assigned PIC</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedDocuments.map((doc: LegalDocument) => {
                  const statusCfg = getStatusConfig(doc.status)
                  const priorityVariant = getPriorityVariant(doc.priority)

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        router.push(`/legal/documents/${doc.id}`)
                      }}
                    >
                      <td className="p-3.5 pl-5 max-w-xs">
                        <Link
                          href={`/legal/documents/${doc.id}`}
                          className="font-semibold text-foreground hover:text-primary hover:underline line-clamp-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {doc.title}
                        </Link>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {doc.documentNumber}
                        </div>
                      </td>

                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {doc.type}
                      </td>

                      <td className="p-3.5 text-muted-foreground whitespace-nowrap max-w-[180px] truncate">
                        {doc.project}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge
                          variant={statusCfg.variant}
                          label={statusCfg.label}
                          size="sm"
                        />
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge
                          variant={priorityVariant}
                          label={doc.priority}
                          size="sm"
                          showDot={false}
                        />
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                          <Layers className="size-3" />
                          v{doc.currentVersion}.0
                        </span>
                      </td>

                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {doc.assignedLegalPic.name.split(" ")[0]}
                      </td>

                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {doc.createdAt.split(" ")[0]}
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/legal/documents/${doc.id}`}
                          className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing{" "}
              <strong className="text-foreground">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredDocuments.length)}
              </strong>{" "}
              of <strong className="text-foreground">{filteredDocuments.length}</strong>{" "}
              documents
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
