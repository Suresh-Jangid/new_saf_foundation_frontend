export interface PaginationData<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export function paginateData<T>(data: T[], currentPage = 1, itemsPerPage = 10): PaginationData<T> {
  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const items = data.slice(startIndex, endIndex)

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
  }
}
