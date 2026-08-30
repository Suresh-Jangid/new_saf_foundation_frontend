"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, post, postUrlEncoded } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, formatDateForAPI, isValidDate, parseDateFromDDMMYYYY, unwrapApiRecordById } from "@/lib/utils";
import { GENDER_OPTIONS } from "@/lib/form-values";

interface SurakshaBimaYojanaRecord {
  id: string
  date: string
  codeNumber: string
  bimaNumber: string
  applicantName: string
  fatherName: string
  wifeOf: string
  gotra: string
  address: string
  membershipJoinDate: string
  associatedUntil: string
  permanentFee: string
  installmentAmount: string
  totalGrantAmount: string
  totalMembersServing: string
  rate200: string
  totalPaidAmount: string
  gender: string
  deductionPercent: string
  deductionAmount: string
  memberCount: string
  insuranceApplication_id: string
  createdAt: string
}

export default function EditSurakshaBimaYojanaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // All form fields
  const [formData, setFormData] = useState({
    date: "",
    codeNumber: "",
    bimaNumber: "",
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
    totalPaidAmount: "",
    gender: "",
    deductionPercent: "10",
    deductionAmount: "",
    memberCount: "",
    insuranceApplication_id: "",
    memberContribution: "",
  })

  const { updateApi } = useCRUD<SurakshaBimaYojanaRecord>("surakshaBimaYojanaRecords", [], {
    update: API_ENDPOINTS.UPDATE_SURAKSHA_BIMA,
  });

  // Date pickers
  const [marriageDateObj, setMarriageDateObj] = useState<Date | undefined>(undefined)
  const [marriageDateOpen, setMarriageDateOpen] = useState(false)
  const [marriageDateValue, setMarriageDateValue] = useState("")

  const [membershipJoinDateObj, setMembershipJoinDateObj] = useState<Date | undefined>(undefined)
  const [membershipJoinDateOpen, setMembershipJoinDateOpen] = useState(false)
  const [membershipJoinDateValue, setMembershipJoinDateValue] = useState("")



  // Fetch data from API (POST with id, like General Applications)
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const formParams = new URLSearchParams();
        formParams.append('id', id);
        const response = await post(API_ENDPOINTS.GET_SURAKSHA_BIMA, formParams, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.data.status && response.data.data) {
          const record = unwrapApiRecordById<any>(response.data.data, id);
          if (!record) {
            toast.error("Suraksha bima yojana record not found");
            router.push("/dashboard/suraksha-bima-yojana");
            return;
          }
          console.log("API Response:", record);
          
          setFormData({
            date: record.date || "",
            codeNumber: record.codeNumber || "",
            bimaNumber: record.bimaNumber || "",
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
            totalPaidAmount: record.totalPaidAmount || "",
            gender: record.gender 
              ? record.gender.charAt(0).toUpperCase() + record.gender.slice(1).toLowerCase()
              : "",
            deductionPercent: record.deductionPercent || "10",
            deductionAmount: record.deductionAmount || "",
            memberCount: record.memberCount || record.totalMembersServing || "",
            insuranceApplication_id: record.insuranceApplication_id || "",
            memberContribution: record.memberContribution || "",
          });
          
          // Set date pickers
          if (record.date) {
            const d = new Date(record.date)
            setMarriageDateObj(d)
            setMarriageDateValue(formatDate(d))
            if (record.insuranceApplication_id) {
              refreshLiveData(formatDateForAPI(d), record.insuranceApplication_id)
            }
          }
          if (record.membershipJoinDate) {
            const d = new Date(record.membershipJoinDate)
            setMembershipJoinDateObj(d)
            setMembershipJoinDateValue(formatDate(d))
          }
         
        } else {
          toast.error("Suraksha bima yojana record not found");
          router.push("/dashboard/suraksha-bima-yojana");
        }
      } catch (error: any) {
        console.error("Error fetching suraksha bima yojana record:", error);
        toast.error("Failed to load suraksha bima yojana data");
        router.push("/dashboard/suraksha-bima-yojana");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Recalculate amounts when memberCount or deductionPercent changes
  useEffect(() => {
    if (formData.memberCount || formData.deductionPercent) {
      calculateAmounts()
    }
  }, [formData.memberCount, formData.deductionPercent])

  const calculateAmounts = () => {
    const memberCount = parseInt(formData.memberCount) || 0
    const deductionPercent = parseFloat(formData.deductionPercent) || 10
    
    // Calculate rate200 (member count)
    const rate200 = memberCount
    
    // Calculate total grant amount (member count * 200)
    const totalGrantAmount = memberCount * 200
    
    // Calculate deduction amount
    const deductionAmount = (totalGrantAmount * deductionPercent) / 100
    
    // Calculate total paid amount
    const totalPaidAmount = totalGrantAmount - deductionAmount
    
    // Calculate member contribution (member count * 200)
    const memberContribution = memberCount * 200
    
    setFormData(prev => ({
      ...prev,
      memberCount: memberCount.toString(),
      rate200: rate200.toString(),
      // totalGrantAmount: totalGrantAmount.toString(),
      totalMembersServing: memberCount.toString(),
      deductionAmount: deductionAmount.toFixed(2),
      totalPaidAmount: totalPaidAmount.toFixed(2),
      memberContribution: memberContribution.toString()
    }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))

    // Auto-calculate amounts when relevant fields change
    if (['memberCount', 'deductionPercent'].includes(id)) {
      calculateAmounts()
    }
  }

  // Re-fetch active member count and this member's own EMI whenever the
  // entered date changes, so both stay in sync with the selected date.
  const refreshLiveData = async (dateStr: string, insuranceApplicationIdOverride?: string) => {
    const insuranceApplicationId = insuranceApplicationIdOverride || formData.insuranceApplication_id
    if (!insuranceApplicationId || !dateStr) return

    try {
      const response = await postUrlEncoded("?apicall=getSurakshaBimaData", {
        insuranceApplication_id: insuranceApplicationId,
        date: dateStr,
      })

      const data = response.data
      if (data.status && data.data) {
        const memberCount = data?.totalCount || 0
        const totalEmiPaid = data?.totalEmiPaid || 0
        const totalGrantAmount = memberCount * 200

        setFormData((prev) => ({
          ...prev,
          installmentAmount: String(totalEmiPaid),
          totalGrantAmount: String(totalGrantAmount),
          totalMembersServing: memberCount.toString(),
          rate200: memberCount.toString(),
          memberCount: memberCount.toString(),
        }))
      }
    } catch (error) {
      console.error("Error refreshing live suraksha bima data:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.date || !formData.codeNumber || !formData.bimaNumber || !formData.applicantName || !formData.gender || !formData.gotra || !formData.address || !formData.memberCount) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    // Validate numeric fields
    if (formData.memberCount && isNaN(parseInt(formData.memberCount))) {
      toast.error("सदस्य संख्या एक वैध संख्या होनी चाहिए");
      return;
    }

    // Additional validation based on gender
    if (formData.gender.toLowerCase() === "male" && !formData.fatherName) {
      toast.error("पुरुष के लिए पिता का नाम आवश्यक है");
      return;
    }
    if (formData.gender.toLowerCase() === "female" && !formData.wifeOf) {
      toast.error("महिला के लिए पति का नाम आवश्यक है");
      return;
    }

    // The account registration date (membershipJoinDate) is loaded from the
    // insurance application. The entry date must NOT fall before it — a date
    // earlier than the account registration date is invalid.
    if (marriageDateObj && membershipJoinDateObj) {
      const entry = new Date(marriageDateObj); entry.setHours(0, 0, 0, 0);
      const reg = new Date(membershipJoinDateObj); reg.setHours(0, 0, 0, 0);
      if (entry < reg) {
        toast.error("दिनांक खाता पंजीकरण दिनांक से पूर्व नहीं हो सकती / Date cannot be earlier than the account registration date");
        return;
      }
    }

    setIsLoading(true)

    try {
      const success = await updateApi(id, formData);
      
      if (success) {
        router.push("/dashboard/suraksha-bima-yojana");
      }
    } catch (error: any) {
      console.error("Error updating suraksha bima yojana:", error);
      toast.error("सुरक्षा बीमा योजना रिकॉर्ड अपडेट करने में त्रुटि");
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading suraksha bima yojana data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full">
        {/* Header Section */}
        <div className="border-b border-gray-200 flex bg-white px-6 py-4">
          <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
              ← वापस जाएं /<br /> Go Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">सुरक्षा बीमा योजना रिकॉर्ड संपादित करें</h1>
              <p className="text-sm text-gray-600 mt-1">Edit Insurance Bima Payment Record</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">मूल जानकारी / Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="date">दिनांक (Date) *</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="date"
                      value={marriageDateValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value
                        setMarriageDateValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setMarriageDateObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            date: formatDate(date),
                          }))
                          refreshLiveData(formatDateForAPI(date))
                        } else {
                          // Clear dateObj if invalid date
                          setMarriageDateObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            date: str,
                          }))
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setMarriageDateOpen(true)
                        }
                      }}
                      required
                    />
                    <Popover open={marriageDateOpen} onOpenChange={setMarriageDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-picker"
                          variant="ghost"
                          className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                          tabIndex={-1}
                          type="button"
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span className="sr-only">Select date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                      >
                        <Calendar
                          mode="single"
                          selected={marriageDateObj}
                          captionLayout="dropdown"
                          month={marriageDateObj}
                          onMonthChange={setMarriageDateObj}
                          onSelect={(date: any) => {
                            setMarriageDateObj(date)
                            setMarriageDateValue(formatDate(date))
                            setFormData((prev) => ({
                              ...prev,
                              date: date ? formatDate(date) : "",
                            }))
                            if (date) {
                              refreshLiveData(formatDateForAPI(date))
                            }
                            setMarriageDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="codeNumber">कोड नंबर (Code Number) *</Label>
                  <Input id="codeNumber" value={formData.codeNumber} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="bimaNumber">बीमा नंबर (Bima Number) *</Label>
                  <Input id="bimaNumber" value={formData.bimaNumber} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">व्यक्तिगत जानकारी / Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="applicantName">आवेदक का नाम (Applicant Name) *</Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">लिंग (Gender) *</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="bg-background border rounded px-3 py-2 w-full"
                  >
                    <option value="">Select Gender</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.gender.toLowerCase() === "male" && (
                  <div>
                    <Label htmlFor="fatherName">पिता का नाम (Father Name) *</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
                {formData.gender.toLowerCase() === "female" && (
                  <div>
                    <Label htmlFor="wifeOf">पति का नाम (Wife Of) *</Label>
                    <Input
                      id="wifeOf"
                      value={formData.wifeOf}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                  <Input id="gotra" value={formData.gotra} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="address">Village / गांव *</Label>
                  <Input id="address" value={formData.address} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* Membership Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">सदस्यता जानकारी / Membership Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="membershipJoinDate">सदस्यता से जुड़ने की तारीख (Membership Join Date)</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="membershipJoinDate"
                      value={membershipJoinDateValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value
                        setMembershipJoinDateValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setMembershipJoinDateObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            membershipJoinDate: formatDate(date),
                          }))
                        } else {
                          // Clear dateObj if invalid date
                          setMembershipJoinDateObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            membershipJoinDate: str,
                          }))
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setMembershipJoinDateOpen(true)
                        }
                      }}
                    />
                    <Popover open={membershipJoinDateOpen} onOpenChange={setMembershipJoinDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="membershipJoinDate-picker"
                          variant="ghost"
                          className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                          tabIndex={-1}
                          type="button"
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span className="sr-only">Select date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                      >
                        <Calendar
                          mode="single"
                          selected={membershipJoinDateObj}
                          captionLayout="dropdown"
                          month={membershipJoinDateObj}
                          onMonthChange={setMembershipJoinDateObj}
                          onSelect={(date: any) => {
                            setMembershipJoinDateObj(date)
                            setMembershipJoinDateValue(formatDate(date))
                            setFormData((prev) => ({
                              ...prev,
                              membershipJoinDate: date ? formatDate(date) : "",
                            }))
                            setMembershipJoinDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="associatedUntil">यह सदस्य कब तक इस संस्था से जुड़ी रही (How long associated)</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="associatedUntil"
                      value={formData.associatedUntil}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      
                    />
                   
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">वित्तीय जानकारी / Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="permanentFee">स्थायी शुल्क (अनुदान) दी गई राशि (Permanent Fee/Grant Amount)</Label>
                  <Input 
                    id="permanentFee" 
                    type="number"
                    step="0.01"
                    value={formData.permanentFee} 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <Label htmlFor="installmentAmount">किस्त के तौर पर दी गई राशि (Installment Amount)</Label>
                  <Input 
                    id="installmentAmount" 
                    type="number"
                    step="0.01"
                    value={formData.installmentAmount} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="memberCount">सदस्य संख्या (Member Count) *</Label>
                  <Input 
                    id="memberCount" 
                    type="number"
                    value={formData.memberCount} 
                    onChange={handleChange}
                    placeholder="Enter member count"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalMembersServing">संस्था में कुल सदस्य सेवा दे रहे हैं (Total Members Serving)</Label>
                  <Input 
                    id="totalMembersServing" 
                    type="number"
                    value={formData.totalMembersServing} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="rate200">200 x सदस्य संख्या (Rate 200 x Members)</Label>
                  <Input 
                    id="rate200" 
                    type="number"
                    value={formData.rate200} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="totalGrantAmount">संस्था में कुल दी गई अनुदान राशि (Total Grant Amount)</Label>
                  <Input 
                    id="totalGrantAmount" 
                    type="number"
                    step="0.01"
                    value={formData.totalGrantAmount} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Deduction and Payment Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">कटौती और भुगतान जानकारी / Deduction & Payment Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="deductionPercent">कटौती प्रतिशत चुनें (Select Deduction Percent)</Label>
                  <select
                    id="deductionPercent"
                    value={formData.deductionPercent}
                    onChange={handleChange}
                    className="bg-background border rounded px-3 py-2 w-full"
                  >
                    <option value="10">10%</option>
                    <option value="25">25%</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="deductionAmount">
                    संस्था के खाते के लिए कटौती गई {formData.deductionPercent}% राशि ({formData.deductionPercent}% Deducted Amount)
                  </Label>
                  <Input
                    id="deductionAmount"
                    value={formData.deductionAmount || ""}
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="totalPaidAmount">संस्था द्वारा कुल भुगतान राशि (Total Paid Amount)</Label>
                  <Input 
                    id="totalPaidAmount" 
                    value={formData.totalPaidAmount} 
                    onChange={handleChange} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="memberContribution">सदस्य द्वारा दी गयी राशि (Amount given by member)</Label>
                  <Input 
                    id="memberContribution" 
                    value={formData.memberContribution} 
                    onChange={handleChange} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                रद्द करें / Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? "अपडेट हो रहा है..." : "रिकॉर्ड अपडेट करें / Update Record"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
