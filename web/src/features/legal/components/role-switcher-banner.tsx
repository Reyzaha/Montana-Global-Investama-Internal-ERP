"use client"

import * as React from "react"
import { usePermissions } from "../permissions/permission-context"
import { UserCheck, Shield, RefreshCw } from "lucide-react"
import { useLegal } from "../context/legal-context"
import { Button } from "@/components/ui/button"

export function RoleSwitcherBanner() {
  const { currentRole, currentUser, userOptions, switchUser } = usePermissions()
  const { resetMockData } = useLegal()

  return (
    <aside
      aria-label="Simulation Persona Switcher"
      className="bg-slate-900 text-slate-100 px-4 py-2 text-xs border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <Shield className="size-3.5" />
          <span>SIMULATION MODE</span>
        </div>
        <span className="text-slate-500 hidden sm:inline">|</span>
        <span className="text-slate-300 hidden md:inline">
          Active Persona:
        </span>
        <span className="bg-slate-800 px-2 py-0.5 rounded text-white font-medium flex items-center gap-1">
          <UserCheck className="size-3 text-emerald-400" />
          {currentUser.name} ({currentUser.department})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-[11px] hidden lg:inline">
          Switch view as:
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {userOptions.map((opt) => {
            const isSelected = opt.role === currentRole
            return (
              <button
                key={opt.role}
                onClick={() => switchUser(opt.role)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => resetMockData()}
          className="text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] h-6 px-2 gap-1 cursor-pointer"
          title="Reset all documents & tasks to initial sample data"
        >
          <RefreshCw className="size-3" />
          <span className="hidden sm:inline">Reset Mock Data</span>
        </Button>
      </div>
    </aside>
  )
}
