"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { post, get, API_ENDPOINTS } from "@/lib/api"
import APIService from "@/lib/services"
import { toast } from "sonner"
import { formatDate, formatDateForAPI, getCurrentUserInfo } from "@/lib/utils"
import { calculateAge, formatDateForInput, parseDateFromDDMMYYYY, isValidDate } from "@/lib/utils"

export default function AddMarriageSewingMachineDistribution() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    marriageNumber: "",
    applicationDate: "",
    applicantName: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    aadharNumber: "",
    gotra: "",
    age: "",
    mobile: "",
    address: "",
    pinCode: "",
    tehsil: "",
    district: "",
    state: "",
  })

  // Add computed age state
  const [computedAge, setComputedAge] = useState("")

  // Calculate age when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      if (age !== null) {
        setComputedAge(age.toString())
        setFormData(prev => ({ ...prev, age: age.toString() }))
      } else {
        setComputedAge("")
        setFormData(prev => ({ ...prev, age: "" }))
      }
    } else {
      setComputedAge("")
      setFormData(prev => ({ ...prev, age: "" }))
    }
  }, [formData.dateOfBirth])

  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [lastFetchedNumber, setLastFetchedNumber] = useState<string | null>(null)

  const isFormDisabled = isLoading || isLookupLoading || !formData.marriageNumber

  const fetchMarriageDetails = async (marriageNumber: string) => {
    if (!marriageNumber) return
    try {
      setIsLookupLoading(true)
      console.log("[Lookup] calling by number:", marriageNumber)
      let res = await APIService.getMarriageDetailsByNumber(marriageNumber)
      // Fallback to GET if POST returns failure or unexpected
      if (!res?.status) {
        console.warn("[Lookup] POST failed or returned status=false, trying GET fallback")
        const params = new URLSearchParams({ marriageNumber })
        const resp:any = await get(`${API_ENDPOINTS.GET_MARRIAGE_DETAILS_BY_NUMBER}&${params.toString()}`)
        res = resp?.congratulationsData

      }
      if (!res?.status) {
        toast.error(res?.message || "Marriage details not found")
        setLastFetchedNumber(marriageNumber)
        return
      }

      console.log("hello in the congratulation", res);
      
      const data:any  = res
      const congratulationsData = data.congratulationsData
      const sewingMachineData = data?.sewingMachineData || data?.sewing || null

      // Prefer sewingMachineData if present, otherwise use congratulationsData
      const src: any = sewingMachineData || congratulationsData || {}

      const next: any = { ...formData }
      const setIf = (key: keyof typeof next, value: any) => {
        if (value !== undefined && value !== null && value !== "") next[key] = String(value)
      }

      setIf("applicantName", src.applicantName || src.name)
      setIf("fatherName", src.fatherName)
      setIf("motherName", src.motherName)
      setIf("aadharNumber", src.aadharNumber || src.aadhaar)
      setIf("gotra", congratulationsData?.gotra)
      setIf("age", src.age)
      setIf("mobile", src.mobile || src.phone)
      setIf("address", src.address || src.village)
      setIf("pinCode", src.pinCode || src.pincode)
      setIf("tehsil", src.tehsil)
      setIf("district", src.district)
      setIf("state", src.state)

      // Dates
      const dobStr: string | undefined = src.dateOfBirth || src.dob
      if (dobStr) {
        const dob = new Date(dobStr)
        if (!isNaN(dob.getTime())) {
          // Store in dd-mm-yyyy format for display
          next.dateOfBirth = formatDate(dob)
          setDateOfBirthObj(dob)
          setDateOfBirthValue(formatDate(dob))
          // Calculate age when date of birth is set
          const age = calculateAge(formatDate(dob))
          if (age !== null) {
            setComputedAge(age.toString())
            next.age = age.toString()
          }
        }
      }

      // Application Date from API `date` if available
      const appDateStr: string | undefined = src.applicationDate || src.date
      if (appDateStr) {
        const ad = new Date(appDateStr)
        if (!isNaN(ad.getTime())) {
          // Store in dd-mm-yyyy format for display
          next.applicationDate = formatDate(ad)
          setApplicationDateObj(ad)
          setApplicationDateValue(formatDate(ad))
        }
      }

      setFormData(next)
      setLastFetchedNumber(marriageNumber)
      toast.success("Marriage details fetched")
      console.log("[Lookup] success:", { congratulationsData, sewingMachineData })
    } catch (err: any) {
      console.error("Lookup error:", err)
      toast.error(err?.response?.data?.message || "Failed to fetch marriage details")
    } finally {
      setIsLookupLoading(false)
    }
  }

  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(
    formData.applicationDate ? parseDateFromDDMMYYYY(formData.applicationDate) || undefined : undefined
  )
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState(
    formData.applicationDate || ""
  )

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(
    formData.dateOfBirth ? parseDateFromDDMMYYYY(formData.dateOfBirth) || undefined : undefined
  )
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    formData.dateOfBirth || ""
  )


  function isValidDate(date: Date | undefined) {
    if (!date) return false
    return !isNaN(date.getTime())
  }

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const apiFormData = new FormData()
      
      // Convert dates to yyyy-mm-dd format for API
      const applicationDateForAPI = formData.applicationDate ? formatDateForInput(parseDateFromDDMMYYYY(formData.applicationDate) || new Date()) : ""
      const dateOfBirthForAPI = formData.dateOfBirth ? formatDateForInput(parseDateFromDDMMYYYY(formData.dateOfBirth) || new Date()) : ""
      
      // Add all form fields to FormData
      apiFormData.append("marriageNumber", formData.marriageNumber)
      apiFormData.append("applicationDate", applicationDateForAPI)
      apiFormData.append("applicantName", formData.applicantName)
      apiFormData.append("fatherName", formData.fatherName)
      apiFormData.append("motherName", formData.motherName)
      apiFormData.append("dateOfBirth", dateOfBirthForAPI)
      apiFormData.append("aadharNumber", formData.aadharNumber)
      apiFormData.append("gotra", formData.gotra)
      apiFormData.append("age", formData.age)
      apiFormData.append("mobile", formData.mobile)
      apiFormData.append("address", formData.address)
      apiFormData.append("pinCode", formData.pinCode)
      apiFormData.append("tehsil", formData.tehsil)
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      apiFormData.append("district", formData.district)
      apiFormData.append("state", formData.state)
      apiFormData.append("addedby", addedby)
      apiFormData.append("addedby_id", String(addedby_id))

      const response = await post("?apicall=addMarriageSewing", apiFormData)
      
      if (response.data.status) {
        toast.success("Sewing machine application added successfully")
        router.push("/dashboard/marriage-congratulations/sewing-machine-distribution")
      } else {
        toast.error(response.data.message || "Failed to add sewing machine application")
      }
    } catch (error: any) {
      console.error("Error adding sewing machine application:", error)
      toast.error(error.response?.data?.message || "Failed to add sewing machine application")
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="p-6">
      {/* Top Back Button */}
      <div className="flex ">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading}>
            ← वापस जाएं / <br />Go Back
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">नया विवाह सिलाई मशीन वितरण आवेदन जोड़ें</h1>
          <p className="text-sm text-gray-600"></p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>सिलाई मशीन आवेदन विवरण / Sewing Machine Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Marriage Number Field (replaces Camp Number) */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3   grid-cols-1 gap-4">
              <div>
                <Label htmlFor="marriageNumber">विवाह नंबर / Marriage Number</Label>
                <div className="flex gap-2 items-start">
                  <Input
                    id="marriageNumber"
                    value={formData.marriageNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, marriageNumber: e.target.value }))}
                    onBlur={() => fetchMarriageDetails(formData.marriageNumber.trim())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        fetchMarriageDetails(formData.marriageNumber.trim())
                      }
                    }}
                    placeholder="विवाह नंबर / Marriage Number"
                    required
                    disabled={isLookupLoading || isLoading}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fetchMarriageDetails(formData.marriageNumber.trim())}
                    disabled={!formData.marriageNumber || isLookupLoading || isLoading}
                  >
                    {isLookupLoading ? "लोड हो रहा है..." : "विवरण लाएं / Fetch Details"}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="applicationDate">आवेदन तिथि / Application Date</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="applicationDate"
                    value={applicationDateValue}
                                         placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                                         onChange={(e) => {
                       setApplicationDateValue(e.target.value)
                       const parsedDate = parseDateFromDDMMYYYY(e.target.value)
                       if (parsedDate) {
                         setApplicationDateObj(parsedDate)
                         setFormData((prev) => ({
                           ...prev,
                           applicationDate: e.target.value,
                         }))
                       }
                     }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setApplicationDateOpen(true)
                      }
                    }}
                    required
                    disabled={isFormDisabled}
                  />
                  <Popover open={applicationDateOpen} onOpenChange={setApplicationDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="applicationDate-picker"
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        tabIndex={-1}
                        type="button"
                        disabled={isFormDisabled}
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
                        selected={applicationDateObj}
                        captionLayout="dropdown"
                        month={applicationDateObj}
                        onMonthChange={setApplicationDateObj}
                                                 onSelect={(date: any) => {
                           setApplicationDateObj(date)
                           const formattedDate = formatDate(date)
                           setApplicationDateValue(formattedDate)
                           setFormData((prev) => ({
                             ...prev,
                             applicationDate: formattedDate,
                           }))
                           setApplicationDateOpen(false)
                         }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="age">उम्र / Age</Label>
                <Input
                  id="age"
                  type="text"
                  value={computedAge}
                  placeholder="उम्र / Age"
                  readOnly
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2  grid-cols-1 gap-4">
              <div>
                <Label htmlFor="applicantName">आवेदक का नाम / Applicant Name</Label>
                <Input
                  id="applicantName"
                  value={formData.applicantName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicantName: e.target.value }))}
                  placeholder="आवेदक का नाम / Applicant Name"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम / Father's Name</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="पिता का नाम / Father's Name"
                  required
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2  grid-cols-1 gap-4">
              <div>
                <Label htmlFor="motherName">माता का नाम / Mother's Name</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motherName: e.target.value }))}
                  placeholder="माता का नाम / Mother's Name"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">जन्म तिथि / Date of Birth</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="dateOfBirth"
                    value={dateOfBirthValue}
                                         placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                                         onChange={(e) => {
                       setDateOfBirthValue(e.target.value)
                       const parsedDate = parseDateFromDDMMYYYY(e.target.value)
                       if (parsedDate) {
                         setDateOfBirthObj(parsedDate)
                         setFormData((prev) => ({
                           ...prev,
                           dateOfBirth: e.target.value,
                         }))
                         // Calculate age when date is manually entered
                         const age = calculateAge(e.target.value)
                         if (age !== null) {
                           setComputedAge(age.toString())
                         }
                       }
                     }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setDateOfBirthOpen(true)
                      }
                    }}
                    required
                    disabled={isFormDisabled}
                  />
                  <Popover open={dateOfBirthOpen} onOpenChange={setDateOfBirthOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="dateOfBirth-picker"
                        variant="ghost"
                        className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                        tabIndex={-1}
                        type="button"
                        disabled={isFormDisabled}
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
                        selected={dateOfBirthObj}
                        captionLayout="dropdown"
                        month={dateOfBirthObj}
                        onMonthChange={setDateOfBirthObj}
                                                 onSelect={(date: any) => {
                           setDateOfBirthObj(date)
                           const formattedDate = formatDate(date)
                           setDateOfBirthValue(formattedDate)
                           setFormData((prev) => ({
                             ...prev,
                             dateOfBirth: formattedDate,
                           }))
                           // Calculate age when date is selected
                           if (date) {
                             const age = calculateAge(formattedDate)
                             if (age !== null) {
                               setComputedAge(age.toString())
                             }
                           }
                           setDateOfBirthOpen(false)
                         }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2  grid-cols-1 gap-4">
              <div>
                <Label htmlFor="aadharNumber">आधार नंबर / Aadhar Number</Label>
                <Input
                  id="aadharNumber"
                  inputMode="numeric"
                  value={formData.aadharNumber}
                  onChange={(e) =>{
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                    setFormData((prev) => ({ ...prev, aadharNumber: digits }))
                  }}
                  placeholder="आधार नंबर / Aadhar Number"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="gotra">गोत्र / Gotra</Label>
                <Input
                  id="gotra"
                  value={formData.gotra}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gotra: e.target.value }))}
                  placeholder="गोत्र / Gotra"
                  required
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2  grid-cols-1 gap-4">
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर / Mobile Number</Label>
                <Input
                  id="mobile"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData((prev) => ({ ...prev, mobile: digits }))
                  }}
                  placeholder="मोबाइल नंबर / Mobile Number"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div>
                <Label htmlFor="address">Village / गाँव</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="गांव का नाम दर्ज करे"
                  required
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2  grid-cols-1 xl:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="pinCode">पिन कोड / Pin Code</Label>
                <Input
                  id="pinCode"
                  value={formData.pinCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pinCode: e.target.value }))}
                  placeholder="पिन कोड / Pin Code"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="tehsil">तहसील / Tehsil</Label>
                <Input
                  id="tehsil"
                  value={formData.tehsil}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tehsil: e.target.value }))}
                  placeholder="तहसील / Tehsil"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="district">जिला / District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="जिला / District"
                  required
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <Label htmlFor="state">राज्य / State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="राज्य / State"
                  required
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                रद्द करें / Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isLookupLoading || !formData.marriageNumber}>
                {isLoading ? "जोड़ रहा है..." : "आवेदन बनाएं / Submit Application"}
              </Button>
              
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
