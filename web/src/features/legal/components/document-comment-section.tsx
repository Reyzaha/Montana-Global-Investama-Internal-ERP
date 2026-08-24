"use client"

import * as React from "react"
import { MessageSquare, Send, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LegalDocument, DocumentComment } from "../types/document.types"
import { useLegal } from "../context/legal-context"
import { usePermissions } from "../permissions/permission-context"
import { PermissionGate } from "../permissions/permission-gate"
import { LEGAL_PERMISSIONS } from "../permissions/permissions.config"

export function DocumentCommentSection({ document: doc }: { document: LegalDocument }) {
  const { addComment } = useLegal()
  const { currentUser } = usePermissions()
  const [commentText, setCommentText] = React.useState("")
  const [isInternalOnly, setIsInternalOnly] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const isLegalTeam =
    currentUser.department === "Legal" || currentUser.role === "LEGAL_PIC"

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setLoading(true)
    try {
      await addComment(doc.id, commentText.trim(), isInternalOnly)
      setCommentText("")
      setIsInternalOnly(false)
    } finally {
      setLoading(false)
    }
  }

  // Filter internal notes if user is not in Legal
  const visibleComments = doc.comments.filter((c: DocumentComment) => {
    if (c.isInternalLegalOnly) {
      return isLegalTeam
    }
    return true
  })

  return (
    <Card>
      <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            Review Notes & Comments ({visibleComments.length})
          </CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          Thread on v{doc.currentVersion}.0
        </span>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Comment Thread List */}
        {visibleComments.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            No comments yet. Start a discussion or add a review note.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((cmt: DocumentComment) => {
              const initials = cmt.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()

              return (
                <div
                  key={cmt.id}
                  className={`rounded-lg border p-3.5 space-y-1.5 transition-colors ${
                    cmt.isInternalLegalOnly
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px] bg-muted font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-foreground">
                        {cmt.author.name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                        {cmt.author.department}
                      </span>
                      {cmt.isInternalLegalOnly && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.2 text-[10px] font-semibold">
                          <Lock className="size-2.5" />
                          Internal Legal Note
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted-foreground/10 px-1 text-[10px]">
                        v{cmt.versionTarget}.0
                      </span>
                      <span>{cmt.createdAt}</span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed pl-8">
                    {cmt.content}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* New Comment Input Form */}
        <PermissionGate permission={LEGAL_PERMISSIONS.REVIEW_COMMENT}>
          <form onSubmit={handlePostComment} className="pt-2 border-t space-y-2.5">
            <div className="space-y-1">
              <Textarea
                placeholder="Add a review note, clause remark, or question..."
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              {isLegalTeam ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternalOnly}
                    onChange={(e) => setIsInternalOnly(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary size-3.5"
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="size-3" />
                    Internal Legal Note only (hidden from requester)
                  </span>
                </label>
              ) : (
                <div />
              )}

              <Button
                type="submit"
                size="sm"
                disabled={loading || !commentText.trim()}
                className="gap-1.5 text-xs h-7 cursor-pointer"
              >
                <Send className="size-3" />
                <span>{loading ? "Posting..." : "Post Comment"}</span>
              </Button>
            </div>
          </form>
        </PermissionGate>
      </CardContent>
    </Card>
  )
}
