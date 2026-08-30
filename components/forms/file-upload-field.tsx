"use client"

import React, { memo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={handleFileChange}
      />
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          className="mt-2 h-24 rounded border"
        />
      )}
    </div>
  )
})

FileUploadField.displayName = "FileUploadField"
