"use client"

import * as React from "react"
import { usePermissions } from "./permission-context"
import { LegalPermission } from "./permissions.config"

export interface PermissionGateProps {
  permission?: LegalPermission
  anyPermissions?: LegalPermission[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  anyPermissions,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = usePermissions()

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  if (anyPermissions && !hasAnyPermission(anyPermissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
