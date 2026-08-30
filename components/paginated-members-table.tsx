"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PaginatedTableSection } from "@/components/paginated-table-section"

type Member = {
  id: string | number
  name: string
  formNumber?: string
  category?: string
  payment_status?: number
}

interface PaginatedMembersTableProps {
  members: Member[]
  amount: number
  category: string
  loading?: boolean
  searchTerm?: string
  onPay: (memberId: string | number, amount: number, category: string) => void
}

export function PaginatedMembersTable({
  members,
  amount,
  category,
  loading = false,
  searchTerm = "",
  onPay,
}: PaginatedMembersTableProps) {
  return (
    <PaginatedTableSection
      data={members}
      loading={loading}
      loadingMessage="Loading members..."
      emptyMessage={
        searchTerm
          ? `No members found matching "${searchTerm}"`
          : `No Category ${category} members available.`
      }
      resetKey={`${category}-${searchTerm}`}
    >
      {(paginatedMembers) => (
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Member Name</TableHead>
              <TableHead>Form Number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.map((member) => (
              <TableRow key={`${member.id}-${category}`}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.formNumber || "-"}</TableCell>
                <TableCell>{member.category || "-"}</TableCell>
                <TableCell
                  className={
                    (member.payment_status ?? 0) === 1
                      ? "text-green-600 font-bold"
                      : "text-red-600 font-bold"
                  }
                >
                  {(member.payment_status ?? 0) === 1 ? "Paid" : "Pending"}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => onPay(member.id, amount, member.category || "")}
                    disabled={(member.payment_status ?? 0) === 1}
                  >
                    {(member.payment_status ?? 0) === 1 ? "Already Paid" : `Pay ₹${amount}`}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PaginatedTableSection>
  )
}
