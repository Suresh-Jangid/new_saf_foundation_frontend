"use client"

import React, { memo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MediaUploadControl } from "@/components/media-upload"

interface FileUploadFieldProps {
  id: string
  label: string
  accept?: string
  onChange: (file: File | null) => void
  value?: File | null
}

export const FileUploadField = memo<FileUploadFieldProps>(({
  id,
  label,
  accept = "image/*",
  onChange,
  value
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange(file)
    
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          id={id}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="flex-1"
        />
        <MediaUploadControl
          id={`${id}-camera`}
          mode={accept?.includes("pdf") ? "pdf" : "image"}
          accept={accept}
          label={label}
          standaloneCameraOnly
          onFileSelect={(capturedFile) => {
            onChange(capturedFile)
            if (capturedFile) {
              const url = URL.createObjectURL(capturedFile)
              setPreviewUrl(url)
            }
          }}
        />
      </div>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          className="mt-2 h-24 rounded border object-cover"
        />
      )}
    </div>
  )
})

FileUploadField.displayName = "FileUploadField"
