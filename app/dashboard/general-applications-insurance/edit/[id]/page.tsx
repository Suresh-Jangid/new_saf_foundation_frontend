"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
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
import { CalendarDays, CalendarIcon } from "lucide-react"
import APIService from "@/lib/services"
import { post } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getApplicantPhotoPath, getNomineePhotoPath, getProxiedPhotoSrc, getRecordField, unwrapApiRecordById } from "@/lib/utils"
import { PAYMENT_MODE, PAYMENT_MODE_OPTIONS, isRazorpayPaymentMode, GENDER_OPTIONS } from "@/lib/form-values"
import { formatBilingual } from '@/lib/translations'
import { RazorpayPayment } from "@/components/razorpay-payment"
import { useAgeCategory } from "@/hooks/use-age-category"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type GeneralApplicationFormData = {
  formNumber?: string;
  offlineFormNumber?: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  wifeName: string; // <-- Add this
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeAadhar?: string;
  nomineeMobile?: string;
  nomineePhoto?: File | null;
  existingNomineePhoto?: string;
  affidavit: string;
  selectedAgentId?: string;
  remarks: string;
  passportPhoto: File | null;
  existingPassportPhoto?: string; // Add this to store existing image URL
  gender: string;
  category: string;
  paymentAmount?: string;
  paymentMode?: string;
  paymentDate?: string;
};

// Remove local formatDate function - using imported one from utils
function isValidDate(date: Date | undefined) {
  if (!date) return false
  return !isNaN(date.getTime())
}

// Helper to calculate category based on gender and age
function calculateCategory(gender: string, age: number) {
  if (gender === "Female") {
    if (age >= 5 && age <= 10) return "A";
    if (age >= 11 && age <= 15) return "B";
    if (age >= 16) return "C";
  } else if (gender === "Male") {
    if (age >= 6 && age <= 12) return "A";
    if (age >= 13 && age <= 18) return "B";
    if (age >= 19) return "C";
  }
  return "";
}

export default function EditGeneralInsuranceApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [initialOfflineFormNumber, setInitialOfflineFormNumber] = useState<string>("")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const [formData, setFormData] = useState<GeneralApplicationFormData>({
    formNumber: "",
    offlineFormNumber: "",
    applicationDate: "",
    applicantName: "",
    fatherName: "",
    wifeName: "", // <-- Add this
    motherName: "",
    dateOfBirth: "",
    aadharNumber: "",
    gotra: "",
    mobile: "",
    address: "",
    pinCode: "",
    tehsil: "",
    district: "",
    state: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeAadhar: "",
    nomineeMobile: "",
    nomineePhoto: null,
    existingNomineePhoto: "",
    affidavit: "",
    selectedAgentId: "",
    remarks: "",
    passportPhoto: null,
    existingPassportPhoto: "",
    gender: "",
    category: "",
    paymentAmount: "",
    paymentMode: "",
    paymentDate: "",
  })

  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(
    formData.applicationDate ? new Date(formData.applicationDate) : undefined
  )
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState(
    formatDate(applicationDateObj as any)
  )

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(
    formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
  )
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    formatDate(dateOfBirthObj as any)
  )

  // Payment date state
  const [paymentDateObj, setPaymentDateObj] = useState<Date | undefined>(undefined)
  const [paymentDateOpen, setPaymentDateOpen] = useState(false)
  const [paymentDateValue, setPaymentDateValue] = useState("")

  // Payment status state
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending')
  const [paymentData, setPaymentData] = useState<any>(null)

  // Add fee and computedAge state
  const [category, setCategory] = useState("");
  const [fee, setFee] = useState("");
  const [computedAge, setComputedAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { age: calculatedAge, category: calculatedCategory, fee: calculatedFee } = useAgeCategory(formData.dateOfBirth);

  // Agents state
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Category calculation logic based on centralized A-F slabs
  useEffect(() => {
    if (!formData.dateOfBirth) {
      setCategory("");
      setFee("");
      setComputedAge("");
      setFormData((prev) => ({ ...prev, category: "" }));
      return;
    }
    setComputedAge(calculatedAge || "");
    setCategory(calculatedCategory || "");
    setFee(calculatedFee || "");
    setFormData((prev) => ({ ...prev, category: calculatedCategory || "" }));
  }, [formData.dateOfBirth, calculatedAge, calculatedCategory, calculatedFee]);

  useEffect(() => {
    const parseApiDate = (value?: string) => {
      if (!value) return undefined
      if (value.includes("-") && value.split("-")[0].length === 4) {
        return new Date(value)
      }
      return parseDateFromDDMMYYYY(value)
    }

    const loadData = async () => {
      if (!id) return;

      let fetchedAgents: Array<{ id: string; name: string }> = [];
      try {
        setInitialLoading(true);
        setIsLoadingAgents(true);
        const responseAgents = await post('?apicall=getAgents');
        const dataAgents = responseAgents.data;
        if (dataAgents.status && dataAgents.data) {
          fetchedAgents = dataAgents.data.map((agent: any) => ({
            id: String(agent.id),
            name: agent.name
          }));
          setAgents(fetchedAgents as any);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast.error("Failed to load agents");
      } finally {
        setIsLoadingAgents(false);
      }

      try {
        const response = await APIService.getInsuranceApplicationById(id)
        if (response.status && response.data) {
          const record = unwrapApiRecordById<any>(response.data, id)
          if (!record) {
            toast.error("Application not found")
            return
          }

          const applicationDate = getRecordField(record, "applicationDate", "application_date")
          const dateOfBirth = getRecordField(record, "dateOfBirth", "date_of_birth")
          const paymentDate = getRecordField(record, "paymentDate", "payment_date")
          const photoPath = getApplicantPhotoPath(record)

          // Try to match agent by name first, then by ID
          let agentId = "";
          const workerName = record.workerName || record.worker_name || record.added_name || (record.addedBy && record.addedBy.name) || "";
          if (workerName && fetchedAgents.length > 0) {
            const agentByName = fetchedAgents.find(
              (a) => a.name === workerName
            );
            if (agentByName) agentId = String(agentByName.id);
          }
          if (!agentId) {
            agentId = getRecordField(
              record,
              "addedById",
              "addedby_id",
              "selectedAgentId"
            ) || (record.addedBy?.id != null ? String(record.addedBy.id) : "");
          }

          if (agentId && !fetchedAgents.some(a => String(a.id) === agentId)) {
            const nameToUse = workerName || "Admin";
            fetchedAgents.push({ id: agentId, name: nameToUse });
            setAgents([...fetchedAgents] as any);
          }

          const gender = getRecordField(record, "gender")
          const fatherNameVal = getRecordField(record, "fatherName", "father_name") || ""
          let wifeNameVal = getRecordField(record, "wifeName", "wife_name") || ""

          if (gender === "Female" && !wifeNameVal && fatherNameVal) {
            wifeNameVal = fatherNameVal;
          }

          const offNo = getRecordField(record, "offlineFormNumber", "offline_form_number", "offlineFormNo") || ""
          setInitialOfflineFormNumber(offNo)

          const nomineePhotoPath = getNomineePhotoPath(record)
          const nomineeAadhar = getRecordField(record, "nomineeAadhar", "nominee_aadhar", "nomineeAadhaar", "nominee_aadhaar")
          const nomineeMobile = getRecordField(record, "nomineeMobile", "nominee_mobile")

          setFormData({
            formNumber: getRecordField(record, "formNumber", "form_number"),
            offlineFormNumber: offNo,
            applicationDate,
            applicantName: getRecordField(record, "applicantName", "applicant_name"),
            fatherName: gender === "Female" ? "" : fatherNameVal,
            wifeName: wifeNameVal,
            motherName: getRecordField(record, "motherName", "mother_name"),
            dateOfBirth,
            aadharNumber: getRecordField(record, "aadharNumber", "aadhar_number"),
            gotra: getRecordField(record, "gotra"),
            mobile: getRecordField(record, "mobile"),
            address: getRecordField(record, "address"),
            pinCode: getRecordField(record, "pinCode", "pin_code"),
            tehsil: getRecordField(record, "tehsil"),
            district: getRecordField(record, "district"),
            state: getRecordField(record, "state"),
            nomineeName: getRecordField(record, "nomineeName", "nominee_name"),
            nomineeRelation: getRecordField(record, "nomineeRelation", "nominee_relation"),
            nomineeAadhar,
            nomineeMobile,
            nomineePhoto: null,
            existingNomineePhoto: nomineePhotoPath,
            affidavit: getRecordField(record, "affidavit", "affidavitUrl"),
            selectedAgentId: agentId,
            remarks: getRecordField(record, "remarks"),
            passportPhoto: null,
            existingPassportPhoto: photoPath,
            gender,
            category: getRecordField(record, "category"),
            paymentAmount: getRecordField(record, "paymentAmount", "payment_amount"),
            paymentMode: getRecordField(record, "paymentMode", "payment_mode"),
            paymentDate,
          })

          const appDate = parseApiDate(applicationDate)
          setApplicationDateObj(appDate)
          setApplicationDateValue(appDate ? formatDate(appDate) : "")

          const dobDate = parseApiDate(dateOfBirth)
          setDateOfBirthObj(dobDate)
          setDateOfBirthValue(dobDate ? formatDate(dobDate) : "")

          if (paymentDate) {
            const payDate = parseApiDate(paymentDate)
            setPaymentDateObj(payDate)
            setPaymentDateValue(payDate ? formatDate(payDate) : "")
          }

          if (isRazorpayPaymentMode(getRecordField(record, "paymentMode", "payment_mode")) && getRecordField(record, "paymentAmount", "payment_amount")) {
            setPaymentStatus("paid")
          }
        } else {
          toast.error(response.message || "Failed to load application")
        }
      } catch (error) {
        toast.error("Failed to load application data")
      } finally {
        setInitialLoading(false)
      }
    }

    loadData()
  }, [id])

  const executeSubmit = async () => {
    setConfirmDialogOpen(false)
    try {
      setLoading(true)
      if (!formData.selectedAgentId) {
        toast.error("कृपया कार्यकर्ता का नाम चुनें / Please select a worker")
        setLoading(false)
        return
      }

      const mobileDigits = (formData.mobile || "").replace(/\D/g, "")
      const aadharDigits = (formData.aadharNumber || "").replace(/\D/g, "")
      const nomineeAadharDigits = (formData.nomineeAadhar || "").replace(/\D/g, "")
      const nomineeMobileDigits = (formData.nomineeMobile || "").replace(/\D/g, "")

      const updateData = {
        applicationDate: formatDateForAPI(applicationDateObj),
        offlineFormNumber: formData.offlineFormNumber ? formData.offlineFormNumber.trim() : "",
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        wifeName: formData.wifeName,
        motherName: formData.motherName,
        dateOfBirth: formatDateForAPI(dateOfBirthObj),
        aadharNumber: aadharDigits,
        gotra: formData.gotra,
        mobile: mobileDigits,
        address: formData.address,
        pinCode: formData.pinCode,
        tehsil: formData.tehsil,
        district: formData.district,
        state: formData.state,
        nomineeName: formData.nomineeName,
        nomineeRelation: formData.nomineeRelation,
        nomineeAadhar: nomineeAadharDigits,
        nomineeMobile: nomineeMobileDigits,
        gender: formData.gender,
        category: formData.category || category,
        selectedAgentId: formData.selectedAgentId,
        passportPhoto: formData.passportPhoto ?? undefined,
        existingPassportPhoto:
          !formData.passportPhoto && formData.existingPassportPhoto
            ? formData.existingPassportPhoto
            : undefined,
        nomineePhoto: formData.nomineePhoto ?? undefined,
        existingNomineePhoto:
          !formData.nomineePhoto && formData.existingNomineePhoto
            ? formData.existingNomineePhoto
            : undefined,
      }
      const response = await APIService.updateInsuranceApplication(id, updateData)
      if (response.status) {
        toast.success("Application updated successfully")
        router.push("/dashboard/general-applications-insurance")
      } else {
        toast.error(response.message || "Failed to update application")
      }
    } catch (error: any) {
      console.error("Error updating application:", error)
      if (error?.response?.status === 409 || error?.status === 409) {
        toast.error(
          error.response?.data?.message ||
          "यह ऑफलाइन फॉर्म नंबर पहले ही किसी अन्य रिकॉर्ड में उपयोग में है। कृपया दूसरा नंबर चुनें।"
        )
      } else {
        toast.error(error.response?.data?.message || error.message || "Failed to update application")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.selectedAgentId) {
      toast.error("कृपया कार्यकर्ता का नाम चुनें / Please select a worker")
      return
    }

    const currentOffline = (formData.offlineFormNumber || "").trim()
    const initialOffline = (initialOfflineFormNumber || "").trim()

    if (currentOffline !== initialOffline) {
      setConfirmDialogOpen(true)
    } else {
      executeSubmit()
    }
  }

  const handlePaymentSuccess = useCallback((paymentData: any) => {
    setPaymentStatus('paid')
    setPaymentData(paymentData)
    setFormData((prev) => ({
      ...prev,
      paymentAmount: String(paymentData.amount),
      paymentMode: PAYMENT_MODE.RAZORPAY,
      paymentDate: new Date().toISOString().split('T')[0],
    }))
    setPaymentDateObj(new Date())
    setPaymentDateValue(formatDate(new Date()))
    toast.success("Payment completed successfully!")
  }, [])

  const handlePaymentError = useCallback((error: any) => {
    setPaymentStatus('failed')
    console.error('Payment error:', error)
    toast.error(error.message || "Payment failed. Please try again.")
  }, [])

  const paymentModeOptions = PAYMENT_MODE_OPTIONS.filter(
    (option) =>
      option.value === PAYMENT_MODE.CASH || option.value === PAYMENT_MODE.RAZORPAY
  ).map((option) => ({ value: option.value, label: option.label }))

  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading application data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="flex ">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()}>
            ← वापस जाएं / <br/>Go Back
          </Button>
        </div>
        <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900">बीमा हेतु सामान्य संपादित करें</h1>
        <p className="text-sm text-gray-600">Edit Insurance Bima Application</p>
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Insurance Bima Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* System Form Number and Offline Form Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
              <div>
                <Label htmlFor="formNumber">सिस्टम फॉर्म नं. / System Form No.</Label>
                <Input
                  id="formNumber"
                  value={formData.formNumber || "-"}
                  disabled
                  readOnly
                  className="bg-muted font-semibold text-gray-800 cursor-not-allowed mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  सिस्टम द्वारा जनरेटेड (संपादन योग्य नहीं)
                </p>
              </div>

              <div>
                <Label htmlFor="offlineFormNumber">ऑफलाइन फॉर्म नं. / Offline Form No.</Label>
                <Input
                  id="offlineFormNumber"
                  name="offlineFormNumber"
                  value={formData.offlineFormNumber || ""}
                  placeholder="उदा. 1259"
                  maxLength={50}
                  className="bg-background font-medium mt-1"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      offlineFormNumber: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  भौतिक फॉर्म संख्या (वैकल्पिक) / Physical offline form number
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  gap-4">

              <div>
                <Label htmlFor="applicationDate">आवेदन तिथि / Application Date</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="applicationDate"
                    value={applicationDateValue}
                    placeholder="01 June, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const value = e.target.value
                      setApplicationDateValue(value)
                      const parsed = parseDateFromDDMMYYYY(value) || undefined
                      if (parsed) {
                        setApplicationDateObj(parsed)
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: formatDateForAPI(parsed),
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
                  />
                  <Popover open={applicationDateOpen} onOpenChange={setApplicationDateOpen}>
                    <PopoverTrigger asChild>

                    <Button
                          id="applicationDate-picker"
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
                        selected={applicationDateObj}
                        captionLayout="dropdown"
                        month={applicationDateObj}
                        onMonthChange={setApplicationDateObj}
                        onSelect={(date:any) => {
                          setApplicationDateObj(date)
                          setApplicationDateValue(formatDate(date))
                          setFormData((prev) => ({
                            ...prev,
                            applicationDate: date
                              ? formatDateForAPI(date)
                              : "",
                          }))
                          setApplicationDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">जन्म तिथि / Date of Birth</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="dateOfBirth"
                    value={dateOfBirthValue}
                    placeholder="01 June, 2000"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const value = e.target.value
                      setDateOfBirthValue(value)
                      const parsed = parseDateFromDDMMYYYY(value) || undefined
                      if (parsed) {
                        setDateOfBirthObj(parsed)
                        setFormData((prev) => ({
                          ...prev,
                          dateOfBirth: formatDateForAPI(parsed),
                        }))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setDateOfBirthOpen(true)
                      }
                    }}
                    required
                  />
                  <Popover open={dateOfBirthOpen} onOpenChange={setDateOfBirthOpen}>
                    <PopoverTrigger asChild>

                      <Button
                          id="dateOfBirth-picker"
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
                        selected={dateOfBirthObj}
                        captionLayout="dropdown"
                        month={dateOfBirthObj}
                        onMonthChange={setDateOfBirthObj}
                        onSelect={(date:any) => {
                          setDateOfBirthObj(date)
                          setDateOfBirthValue(formatDate(date))
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: date
                              ? formatDateForAPI(date)
                              : "",
                          }))
                          setDateOfBirthOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="applicantName">आवेदक का नाम / Applicant Name</Label>
                <Input
                  id="applicantName"
                  value={formData.applicantName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicantName: e.target.value }))}
                  placeholder="आवेदक का नाम दर्ज करें"
                  required
                />
              </div>
            </div>

            {/* Gender field */}
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="gender">लिंग / Gender</Label>
                <select
                  id="gender"
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.gender}
              onChange={(e) => {
                const selectedGender = e.target.value
                setFormData((prev) => ({
                  ...prev,
                  gender: selectedGender,
                  // Reset fatherName for females
                  fatherName: selectedGender === "Female" ? "" : prev.fatherName,
                }))
              }}
              required
            >
              <option value="">लिंग चुनें / Select Gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {formData.gender === "Female" ? (
            <div>
              <Label htmlFor="wifeName">पति का नाम / Wife of</Label>
              <Input
                id="wifeName"
                value={formData.wifeName}
                onChange={(e) => setFormData((prev) => ({ ...prev, wifeName: e.target.value }))}
                placeholder="पति का नाम दर्ज करें"
                required
              />
            </div>
          ) : formData.gender === "Male" ? (
            <>
              <div>
                <Label htmlFor="fatherName">पिता का नाम / Son of</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="पिता का नाम दर्ज करें"
                  required
                />
              </div>
              <div>
                <Label htmlFor="wifeName">पत्नी का नाम / Wife Name</Label>
                <Input
                  id="wifeName"
                  value={formData.wifeName || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, wifeName: e.target.value }))}
                  placeholder="पत्नी का नाम दर्ज करें"
                />
              </div>
            </>
          ) : (
            <div />
          )}

              {/* Category and Fee display */}
              <div className="mt-1">
                <Label htmlFor="category">श्रेणी / Category</Label>
                <Input
                  id="category"
                  type="text"
                  value={formData.category}
                  placeholder="श्रेणी / Category"
                  readOnly
                />
              </div>
              <div className="mt-1">
                <Label htmlFor="fee">शुल्क / Fee</Label>
                <Input
                  id="fee"
                  type="text"
                  value={fee}
                  placeholder="शुल्क / Fee"
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="motherName">माता का नाम / Mother's Name</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motherName: e.target.value }))}
                  placeholder="माता का नाम दर्ज करें"
                  required
                />
              </div>

              <div>
                <Label htmlFor="computedAge">आयु / Age</Label>
                <Input
                  id="computedAge"
                  type="text"
                  value={computedAge}
                  placeholder="आयु / Age"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1  md:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="aadharNumber">आधार संख्या / Aadhar Number</Label>
                <Input
                  id="aadharNumber"
                  value={formData.aadharNumber}
                  type="number"
                  onChange={(e) =>{
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                    setFormData((prev) => ({ ...prev, aadharNumber: e.target.value }))
                  }}
                  placeholder="आधार संख्या दर्ज करें"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gotra">गोत्र / Gotra</Label>
                <Input
                  id="gotra"
                  value={formData.gotra}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gotra: e.target.value }))}
                  placeholder="गोत्र दर्ज करें"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1  md:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर / Mobile Number</Label>
                <Input
                  id="mobile"
                  type="number"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={(e) =>
                  {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData((prev) => ({ ...prev, mobile: digits }))
                  }}
                  placeholder="मोबाइल नंबर दर्ज करें"
                  required
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
                />
              </div>
            </div>

            <div className="grid grid-cols-1  md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="pinCode">पिन कोड / Pin Code</Label>
                <Input
                  id="pinCode"
                  type="number"
                  inputMode="numeric"
                  value={formData.pinCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pinCode: e.target.value }))}
                  placeholder="पिन कोड दर्ज करें"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tehsil">तहसील / Tehsil</Label>
                <Input
                  id="tehsil"
                  value={formData.tehsil}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tehsil: e.target.value }))}
                  placeholder="तहसील दर्ज करें"
                  required
                />
              </div>
              <div>
                <Label htmlFor="district">जिला / District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="जिला दर्ज करें"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">राज्य / State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="राज्य दर्ज करें"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1  md:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="nomineeName">नॉमिनी का नाम / Nominee Name</Label>
                <Input
                  id="nomineeName"
                  value={formData.nomineeName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nomineeName: e.target.value }))}
                  placeholder="नॉमिनी का नाम दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="nomineeRelation">नामित व्यक्ति से संबंध / Nominee Relation</Label>
                <Input
                  id="nomineeRelation"
                  value={formData.nomineeRelation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nomineeRelation: e.target.value }))}
                  placeholder="संबंध दर्ज करें"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nomineeAadhar">नॉमिनी आधार संख्या / Nominee Aadhaar Number</Label>
                <Input
                  id="nomineeAadhar"
                  type="number"
                  inputMode="numeric"
                  value={formData.nomineeAadhar || ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 12)
                    setFormData((prev) => ({ ...prev, nomineeAadhar: digits }))
                  }}
                  placeholder="नॉमिनी आधार संख्या दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="nomineeMobile">नॉमिनी मोबाइल नंबर / Nominee Mobile Number</Label>
                <Input
                  id="nomineeMobile"
                  type="number"
                  inputMode="numeric"
                  value={formData.nomineeMobile || ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setFormData((prev) => ({ ...prev, nomineeMobile: digits }))
                  }}
                  placeholder="नॉमिनी मोबाइल नंबर दर्ज करें"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="selectedAgentId">कार्यकर्ता का नाम / Worker Name</Label>
              <select
                id="selectedAgentId"
                className="w-full border rounded px-3 py-2 mt-1"
                value={formData.selectedAgentId || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, selectedAgentId: e.target.value }))}
                required
                disabled={isLoadingAgents}
              >
                <option value="">कार्यकर्ता चुनें / Select Worker</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {isLoadingAgents && (
                <p className="text-sm text-gray-500 mt-1">Loading agents...</p>
              )}
            </div>

            <div>
              <Label htmlFor="affidavit">शपथ पत्र / Affidavit</Label>
              <Textarea
                id="affidavit"
                value={formData.affidavit}
                onChange={(e) => setFormData((prev) => ({ ...prev, affidavit: e.target.value }))}
                placeholder="शपथ पत्र का विवरण दर्ज करें"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="remarks">टिप्पणी / Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="टिप्पणी दर्ज करें"
                rows={3}
              />
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passportPhoto">पासपोर्ट साइज रंगीन फोटो / Passport Size Color Photo</Label>
                <Input
                  id="passportPhoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passportPhoto: e.target.files?.[0] || null,
                    }))
                  }
                />
                {(formData.passportPhoto || formData.existingPassportPhoto) && (
                  <img
                    src={formData.passportPhoto ? URL.createObjectURL(formData.passportPhoto) : getProxiedPhotoSrc(formData.existingPassportPhoto)}
                    alt="पासपोर्ट फोटो प्रीव्यू"
                    className="mt-2 h-24 rounded border"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="nomineePhoto">नॉमिनी का फोटो / Nominee Photo</Label>
                <Input
                  id="nomineePhoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nomineePhoto: e.target.files?.[0] || null,
                    }))
                  }
                />
                {(formData.nomineePhoto || formData.existingNomineePhoto) && (
                  <img
                    src={formData.nomineePhoto ? URL.createObjectURL(formData.nomineePhoto) : getProxiedPhotoSrc(formData.existingNomineePhoto)}
                    alt="नॉमिनी फोटो प्रीव्यू"
                    className="mt-2 h-24 rounded border"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                रद्द करें
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "आवेदन अपडेट करें"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Offline Form Number changes */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>फॉर्म संख्या पुष्टि / Confirm Offline Form Number</AlertDialogTitle>
            <AlertDialogDescription>
              {formData.offlineFormNumber?.trim() ? (
                <>
                  ऑफलाइन फॉर्म नं. <span className="font-bold text-primary">{(formData.offlineFormNumber || "").trim()}</span> सही है?
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Is this offline form number correct? Click Confirm to save.
                  </span>
                </>
              ) : (
                <>
                  क्या आप ऑफलाइन फॉर्म नंबर हटाना चाहते हैं?
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Are you sure you want to remove the offline form number? Click Confirm to proceed.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>रद्द करें / Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSubmit}
              className="bg-primary hover:bg-primary/90"
            >
              हाँ, सही है / Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
