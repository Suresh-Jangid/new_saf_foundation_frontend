"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { X, FileText } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, formatDateForAPI, getCurrentUserInfo } from "@/lib/utils"
import { RoleGuard } from "@/components/role-guard"

export default function AddLoanApplicationPage() {
  const router = useRouter()
  const today = new Date()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [submittedRecord, setSubmittedRecord] = useState<any>(null)
  const [formData, setFormData] = useState({
    date: formatDateForAPI(today),
    applicantName: "",
    fatherName: "",
    motherName: "",
    address: "",
    reason: "",
    aadhaar: null as File | null,
    incomeCertificate: null as File | null,
    moolNiwas: null as File | null,
    photo: null as File | null,
  })

  const { createApi } = useCRUD("loanApplicationRecords", [], {
    create: API_ENDPOINTS.CREATE_LOAN_APPLICATION,
  });

  const [dateObj, setDateObj] = useState<Date | undefined>(today)
  const [dateOpen, setDateOpen] = useState(false)
  const [dateValue, setDateValue] = useState(formatDate(today))

  // Add filePreviews state
  const [filePreviews, setFilePreviews] = useState<{
    [key: string]: string | null
  }>({
    aadhaar: null,
    incomeCertificate: null,
    moolNiwas: null,
    photo: null,
  })

  // Remove local formatDate function - using imported one from utils
  function isValidDate(date: Date | undefined) {
    if (!date) return false
    return !isNaN(date.getTime())
  }



  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value, type } = e.target
    if (type === "file" && e.target instanceof HTMLInputElement) {
      const input = e.target as HTMLInputElement
      const file = input.files && input.files[0] ? input.files[0] : null
      setFormData((prev) => ({
        ...prev,
        [id]: file,
      }))
      // Generate preview
      if (file) {
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          setFilePreviews((prev) => ({
            ...prev,
            [id]: URL.createObjectURL(file),
          }))
        } else {
          setFilePreviews((prev) => ({
            ...prev,
            [id]: null,
          }))
        }
      } else {
        setFilePreviews((prev) => ({
          ...prev,
          [id]: null,
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }))
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.date || !formData.applicantName || !formData.fatherName || !formData.motherName || !formData.address || !formData.reason) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format date as yyyyddmm for API
      const formattedDate = dateObj ? formatDateForAPI(dateObj) : formData.date;
      
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      const submissionData: Record<string, unknown> = {
        date: formattedDate,
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        address: formData.address,
        reason: formData.reason,
        addedby,
        addedby_id,
      };

      if (formData.aadhaar) submissionData.aadhaar = formData.aadhaar;
      if (formData.incomeCertificate) submissionData.incomeCertificate = formData.incomeCertificate;
      if (formData.moolNiwas) submissionData.moolNiwas = formData.moolNiwas;
      if (formData.photo) submissionData.photo = formData.photo;
      
      const result = await createApi(submissionData);
      
      if (result) {
        // Store the submitted record for PDF generation
        setSubmittedRecord({
          ...submissionData,
          date: formData.date, // Keep original date format for display
        });

        router.push("/dashboard/loan-application");
        // Don't redirect immediately, show PDF generation option
      }
    } catch (error) {
      console.error("Error creating loan application:", error);
      toast.error("ऋण आवेदन जोड़ने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGuard requiredModule="balika_loan_application" requiredAction="create">
      <div className="p-6 w-full">
        <div className="flex">
          <div className="mb-4">
            <Button type="button" variant="link" onClick={() => router.back()}>
              ← वापस जाएं / <br/>Go Back
            </Button>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">नया ऋण आवेदन जोड़ें</h1>
            <p className="text-sm text-gray-600">Add New Loan Application</p>
          </div>
        </div>
        
               
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Loan Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 w-full">
              <div>
                <Label htmlFor="date">दिनांक (Date) *</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={dateValue}
                    placeholder="01 June, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      setDateValue(e.target.value)
                      if (isValidDate(date)) {
                        setDateObj(date)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setDateOpen(true)
                      }
                    }}
                    required
                  />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
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
                        selected={dateObj}
                        captionLayout="dropdown"
                        month={dateObj}
                        onMonthChange={setDateObj}
                        onSelect={(date: any) => {
                          setDateObj(date)
                          setDateValue(formatDate(date))
                                                   setFormData((prev) => ({
                             ...prev,
                             date: date ? formatDateForAPI(date) : "",
                           }))
                          setDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="applicantName">आवेदक का नाम (Applicant Name) *</Label>
                <Input id="applicantName" value={formData.applicantName} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम (Father Name) *</Label>
                <Input id="fatherName" value={formData.fatherName} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="motherName">माता का नाम (Mother Name) *</Label>
                <Input id="motherName" value={formData.motherName} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="address">निवासी (Address) *</Label>
                <Textarea id="address" value={formData.address} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="reason">ऋण का कारण (Reason for Loan) *</Label>
                <select
                  id="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="bg-background border rounded px-3 py-2 w-full"
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="education">शिक्षा (Education)</option>
                  <option value="business">व्यापार (Business)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aadhaar */}
                <div>
                  <Label htmlFor="aadhaar">आधार कार्ड (Aadhaar Card)</Label>
                  <Input id="aadhaar" type="file" accept="image/*,.pdf" onChange={handleChange} />
                  {filePreviews.aadhaar && formData.aadhaar && (
                    <div className="mt-2 flex items-center gap-2">
                      {formData.aadhaar.type.startsWith("image/") ? (
                        <img src={filePreviews.aadhaar} alt="Aadhaar Preview" className="h-32 w-auto border rounded" />
                      ) : formData.aadhaar.type === "application/pdf" ? (
                        <embed src={filePreviews.aadhaar} type="application/pdf" className="h-32 w-full border rounded" />
                      ) : (
                        <span className="text-sm text-gray-500">No preview available</span>
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, aadhaar: null }))
                          setFilePreviews((prev) => ({ ...prev, aadhaar: null }))
                        }}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                </div>
                {/* Income Certificate */}
                <div>
                  <Label htmlFor="incomeCertificate">आय प्रमाण पत्र (Income Certificate)</Label>
                  <Input id="incomeCertificate" type="file" accept="image/*,.pdf" onChange={handleChange} />
                  {filePreviews.incomeCertificate && formData.incomeCertificate && (
                    <div className="mt-2 flex items-center gap-2">
                      {formData.incomeCertificate.type.startsWith("image/") ? (
                        <img src={filePreviews.incomeCertificate} alt="Income Certificate Preview" className="h-32 w-auto border rounded" />
                      ) : formData.incomeCertificate.type === "application/pdf" ? (
                        <embed src={filePreviews.incomeCertificate} type="application/pdf" className="h-32 w-full border rounded" />
                      ) : (
                        <span className="text-sm text-gray-500">No preview available</span>
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, incomeCertificate: null }))
                          setFilePreviews((prev) => ({ ...prev, incomeCertificate: null }))
                        }}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                </div>
                {/* Mool Niwas */}
                <div>
                  <Label htmlFor="moolNiwas">मूल निवास प्रमाण पत्र (Mool Niwas Certificate)</Label>
                  <Input id="moolNiwas" type="file" accept="image/*,.pdf" onChange={handleChange} />
                  {filePreviews.moolNiwas && formData.moolNiwas && (
                    <div className="mt-2 flex items-center gap-2">
                      {formData.moolNiwas.type.startsWith("image/") ? (
                        <img src={filePreviews.moolNiwas} alt="Mool Niwas Preview" className="h-32 w-auto border rounded" />
                      ) : formData.moolNiwas.type === "application/pdf" ? (
                        <embed src={filePreviews.moolNiwas} type="application/pdf" className="h-32 w-full border rounded" />
                      ) : (
                        <span className="text-sm text-gray-500">No preview available</span>
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, moolNiwas: null }))
                          setFilePreviews((prev) => ({ ...prev, moolNiwas: null }))
                        }}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                </div>
                {/* Photo */}
                <div>
                  <Label htmlFor="photo">फोटो (Photo)</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={handleChange} />
                  {filePreviews.photo && formData.photo && (
                    <div className="mt-2 flex items-center gap-2">
                      {formData.photo.type.startsWith("image/") ? (
                        <img src={filePreviews.photo} alt="Photo Preview" className="h-32 w-auto border rounded" />
                      ) : (
                        <span className="text-sm text-gray-500">No preview available</span>
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, photo: null }))
                          setFilePreviews((prev) => ({ ...prev, photo: null }))
                        }}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  रद्द करें
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "जोड़ रहा है..." : "आवेदन बनाएं"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
