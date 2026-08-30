"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Search } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { paginateData } from "@/lib/pagination"

interface DisplayColumn<T> {
  key: keyof T | string
  label: string
  render?: (value: any, record: T) => React.ReactNode
  className?: string
}

interface DisplayTableProps<T> {
  data: T[]
  columns: DisplayColumn<T>[]
  searchKey?: keyof T
  searchPlaceholder?: string
  className?: string
  itemsPerPage?: number
  showPagination?: boolean
}

export function DisplayTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  className = "",
  itemsPerPage = 10,
  showPagination = false
}: DisplayTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search term
  const filteredData = data.filter((item) => {
    if (!searchTerm || !searchKey) return true
    
    const value = item[searchKey]
    return value && String(value).toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Paginate the filtered data
  const paginatedData = showPagination 
    ? paginateData(filteredData, currentPage, itemsPerPage)
    : { items: filteredData, currentPage: 1, totalPages: 1, totalItems: filteredData.length, itemsPerPage }

  // Use paginated items for display
  const displayData = paginatedData.items

  const getCellValue = (record: T, column: DisplayColumn<T>) => {
    if (column.render) {
      return column.render(record[column.key as keyof T], record)
    }
    
    return record[column.key as keyof T] as React.ReactNode
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              {searchTerm ? "No records found matching your search." : "No data available"}
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column, index) => (
                        <TableHead key={index} className={column.className || ''}>
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.map((record, recordIndex) => (
                      <TableRow key={recordIndex}>
                        {columns.map((column, columnIndex) => (
                          <TableCell key={columnIndex} className={column.className || ''}>
                            {getCellValue(record, column)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {showPagination && paginatedData.totalPages > 1 && (
                <Pagination 
                  currentPage={paginatedData.currentPage}
                  totalPages={paginatedData.totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
