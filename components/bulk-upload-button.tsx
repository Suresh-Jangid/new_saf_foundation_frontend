"use client"

import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileSpreadsheet, Plus } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { isAdmin } from "@/lib/utils"

interface BulkUploadButtonProps {
  moduleName: string
  requiredHeaders: string[]
  sampleRows: Record<string, any>[]
  onImportRow: (row: Record<string, any>) => Promise<any>
  onSuccess: () => void
}

export function BulkUploadButton({
  moduleName,
  requiredHeaders,
  sampleRows,
  onImportRow,
  onSuccess,
}: BulkUploadButtonProps) {
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadSample = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: requiredHeaders })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, moduleName)
      XLSX.writeFile(workbook, `${moduleName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_sample.xlsx`)
    } catch (err: any) {
      toast.error("Failed to download sample file")
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)
    setProgress({ current: 0, total: 0 })

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

      if (rows.length === 0) {
        setImportError("The Excel sheet appears to be empty.")
        setImporting(false)
        return
      }

      // Validate headers
      const sampleRow = rows[0]
      const missing = requiredHeaders.filter((h) => !(h in sampleRow))
      if (missing.length > 0) {
        setImportError(`Missing required headers: ${missing.join(", ")}`)
        setImporting(false)
        return
      }

      setProgress({ current: 0, total: rows.length })

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < rows.length; i++) {
        setProgress((prev) => ({ ...prev, current: i + 1 }))
        try {
          await onImportRow(rows[i])
          successCount++
        } catch (err: any) {
          console.error(`Error importing row ${i + 2}:`, err)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Import completed: ${successCount} successful, ${failCount} failed.`)
        setOpen(false)
        onSuccess()
      } else {
        setImportError("Failed to import any records. Check the logs for details.")
      }
    } catch (err: any) {
      console.error(err)
      setImportError(err.message || "An error occurred while reading the file.")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (!isAdmin()) return null

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md border-0"
      >
        <Plus className="w-4 h-4" />
        <span>Bulk Upload</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg bg-background border rounded-lg shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Bulk Import: {moduleName}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Upload data from an Excel sheet. Make sure the headers match the sample template.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-6">
            {/* Sample Download Area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg border border-dashed border-muted">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Need a starting template?</p>
                <p className="text-xs text-muted-foreground">Download the structured sample Excel file.</p>
              </div>
              <Button
                onClick={handleDownloadSample}
                variant="outline"
                size="sm"
                className="mt-3 sm:mt-0 flex items-center gap-2 border-primary/20 hover:border-primary/50 text-primary"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Sample</span>
              </Button>
            </div>

            {/* File Upload Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Select Excel File</label>
              <div
                onClick={() => !importing && fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 bg-card border-2 border-dashed border-muted hover:border-primary/50 rounded-xl cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={importing}
                />
                <div className="p-3 bg-muted rounded-full group-hover:scale-110 transition-transform mb-3">
                  <FileSpreadsheet className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {importing
                    ? `Processing row ${progress.current} of ${progress.total}...`
                    : "Click to choose file or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts .xlsx and .xls formats only
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {importError}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false)
                setImportError(null)
              }}
              disabled={importing}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
