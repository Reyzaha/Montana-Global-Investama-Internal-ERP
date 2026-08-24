"use client"

import * as React from "react"
import { ErpLayout } from "@/components/layout/erp-layout"
import { ToastProvider } from "@/components/ui/toast"
import { PermissionProvider } from "@/src/features/legal/permissions/permission-context"
import { LegalProvider } from "@/src/features/legal/context/legal-context"
import { RoleSwitcherBanner } from "@/src/features/legal/components/role-switcher-banner"
import { LegalSubNav } from "@/src/features/legal/components/legal-sub-nav"
import { CreateRequestDialog } from "@/src/features/legal/components/create-request-dialog"

export default function LegalWorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [requestModalOpen, setRequestModalOpen] = React.useState(false)

  return (
    <ToastProvider>
      <PermissionProvider initialRole="LEGAL_PIC">
        <LegalProvider>
          <ErpLayout>
            <div className="flex flex-1 flex-col min-h-full">
              {/* Persona Switcher Banner for live evaluation & test simulation */}
              <RoleSwitcherBanner />

              {/* Legal Workspace Sub-Navigation & Header */}
              <LegalSubNav onNewRequest={() => setRequestModalOpen(true)} />

              {/* Workspace Main Page Content */}
              <main className="flex-1 bg-muted/10 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-6">{children}</div>
              </main>

              {/* Global Cross-department Legal Request Modal */}
              <CreateRequestDialog
                open={requestModalOpen}
                onOpenChange={setRequestModalOpen}
              />
            </div>
          </ErpLayout>
        </LegalProvider>
      </PermissionProvider>
    </ToastProvider>
  )
}
