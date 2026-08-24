"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  UploadCloud,
  FileText,
  Save,
  Send,
  Tag,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload, UploadedFileInfo } from "@/components/shared/file-upload"
import { useLegal } from "@/src/features/legal/context/legal-context"
import {
  DOCUMENT_TYPE,
  DocumentType,
  PriorityLevel,
} from "@/src/features/legal/types/document.types"
import { MOCK_USERS } from "@/src/features/legal/mocks/legal-users"

export default function NewDocumentPage() {
  const router = useRouter()
  const { createDocument } = useLegal()

  const [title, setTitle] = React.useState("")
  const [docType, setDocType] = React.useState<DocumentType>("Contract")
  const [project, setProject] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<PriorityLevel>("MEDIUM")
  const [effectiveDate, setEffectiveDate] = React.useState("2026-09-01")
  const [expirationDate, setExpirationDate] = React.useState("2028-08-31")
  const [tagsInput, setTagsInput] = React.useState("Mining, Heavy Equipment, Capex")
  const [selectedFile, setSelectedFile] = React.useState<UploadedFileInfo | null>(null)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSave = async (submitImmediately: boolean) => {
    if (!title.trim()) {
      setError("Please enter the document title.")
      return
    }
    if (!project.trim()) {
      setError("Please enter the associated project name.")
      return
    }
    if (!selectedFile) {
      setError("Please select or drop the document file (.pdf, .docx).")
      return
    }

    setLoading(true)
    setError("")

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const doc = await createDocument({
        title: title.trim(),
        type: docType,
        project: project.trim(),
        description: description.trim() || undefined,
        priority,
        effectiveDate,
        expirationDate,
        tags,
        file: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        },
        submitImmediately,
      })

      router.push(`/legal/documents/${doc.id}`)
    } catch {
      setError("Failed to register document.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/legal" className="hover:underline hover:text-foreground">
          Legal
        </Link>
        <span>/</span>
        <Link href="/legal/documents" className="hover:underline hover:text-foreground">
          Documents
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Register New Document</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight sm:text-2xl">
            Register & Upload Document
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Upload contract drafts, agreements, or legal instruments for review and approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/legal/documents">
            <Button variant="outline" size="sm" className="text-xs h-8">
              Cancel
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="text-xs h-8 gap-1 cursor-pointer"
          >
            <Save className="size-3.5" />
            <span>Save as Draft</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={loading}
            className="text-xs h-8 gap-1 cursor-pointer"
          >
            <Send className="size-3.5" />
            <span>Submit for Review</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document File & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Zone */}
          <Card>
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UploadCloud className="size-4 text-primary" />
                Document File (v1.0)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <FileUpload
                value={selectedFile}
                onFileSelect={(file) => setSelectedFile(file)}
                helperText="Upload the initial draft in PDF or DOCX format (Max 25MB)"
              />
            </CardContent>
          </Card>

          {/* Core Information */}
          <Card>
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Document Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Project Agreement Komatsu 31P-20 Heavy Machinery Supply"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Document Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                  >
                    {Object.values(DOCUMENT_TYPE).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Related Project / Venture <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Sangatta Mining Expansion Block B"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Description & Context
                </label>
                <Textarea
                  placeholder="Ringkasan maksud perjanjian, pihak mitra, klausul khusus, atau latar belakang komersial..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Governance & Assignment Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold">
                Governance & Routing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Review Priority
                </label>
                <select
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (48hr SLA)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Assigned Legal PIC
                </label>
                <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">
                      {MOCK_USERS.LEGAL_PIC.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {MOCK_USERS.LEGAL_PIC.title}
                    </div>
                  </div>
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                    Legal Lead
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Authorized Executive Approver
                </label>
                <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">
                      {MOCK_USERS.DIRECTOR.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {MOCK_USERS.DIRECTOR.title}
                    </div>
                  </div>
                  <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 text-[10px] font-semibold">
                    Director
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Effective Date
                  </label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Expiration Date
                  </label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <Tag className="size-3.5" />
                  <span>Tags (Comma-separated)</span>
                </label>
                <Input
                  placeholder="e.g. Mining, Capex, Vendor"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
