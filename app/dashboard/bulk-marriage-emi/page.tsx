"use client"

import { useState, useEffect } from "react"
import { DataTable } from "@/components/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RoleGuard } from "@/components/role-guard"
import { RazorpayPayment } from "@/components/razorpay-payment"
import { formatDate, getCurrentUserInfo } from "@/lib/utils"
import { Search, Filter, Download, User, Users, FileText, Send, CreditCard, Banknote, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { sendWhatsAppMessage, sendWhatsAppFile } from "@/lib/fireconnect-whatsapp-service"
import { post } from "@/lib/api";

interface Application {
  id: number
  formNumber: string
  fatherName: string
  gotra: string
  category: string
  address: string
  applicationDate: string
  applicantName: string
  gender: string
  emiAmount?: number
  mobile?: string
  phone?: string
}

interface Marriage {
  marriageNumber: string
  applicantName: string
  fatherName:string
  date: string
  payment_status: number
  filter_payment_status?: number
  filter_row_id?: any
  gender: string
  emiAmount?: number
  id:any;
  village:any;
  tehsil?:any;
  pdf_created?: number;
}

interface ApiResponse {
  success: boolean
  applications: Application[]
  marriages: Marriage[]
}

interface MarriageRecord {
  id: any
  marriageNumber: string
  marriageUserName: string
  marriageUserFatherName: string
  dateOfMarriage: string
  userId: string
  emiAmount: any
  emiStatus: string
  selected?: boolean
  filter_row_id?: any
  pdf_created?: number
  tehsil?: any
}

const convertToYYYYMMDD = (date: Date | null): string => {
  if (!date) return "";
  
  if (isNaN(date.getTime())) return "";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default function BulkMarriageEMIPage() {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [userId, setUserId] = useState("")
  const [filteredMarriageRecords, setFilteredMarriageRecords] = useState<MarriageRecord[]>([]) 
  const [completedMarriageRecords, setCompletedMarriageRecords] = useState<MarriageRecord[]>([])
  const [filteredUserDetails, setFilteredUserDetails] = useState<Application[]>([])
  const [selectedMarriageRecords, setSelectedMarriageRecords] = useState<string[]>([])
  const [selectedCompletedMarriageRecords, setSelectedCompletedMarriageRecords] = useState<string[]>([])
  const [showUserData, setShowUserData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [paymentMode, setPaymentMode] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending')
  const [paymentData, setPaymentData] = useState<any>(null)

  const pendingColumns = [
    {
      key: "selected",
      label: "चयन करें / Select",
      render: (value: boolean, record: MarriageRecord) => (
        <Checkbox
          checked={selectedMarriageRecords.includes(record.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedMarriageRecords([...selectedMarriageRecords, record.id])
            } else {
              setSelectedMarriageRecords(selectedMarriageRecords.filter(id => id !== record.id))
            }
          }}
        />
      ),
    },
    {
      key: "marriageNumber",
      label: "विवाह संख्या / Marriage Number",
    },
    {
      key: "marriageUserName",
      label: "विवाह उपयोगकर्ता नाम / Marriage User Name",
    },
    {
      key: "marriageUserFatherName",
      label: "विवाह उपयोगकर्ता पिता का नाम / Marriage User Father Name",
    },
    {
      key: "dateOfMarriage",
      label: "विवाह की तारीख / Date of Marriage",
      render: (value: string) => formatDate(value),
    },   
   
    {
      key: "emiStatus",
      label: "ईएमआई स्थिति / EMI Status",
      render: (value: string) => {
        const statusColors = {
          'Active': 'bg-green-100 text-green-800',
          'Pending': 'bg-yellow-100 text-yellow-800',
          'Completed': 'bg-blue-100 text-blue-800',
          'Defaulted': 'bg-red-100 text-red-800'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        )
      },
    },
  ]

  const completedColumns = [
    {
      key: "selected",
      label: "चयन करें / Select",
      render: (value: boolean, record: MarriageRecord) => (
        <Checkbox
          checked={selectedCompletedMarriageRecords.includes(record.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedCompletedMarriageRecords([...selectedCompletedMarriageRecords, record.id])
            } else {
              setSelectedCompletedMarriageRecords(selectedCompletedMarriageRecords.filter(id => id !== record.id))
            }
          }}
        />
      ),
    },
    {
      key: "marriageNumber",
      label: "विवाह संख्या / Marriage Number",
    },
    {
      key: "marriageUserName",
      label: "विवाह उपयोगकर्ता नाम / Marriage User Name",
    },
    {
      key: "marriageUserFatherName",
      label: "विवाह उपयोगकर्ता पिता का नाम / Marriage User Father Name",
    },
    {
      key: "dateOfMarriage",
      label: "विवाह की तारीख / Date of Marriage",
      render: (value: string) => formatDate(value),
    },   
    {
      key: "emiStatus",
      label: "ईएमआई स्थिति / EMI Status",
      render: (value: string) => {
        const statusColors = {
          'Active': 'bg-green-100 text-green-800',
          'Pending': 'bg-yellow-100 text-yellow-800',
          'Completed': 'bg-blue-100 text-blue-800',
          'Defaulted': 'bg-red-100 text-red-800'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        )
      },
    },
    {
      key: "pdf_created",
      label: "पीडीएफ जेनरेशन स्थिति / PDF Generation Status",
      render: (value: number, record: MarriageRecord) => {
        const pdfStatus = record.pdf_created ?? 0
        const statusColors = {
          1: 'bg-green-100 text-green-800',
          0: 'bg-gray-100 text-gray-800'
        }
        const statusText = {
          1: 'Generated',
          0: 'Not Generated'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[pdfStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
            {statusText[pdfStatus as keyof typeof statusText] || 'Unknown'}
          </span>
        )
      },
    },
  ]


  const fetchBulkData = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a User ID to fetch data")
      return
    }

          setLoading(true)
      try {
        const formData = new FormData()
        formData.append('userId', userId.trim())
        
        // Only append dates if they have values
        if (startDate) {
          const formattedStartDate = convertToYYYYMMDD(startDate)
          console.log('Start Date:', startDate, 'Formatted:', formattedStartDate)
          formData.append('fromDate', formattedStartDate)
        }
        
        if (endDate) {
          const formattedEndDate = convertToYYYYMMDD(endDate)
          console.log('End Date:', endDate, 'Formatted:', formattedEndDate)
          formData.append('toDate', formattedEndDate)
        }

        const response = await post('?apicall=getUserData', formData)

      const data: ApiResponse = response.data

      if (data.success) {
        // Transform API data to match our existing structure
        const transformedMarriagesAll: MarriageRecord[] = data.marriages.map((marriage, index) => ({
          id: marriage?.id,
          marriageNumber: marriage.marriageNumber,
          marriageUserName: marriage.applicantName,
          marriageUserFatherName: marriage.fatherName, // Not provided in API
          dateOfMarriage: marriage.date,
          userId: userId.trim(),
          emiAmount: marriage.emiAmount, // Default value as not provided in API
          // Treat filter_payment_status === 1 as previously submitted (completed). Ignore payment_status for status derivation.
          emiStatus: (marriage.filter_payment_status === 1) ? "Completed" : "Pending",
          selected: false,
          filter_row_id: marriage.filter_row_id,
          pdf_created: marriage.pdf_created ?? 0,
          tehsil: marriage.tehsil
        }))

        // Split into pending and completed lists
        const pendingMarriages = transformedMarriagesAll.filter(m => m.emiStatus !== 'Completed')
        const completedMarriages = transformedMarriagesAll
          .filter(m => m.emiStatus === 'Completed')
          .map((m, idx) => ({ 
            ...m, 
            id: `completed-${idx}`,
            // Preserve original database ID in filter_row_id if not already set
            filter_row_id: m.filter_row_id ?? m.id
          }))

        setFilteredMarriageRecords(pendingMarriages)
        setCompletedMarriageRecords(completedMarriages)
        setFilteredUserDetails(data.applications)
        setSelectedCompletedMarriageRecords([])
        setShowUserData(true)

        // toast.success(`Found ${data.applications.length} application(s) and ${data.marriages.length} marriage record(s)`)
      } else {
        toast.error("No data found for the entered criteria")
        setFilteredMarriageRecords([])
        setFilteredUserDetails([])
        setShowUserData(false)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error("Error fetching data. Please try again.")
      setFilteredMarriageRecords([])
      setFilteredUserDetails([])
      setShowUserData(false)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setUserId("")
    setFilteredMarriageRecords([])
    setFilteredUserDetails([])
    setSelectedMarriageRecords([])
    setSelectedCompletedMarriageRecords([])
    setCompletedMarriageRecords([])
    setShowUserData(false)
    setPaymentMode("")
    setPaymentStatus('pending')
    setPaymentData(null)
    toast.success("Filters cleared")
  }

  
  const selectAllMarriageRecords = (checked: boolean) => {
    if (checked) {
      // Only select records that are not completed (not disabled)
      const selectableRecords = filteredMarriageRecords.filter(record => record.emiStatus !== 'Completed')
      setSelectedMarriageRecords(selectableRecords.map(record => record.id))
    } else {
      setSelectedMarriageRecords([])
    }
  }

  const selectAllCompletedMarriageRecords = (checked: boolean) => {
    if (checked) {
      setSelectedCompletedMarriageRecords(completedMarriageRecords.map(record => record.id))
    } else {
      setSelectedCompletedMarriageRecords([])
    }
  }


  // Get marriage records for a specific user
  const getMarriageRecordsForUser = (userId: string) => {
    return [...filteredMarriageRecords, ...completedMarriageRecords].filter(record => record.userId === userId)
  }

  // Calculate total payment amount for selected records
  const calculateTotalAmount = () => {
    const selectedRecords = filteredMarriageRecords.filter(record => 
      selectedMarriageRecords.includes(record.id)
    )
    return selectedRecords.reduce((total, record) => total + (record.emiAmount || 0), 0)
  }

  // Payment success handler
  const handlePaymentSuccess = (paymentData: any) => {
    setPaymentStatus('paid')
    setPaymentData(paymentData)
    // toast.success('Payment completed successfully!')
  }

  // Payment error handler
  const handlePaymentError = (error: any) => {
    setPaymentStatus('failed')
    setPaymentData(null)
    console.error('Payment error:', error)
  }

  const handleSubmit = async () => {
    if (selectedMarriageRecords.length === 0) {
      toast.error("Please select at least one marriage record to submit")
      return
    }

    if (!filteredUserDetails.length) {
      toast.error("User details not found. Please fetch data first.")
      return
    }

    if (!paymentMode) {
      toast.error("Please select a payment mode to complete the application")
      return
    }

    // For Razorpay, check if payment is completed
    if (paymentMode === 'razorpay' && paymentStatus !== 'paid') {
      toast.error("Please complete the Razorpay payment before submitting")
      return
    }

    // Prevent duplicate calls
    if (submitting) {
      return
    }

    setSubmitting(true)
    try {
      const selectedRecords = filteredMarriageRecords.filter(record => 
        selectedMarriageRecords.includes(record.id)
      )

      // Get the application ID from user details (assuming all records belong to same application)
      const applicationId = filteredUserDetails[0].id

      // Get current user info for addedby fields
      const { addedby, addedby_id } = getCurrentUserInfo();

      // Prepare data according to API requirements
      const apiData = {
        application_id: applicationId,
        payment_mode: paymentMode,
       
        payment_data: paymentMode === 'razorpay' ? paymentData : null,
        data: selectedRecords.map(record => ({
        //   filter_row_id: record.filter_row_id,
        //   payment_status: 1,
         addedby: addedby,
        addedby_id: addedby_id,
          id:record.id,
          pay_in_wedding_payment_status :1, // 1 for paid, 0 for pending
         
        }))
      }

      console.log("Submitting payment status update:", apiData)

      // Call the updatePaymentStatus API
      const response = await post('?apicall=updatePaymentStatus', apiData)

      const result = response.data
      
      if (result.status) {
        const { marriages_updated, marriages_failed, details } = result
        
        // Show single success toast
        toast.success(`Payment status updated successfully`)
        
        // Update local state for successfully updated records
        const updatedMarriageNumbers = details
          .filter((detail: any) => detail.status === 'updated')
          .map((detail: any) => detail.marriageNumber)
        
        // Move updated records from pending to completed list
        const movedRecords = filteredMarriageRecords
          .filter(r => updatedMarriageNumbers.includes(r.marriageNumber))
          .map(r => ({ ...r, emiStatus: 'Completed' }))

        setFilteredMarriageRecords(prev => prev.filter(r => !updatedMarriageNumbers.includes(r.marriageNumber)))
        if (movedRecords.length > 0) {
          setCompletedMarriageRecords(prev => [...prev, ...movedRecords.map((r, idx) => ({ ...r, id: `${r.id}-done-${idx}` }))])
        }
        
        // Clear selection and payment mode after successful submission
        setSelectedMarriageRecords([])
        setPaymentMode("")
        setPaymentStatus('pending')
        setPaymentData(null)
        
        // Refresh latest data from API (getUserData)
        await fetchBulkData()
        
        // Show error for failed records only (if any)
        if (marriages_failed > 0) {
          const failedRecords = details.filter((detail: any) => detail.status !== 'updated')
          if (failedRecords.length > 0) {
            toast.error(`Failed to update: ${failedRecords.map((r: any) => r.marriageNumber).join(', ')}`)
          }
        }
      } else {
        throw new Error(result.message || 'API returned unsuccessful response')
      }
    } catch (error:any) {
      console.error('Error updating payment status:', error)
      toast.error(`Failed to update payment status: ${error.message || 'Please try again.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePDF = async (source: 'pending' | 'completed' = 'pending') => {
    const selectedIds = source === 'pending' ? selectedMarriageRecords : selectedCompletedMarriageRecords
    if (selectedIds.length === 0) {
      toast.error("Please select at least one marriage record to generate PDF")
      return
    }

    setGeneratingPDF(true)
    try {
      const list = source === 'pending' ? filteredMarriageRecords : completedMarriageRecords
      const selectedRecords = list.filter(record => selectedIds.includes(record.id))

        // Determine gender from user details (assuming all records are for the same user)
        const userGender = filteredUserDetails.length > 0 ? filteredUserDetails[0].gender : 'Female'
        
        // Prepare data for PDF generation
        const pdfData = {
          userId: userId,
          startDate: startDate ? convertToYYYYMMDD(startDate) : '',
          endDate: endDate ? convertToYYYYMMDD(endDate) : '',
        totalRecords: selectedRecords.length,
        // User details
        applicantName: filteredUserDetails[0]?.applicantName || '',
        fatherName: filteredUserDetails[0]?.fatherName || '',
        gotra: filteredUserDetails[0]?.gotra || '',
        address: filteredUserDetails[0]?.address || '',
        category: filteredUserDetails[0]?.category || '',
        gender: filteredUserDetails[0]?.gender || '',
        emiAmount: filteredUserDetails[0]?.emiAmount || 0,
      
  
        marriages: selectedRecords.map(record => ({
          marriageNumber: record.marriageNumber,
          applicantName: record.marriageUserName,
          fatherName : record.marriageUserFatherName,
          date: record.dateOfMarriage,
          payment_status: record.emiStatus === 'Completed' ? 1 : 0,
          application_id: filteredUserDetails[0]?.id,
          gender: filteredUserDetails[0]?.gender?.toLowerCase(),
          emiAmount: record.emiAmount || 0,
          village: record.tehsil
        }))
      }

      console.log("Generating PDF with data:", JSON.stringify(pdfData, null, 2))
      console.log("Using gender template:", userGender)
      console.log("Selected marriage records:", selectedRecords)

      const response = await fetch('/api/generate-bulk-marriage-emi-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: pdfData,
          gender: userGender
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate appropriate filename based on gender
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      let filename = 'bulk_marriage_emi.pdf'
      
      if (userGender === 'Female' || userGender === 'महिला') {
        filename = `female_bulk_marriage_emi_${timestamp}.pdf`
      } else if (userGender === 'Male' || userGender === 'पुरुष') {
        filename = `male_bulk_marriage_emi_${timestamp}.pdf`
      } else {
        filename = `bulk_marriage_emi_${timestamp}.pdf`
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      // Get user mobile from filteredUserDetails
      const userMobile = filteredUserDetails[0]?.mobile || filteredUserDetails[0]?.phone;

      // Update PDF status
      try {
        const recordIds = selectedRecords
          .map(record => record.filter_row_id ?? record.id)
          .filter(id => id != null && !(typeof id === 'string' && id.startsWith('completed-')))
        
        if (recordIds.length > 0) {
          const updateResponse = await post('?apicall=updatePdfStatus', {
            ids: recordIds
          })
        }

        // Re-fetch the list data after updating PDF status
        await fetchBulkData()
      } catch (updateError) {
        console.error('Error updating PDF status:', updateError)
      }

      toast.success('PDF generated successfully')

      // --- WhatsApp Integration ---
      if (userMobile) {
        try {
          const applicantName = filteredUserDetails[0]?.applicantName || "Applicant";
          const message = `नमस्ते ${applicantName},\n\nपुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन मे विवाह योजना के तहत सहयोग (अनुदान)राशी देने के लिए आपका आभार \nअपनी रसीद प्राप्त करे\n     अधिक जानकारी हेतु संपर्क करे \nपीराराम तेनगरिया जसोल \n9413032072, 8209467238`;

          // Send Text
          await sendWhatsAppMessage(userMobile, message);
          toast.success("WhatsApp message sent successfully");

          // Send File
          const file = new File([blob], filename, { type: "application/pdf" });
          await sendWhatsAppFile(userMobile, file, `Bulk EMI Receipt`);
          toast.success("Receipt sent to WhatsApp successfully");

        } catch (waError) {
          console.error("WhatsApp integration error:", waError);
          toast.error("Failed to send WhatsApp message/file");
        }
      } else {
        console.warn("User mobile number not found, skipping WhatsApp send.");
        toast.warning("Mobile number not found, skipped WhatsApp send.");
      }

    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  return (
    <RoleGuard requiredModule="bulk_marriage_emi" requiredAction="view">
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">बल्क विवाह ईएमआई / Bulk Marriage EMI</h1>
          <p className="text-muted-foreground">Manage and view bulk marriage EMI records</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            फिल्टर / Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>प्रारंभ तिथि / Start Date</Label>
              <DatePicker
                id="startDate"
                value={startDate ? formatDate(startDate) : ""}
                onChange={(date) => setStartDate(date)}
                placeholder="dd-mm-yyyy"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>समाप्ति तिथि / End Date</Label>
              <DatePicker
                id="endDate"
                value={endDate ? formatDate(endDate) : ""}
                onChange={(date) => setEndDate(date)}
                placeholder="dd-mm-yyyy"
              />
            </div>

            {/* User ID */}
            <div className="space-y-2">
              <Label>उपयोगकर्ता आईडी / User ID</Label>
              <Input
                placeholder="Enter user ID, form number, or father name"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={fetchBulkData} 
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              {loading ? "Fetching..." : "Fetch Data"}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              फिल्टर साफ़ करें / Clear Filters
            </Button>
           
          </div>
        </CardContent>
      </Card>

      {/* User Details Card - Only show after applying filters */}
      {showUserData && filteredUserDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              उपयोगकर्ता विवरण / User Details ({filteredUserDetails.length} users found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUserDetails.map((user, index) => {
              const userMarriageRecords = getMarriageRecordsForUser(user.id.toString())
              return (
                <div key={user.id} className="space-y-6">
                  {index > 0 && <div className="border-t pt-6" />}
                  
                  {/* User Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        आवेदक का नाम / Applicant Name
                      </Label>
                      <p className="text-sm font-medium">{user.applicantName}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        फॉर्म संख्या / Form Number
                      </Label>
                      <p className="text-sm font-medium">{user.formNumber}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        पिता का नाम / Father Name
                      </Label>
                      <p className="text-sm font-medium">{user.fatherName}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        गोत्र / Gotra
                      </Label>
                      <p className="text-sm font-medium">{user.gotra}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        पता / Address
                      </Label>
                      <p className="text-sm font-medium">{user.address}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        उपयोगकर्ता श्रेणी / User Category
                      </Label>
                      <p className="text-sm font-medium">{user.category}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        लिंग / Gender
                      </Label>
                      <p className="text-sm font-medium">{user.gender}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        ईएमआई राशि / EMI Amount
                      </Label>
                      <p className="text-sm font-medium">₹{user.emiAmount?.toLocaleString('hi-IN') || '0'}</p>
                    </div>
                  </div>

                  {/* User's Marriage Records Summary */}
                  {userMarriageRecords.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        इस उपयोगकर्ता के विवाह रिकॉर्ड्स / Marriage Records for this User ({userMarriageRecords.length} records)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">कुल ईएमआई राशि / Total EMI Amount:</span>
                          <p className="font-medium">₹{userMarriageRecords.reduce((sum, record) => sum + record.emiAmount, 0).toLocaleString('hi-IN')}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">सक्रिय ईएमआई / Active EMIs:</span>
                          <p className="font-medium">{userMarriageRecords.filter(r => r.emiStatus === 'Active').length}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">लंबित ईएमआई / Pending EMIs:</span>
                          <p className="font-medium">{userMarriageRecords.filter(r => r.emiStatus === 'Pending').length}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">पूर्ण ईएमआई / Completed EMIs:</span>
                          <p className="font-medium">{userMarriageRecords.filter(r => r.emiStatus === 'Completed').length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Marriage Records Card - Only show after applying filters */}
      {showUserData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                विवाह रिकॉर्ड्स / Marriage Records ({filteredMarriageRecords.length} records found)
              </span>
              {filteredMarriageRecords.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={(() => {
                        const selectableRecords = filteredMarriageRecords.filter(record => record.emiStatus !== 'Completed')
                        return selectableRecords.length > 0 && selectedMarriageRecords.length === selectableRecords.length
                      })()}
                      onCheckedChange={selectAllMarriageRecords}
                    />
                    <span className="text-sm text-muted-foreground">
                      सभी चयन करें / Select All
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleGeneratePDF('pending')}
                    disabled={generatingPDF || selectedMarriageRecords.length === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="h-4 w-4" />
                    {generatingPDF ? "Generating PDF..." : "Generate PDF"}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMarriageRecords.length > 0 ? (
              <>
                <DataTable
                  data={filteredMarriageRecords}
                  columns={pendingColumns}
                  title=""
                  addNewUrl=""
                  addNewLabel=""
                  onDelete={() => {}}
                  editUrlPattern=""
                  searchFields={["marriageNumber", "marriageUserName", "marriageUserFatherName"]}
                  showAddButton={false}
                  showEditButton={false}
                  showDeleteButton={false}
                  showActionsColumn={false}
                />
                
                {/* Action Buttons for Selected Records */}
                {selectedMarriageRecords.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    {/* Payment Mode Selection */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">
                        भुगतान मोड चुनें / Select Payment Mode *
                      </Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="भुगतान मोड चुनें / Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              <span>नकद / Cash</span>
                            </div>
                          </SelectItem>
                          {/* <SelectItem value="bank_transfer">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span>बैंक ट्रांसफर / Bank Transfer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="upi">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              <span>यूपीआई / UPI</span>
                            </div>
                          </SelectItem> */}
                          <SelectItem value="razorpay">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span>राज़रपे / Razorpay</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Razorpay Payment Section */}
                    {paymentMode === 'razorpay' && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-blue-900">Online Payment</h3>
                            <p className="text-sm text-blue-700">
                              Pay ₹{calculateTotalAmount().toLocaleString('hi-IN')} securely using Razorpay
                            </p>
                            {paymentStatus === 'paid' && (
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                ✓ Payment completed successfully
                              </p>
                            )}
                            {paymentStatus === 'failed' && (
                              <p className="text-xs text-red-600 mt-1">
                                Payment failed. Please try again.
                              </p>
                            )}
                          </div>
                          <RazorpayPayment
                            amount={calculateTotalAmount()}
                            description={`Bulk Marriage EMI Payment - ${filteredUserDetails[0]?.applicantName || 'Applicant'}`}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                            disabled={submitting || !filteredUserDetails[0]?.applicantName || calculateTotalAmount() <= 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                          >
                            {paymentStatus === 'paid' ? 'Payment Completed' : `Pay ₹${calculateTotalAmount().toLocaleString('hi-IN')} Now`}
                          </RazorpayPayment>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={handleSubmit}
                        disabled={submitting || !paymentMode || (paymentMode === 'razorpay' && paymentStatus !== 'paid')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4" />
                        {submitting ? "Submitting..." : `Submit Selected (${selectedMarriageRecords.length})`}
                      </Button>
                    </div>
                    
                    <div className="mt-3 text-center text-sm text-muted-foreground">
                      <p>Selected {selectedMarriageRecords.length} record(s) for processing</p>
                      <p className="text-xs">PDF will be generated using {filteredUserDetails.length > 0 ? filteredUserDetails[0].gender : 'default'} template</p>
                      {paymentMode && (
                        <p className="text-xs text-green-600 font-medium">
                          Payment Mode: {paymentMode === 'cash' ? 'Cash' : 
                                        paymentMode === 'bank_transfer' ? 'Bank Transfer' :
                                        paymentMode === 'upi' ? 'UPI' : 'Razorpay'}
                          {paymentMode === 'razorpay' && paymentStatus === 'paid' && (
                            <span className="ml-2">✓ Payment Verified</span>
                          )}
                        </p>
                      )}
                      {paymentMode === 'razorpay' && (
                        <p className="text-xs text-blue-600 font-medium">
                          Total Amount: ₹{calculateTotalAmount().toLocaleString('hi-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No marriage records found for the entered criteria.</p>
                <p>Please check your search criteria and try again.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed Marriage Records Card */}
      {showUserData && completedMarriageRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                पूर्ण विवाह रिकॉर्ड्स / Completed Marriage Records ({completedMarriageRecords.length} records)
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={completedMarriageRecords.length > 0 && selectedCompletedMarriageRecords.length === completedMarriageRecords.length}
                    onCheckedChange={selectAllCompletedMarriageRecords}
                  />
                  <span className="text-sm text-muted-foreground">
                    सभी चयन करें / Select All
                  </span>
                </div>
                <Button 
                  onClick={() => handleGeneratePDF('completed')}
                  disabled={generatingPDF || selectedCompletedMarriageRecords.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="h-4 w-4" />
                  {generatingPDF ? "Generating PDF..." : `Generate PDF (${selectedCompletedMarriageRecords.length})`}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={completedMarriageRecords}
              columns={completedColumns}
              title=""
              addNewUrl=""
              addNewLabel=""
              onDelete={() => {}}
              editUrlPattern=""
              searchFields={["marriageNumber", "marriageUserName", "marriageUserFatherName"]}
              showAddButton={false}
              showEditButton={false}
              showDeleteButton={false}
              showActionsColumn={false}
            />
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {showUserData && filteredUserDetails.length === 0 && filteredMarriageRecords.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>No data found for the entered criteria.</p>
              <p>Please check your search criteria and try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </RoleGuard>
  )
}
