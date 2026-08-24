import {
  ApprovalInput,
  CreateDocumentInput,
  DocumentComment,
  DocumentFilter,
  LegalDocument,
  RequestRevisionInput,
  ResubmitDocumentInput,
} from "../types/document.types"
import { LegalTask, TaskFilter } from "../types/task.types"
import { CreateLegalRequestInput, LegalRequest } from "../types/request.types"
import { LegalActivity } from "../types/activity.types"
import { UserReference } from "../types/user.types"
import {
  LegalDashboardStats,
  LegalDocumentRepository,
} from "./legal-repository.interface"

import { INITIAL_LEGAL_DOCUMENTS } from "../mocks/legal-documents"
import { INITIAL_LEGAL_TASKS } from "../mocks/legal-tasks"
import { INITIAL_LEGAL_REQUESTS } from "../mocks/legal-requests"
import { INITIAL_LEGAL_ACTIVITIES } from "../mocks/legal-activities"
import { MOCK_USERS } from "../mocks/legal-users"

const STORAGE_KEYS = {
  DOCS: "mgi_legal_documents_v1",
  TASKS: "mgi_legal_tasks_v1",
  REQUESTS: "mgi_legal_requests_v1",
  ACTIVITIES: "mgi_legal_activities_v1",
}

function getTimestampString(): string {
  const d = new Date()
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${min} WIB`
}

export class MockLegalDocumentRepository implements LegalDocumentRepository {
  private documents: LegalDocument[]
  private tasks: LegalTask[]
  private requests: LegalRequest[]
  private activities: LegalActivity[]

  constructor() {
    this.documents = this.loadFromStorage(
      STORAGE_KEYS.DOCS,
      INITIAL_LEGAL_DOCUMENTS
    )
    this.tasks = this.loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_LEGAL_TASKS)
    this.requests = this.loadFromStorage(
      STORAGE_KEYS.REQUESTS,
      INITIAL_LEGAL_REQUESTS
    )
    this.activities = this.loadFromStorage(
      STORAGE_KEYS.ACTIVITIES,
      INITIAL_LEGAL_ACTIVITIES
    )
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore JSON parse errors
    }
    return fallback
  }

  private saveToStorage(key: string, data: unknown) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // ignore storage quota errors
    }
  }

  private persist() {
    this.saveToStorage(STORAGE_KEYS.DOCS, this.documents)
    this.saveToStorage(STORAGE_KEYS.TASKS, this.tasks)
    this.saveToStorage(STORAGE_KEYS.REQUESTS, this.requests)
    this.saveToStorage(STORAGE_KEYS.ACTIVITIES, this.activities)
  }

  public resetToDefaults() {
    this.documents = [...INITIAL_LEGAL_DOCUMENTS]
    this.tasks = [...INITIAL_LEGAL_TASKS]
    this.requests = [...INITIAL_LEGAL_REQUESTS]
    this.activities = [...INITIAL_LEGAL_ACTIVITIES]
    this.persist()
  }

  async getDocuments(filter?: DocumentFilter): Promise<LegalDocument[]> {
    let result = [...this.documents]

    if (filter) {
      if (filter.search) {
        const q = filter.search.toLowerCase()
        result = result.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.documentNumber.toLowerCase().includes(q) ||
            d.project.toLowerCase().includes(q) ||
            d.uploadedBy.name.toLowerCase().includes(q) ||
            (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
        )
      }

      if (filter.status && filter.status !== "ALL") {
        result = result.filter((d) => d.status === filter.status)
      }

      if (filter.type && filter.type !== "ALL") {
        result = result.filter((d) => d.type === filter.type)
      }

      if (filter.priority && filter.priority !== "ALL") {
        result = result.filter((d) => d.priority === filter.priority)
      }

      if (filter.project) {
        result = result.filter((d) =>
          d.project.toLowerCase().includes(filter.project!.toLowerCase())
        )
      }
    }

    return result
  }

  async getDocumentById(id: string): Promise<LegalDocument | null> {
    const doc = this.documents.find((d) => d.id === id)
    return doc ? { ...doc } : null
  }

  async createDocument(
    input: CreateDocumentInput,
    user: UserReference
  ): Promise<LegalDocument> {
    const nextSeq = this.documents.length + 1
    const padSeq = nextSeq < 10 ? `00${nextSeq}` : nextSeq < 100 ? `0${nextSeq}` : `${nextSeq}`
    const id = `doc-${Date.now().toString().slice(-4)}`
    const documentNumber = `MGI/LEG/CTR/2026/08-${padSeq}`
    const ts = getTimestampString()

    const initialStatus = input.submitImmediately ? "SUBMITTED" : "DRAFT"

    const newDoc: LegalDocument = {
      id,
      documentNumber,
      title: input.title,
      type: input.type,
      project: input.project,
      description: input.description,
      status: initialStatus,
      priority: input.priority ?? "MEDIUM",
      currentVersion: 1,
      versions: [
        {
          version: 1,
          fileName: input.file.name,
          fileSize: input.file.size,
          fileType: input.file.type || "application/pdf",
          uploadedBy: user,
          uploadedAt: ts,
          changeSummary: "Initial version uploaded.",
        },
      ],
      uploadedBy: user,
      assignedLegalPic: MOCK_USERS.LEGAL_PIC,
      approver: MOCK_USERS.DIRECTOR,
      tags: input.tags ?? [],
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate,
      comments: [],
      createdAt: ts,
      updatedAt: ts,
    }

    this.documents.unshift(newDoc)

    // Add activity
    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: id,
      documentNumber,
      documentTitle: newDoc.title,
      action: input.submitImmediately
        ? "Document created & submitted for review"
        : "Document draft created",
      description: `Version 1.0 uploaded by ${user.name} (${user.department}).`,
      actor: user,
      timestamp: ts,
      eventType: input.submitImmediately ? "submit" : "upload",
    })

    // If submitted immediately, create task for Legal PIC
    if (input.submitImmediately) {
      this.tasks.unshift({
        id: `tsk-${Date.now()}`,
        title: `Legal Review: ${newDoc.title}`,
        documentId: id,
        documentTitle: newDoc.title,
        project: newDoc.project,
        category: "PENDING_REVIEW",
        requester: user,
        assignee: MOCK_USERS.LEGAL_PIC,
        priority: newDoc.priority,
        status: "TODO",
        dueDate: "2026-08-30",
        actionUrl: `/legal/documents/${id}`,
        actionLabel: "Conduct Legal Review",
        createdAt: ts,
      })
    }

    this.persist()
    return newDoc
  }

  async submitForReview(
    id: string,
    user: UserReference
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "SUBMITTED"
    doc.updatedAt = ts

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Submitted for Legal Review",
      description: `${user.name} formally submitted document for review.`,
      actor: user,
      timestamp: ts,
      eventType: "submit",
    })

    // Update or add task
    this.tasks.unshift({
      id: `tsk-${Date.now()}`,
      title: `Legal Review: ${doc.title}`,
      documentId: doc.id,
      documentTitle: doc.title,
      project: doc.project,
      category: "PENDING_REVIEW",
      requester: user,
      assignee: doc.assignedLegalPic,
      priority: doc.priority,
      status: "TODO",
      dueDate: "2026-08-30",
      actionUrl: `/legal/documents/${doc.id}`,
      actionLabel: "Conduct Legal Review",
      createdAt: ts,
    })

    this.persist()
    return { ...doc }
  }

  async startReview(id: string, user: UserReference): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "UNDER_REVIEW"
    doc.assignedLegalPic = user
    doc.updatedAt = ts

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Review started by Legal PIC",
      description: `${user.name} opened document and began risk review.`,
      actor: user,
      timestamp: ts,
      eventType: "review",
    })

    this.persist()
    return { ...doc }
  }

  async requestRevision(
    id: string,
    input: RequestRevisionInput,
    user: UserReference
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "REVISION_REQUIRED"
    doc.revisionReason = input.reason
    doc.revisionRequestedBy = user
    doc.revisionRequestedAt = ts
    doc.updatedAt = ts

    if (input.notes) {
      doc.comments.push({
        id: `cmt-${Date.now()}`,
        author: user,
        content: `[REVISION REQUEST] ${input.reason}\n${input.notes ? `\nDetail: ${input.notes}` : ""}`,
        createdAt: ts,
        versionTarget: doc.currentVersion,
      })
    }

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Revision requested by Legal Reviewer",
      description: `${user.name} requested revision: "${input.reason}"`,
      actor: user,
      timestamp: ts,
      eventType: "revision",
    })

    // Create task for uploader to revise
    this.tasks.unshift({
      id: `tsk-${Date.now()}`,
      title: `Revise Document: ${doc.title}`,
      documentId: doc.id,
      documentTitle: doc.title,
      project: doc.project,
      category: "REVISION_REQUIRED",
      requester: user,
      assignee: doc.uploadedBy,
      priority: doc.priority,
      status: "TODO",
      dueDate: "2026-08-28",
      actionUrl: `/legal/documents/${doc.id}`,
      actionLabel: "Upload Revision",
      createdAt: ts,
    })

    this.persist()
    return { ...doc }
  }

  async resubmitDocument(
    id: string,
    input: ResubmitDocumentInput,
    user: UserReference
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const nextVer = doc.currentVersion + 1
    const ts = getTimestampString()

    doc.currentVersion = nextVer
    doc.status = "RESUBMITTED"
    doc.updatedAt = ts

    doc.versions.push({
      version: nextVer,
      fileName: input.file.name,
      fileSize: input.file.size,
      fileType: input.file.type || "application/pdf",
      uploadedBy: user,
      uploadedAt: ts,
      changeSummary: input.changeSummary,
    })

    if (input.responseNotes) {
      doc.comments.push({
        id: `cmt-${Date.now()}`,
        author: user,
        content: `[RESUBMISSION v${nextVer}] ${input.changeSummary}\n${input.responseNotes ? `Notes: ${input.responseNotes}` : ""}`,
        createdAt: ts,
        versionTarget: nextVer,
      })
    }

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: `Version ${nextVer}.0 uploaded & resubmitted`,
      description: `${user.name} uploaded new version: "${input.changeSummary}"`,
      actor: user,
      timestamp: ts,
      eventType: "resubmit",
    })

    // Create task for Legal PIC to re-review
    this.tasks.unshift({
      id: `tsk-${Date.now()}`,
      title: `Re-review v${nextVer}: ${doc.title}`,
      documentId: doc.id,
      documentTitle: doc.title,
      project: doc.project,
      category: "PENDING_REVIEW",
      requester: user,
      assignee: doc.assignedLegalPic,
      priority: doc.priority,
      status: "TODO",
      dueDate: "2026-08-29",
      actionUrl: `/legal/documents/${doc.id}`,
      actionLabel: "Verify Resubmission",
      createdAt: ts,
    })

    this.persist()
    return { ...doc }
  }

  async passReview(
    id: string,
    notes?: string,
    user: UserReference = MOCK_USERS.LEGAL_PIC
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "PENDING_APPROVAL"
    doc.approver = MOCK_USERS.DIRECTOR
    doc.updatedAt = ts

    if (notes) {
      doc.comments.push({
        id: `cmt-${Date.now()}`,
        author: user,
        content: `[LEGAL REVIEW PASSED] ${notes}`,
        createdAt: ts,
        versionTarget: doc.currentVersion,
      })
    }

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Legal Review passed & submitted for Director Approval",
      description: `${user.name} approved legal review. Escalated to Director Suryo Montana.`,
      actor: user,
      timestamp: ts,
      eventType: "review",
    })

    // Create task for Director
    this.tasks.unshift({
      id: `tsk-${Date.now()}`,
      title: `Director Approval: ${doc.title}`,
      documentId: doc.id,
      documentTitle: doc.title,
      project: doc.project,
      category: "PENDING_APPROVAL",
      requester: user,
      assignee: MOCK_USERS.DIRECTOR,
      priority: doc.priority,
      status: "TODO",
      dueDate: "2026-08-27",
      actionUrl: `/legal/documents/${doc.id}`,
      actionLabel: "Review & Approve",
      createdAt: ts,
    })

    this.persist()
    return { ...doc }
  }

  async approveDocument(
    id: string,
    input: ApprovalInput,
    user: UserReference
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "APPROVED"
    doc.approvedBy = user
    doc.approvedAt = ts
    doc.updatedAt = ts

    if (input.notes) {
      doc.comments.push({
        id: `cmt-${Date.now()}`,
        author: user,
        content: `[FORMAL APPROVAL] ${input.notes}`,
        createdAt: ts,
        versionTarget: doc.currentVersion,
      })
    }

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Document approved by Director",
      description: `${user.name} provided formal executive approval. Document is now legally active.`,
      actor: user,
      timestamp: ts,
      eventType: "approval",
    })

    // Complete related tasks
    this.tasks.forEach((t) => {
      if (t.documentId === doc.id) {
        t.status = "COMPLETED"
        t.category = "COMPLETED"
        t.completedAt = ts
      }
    })

    this.persist()
    return { ...doc }
  }

  async rejectDocument(
    id: string,
    input: ApprovalInput,
    user: UserReference
  ): Promise<LegalDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    doc.status = "REJECTED"
    doc.rejectionReason = input.reason || input.notes || "Document rejected by Director."
    doc.rejectionBy = user
    doc.rejectedAt = ts
    doc.updatedAt = ts

    doc.comments.push({
      id: `cmt-${Date.now()}`,
      author: user,
      content: `[REJECTED] Reason: ${doc.rejectionReason}`,
      createdAt: ts,
      versionTarget: doc.currentVersion,
    })

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: "Document rejected",
      description: `${user.name} rejected document: "${doc.rejectionReason}"`,
      actor: user,
      timestamp: ts,
      eventType: "reject",
    })

    // Complete related tasks
    this.tasks.forEach((t) => {
      if (t.documentId === doc.id) {
        t.status = "COMPLETED"
        t.category = "COMPLETED"
        t.completedAt = ts
      }
    })

    this.persist()
    return { ...doc }
  }

  async addComment(
    documentId: string,
    content: string,
    user: UserReference,
    isInternalOnly: boolean = false
  ): Promise<DocumentComment> {
    const doc = this.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error("Document not found")

    const ts = getTimestampString()
    const newComment: DocumentComment = {
      id: `cmt-${Date.now()}`,
      author: user,
      content,
      createdAt: ts,
      versionTarget: doc.currentVersion,
      isInternalLegalOnly: isInternalOnly,
    }

    doc.comments.push(newComment)
    doc.updatedAt = ts

    this.activities.unshift({
      id: `act-${Date.now()}`,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      documentTitle: doc.title,
      action: isInternalOnly
        ? "Internal legal note added"
        : "Comment posted",
      description: `${user.name} added comment on v${doc.currentVersion}: "${content.length > 60 ? content.substring(0, 60) + "..." : content}"`,
      actor: user,
      timestamp: ts,
      eventType: "comment",
    })

    this.persist()
    return newComment
  }

  async getTasks(filter?: TaskFilter): Promise<LegalTask[]> {
    let result = [...this.tasks]
    if (filter) {
      if (filter.category && filter.category !== "ALL") {
        result = result.filter((t) => t.category === filter.category)
      }
      if (filter.priority && filter.priority !== "ALL") {
        result = result.filter((t) => t.priority === filter.priority)
      }
      if (filter.search) {
        const q = filter.search.toLowerCase()
        result = result.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.project.toLowerCase().includes(q) ||
            t.assignee.name.toLowerCase().includes(q)
        )
      }
    }
    return result
  }

  async getRequests(): Promise<LegalRequest[]> {
    return [...this.requests]
  }

  async createRequest(
    input: CreateLegalRequestInput,
    user: UserReference
  ): Promise<LegalRequest> {
    const nextSeq = this.requests.length + 1
    const padSeq = nextSeq < 10 ? `00${nextSeq}` : nextSeq < 100 ? `0${nextSeq}` : `${nextSeq}`
    const id = `req-${Date.now().toString().slice(-4)}`
    const requestNumber = `REQ/LEG/2026/08-${padSeq}`
    const ts = getTimestampString()

    const newReq: LegalRequest = {
      id,
      requestNumber,
      title: input.title,
      requester: user,
      department: input.department,
      requestType: input.requestType,
      relatedProject: input.relatedProject,
      relatedDocumentId: input.relatedDocumentId,
      description: input.description,
      priority: input.priority,
      status: "SUBMITTED",
      assignedLegalPic: MOCK_USERS.LEGAL_PIC,
      targetDate: input.targetDate,
      createdAt: ts,
      updatedAt: ts,
    }

    this.requests.unshift(newReq)

    this.activities.unshift({
      id: `act-${Date.now()}`,
      action: `Cross-department Legal Request submitted`,
      description: `${user.name} (${user.department}) submitted request: "${input.title}"`,
      actor: user,
      timestamp: ts,
      eventType: "submit",
    })

    this.persist()
    return newReq
  }

  async getActivities(documentId?: string): Promise<LegalActivity[]> {
    if (documentId) {
      return this.activities.filter((a) => a.documentId === documentId)
    }
    return [...this.activities]
  }

  async getDashboardStats(): Promise<LegalDashboardStats> {
    const total = this.documents.length
    const pendingReview = this.documents.filter(
      (d) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW" || d.status === "RESUBMITTED"
    ).length
    const revisionRequired = this.documents.filter(
      (d) => d.status === "REVISION_REQUIRED"
    ).length
    const pendingApproval = this.documents.filter(
      (d) => d.status === "PENDING_APPROVAL"
    ).length
    const approved = this.documents.filter(
      (d) => d.status === "APPROVED"
    ).length
    const rejected = this.documents.filter(
      (d) => d.status === "REJECTED"
    ).length
    const draft = this.documents.filter((d) => d.status === "DRAFT").length
    const activeTasks = this.tasks.filter((t) => t.status !== "COMPLETED").length
    const incomingRequests = this.requests.filter(
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
  }
}

export const mockLegalRepository = new MockLegalDocumentRepository()
