"use client"

import { useEffect, useMemo, useState } from "react"
import { paginateData } from "@/lib/pagination"

const ITEMS_PER_PAGE = 10

export function useTablePagination<T>(
  data: T[],
  itemsPerPage = ITEMS_PER_PAGE,
  resetKey?: string | number
) {
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [data.length, resetKey])

  const paginated = useMemo(
    () => paginateData(data, currentPage, itemsPerPage),
    [data, currentPage, itemsPerPage]
  )

  return {
    items: paginated.items,
    currentPage: paginated.currentPage,
    totalPages: paginated.totalPages,
    totalItems: paginated.totalItems,
    setCurrentPage,
  }
}
