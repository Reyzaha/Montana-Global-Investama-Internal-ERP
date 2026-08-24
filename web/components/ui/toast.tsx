"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "destructive" | "warning" | "info"
}

interface ToastContextType {
  toasts: ToastItem[]
  toast: (toast: Omit<ToastItem, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback(
    ({ title, description, variant = "default" }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, title, description, variant }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    []
  )

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
              item.variant === "success"
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100"
                : item.variant === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground"
                : item.variant === "warning"
                ? "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100"
                : "border-border bg-card text-card-foreground"
            }`}
          >
            {item.variant === "success" && (
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {item.variant === "destructive" && (
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
            )}
            {item.variant === "warning" && (
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            {item.variant === "default" && (
              <Info className="size-5 text-primary shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {item.title && (
                <div className="font-semibold text-sm leading-none mb-1">
                  {item.title}
                </div>
              )}
              {item.description && (
                <div className="text-xs opacity-90 leading-relaxed">
                  {item.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
