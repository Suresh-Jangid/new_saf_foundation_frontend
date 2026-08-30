"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { API_ENDPOINTS, post } from "@/lib/api"
import { Plus, Trash2, Loader2, IndianRupee } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getCurrentUserInfo } from "@/lib/utils"
import { PaginatedTableSection } from "@/components/paginated-table-section"

interface CongratsPayment {
  id: string
  mayra_id: string
  amount: number
  category: string
  mayra_congratulations_id: string
  addedby: string
  addedby_id: string
  applicantName: string | null
  formNumber: string | null
}

const CATEGORIES = ["A", "B", "C", "D"]

export default function MayraCongratsPaymentsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [payments, setPayments] = useState<CongratsPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    mayra_id: "",
    amount: "",
    category: "B",
  })

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await post(API_ENDPOINTS.GET_MAYRA_CONGRATS_PAYMENT, {
        mayra_congratulations_id: id,
      })
      if (response.data.status && response.data.data) {
        setPayments(Array.isArray(response.data.data) ? response.data.data : [response.data.data])
      } else {
        setPayments([])
      }
    } catch {
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.mayra_id) { toast.error("कृपया Mayra ID दर्ज करें"); return }
    if (!formData.amount || Number(formData.amount) <= 0) { toast.error("कृपया वैध राशि दर्ज करें"); return }

    setAdding(true)
    try {
      const { addedby, addedby_id } = getCurrentUserInfo()
      const response = await post(API_ENDPOINTS.CREATE_MAYRA_CONGRATS_PAYMENT, {
        mayra_id: formData.mayra_id,
        amount: formData.amount,
        category: formData.category,
        mayra_congratulations_id: id,
        addedby,
        addedby_id,
      })
      if (response.data.status) {
        toast.success("भुगतान सफलतापूर्वक जोड़ा गया")
        setIsDialogOpen(false)
        fetchPayments()
        setFormData({ mayra_id: "", amount: "", category: "B" })
      } else {
        toast.error(response.data.message || "Failed to add payment")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm("क्या आप इस भुगतान को हटाना चाहते हैं?")) return
    try {
      const response = await post(API_ENDPOINTS.DELETE_MAYRA_CONGRATS_PAYMENT, { id: paymentId })
      if (response.data.status) {
        toast.success("भुगतान हटाया गया")
        fetchPayments()
      } else {
        toast.error(response.data.message || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const categoryCount: Record<string, number> = {}
  payments.forEach(p => {
    categoryCount[p.category] = (categoryCount[p.category] || 0) + Number(p.amount || 0)
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Button variant="link" onClick={() => router.back()} className="p-0 h-auto">
                ← वापस जाएं / Go Back
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
                बधाई भुगतान प्रबंधन (Congratulations Payments)
              </h1>
              <p className="text-sm text-gray-600 mt-1">Congrats ID: {id}</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> नया भुगतान जोड़ें
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>भुगतान विवरण (Payment Details)</DialogTitle>
                  <DialogDescription>बधाई भुगतान का विवरण दर्ज करें।</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Mayra ID *</Label>
                    <Input
                      required
                      type="number"
                      placeholder="Mayra Application ID"
                      value={formData.mayra_id}
                      onChange={e => setFormData(p => ({ ...p, mayra_id: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>राशि (Amount) *</Label>
                      <Input
                        type="number"
                        required
                        placeholder="₹ राशि"
                        value={formData.amount}
                        onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>श्रेणी (Category)</Label>
                      <select
                        className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white"
                        value={formData.category}
                        onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      रद्द करें
                    </Button>
                    <Button type="submit" disabled={adding}>
                      {adding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      {adding ? "Saving..." : "सहेजें / Save"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="px-6 py-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-orange-100 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <IndianRupee className="text-orange-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">कुल भुगतान</p>
                    <h3 className="text-xl font-bold text-orange-700">₹{totalPaid.toLocaleString()}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <IndianRupee className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">कुल रिकॉर्ड</p>
                    <h3 className="text-xl font-bold text-blue-700">{payments.length}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(categoryCount).map(([cat, amount]) => (
              <Card key={cat}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-full">
                      <span className="text-green-700 font-bold text-sm">{cat}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">श्रेणी {cat}</p>
                      <h3 className="text-xl font-bold text-green-700">₹{Number(amount).toLocaleString()}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>भुगतान इतिहास (Payment History)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PaginatedTableSection
                data={payments}
                loading={loading}
                emptyMessage="कोई भुगतान नहीं मिला।"
              >
                {(paginatedPayments) => (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mayra ID</TableHead>
                        <TableHead>आवेदक</TableHead>
                        <TableHead>फॉर्म संख्या</TableHead>
                        <TableHead>राशि (Amount)</TableHead>
                        <TableHead>श्रेणी (Category)</TableHead>
                        <TableHead>जोड़ा गया</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-gray-600">{payment.mayra_id}</TableCell>
                          <TableCell>{payment.applicantName || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-500">{payment.formNumber || "-"}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ₹{Number(payment.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payment.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{payment.addedby || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </PaginatedTableSection>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
