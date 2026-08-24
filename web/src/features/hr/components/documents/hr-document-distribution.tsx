"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Users,
  CheckSquare,
  Square,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { HrDocument } from "../../types/document.types";
import { EmployeeProfile } from "../../types/employee.types";
import { mockDocumentRepository, mockEmployeeRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function HrDocumentDistribution() {
  const { currentUser, storeVersion } = useHrContext();

  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // Upload & Share Modal State
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("Company Policy");
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // View Details Modal State
  const [viewingDoc, setViewingDoc] = useState<HrDocument | null>(null);

  const loadData = () => {
    Promise.all([
      mockDocumentRepository.getAllSharedDocuments(),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allDocs, allEmps]) => {
        setDocuments(allDocs);
        setEmployees(allEmps);
      })
      .catch((err) => console.error("Failed to load documents:", err));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockDocumentRepository.getAllSharedDocuments(),
      mockEmployeeRepository.getAllEmployees(),
    ])
      .then(([allDocs, allEmps]) => {
        if (isMounted) {
          setDocuments(allDocs);
          setEmployees(allEmps);
        }
      })
      .catch((err) => console.error("Failed to load documents:", err));

    return () => {
      isMounted = false;
    };
  }, [storeVersion]);

  const handleSelectAll = () => {
    if (selectedUserIds.length === employees.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(employees.map((e) => e.id));
    }
  };

  const handleToggleUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((userId) => userId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Document title is required.");
      return;
    }

    if (!fileName.trim()) {
      setError("Please specify or upload a document file.");
      return;
    }

    if (selectedUserIds.length === 0) {
      setError("Please select at least one recipient employee.");
      return;
    }

    setSubmitting(true);
    try {
      await mockDocumentRepository.shareDocument({
        title: title.trim(),
        type: docType,
        fileName: fileName.trim(),
        fileUrl: `/documents/${fileName.trim()}`,
        fileSize: "1.4 MB",
        description: description.trim() || undefined,
        uploadedBy: currentUser.id,
        recipientUserIds: selectedUserIds,
      });

      setOpenModal(false);
      setTitle("");
      setFileName("");
      setDescription("");
      setSelectedUserIds([]);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to share document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header and Upload Action */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">HR Document Distribution</CardTitle>
            <CardDescription className="text-xs">
              Upload company regulations, handbooks, SOPs, and distribute to selected employees.
            </CardDescription>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="mr-1.5 size-4" />
                Upload & Share Document
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Share HR Document</DialogTitle>
                <DialogDescription className="text-xs">
                  Fill in the document details and select which employees should receive it.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleShareSubmit} className="grid gap-4 py-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="font-medium">Document Title *</label>
                    <Input
                      placeholder="e.g. Employee Handbook 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label className="font-medium">Document Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="Employee Handbook">Employee Handbook</option>
                      <option value="Company Policy">Company Policy</option>
                      <option value="Safety & HSE Guideline">Safety & HSE Guideline</option>
                      <option value="Benefit & Insurance Guide">Benefit & Insurance Guide</option>
                      <option value="Internal Announcement">Internal Announcement</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="font-medium">File Name / Attachment *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Montana-Employee-Handbook-2026.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      required
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs px-2.5"
                      onClick={() => setFileName(`MGI-${docType.replace(/\s+/g, "-")}-2026.pdf`)}
                    >
                      <FileText className="size-3.5 mr-1" />
                      Auto-Fill
                    </Button>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="font-medium">Description (Optional)</label>
                  <Textarea
                    placeholder="Provide overview or instructions for the recipient employees..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Multi-Select Employees Checkbox Section */}
                <div className="grid gap-2 border rounded-lg p-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      Select Target Employees ({selectedUserIds.length}/{employees.length}) *
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      {selectedUserIds.length === employees.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto divide-y border rounded bg-background">
                    {employees.map((emp) => {
                      const isSelected = selectedUserIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleToggleUser(emp.id)}
                          className="flex items-center justify-between p-2 hover:bg-muted/40 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="size-4 text-primary" />
                            ) : (
                              <Square className="size-4 text-muted-foreground" />
                            )}
                            <div>
                              <span className="font-medium text-foreground">{emp.name}</span>
                              <span className="text-[11px] text-muted-foreground block">
                                {emp.username} • {emp.department}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {emp.role}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                    {error}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Distributing..." : "Share Document"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents shared yet"
              description="Uploaded company guidelines and forms distributed to employees will appear here."
              actionLabel="Upload First Document"
              onAction={() => setOpenModal(true)}
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Shared On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const readCount = doc.recipients.filter((r) => r.readAt).length;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-start gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-primary mt-0.5">
                              <FileText className="size-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm block">{doc.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {doc.fileName} • {doc.fileSize || "1.2 MB"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {doc.type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-medium">
                              {doc.recipients.length} {doc.recipients.length === 1 ? "Employee" : "Employees"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {readCount} of {doc.recipients.length} read
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDisplayDateTime(doc.createdAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setViewingDoc(doc)}
                          >
                            <Eye className="mr-1 size-3.5" />
                            View Distribution
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Distribution Details Modal */}
      <Dialog open={Boolean(viewingDoc)} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{viewingDoc?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {viewingDoc?.fileName} • Distributed by {viewingDoc?.uploadedByName || "HR"}
            </DialogDescription>
          </DialogHeader>

          {viewingDoc && (
            <div className="grid gap-3 py-2 text-xs">
              {viewingDoc.description && (
                <div className="rounded-md bg-muted/40 p-3 border">
                  <span className="text-muted-foreground block mb-1">Description:</span>
                  <p className="text-foreground">{viewingDoc.description}</p>
                </div>
              )}

              <div>
                <span className="font-semibold text-foreground mb-2 block">
                  Delivery Status ({viewingDoc.recipients.length} Recipients)
                </span>
                <div className="max-h-48 overflow-y-auto divide-y border rounded bg-background">
                  {viewingDoc.recipients.map((rec) => (
                    <div key={rec.userId} className="flex items-center justify-between p-2 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{rec.userName || rec.userId}</span>
                        <span className="text-[11px] text-muted-foreground block">{rec.userEmail}</span>
                      </div>
                      <div>
                        {rec.readAt ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Read ({formatDisplayDate(rec.readAt)})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Delivered
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setViewingDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
