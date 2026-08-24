"use client"

import * as React from "react"
import { UploadCloud, File, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface UploadedFileInfo {
  name: string
  size: number
  type: string
  lastModified?: number
}

export interface FileUploadProps {
  onFileSelect?: (file: UploadedFileInfo | null) => void
  accept?: string
  maxSizeMb?: number
  value?: UploadedFileInfo | null
  className?: string
  helperText?: string
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.docx,.doc",
  maxSizeMb = 25,
  value,
  className,
  helperText = "Supported formats: PDF, DOCX, DOC (Max. 25MB)",
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [internalFile, setInternalFile] = React.useState<UploadedFileInfo | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedFile = value !== undefined ? value : internalFile

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateAndSet = (file: File) => {
    setError(null)
    const maxBytes = maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`File exceeds maximum size limit of ${maxSizeMb}MB`)
      return
    }

    const fileInfo: UploadedFileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }
    setInternalFile(fileInfo)
    onFileSelect?.(fileInfo)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndSet(e.target.files[0])
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInternalFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
    onFileSelect?.(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id="file-upload-input"
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer bg-muted/20 hover:bg-muted/40",
            dragActive ? "border-primary bg-primary/5" : "border-border",
            error && "border-destructive/50 bg-destructive/5"
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
            <UploadCloud className="size-6 text-primary" />
          </div>
          <div className="text-sm font-medium text-foreground">
            <span className="text-primary hover:underline">Click to upload</span> or drag and drop
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          {error && (
            <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <File className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {selectedFile.name}
                </span>
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
