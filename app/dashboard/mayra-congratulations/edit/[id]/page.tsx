"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { post, postUrlEncoded, API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils"
import { GENDER } from "@/lib/form-values"
import { RoleGuard } from "@/components/role-guard"

export default function EditMayraCongratulationsPage() {
  const router = useRouter()
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [formData, setFormData] = useState({
    mayra_id: "",
    date: "",
    codeNumber: "",
    mayraNumber: "",
    applicantName: "",
    fatherName: "",
    wifeOf: "",
    gotra: "",
    address: "",
    membershipJoinDate: "",
    associatedUntil: "",
    permanentFee: "",
    installmentAmount: "",
    totalGrantAmount: "",
    totalMembersServing: "",
    rate200: "",
    rate300: "",
    deductionPercent: "20",
    deductedAmount: "",
    totalPaidAmount: "",
    gender: "female",
  })

  const [dateOpen, setDateOpen] = useState(false)
  const [membershipDateOpen, setMembershipDateOpen] = useState(false)
  const [untilDateOpen, setUntilDateOpen] = useState(false)

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setIsFetching(true)
        const response = await post(API_ENDPOINTS.GET_MAYRA_CONGRATS, {})
        if (response.data.status && response.data.data) {
          const list = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
          const record = list.find((r: any) => r.id.toString() === id.toString())
          if (record) {
            setFormData({
              mayra_id: record.mayra_id || "",
              date: record.date || "",
              codeNumber: record.codeNumber || "",
              mayraNumber: record.mayraNumber || "",
              applicantName: record.applicantName || "",
              fatherName: record.fatherName || "",
              wifeOf: record.wifeOf || "",
              gotra: record.gotra || "",
              address: record.address || "",
              membershipJoinDate: record.membershipJoinDate || "",
              associatedUntil: record.associatedUntil || "",
              permanentFee: record.permanentFee || "",
              installmentAmount: record.installmentAmount || "",
              totalGrantAmount: record.totalGrantAmount || "",
              totalMembersServing: record.totalMembersServing || "",
              rate200: record.rate200 || "",
              rate300: record.rate300 || "",
              deductionPercent: record.deductionPercent || "20",
              deductedAmount: record.deductedAmount || "",
              totalPaidAmount: record.totalPaidAmount || "",
              gender: record.gender || "female",
            })
          }
        }
      } catch {
        toast.error("Failed to load record")
      } finally {
        setIsFetching(false)
      }
    }
    fetchRecord()
  }, [id])

  // Auto-calculate totals
  useEffect(() => {
    const r200 = parseInt(formData.rate200) || 0
    const r300 = parseInt(formData.rate300) || 0
    const dPercent = parseInt(formData.deductionPercent) || 20

    const total = (r200 * 200) + (r300 * 300)
    const dAmount = Math.round((total * dPercent) / 100)
    const paid = total - dAmount

    setFormData(prev => ({
      ...prev,
      deductedAmount: dAmount.toString(),
      totalPaidAmount: paid.toString(),
      totalMembersServing: (r200 + r300).toString()
    }))
  }, [formData.rate200, formData.rate300, formData.deductionPercent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { addedby, addedby_id } = getCurrentUserInfo()
      const apiFormData = new FormData()
      apiFormData.append("id", id as string)
      
      Object.entries(formData).forEach(([k, v]) => {
        apiFormData.append(k, String(v ?? ""))
      })
      
      apiFormData.append("addedby", addedby)
      apiFormData.append("addedby_id", addedby_id)

      const response = await post(API_ENDPOINTS.UPDATE_MAYRA_CONGRATS, apiFormData)
      if (response.data.status) {
        toast.success("रिकॉर्ड सफलतापूर्वक अपडेट किया गया")
        router.push("/dashboard/mayra-congratulations")
      } else {
        toast.error(response.data.message || "Failed to update record")
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update record")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="update">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">मायरा बधाई पत्र संपादित करें</h1>
                <p className="text-sm text-gray-600 mt-1">Edit Mayra Congratulations Record</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">मूल विवरण (Basic Details)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>दिनांक / Date</Label>
                    <div className="relative mt-1">
                      <Input placeholder="dd-mm-yyyy" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3" type="button">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" selected={parseDateFromDDMMYYYY(formData.date) || undefined} onSelect={d => { setFormData(p => ({ ...p, date: formatDate(d as any) })); setDateOpen(false) }} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div>
                    <Label>मायरा संख्या / Mayra Number</Label>
                    <Input readOnly className="bg-gray-50" value={formData.mayraNumber} />
                  </div>
                  <div>
                    <Label>कोड नंबर / Code Number</Label>
                    <Input placeholder="कोड नंबर" value={formData.codeNumber} onChange={e => setFormData(p => ({ ...p, codeNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>लिंग / Gender</Label>
                    <select
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1"
                      value={formData.gender}
                      onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}
                    >
                      <option value={GENDER.FEMALE}>महिला / Female</option>
                      <option value={GENDER.MALE}>पुरुष / Male</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Applicant Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">आवेदक का विवरण (Applicant Details)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>आवेदक का नाम *</Label>
                    <Input required placeholder="नाम" value={formData.applicantName} onChange={e => setFormData(p => ({ ...p, applicantName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>पिता का नाम</Label>
                    <Input placeholder="पिता का नाम" value={formData.fatherName} onChange={e => setFormData(p => ({ ...p, fatherName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>पति का नाम / Wife of</Label>
                    <Input placeholder="पति का नाम" value={formData.wifeOf} onChange={e => setFormData(p => ({ ...p, wifeOf: e.target.value }))} />
                  </div>
                  <div>
                    <Label>गोत्र / Gotra</Label>
                    <Input placeholder="गोत्र" value={formData.gotra} onChange={e => setFormData(p => ({ ...p, gotra: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>पता / Address</Label>
                  <Input placeholder="पता" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>

              {/* Section 3: Membership */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">सदस्यता विवरण (Membership Details)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>सदस्यता तिथि / Membership Join Date</Label>
                    <div className="relative mt-1">
                      <Input placeholder="dd-mm-yyyy" value={formData.membershipJoinDate} onChange={e => setFormData(p => ({ ...p, membershipJoinDate: e.target.value }))} />
                      <Popover open={membershipDateOpen} onOpenChange={setMembershipDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3" type="button"><CalendarDays className="h-4 w-4 text-gray-400" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" captionLayout="dropdown" fromYear={1990} toYear={new Date().getFullYear()} selected={parseDateFromDDMMYYYY(formData.membershipJoinDate) || undefined} onSelect={d => { setFormData(p => ({ ...p, membershipJoinDate: formatDate(d as any) })); setMembershipDateOpen(false) }} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div>
                    <Label>संस्था से जुड़ी रही / Associated Until</Label>
                    <div className="relative mt-1">
                      <Input placeholder="dd-mm-yyyy" value={formData.associatedUntil} onChange={e => setFormData(p => ({ ...p, associatedUntil: e.target.value }))} />
                      <Popover open={untilDateOpen} onOpenChange={setUntilDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3" type="button"><CalendarDays className="h-4 w-4 text-gray-400" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" captionLayout="dropdown" fromYear={1990} toYear={new Date().getFullYear() + 5} selected={parseDateFromDDMMYYYY(formData.associatedUntil) || undefined} onSelect={d => { setFormData(p => ({ ...p, associatedUntil: formatDate(d as any) })); setUntilDateOpen(false) }} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Financial Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">वित्तीय विवरण (Financial Details)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>स्थायी शुल्क</Label>
                    <Input type="number" placeholder="₹" value={formData.permanentFee} onChange={e => setFormData(p => ({ ...p, permanentFee: e.target.value }))} />
                  </div>
                  <div>
                    <Label>किस्त राशि</Label>
                    <Input type="number" placeholder="₹" value={formData.installmentAmount} onChange={e => setFormData(p => ({ ...p, installmentAmount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>कुल अनुदान</Label>
                    <Input type="number" placeholder="₹" value={formData.totalGrantAmount} onChange={e => setFormData(p => ({ ...p, totalGrantAmount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>कुल सदस्य</Label>
                    <Input type="number" placeholder="सदस्य" value={formData.totalMembersServing} onChange={e => setFormData(p => ({ ...p, totalMembersServing: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>200x दर</Label><Input type="number" placeholder="200x" value={formData.rate200} onChange={e => setFormData(p => ({ ...p, rate200: e.target.value }))} /></div>
                  <div><Label>300x दर</Label><Input type="number" placeholder="300x" value={formData.rate300} onChange={e => setFormData(p => ({ ...p, rate300: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><Label>कटौती %</Label><Input type="number" placeholder="%" value={formData.deductionPercent} onChange={e => setFormData(p => ({ ...p, deductionPercent: e.target.value }))} /></div>
                  <div><Label>कटौती राशि</Label><Input type="number" placeholder="₹" value={formData.deductedAmount} onChange={e => setFormData(p => ({ ...p, deductedAmount: e.target.value }))} /></div>
                  <div><Label>कुल भुगतान</Label><Input type="number" placeholder="₹" value={formData.totalPaidAmount} onChange={e => setFormData(p => ({ ...p, totalPaidAmount: e.target.value }))} /></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                  रद्द करें / Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? "Updating..." : "अपडेट करें / Update Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
