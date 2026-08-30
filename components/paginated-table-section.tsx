"use client"

import type { ReactNode } from "react"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { Pagination } from "@/components/ui/pagination"

interface PaginatedTableSectionProps<T> {
  data: T[]
  emptyMessage?: string
  loading?: boolean
  loadingMessage?: string
  resetKey?: string | number
  itemsPerPage?: number
  children: (items: T[]) => ReactNode
}

export function PaginatedTableSection<T>({
  data,
  emptyMessage = "No records found.",
  loading = false,
  loadingMessage = "Loading...",
  resetKey,
  itemsPerPage = 10,
  children,
}: PaginatedTableSectionProps<T>) {
  const { items, currentPage, totalPages, setCurrentPage } = useTablePagination(
    data,
    itemsPerPage,
    resetKey
  )

  if (loading) {
    return <div className="text-center py-8 text-gray-500 px-4">{loadingMessage}</div>
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500 px-4">{emptyMessage}</div>
  }

  return (
    <>
      {children(items)}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  )
}
