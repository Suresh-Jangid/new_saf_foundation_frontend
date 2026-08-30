"use client"

import type React from "react"
import { GENDER_OPTIONS } from "@/lib/form-values"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Eye, Edit, Trash2, FileText } from "lucide-react"
import { paginateData } from "@/lib/pagination"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatBilingual } from "@/lib/translations"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"
import { usePathname } from "next/navigation"

// Remembers the active page per listing (keyed by route + title) so the table
// stays on the same page across data refreshes/remounts — e.g. after a delete
// triggers a re-fetch that briefly unmounts this component.
const pageMemory = new Map<string, number>()

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: any, record: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title: string
  subtitle?: string
  addNewUrl: string
  addNewLabel: string
  onDelete: (id: string) => void
  onGenerateBond?: (record: T) => void
  onGeneratePDFForm?: (record: T) => void
  onGenerateCertificate?: (record: T) => void
  onDownloadPDF?: (record: T) => void
  onGenerateApplicationForm?: (record: T) => void
  onGenerateAdikartForm?: (record: T) => void
  editUrlPattern: string
  searchFields: (keyof T)[]
  itemsPerPage?: number
  showGenderFilter?: boolean
  genderField?: keyof T
  onGenderFilterChange?: (gender: string) => void
  currentGenderFilter?: string
  showAddressFilter?: boolean
  addressField?: keyof T
  onAddressFilterChange?: (address: string) => void
  currentAddressFilter?: string
  uniqueAddresses?: string[]
  headerActions?: React.ReactNode
  // Permission-related props
  module?: string // The module this table represents (e.g., "applicant_registration")
  showAddButton?: boolean // Whether to show the add new button
  showEditButton?: boolean // Whether to show edit buttons
  showDeleteButton?: boolean // Whether to show delete buttons
  showActionsColumn?: boolean // Whether to show the actions column at all
  // PDF generation button customization
  pdfFormButtonLabel?: string // Custom label for PDF form generation button
  pdfFormButtonTooltip?: string // Custom tooltip for PDF form generation button
  applicationFormButtonLabel?: string // Custom label for application form generation button
  applicationFormButtonTooltip?: string // Custom tooltip for application form generation button
  adikartFormButtonLabel?: string // Custom label for adikart form generation button
  adikartFormButtonTooltip?: string // Custom tooltip for adikart form generation button
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  title,
  subtitle,
  addNewUrl,
  addNewLabel,  
  onDelete,
  onGenerateBond,
  onGeneratePDFForm,
  onGenerateCertificate,
  onDownloadPDF,
  onGenerateApplicationForm,
  onGenerateAdikartForm,
  editUrlPattern,
  searchFields,
  itemsPerPage = 10,
  showGenderFilter = false,
  genderField = "gender" as keyof T,
  onGenderFilterChange,
  currentGenderFilter = "all",
  showAddressFilter = false,
  addressField = "address" as keyof T,
  onAddressFilterChange,
  currentAddressFilter = "all",
  uniqueAddresses,
  headerActions,
  // Permission-related props
  module,
  showAddButton = true,
  showEditButton = true,
  showDeleteButton = true,
  showActionsColumn = true,
  // PDF generation button customization
  pdfFormButtonLabel = "PDF Form",
  pdfFormButtonTooltip = "Generate PDF Form",
  applicationFormButtonLabel = "Application Form",
  applicationFormButtonTooltip = "Generate Application Form",
  adikartFormButtonLabel = "Adikart Form",
  adikartFormButtonTooltip = "Generate Adikart Form",
  
}: DataTableProps<T>) {
  const pathname = usePathname()
  const pageKey = `${pathname}::${title}`

  const [searchTerm, setSearchTerm] = useState("")
  // Initialise from remembered page so a remount (e.g. post-delete refetch)
  // restores the page the user was on instead of resetting to page 1.
  const [currentPage, setCurrentPageState] = useState<number>(() => pageMemory.get(pageKey) ?? 1)
  const [genderFilter, setGenderFilter] = useState<string>(currentGenderFilter)
  const [addressFilter, setAddressFilter] = useState<string>(currentAddressFilter)

  // Wrapper that keeps the remembered page in sync with local state.
  const setCurrentPage = (page: number) => {
    pageMemory.set(pageKey, page)
    setCurrentPageState(page)
  }

  // Get permissions
  const { canCreate, canUpdate, canDelete, isAdmin } = usePermissions()

  // Update local state when prop changes
  useEffect(() => {
    setGenderFilter(currentGenderFilter)
  }, [currentGenderFilter])

  useEffect(() => {
    setAddressFilter(currentAddressFilter)
  }, [currentAddressFilter])

  // Determine which buttons to show based on permissions
  const shouldShowAddButton = showAddButton && (isAdmin || (module && canCreate(module)))
  const shouldShowEditButton = showEditButton && (isAdmin || (module && canUpdate(module)))
  const shouldShowDeleteButton = showDeleteButton && (isAdmin || (module && canDelete(module)))

  // Filter data based on search term only (no local gender filtering when using API)
  const filteredData = data.filter((item) => {
    const matchesSearch = searchTerm === "" || 
      searchFields.some((field) => {
        const value = item[field]
        return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    
    return matchesSearch
  })

  // Clamp the current page when the dataset shrinks (e.g. after a delete) so we
  // never sit on a now-empty page beyond the last one.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredData.length, itemsPerPage, currentPage])

  // Paginate filtered data
  const paginatedData = paginateData(filteredData, currentPage, itemsPerPage)


  const getCellValue = (record: T, column: Column<T>) => {
    if (column.render) {
      return column.render(record[column.key as keyof T], record)
    }
    
    // Auto-format date fields if no custom render function is provided
    const value = record[column.key as keyof T]
    if (value) {
      const dateFieldNames = ['date', 'applicationDate', 'dateOfBirth', 'membershipJoinDate', 'associatedUntil', 'createdAt', 'dob', 'birth']
      const isDateField = dateFieldNames.some(fieldName => 
        column.key.toString().toLowerCase().includes(fieldName.toLowerCase())
      )
      
      if (isDateField && (typeof value === 'string' || value instanceof Date)) {
        return formatDate(value as string | Date)
      }
    }
    
    return value as React.ReactNode
  }

  return (
    <div className="p-4 md:p-6 relative">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      {/* Search, Filters and Add New */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={formatBilingual("placeholders.searchByName")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page when searching
              }}
              className="pl-10"
            />
          </div>
          {showGenderFilter && (
            <Select value={genderFilter} onValueChange={(value) => {
              setGenderFilter(value)
              setCurrentPage(1) // Reset to first page when filtering
              onGenderFilterChange?.(value) // Call the callback to fetch new data
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={formatBilingual("placeholders.filterByGender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{formatBilingual("common.all")}</SelectItem>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showAddressFilter && uniqueAddresses && (
            <Select value={addressFilter} onValueChange={(value) => {
              setAddressFilter(value)
              setCurrentPage(1) // Reset to first page when filtering
              onAddressFilterChange?.(value) // Call the callback to fetch new data
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={formatBilingual("placeholders.filterByAddress")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{formatBilingual("common.all")}</SelectItem>
                <SelectItem value="village" disabled>
                  {formatBilingual("placeholders.village")}
                </SelectItem>
                {uniqueAddresses.map((address) => (
                  <SelectItem key={address} value={address}>
                    {address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
          {headerActions}
          {shouldShowAddButton && (
            <Link href={addNewUrl}>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                {addNewLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            All Records ({filteredData.length} total)
            {showGenderFilter && genderFilter !== "all" && 
              ` - ${genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1)} only`
            }
            {showAddressFilter && addressFilter !== "all" && 
              ` - ${addressFilter.charAt(0).toUpperCase() + addressFilter.slice(1)} only`
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedData.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {searchTerm || (showGenderFilter && genderFilter !== "all") || (showAddressFilter && addressFilter !== "all")
                ? "No records found matching your filters."
                : `No records found. ${shouldShowAddButton ? `Click "${addNewLabel}" to create your first entry.` : ''}`}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column, index) => (
                        <TableHead key={index} className={`w-[150px] ${column.className || ''}`}>
                          {column.label}
                        </TableHead>
                      ))}
                      {showActionsColumn && (
                        <TableHead className="w-[280px]">{formatBilingual("common.actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.items.map((record) => (
                      <TableRow key={record.id}>
                        {columns.map((column, index) => (
                          <TableCell key={index} className={`w-[150px] ${column.className || ''}`}>
                            {getCellValue(record, column)}
                          </TableCell>
                        ))}
                        {showActionsColumn && (
                          <TableCell className="w-fit">
                          <TooltipProvider>
                            <div className="flex flex-col sm:flex-row gap-1">
                              {onDownloadPDF && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onDownloadPDF(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">Download PDF</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Download PDF</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {onGeneratePDFForm && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGeneratePDFForm(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">{pdfFormButtonLabel}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{pdfFormButtonTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {onGenerateCertificate && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateCertificate(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">Certificate</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Generate Certificate</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {onGenerateApplicationForm && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateApplicationForm(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">{applicationFormButtonLabel}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{applicationFormButtonTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {onGenerateAdikartForm && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateAdikartForm(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">{adikartFormButtonLabel}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{adikartFormButtonTooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {shouldShowEditButton && (
                                <Link href={editUrlPattern.replace("[id]", record.id)}>
                                  <Button size="sm" variant="outline" className="w-full sm:w-auto bg-transparent">
                                    <Edit className="w-4 h-4" />
                                    <span className="ml-1 sm:hidden">{formatBilingual("common.edit")}</span>
                                  </Button>
                                </Link>
                              )}
                              {onGenerateBond && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateBond(record)}
                                      className="w-full sm:w-auto"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span className="ml-1 sm:hidden">Bond</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Generate Bond PDF</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {shouldShowDeleteButton && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onDelete(record.id)}
                                  className="w-full sm:w-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="ml-1 sm:hidden">Delete</span>
                                </Button>
                              )}
                            </div>
                          </TooltipProvider>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination 
                currentPage={paginatedData.currentPage}
                totalPages={paginatedData.totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
