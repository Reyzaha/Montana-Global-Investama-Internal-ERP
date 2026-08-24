"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, Eye, BookOpen } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { HrDocument } from "../../types/document.types";
import { mockDocumentRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { formatDisplayDateTime } from "../../utils/date";

export function UserDocumentList() {
  const { currentUser, storeVersion } = useHrContext();

  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [viewingDoc, setViewingDoc] = useState<HrDocument | null>(null);

  const loadDocuments = () => {
    mockDocumentRepository
      .getUserDocuments(currentUser.id)
      .then((userDocs) => setDocuments(userDocs))
      .catch((err) => console.error("Failed to load user documents:", err));
  };

  useEffect(() => {
    let isMounted = true;
    mockDocumentRepository
      .getUserDocuments(currentUser.id)
      .then((userDocs) => {
        if (isMounted) setDocuments(userDocs);
      })
      .catch((err) => console.error("Failed to load user documents:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  const handleOpenDoc = async (doc: HrDocument) => {
    setViewingDoc(doc);
    try {
      await mockDocumentRepository.markDocumentAsRead(doc.id, currentUser.id);
    } catch (err) {
      console.error("Failed to mark document as read:", err);
    }
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <div>
            <CardTitle className="text-base font-semibold">My Documents</CardTitle>
            <CardDescription className="text-xs">
              Official company documents, policies, guidelines, and handbooks shared with you by HR.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents have been shared with you"
            description="When HR distributes policies, handbooks, or company forms to you, they will appear here."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const recipientInfo = doc.recipients.find((r) => r.userId === currentUser.id);
                  const isUnread = !recipientInfo?.readAt;

                  return (
                    <TableRow key={doc.id} className={isUnread ? "bg-primary/[0.02]" : ""}>
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`flex size-8 items-center justify-center rounded mt-0.5 ${
                              isUnread ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <FileText className="size-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm block flex items-center gap-2">
                              {doc.title}
                              {isUnread && (
                                <span className="size-2 rounded-full bg-primary inline-block" />
                              )}
                            </span>
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

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDisplayDateTime(recipientInfo?.deliveredAt || doc.createdAt)}
                      </TableCell>

                      <TableCell>
                        {isUnread ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                            Unread
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                            Read
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => handleOpenDoc(doc)}
                        >
                          <Eye className="mr-1 size-3.5" />
                          Open Document
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

      {/* Document Viewer Modal */}
      <Dialog open={Boolean(viewingDoc)} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <DialogTitle className="text-base font-semibold">{viewingDoc?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Category: {viewingDoc?.type} • From: HR ({viewingDoc?.uploadedByName || "HR Department"})
            </DialogDescription>
          </DialogHeader>

          {viewingDoc && (
            <div className="grid gap-3 py-2 text-xs">
              {viewingDoc.description && (
                <div className="rounded-md bg-muted/40 p-3 border">
                  <span className="text-muted-foreground block mb-1">Message from HR:</span>
                  <p className="font-medium text-foreground">{viewingDoc.description}</p>
                </div>
              )}

              {/* Simulated Document Preview Card */}
              <div className="rounded-lg border border-dashed p-6 text-center bg-muted/10">
                <FileText className="mx-auto size-12 text-primary/60 mb-2" />
                <p className="font-semibold text-sm text-foreground">{viewingDoc.fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format: PDF Document • File Size: {viewingDoc.fileSize || "1.2 MB"}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      alert(`Downloading ${viewingDoc.fileName}...`);
                    }}
                    className="text-xs"
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Download File
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewingDoc(null);
                loadDocuments();
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
