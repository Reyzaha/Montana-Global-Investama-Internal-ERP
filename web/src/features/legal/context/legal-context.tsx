"use client"

import * as React from "react"
import {
  ApprovalInput,
  CreateDocumentInput,
  LegalDocument,
  RequestRevisionInput,
  ResubmitDocumentInput,
} from "../types/document.types"
import { LegalTask } from "../types/task.types"
import { CreateLegalRequestInput, LegalRequest } from "../types/request.types"
import { LegalActivity } from "../types/activity.types"
import {
  LegalDashboardStats,
  LegalDocumentRepository,
} from "../services/legal-repository.interface"
import { mockLegalRepository } from "../services/mock-legal-repository"
import { usePermissions } from "../permissions/permission-context"
import { useToast } from "@/components/ui/toast"
import { INITIAL_LEGAL_DOCUMENTS } from "../mocks/legal-documents"
import { INITIAL_LEGAL_TASKS } from "../mocks/legal-tasks"
import { INITIAL_LEGAL_REQUESTS } from "../mocks/legal-requests"
import { INITIAL_LEGAL_ACTIVITIES } from "../mocks/legal-activities"

interface LegalContextType {
  repository: LegalDocumentRepository
  documents: LegalDocument[]
  tasks: LegalTask[]
  requests: LegalRequest[]
  activities: LegalActivity[]
  stats: LegalDashboardStats
  loading: boolean
  refresh: () => Promise<void>

  // Actions
  createDocument: (input: CreateDocumentInput) => Promise<LegalDocument>
  submitForReview: (id: string) => Promise<LegalDocument>
  startReview: (id: string) => Promise<LegalDocument>
  requestRevision: (id: string, input: RequestRevisionInput) => Promise<LegalDocument>
  resubmitDocument: (id: string, input: ResubmitDocumentInput) => Promise<LegalDocument>
  passReview: (id: string, notes?: string) => Promise<LegalDocument>
  approveDocument: (id: string, input: ApprovalInput) => Promise<LegalDocument>
  rejectDocument: (id: string, input: ApprovalInput) => Promise<LegalDocument>
  addComment: (
    documentId: string,
    content: string,
    isInternalOnly?: boolean
  ) => Promise<void>
  createRequest: (input: CreateLegalRequestInput) => Promise<LegalRequest>
  resetMockData: () => Promise<void>
}

const LegalContext = React.createContext<LegalContextType | undefined>(undefined)

export function LegalProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = usePermissions()
  const { toast } = useToast()
  const repository = mockLegalRepository

  const [documents, setDocuments] = React.useState<LegalDocument[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("mgi_legal_documents_v1")
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return INITIAL_LEGAL_DOCUMENTS
  })

  const [tasks, setTasks] = React.useState<LegalTask[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("mgi_legal_tasks_v1")
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return INITIAL_LEGAL_TASKS
  })

  const [requests, setRequests] = React.useState<LegalRequest[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("mgi_legal_requests_v1")
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return INITIAL_LEGAL_REQUESTS
  })

  const [activities, setActivities] = React.useState<LegalActivity[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("mgi_legal_activities_v1")
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return INITIAL_LEGAL_ACTIVITIES
  })

  const [loading, setLoading] = React.useState(false)

  const stats: LegalDashboardStats = React.useMemo(() => {
    const total = documents.length
    const pendingReview = documents.filter(
      (d) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW" || d.status === "RESUBMITTED"
    ).length
    const revisionRequired = documents.filter(
      (d) => d.status === "REVISION_REQUIRED"
    ).length
    const pendingApproval = documents.filter(
      (d) => d.status === "PENDING_APPROVAL"
    ).length
    const approved = documents.filter((d) => d.status === "APPROVED").length
    const rejected = documents.filter((d) => d.status === "REJECTED").length
    const draft = documents.filter((d) => d.status === "DRAFT").length
    const activeTasks = tasks.filter((t) => t.status !== "COMPLETED").length
    const incomingRequests = requests.filter(
      (r) => r.status === "SUBMITTED" || r.status === "ASSIGNED" || r.status === "IN_PROGRESS"
    ).length

    return {
      totalDocuments: total,
      pendingReviewCount: pendingReview,
      revisionRequiredCount: revisionRequired,
      pendingApprovalCount: pendingApproval,
      approvedCount: approved,
      rejectedCount: rejected,
      draftCount: draft,
      activeTasksCount: activeTasks,
      incomingRequestsCount: incomingRequests,
    }
  }, [documents, tasks, requests])

  const refresh = React.useCallback(async () => {
    const [docsData, tasksData, reqsData, actsData] = await Promise.all([
      repository.getDocuments(),
      repository.getTasks(),
      repository.getRequests(),
      repository.getActivities(),
    ])
    setDocuments(docsData)
    setTasks(tasksData)
    setRequests(reqsData)
    setActivities(actsData)
  }, [repository])

  const createDocument = React.useCallback(
    async (input: CreateDocumentInput) => {
      setLoading(true)
      try {
        const doc = await repository.createDocument(input, currentUser)
        await refresh()
        toast({
          title: "Document Registered",
          description: `Document ${doc.documentNumber} has been ${input.submitImmediately ? "submitted for review" : "saved as draft"}.`,
          variant: "success",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create document"
        toast({
          title: "Error Creating Document",
          description: message,
          variant: "destructive",
        })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const submitForReview = React.useCallback(
    async (id: string) => {
      try {
        const doc = await repository.submitForReview(id, currentUser)
        await refresh()
        toast({
          title: "Submitted for Legal Review",
          description: `Document ${doc.documentNumber} is now submitted to Legal PIC.`,
          variant: "success",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Submission failed"
        toast({
          title: "Submission Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const startReview = React.useCallback(
    async (id: string) => {
      try {
        const doc = await repository.startReview(id, currentUser)
        await refresh()
        toast({
          title: "Review In Progress",
          description: `You have started reviewing ${doc.documentNumber}.`,
          variant: "info",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Action failed"
        toast({
          title: "Action Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const requestRevision = React.useCallback(
    async (id: string, input: RequestRevisionInput) => {
      try {
        const doc = await repository.requestRevision(id, input, currentUser)
        await refresh()
        toast({
          title: "Revision Requested",
          description: `Notification and task sent to ${doc.uploadedBy.name}.`,
          variant: "warning",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Request revision failed"
        toast({
          title: "Failed to Request Revision",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const resubmitDocument = React.useCallback(
    async (id: string, input: ResubmitDocumentInput) => {
      try {
        const doc = await repository.resubmitDocument(id, input, currentUser)
        await refresh()
        toast({
          title: "New Version Resubmitted",
          description: `Version ${doc.currentVersion}.0 submitted to Legal PIC for verification.`,
          variant: "success",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Resubmission failed"
        toast({
          title: "Resubmission Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const passReview = React.useCallback(
    async (id: string, notes?: string) => {
      try {
        const doc = await repository.passReview(id, notes, currentUser)
        await refresh()
        toast({
          title: "Legal Review Passed",
          description: `Document ${doc.documentNumber} forwarded to Director for formal approval.`,
          variant: "success",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Action failed"
        toast({
          title: "Action Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const approveDocument = React.useCallback(
    async (id: string, input: ApprovalInput) => {
      try {
        const doc = await repository.approveDocument(id, input, currentUser)
        await refresh()
        toast({
          title: "Document Formally Approved",
          description: `Document ${doc.documentNumber} has been approved by Director and is now legally binding.`,
          variant: "success",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Approval failed"
        toast({
          title: "Approval Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const rejectDocument = React.useCallback(
    async (id: string, input: ApprovalInput) => {
      try {
        const doc = await repository.rejectDocument(id, input, currentUser)
        await refresh()
        toast({
          title: "Document Rejected",
          description: `Document ${doc.documentNumber} has been marked as rejected.`,
          variant: "destructive",
        })
        return doc
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Rejection failed"
        toast({
          title: "Rejection Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const addComment = React.useCallback(
    async (documentId: string, content: string, isInternalOnly?: boolean) => {
      try {
        await repository.addComment(documentId, content, currentUser, isInternalOnly)
        await refresh()
        toast({
          title: "Comment Added",
          description: isInternalOnly
            ? "Internal legal note recorded."
            : "Comment posted to document thread.",
          variant: "info",
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add comment"
        toast({
          title: "Comment Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const createRequest = React.useCallback(
    async (input: CreateLegalRequestInput) => {
      try {
        const req = await repository.createRequest(input, currentUser)
        await refresh()
        toast({
          title: "Legal Request Submitted",
          description: `Request ${req.requestNumber} submitted to Legal department.`,
          variant: "success",
        })
        return req
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Request submission failed"
        toast({
          title: "Request Failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    [currentUser, refresh, repository, toast]
  )

  const resetMockData = React.useCallback(async () => {
    mockLegalRepository.resetToDefaults()
    await refresh()
    toast({
      title: "Data Reset",
      description: "All legal documents, tasks, requests, and activity logs have been reset to default mock state.",
      variant: "info",
    })
  }, [refresh, toast])

  return (
    <LegalContext.Provider
      value={{
        repository,
        documents,
        tasks,
        requests,
        activities,
        stats,
        loading,
        refresh,
        createDocument,
        submitForReview,
        startReview,
        requestRevision,
        resubmitDocument,
        passReview,
        approveDocument,
        rejectDocument,
        addComment,
        createRequest,
        resetMockData,
      }}
    >
      {children}
    </LegalContext.Provider>
  )
}

export function useLegal() {
  const context = React.useContext(LegalContext)
  if (!context) {
    throw new Error("useLegal must be used within a LegalProvider")
  }
  return context
}

export function useLegalDocument(id: string) {
  const { documents, refresh } = useLegal()
  const document = React.useMemo(() => {
    return documents.find((d) => d.id === id) ?? null
  }, [documents, id])

  return { document, loading: false, reload: refresh, refreshGlobal: refresh }
}
