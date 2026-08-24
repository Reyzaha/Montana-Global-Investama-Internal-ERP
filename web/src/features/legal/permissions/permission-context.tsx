"use client"

import * as React from "react"
import { LegalRole, UserReference } from "../types/user.types"
import { LegalPermission, ROLE_PERMISSIONS } from "./permissions.config"

export interface MockUserOption {
  user: UserReference
  role: LegalRole
  label: string
}

export const MOCK_USERS_OPTIONS: MockUserOption[] = [
  {
    role: "LEGAL_PIC",
    label: "Legal PIC (Reviewer)",
    user: {
      id: "usr-legal-01",
      name: "Bambang Prakoso, S.H., LL.M.",
      email: "bambang.prakoso@montanaglobal.co.id",
      department: "Legal",
      role: "LEGAL_PIC",
      title: "Senior Legal Specialist & Compliance Lead",
    },
  },
  {
    role: "BUSINESS_DEV_PIC",
    label: "Business Development PIC (Requester)",
    user: {
      id: "usr-bd-01",
      name: "Dewi Lestari, S.E.",
      email: "dewi.lestari@montanaglobal.co.id",
      department: "Business Development",
      role: "BUSINESS_DEV_PIC",
      title: "Business Development Lead",
    },
  },
  {
    role: "DIRECTOR",
    label: "Director (Executive Approver)",
    user: {
      id: "usr-dir-01",
      name: "Ir. Suryo Montana, M.B.A.",
      email: "suryo.montana@montanaglobal.co.id",
      department: "Board of Directors",
      role: "DIRECTOR",
      title: "Managing Director & CEO",
    },
  },
  {
    role: "FINANCE_PIC",
    label: "Finance PIC",
    user: {
      id: "usr-fin-01",
      name: "Hendrik Setiawan, Ak., C.A.",
      email: "hendrik.s@montanaglobal.co.id",
      department: "Finance & Accounting",
      role: "FINANCE_PIC",
      title: "Finance & Treasury Lead",
    },
  },
]

interface PermissionContextType {
  currentUser: UserReference
  currentRole: LegalRole
  permissions: LegalPermission[]
  hasPermission: (permission: LegalPermission) => boolean
  hasAnyPermission: (permissions: LegalPermission[]) => boolean
  switchUser: (role: LegalRole) => void
  userOptions: MockUserOption[]
}

const PermissionContext = React.createContext<PermissionContextType | undefined>(
  undefined
)

export function PermissionProvider({
  children,
  initialRole = "LEGAL_PIC",
}: {
  children: React.ReactNode
  initialRole?: LegalRole
}) {
  const [activeRole, setActiveRole] = React.useState<LegalRole>(initialRole)

  const activeOption =
    MOCK_USERS_OPTIONS.find((opt) => opt.role === activeRole) ??
    MOCK_USERS_OPTIONS[0]

  const permissions = React.useMemo(() => {
    return ROLE_PERMISSIONS[activeRole] ?? []
  }, [activeRole])

  const hasPermission = React.useCallback(
    (permission: LegalPermission) => {
      return permissions.includes(permission)
    },
    [permissions]
  )

  const hasAnyPermission = React.useCallback(
    (perms: LegalPermission[]) => {
      return perms.some((p) => permissions.includes(p))
    },
    [permissions]
  )

  const switchUser = React.useCallback((role: LegalRole) => {
    setActiveRole(role)
  }, [])

  return (
    <PermissionContext.Provider
      value={{
        currentUser: activeOption.user,
        currentRole: activeRole,
        permissions,
        hasPermission,
        hasAnyPermission,
        switchUser,
        userOptions: MOCK_USERS_OPTIONS,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = React.useContext(PermissionContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider")
  }
  return context
}
