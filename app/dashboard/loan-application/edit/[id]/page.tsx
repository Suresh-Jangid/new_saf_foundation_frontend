"use client"

import { useEffect, useState } from "react"
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
import { CalendarDays, X, FileText } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, post } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, formatDateForAPI, unwrapApiRecordById, getRecordField, getProxiedPhotoSrc } from "@/lib/utils"
import { RoleGuard } from "@/components/role-guard"

interface LoanApplicationRecord {
  id: string;
  date: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  address: string;
  reason: string;
  aadhaar?: string;
  incomeCertificate?: string;
  moolNiwas?: string;
  photo?: string;
  createdAt: string;
}

export default function EditLoanApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    date: "",
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

  // Use direct API call instead of useCRUD for better control
  const updateLoanApplication = async (id: string, data: any): Promise<boolean> => {
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          if (data[key] instanceof File) {
            formData.append(key, data[key]);
            console.log(`Adding file ${key}:`, data[key].name, data[key].size);
          } else {
            formData.append(key, String(data[key]));
            console.log(`Adding field ${key}:`, data[key]);
          }
        }
      });
      
      // Add the ID
      formData.append('id', id);
      console.log("Adding ID:", id);
      
      console.log("Sending update request to:", API_ENDPOINTS.UPDATE_LOAN_APPLICATION);
      console.log("FormData entries:", Array.from(formData.entries()));
      
      const response = await post(API_ENDPOINTS.UPDATE_LOAN_APPLICATION, formData);
      
      console.log("API Response:", response.data);
      
      if (response.data.status) {
        toast.success(response.data.message || "ऋण आवेदन सफलतापूर्वक अपडेट किया गया");
        return true;
      } else {
        throw new Error(response.data.message || "Failed to update record");
      }
    } catch (error: any) {
      console.error("Update error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update record";
      toast.error(errorMessage);
      return false;
    }
  };

  const getProxiedDocSrc = (url: string | null) => (url ? getProxiedPhotoSrc(url) : "");

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
      
      // Prepare submission data with proper file handling
        const submissionData: any = {
        date: formattedDate,
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        address: formData.address,
        reason: formData.reason,
      };

      // Handle files - use new files if uploaded, otherwise keep existing files
      if (formData.aadhaar) {
        submissionData.aadhaar = formData.aadhaar;
      } else if (existingFiles.aadhaar) {
        submissionData.existingAadhaar = existingFiles.aadhaar;
      } else {
        submissionData.existingAadhaar = "";
      }

      if (formData.incomeCertificate) {
        submissionData.incomeCertificate = formData.incomeCertificate;
      } else if (existingFiles.incomeCertificate) {
        submissionData.existingIncomeCertificate = existingFiles.incomeCertificate;
      } else {
        submissionData.existingIncomeCertificate = "";
      }

      if (formData.moolNiwas) {
        submissionData.moolNiwas = formData.moolNiwas;
      } else if (existingFiles.moolNiwas) {
        submissionData.existingMoolNiwas = existingFiles.moolNiwas;
      } else {
        submissionData.existingMoolNiwas = "";
      }

      if (formData.photo) {
        submissionData.photo = formData.photo;
      } else if (existingFiles.photo) {
        submissionData.existingPhoto = existingFiles.photo;
      } else {
        submissionData.existingPhoto = "";
      }
      
      console.log("Submitting data:", submissionData);
      
      const success = await updateLoanApplication(id, submissionData);
      
      if (success) {
        router.push("/dashboard/loan-application");
      }
    } catch (error) {
      console.error("Error updating loan application:", error);
      toast.error("ऋण आवेदन अपडेट करने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  }

  const [dateObj, setDateObj] = useState<Date | undefined>(undefined)
  const [dateOpen, setDateOpen] = useState(false)
  const [dateValue, setDateValue] = useState("")
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string | null }>({
    aadhaar: null,
    incomeCertificate: null,
    moolNiwas: null,
    photo: null,
  })

  const [existingFiles, setExistingFiles] = useState<{
    aadhaar: string | null
    incomeCertificate: string | null
    moolNiwas: string | null
    photo: string | null
  }>({
    aadhaar: null,
    incomeCertificate: null,
    moolNiwas: null,
    photo: null,
  })

  // Fetch loan application data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const params = new URLSearchParams();
        params.append("id", id);
        const response = await post("?apicall=getLoanApplications", params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (response.data?.status && response.data.data) {
          const record = unwrapApiRecordById<any>(response.data.data, id);
          if (!record) {
            toast.error("ऋण आवेदन डेटा नहीं मिला");
            router.push("/dashboard/loan-application");
            return;
          }

          const displayDate = formatDate(record.date || "");

          setFormData({
            date: displayDate,
            applicantName: record.applicantName || "",
            fatherName: record.fatherName || "",
            motherName: record.motherName || "",
            address: record.address || "",
            reason: record.reason || "",
            aadhaar: null,
            incomeCertificate: null,
            moolNiwas: null,
            photo: null,
          });

          setExistingFiles({
            aadhaar: getRecordField(record, "aadhaar", "aadhaarUrl", "aadhaar_url") || null,
            incomeCertificate:
              getRecordField(record, "incomeCertificate", "incomeCertificateUrl", "income_certificate") ||
              null,
            moolNiwas: getRecordField(record, "moolNiwas", "moolNiwasUrl", "mool_niwas") || null,
            photo: getRecordField(record, "photo", "photoUrl", "photo_url") || null,
          });

          if (displayDate) {
            const d = new Date(record.date);
            if (isValidDate(d)) {
              setDateObj(d);
              setDateValue(displayDate);
            }
          }
        } else {
          toast.error("ऋण आवेदन डेटा नहीं मिला");
          router.push("/dashboard/loan-application");
        }
      } catch (error) {
        console.error("Error fetching loan application data:", error);
        toast.error("ऋण आवेदन डेटा लोड करने में त्रुटि");
        router.push("/dashboard/loan-application");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, router]);

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

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      const response = await fetch('/api/generate-girl-loan-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            date: formData.date,
            applicantName: formData.applicantName,
            address: formData.address,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `girl_loan_${formData.applicantName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading loan application data...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="balika_loan_application" requiredAction="update">
      <div className="p-6 w-full">
        <div className="flex">
         <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()} >
            ← वापस जाएं / <br/>Go Back
          </Button>
        </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ऋण आवेदन संपादित करें</h1>
            <p className="text-sm text-gray-600">Edit Loan Application</p>
          </div>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Loan Application Details</CardTitle>
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
                <Label htmlFor="address">Village / गांव *</Label>
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
                  {filePreviews.aadhaar && formData.aadhaar ? (
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
                  ) : existingFiles.aadhaar ? (
                    <div className="mt-2 flex items-center gap-2">
                      {existingFiles.aadhaar.toLowerCase().includes('.pdf') ? (
                        <embed src={getProxiedDocSrc(existingFiles.aadhaar)} type="application/pdf" className="h-48 w-full border rounded" />
                      ) : (
                        <img src={getProxiedDocSrc(existingFiles.aadhaar)} alt="Aadhaar" className="h-32 w-auto border rounded" />
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => setExistingFiles((prev) => ({ ...prev, aadhaar: null }))}
                        aria-label="Remove"
                      />
                    </div>
                  ) : null}
                </div>
                {/* Income Certificate */}
                <div>
                  <Label htmlFor="incomeCertificate">आय प्रमाण पत्र (Income Certificate)</Label>
                  <Input id="incomeCertificate" type="file" accept="image/*,.pdf" onChange={handleChange} />
                  {filePreviews.incomeCertificate && formData.incomeCertificate ? (
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
                  ) : existingFiles.incomeCertificate ? (
                    <div className="mt-2 flex items-center gap-2">
                      {existingFiles.incomeCertificate.toLowerCase().includes('.pdf') ? (
                        <embed src={getProxiedDocSrc(existingFiles.incomeCertificate)} type="application/pdf" className="h-48 w-full border rounded" />
                      ) : (
                        <img src={getProxiedDocSrc(existingFiles.incomeCertificate)} alt="Income Certificate" className="h-32 w-auto border rounded" />
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => setExistingFiles((prev) => ({ ...prev, incomeCertificate: null }))}
                        aria-label="Remove"
                      />
                    </div>
                  ) : null}
                </div>
                {/* Mool Niwas */}
                <div>
                  <Label htmlFor="moolNiwas">मूल निवास प्रमाण पत्र (Mool Niwas Certificate)</Label>
                  <Input id="moolNiwas" type="file" accept="image/*,.pdf" onChange={handleChange} />
                  {filePreviews.moolNiwas && formData.moolNiwas ? (
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
                  ) : existingFiles.moolNiwas ? (
                    <div className="mt-2 flex items-center gap-2">
                      {existingFiles.moolNiwas.toLowerCase().includes('.pdf') ? (
                        <embed src={getProxiedDocSrc(existingFiles.moolNiwas)} type="application/pdf" className="h-48 w-full border rounded" />
                      ) : (
                        <img src={getProxiedDocSrc(existingFiles.moolNiwas)} alt="Mool Niwas" className="h-32 w-auto border rounded" />
                      )}
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => setExistingFiles((prev) => ({ ...prev, moolNiwas: null }))}
                        aria-label="Remove"
                      />
                    </div>
                  ) : null}
                </div>
                {/* Photo */}
                <div>
                  <Label htmlFor="photo">फोटो (Photo)</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={handleChange} />
                  {filePreviews.photo && formData.photo ? (
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
                  ) : existingFiles.photo ? (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={getProxiedDocSrc(existingFiles.photo)} alt="Photo" className="h-32 w-auto border rounded" />
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => setExistingFiles((prev) => ({ ...prev, photo: null }))}
                        aria-label="Remove"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGeneratingPDF ? "PDF बना रहा है..." : "PDF बनाएं"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  रद्द करें
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "अपडेट हो रहा है..." : "आवेदन अपडेट करें"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
