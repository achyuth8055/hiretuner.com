"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface DropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileDrop?: (file: File) => void
  accept?: string
  maxSizeLabel?: string
}

export function Dropzone({
  className,
  onFileDrop,
  accept = ".pdf,.docx,.txt",
  maxSizeLabel = "Max 5MB",
  ...props
}: DropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0 && onFileDrop) {
        onFileDrop(files[0])
      }
    },
    [onFileDrop]
  )

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0 && onFileDrop) {
        onFileDrop(files[0])
      }
    },
    [onFileDrop]
  )

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-stack-xl flex flex-col items-center justify-center text-center transition-colors cursor-pointer group relative overflow-hidden",
        isDragging
          ? "border-secondary bg-secondary/5"
          : "border-outline-variant/50 bg-surface hover:bg-surface-container-high",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      <span
        className={cn(
          "material-symbols-outlined text-4xl mb-stack-sm transition-colors",
          isDragging ? "text-secondary" : "text-on-surface-variant group-hover:text-secondary"
        )}
      >
        upload_file
      </span>
      <p className="font-body-base text-body-base font-semibold text-primary mb-1">
        {isDragging ? "Drop your file here" : "Drag & drop your resume here"}
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Supports {accept.replace(/\./g, "").toUpperCase()} ({maxSizeLabel})
      </p>
    </div>
  )
}
