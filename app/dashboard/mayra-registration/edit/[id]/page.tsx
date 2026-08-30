"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter, useParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { post, API_ENDPOINTS, buildEditFormData, createFormData } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, parseDateFromDDMMYYYY, validatePhoneNumber, getApplicantPhotoPath, getNomineePhotoPath, getProxiedPhotoSrc, getRecordField, unwrapApiRecordById } from "@/lib/utils"
import { normalizePaymentModeInput, PAYMENT_MODE_OPTIONS, GENDER_OPTIONS } from "@/lib/form-values"
import { RoleGuard } from "@/components/role-guard"

const normalizeNomineeRelation = (relation?: string): string => {
  const r = (relation || "").trim()
  if (!r) return ""
  const lower = r.toLowerCase()
  if (r === "भांजा" || r === "भांजे" || lower === "bhanej" || lower === "bhanja" || lower === "bhanje") return "भांजा"
  if (r === "भांजी" || lower === "bhenji" || lower === "bhanji") return "भांजी"
  return r
}

export default function EditMayraRegistrationPage() {
  const router = useRouter()
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [agents, setAgents] = useState<Array<{ id: string; name: string; mobile?: string }>>([])

  const [formData, setFormData] = useState({
    applicationDate: "",
    formNumber: "",
    applicantName: "",
    parentName: "",
    motherName: "",
    dateOfBirth: "",
    age: "",
    gotra: "",
    address: "",
    aadharNumber: "",
    nomineeName: "",
    nomineeFathername: "",
    nomineeHusbandName: "",
    nomineeGotra: "",
    nomineeAddress: "",
    nomineeMobile: "",
    nomineeTehsil: "",
    nomineeDistrict: "",
    nomineeState: "",
    nomineePincode: "",
    nomineeRelation: "",
    selectedAgentId: "",
    affidavit: "",
    category: "",
    fee: "",
    paymentAmount: "",
    paymentMode: "",
    paymentDate: "",
    passportPhoto: null as File | null,
    nomineePassportPhoto: null as File | null,
    existingPassportPhoto: "",
    existingNomineePassportPhoto: "",
    gender: "",
  })

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true)
        // Fetch agents
        const agentsResponse = await post('?apicall=getAgents')
        const agentsData = agentsResponse.data
        let fetchedAgents: any[] = []
        if (agentsData.status && agentsData.data) {
          fetchedAgents = agentsData.data.map((agent: any) => ({
            id: String(agent.id),
            name: agent.name,
            mobile: agent.mobile
          }))
          setAgents(fetchedAgents)
        }

        // Fetch registration data
        const response = await post(API_ENDPOINTS.GET_MAYRA_APPLICATIONS, createFormData({ id }))
        if (response.data?.status && response.data?.data) {
          const record = unwrapApiRecordById<Record<string, unknown>>(response.data.data, id as string)
          
          if (record) {
            const firstInstallment = Array.isArray(record.installments)
              ? record.installments[0]
              : null

            // Match worker/agent by name first, then fall back to addedBy
            let agentId = "";
            const workerName = getRecordField(record, "workerName", "worker_name") || "";
            if (workerName) {
              const agentByName = fetchedAgents.find(
                (a) => a.name === workerName
              );
              if (agentByName) agentId = String(agentByName.id);
            }
            if (!agentId) {
              const addedBy = record.addedBy as { id?: string | number } | undefined;
              agentId = String(
                record.addedById || addedBy?.id || record.addedby_id || ""
              );
            }

            if (agentId && !fetchedAgents.some((a: any) => String(a.id) === agentId)) {
              const nameToUse = workerName || "Admin";
              fetchedAgents.push({ id: agentId, name: nameToUse, mobile: "" });
              setAgents([...fetchedAgents]);
            }

            setFormData({
              applicationDate: formatDate(String(record.applicationDate || "")),
              formNumber: getRecordField(record, "formNumber", "form_number", "sr_no"),
              applicantName: getRecordField(record, "applicantName", "applicant_name"),
              parentName: getRecordField(record, "fatherName", "father_name", "parentName", "parent_name"),
              motherName: getRecordField(record, "motherName", "mother_name"),
              dateOfBirth: formatDate(String(record.dateOfBirth || record.date_of_birth || "")),
              age: record.age != null ? String(record.age) : "",
              gotra: getRecordField(record, "gotra"),
              address: getRecordField(record, "address"),
              aadharNumber: getRecordField(record, "aadharNumber", "aadhar_number", "aadhaarNumber"),
              nomineeName: getRecordField(record, "nomineeName", "nominee_name"),
              nomineeFathername: getRecordField(
                record,
                "nomineeFatherName",
                "nomineeFathername",
                "nominee_father_name",
              ) || "",
              nomineeHusbandName: getRecordField(
                record,
                "nomineeHusbandName",
                "nomineeHusbandname",
                "nominee_husband_name",
              ) || "",
              nomineeGotra: getRecordField(record, "nomineeGotra", "nominee_gotra"),
              nomineeAddress: getRecordField(record, "nomineeAddress", "nominee_address"),
              nomineeMobile: getRecordField(record, "mobile", "nomineeMobile", "nominee_mobile"),
              nomineeTehsil: getRecordField(record, "tehsil", "nomineeTehsil", "nominee_tehsil"),
              nomineeDistrict: getRecordField(record, "district", "nomineeDistrict", "nominee_district"),
              nomineeState: getRecordField(record, "state", "nomineeState") || "Rajasthan",
              nomineePincode: getRecordField(record, "pinCode", "pincode", "nomineePincode", "nominee_pincode"),
              nomineeRelation: normalizeNomineeRelation(
                getRecordField(record, "nomineeRelation", "nominee_relation"),
              ),
              selectedAgentId: agentId,
              affidavit: getRecordField(record, "affidavit"),
              category: getRecordField(record, "category"),
              fee: record.totalAmount != null ? String(record.totalAmount) : "",
              paymentAmount:
                firstInstallment?.amount != null
                  ? String(firstInstallment.amount)
                  : record.paymentAmount != null
                    ? String(record.paymentAmount)
                    : "",
              paymentMode: normalizePaymentModeInput(
                String(firstInstallment?.paymentMode || record.paymentMode || ""),
              ),
              paymentDate: formatDate(
                String(firstInstallment?.date || record.paymentDate || ""),
              ),
              passportPhoto: null,
              nomineePassportPhoto: null,
              existingPassportPhoto:
                getApplicantPhotoPath(record) ||
                getRecordField(record, "passportPhoto", "passportPhotoUrl", "passport_photo"),
              existingNomineePassportPhoto:
                getNomineePhotoPath(record) ||
                getRecordField(
                  record,
                  "nomineePassportPhoto",
                  "nomineePhotoUrl",
                  "nomineePhoto",
                  "nominee_photo",
                ),
              gender: getRecordField(record, "gender"),
            })
            if (record.payment_status === 'completed' || record.is_paid === 1) {
              setPaymentStatus('paid');
              setPaymentData({ payment_id: record.razorpay_payment_id });
            }
          } else {
            toast.error('Registration not found')
            router.push('/dashboard/mayra-registration')
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [id])

  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return ""
    // If it's already in YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    
    const parsedDate = parseDateFromDDMMYYYY(dateString)
    if (!parsedDate) return ""
    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const calculateAge = (dob: string) => {
    if (!dob) return ""
    const birthDate = parseDateFromDDMMYYYY(dob)
    if (!birthDate) return ""
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age.toString()
  }

  useEffect(() => {
    if (formData.dateOfBirth) {
      const calculatedAge = calculateAge(formData.dateOfBirth)
      const ageNum = parseInt(calculatedAge, 10)
      
      let newCategory = ""
      let newFee = ""

      if (!isNaN(ageNum)) {
        if (ageNum >= 0 && ageNum <= 9) {
          newCategory = "A"
          newFee = "3000"
        } else if (ageNum >= 10 && ageNum <= 15) {
          newCategory = "B"
          newFee = "6000"
        } else if (ageNum >= 16 && ageNum <= 18) {
          newCategory = "C"
          newFee = "9000"
        } else if (ageNum >= 19) {
          newCategory = "D"
          newFee = "11000"
        }
      }

      setFormData(prev => ({ 
        ...prev, 
        age: calculatedAge,
        category: newCategory,
        fee: newFee
      }))
    }
  }, [formData.dateOfBirth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const aadharDigits = formData.aadharNumber.replace(/\D/g, '')
      if (aadharDigits.length !== 12) {
        toast.error('कृपया 12 अंकों का आधार नंबर दर्ज करें')
        setIsLoading(false)
        return
      }

      if (!validatePhoneNumber(formData.nomineeMobile)) {
        toast.error('कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें')
        setIsLoading(false)
        return
      }

      const nomineeMobile = formData.nomineeMobile.replace(/\D/g, "")
      const selectedAgent = agents.find((a) => a.id.toString() === formData.selectedAgentId)

      const apiFormData = buildEditFormData(id as string, {
        applicationDate: convertToYYYYMMDD(formData.applicationDate),
        applicantName: formData.applicantName,
        fatherName: formData.parentName,
        motherName: formData.motherName,
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        age: formData.age,
        gotra: formData.gotra,
        address: formData.address,
        aadharNumber: aadharDigits,
        mobile: nomineeMobile,
        pinCode: formData.nomineePincode,
        tehsil: formData.nomineeTehsil,
        district: formData.nomineeDistrict,
        nomineeName: formData.nomineeName,
        nomineeFatherName: formData.nomineeFathername,
        nomineeFathername: formData.nomineeFathername,
        nomineeHusbandName: formData.nomineeHusbandName,
        nomineeGotra: formData.nomineeGotra,
        nomineeAddress: formData.nomineeAddress,
        nomineeRelation: formData.nomineeRelation,
        gender: formData.gender,
        selectedAgentId: formData.selectedAgentId || undefined,
        workerName: selectedAgent?.name,
        workerMobile: (selectedAgent as { mobile?: string } | undefined)?.mobile,
        passportPhoto: formData.passportPhoto ?? undefined,
        nomineePassportPhoto: formData.nomineePassportPhoto ?? undefined,
        existingPassportPhoto:
          !formData.passportPhoto && formData.existingPassportPhoto
            ? formData.existingPassportPhoto
            : undefined,
        existingNomineePassportPhoto:
          !formData.nomineePassportPhoto && formData.existingNomineePassportPhoto
            ? formData.existingNomineePassportPhoto
            : undefined,
      })

      const response = await post(API_ENDPOINTS.UPDATE_MAYRA_APPLICATION, apiFormData)
      
      if (response.data.status) {
        toast.success("Mayra Registration updated successfully")
        router.push("/dashboard/mayra-registration")
      } else {
        toast.error(response.data.message || "Failed to update registration")
      }
    } catch (error: any) {
      console.error("Error updating registration:", error)
      toast.error(error.response?.data?.message || "Failed to update registration")
    } finally {
      setIsLoading(false)
    }
  }

  const [appDateOpen, setAppDateOpen] = useState(false)
  const [dobOpen, setDobOpen] = useState(false)

  const [paymentDateObj, setPaymentDateObj] = useState<Date | undefined>(undefined)
  const [paymentDateOpen, setPaymentDateOpen] = useState(false)

  const handlePaymentSuccess = (data: any) => {
    setPaymentStatus('paid');
    setPaymentData(data);
    setFormData(prev => ({
      ...prev,
      paymentAmount: formData.fee,
      paymentMode: 'razorpay',
      paymentDate: formatDate(new Date())
    }));
    toast.success('Payment completed successfully!');
  };

  const handlePaymentModeChange = (mode: string) => {
    setFormData(prev => ({ ...prev, paymentMode: mode }));
    if (mode === 'cash') {
      setPaymentStatus('pending');
      setPaymentData(null);
    }
  };

  const handlePaymentError = (error: any) => {
    setPaymentStatus('failed');
    console.error('Payment error:', error);
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    )
  }

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="update">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.back()}
                  className="p-0 h-auto"
                  disabled={isLoading}
                >
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">मायरा फॉर्म संपादित करें</h1>
                <p className="text-sm text-gray-600 mt-1">Edit Mayra Registration</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Applicant Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">भाणेज/भाणजी का विवरण (Applicant Details)</h2>
                
                {/* Row 1: Form No + same order as add (Date, Name, Gender) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>फॉर्म नं. / Form No.</Label>
                    <Input
                      readOnly
                      className="bg-gray-50 mt-1"
                      value={formData.formNumber}
                    />
                  </div>
                  <div>
                    <Label>आवेदन तिथि / Date</Label>
                    <div className="relative mt-1">
                      <Input
                        value={formData.applicationDate}
                        placeholder="dd-mm-yyyy"
                        onChange={e => setFormData(prev => ({ ...prev, applicationDate: e.target.value }))}
                      />
                      <Popover open={appDateOpen} onOpenChange={setAppDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={parseDateFromDDMMYYYY(formData.applicationDate) || undefined}
                            onSelect={(date: any) => {
                              setFormData(prev => ({ ...prev, applicationDate: formatDate(date) }))
                              setAppDateOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label>भाणेज/भाणजी का नाम</Label>
                    <Input
                      required
                      placeholder="नाम"
                      value={formData.applicantName}
                      onChange={e => setFormData(prev => ({ ...prev, applicantName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>लिंग / Gender</Label>
                    <select
                      required
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1"
                      value={formData.gender}
                      onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="" disabled>
                        लिंग चुनें / Select Gender
                      </option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Father + same order as add (Mother, DOB, Age, Category, Fee, Gotra, Aadhar) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>पुत्र/पुत्री (Son/Daughter of)</Label>
                    <Input
                      required
                      placeholder="पिता का नाम"
                      value={formData.parentName}
                      onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>माता का नाम</Label>
                    <Input
                      required
                      placeholder="माता का नाम"
                      value={formData.motherName}
                      onChange={e => setFormData(prev => ({ ...prev, motherName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>जन्म-तिथि (DOB)</Label>
                    <div className="relative mt-1">
                      <Input
                        required
                        placeholder="dd-mm-yyyy"
                        value={formData.dateOfBirth}
                        onChange={e => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      />
                      <Popover open={dobOpen} onOpenChange={setDobOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={parseDateFromDDMMYYYY(formData.dateOfBirth) || undefined}
                            captionLayout="dropdown"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            onSelect={(date: any) => {
                              setFormData(prev => ({ ...prev, dateOfBirth: formatDate(date) }))
                              setDobOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label>उम्र / Age</Label>
                    <Input
                      readOnly
                      className="bg-gray-50"
                      value={formData.age}
                    />
                  </div>

                  <div>
                    <Label>श्रेणी / Category</Label>
                    <Input
                      readOnly
                      placeholder="Category"
                      className="bg-gray-50"
                      value={formData.category}
                    />
                  </div>

                  <div>
                    <Label>शुल्क / Fee</Label>
                    <Input
                      readOnly
                      placeholder="Fee"
                      className="bg-gray-50"
                      value={formData.fee}
                    />
                  </div>

                  <div>
                    <Label>गोत्र / Gotra</Label>
                    <Input
                      required
                      placeholder="गोत्र"
                      value={formData.gotra}
                      onChange={e => setFormData(prev => ({ ...prev, gotra: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>आधार नं. (Aadhar No.)</Label>
                    <Input
                      required
                      maxLength={12}
                      placeholder="12 digit Aadhar"
                      value={formData.aadharNumber}
                      onChange={e => setFormData(prev => ({ ...prev, aadharNumber: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>निवासी / Resident of</Label>
                  <Textarea
                    required
                    placeholder="पूरा पता"
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>

              {/* Section 2: Nominee Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">नॉमिनी का विवरण (Nominee Details)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>नॉमिनी का नाम</Label>
                    <Input
                      required
                      placeholder="Nominee Name"
                      value={formData.nomineeName}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>पिता का नाम / Father's Name</Label>
                    <Input
                      placeholder="Father's Name"
                      value={formData.nomineeFathername}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeFathername: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>पति का नाम / Husband's Name</Label>
                    <Input
                      placeholder="Husband's Name"
                      value={formData.nomineeHusbandName}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeHusbandName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>गोत्र / Gotra</Label>
                    <Input
                      required
                      placeholder="Gotra"
                      value={formData.nomineeGotra}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeGotra: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Label>नॉमिनी का पता (Nominee Address)</Label>
                    <Input
                      placeholder="Nominee Address"
                      value={formData.nomineeAddress}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeAddress: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>मोबाईल (Mobile)</Label>
                    <Input
                      required
                      maxLength={10}
                      placeholder="10 digit No."
                      value={formData.nomineeMobile}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeMobile: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                  <div>
                    <Label>तहसील / Tehsil</Label>
                    <Input
                      required
                      placeholder="Tehsil"
                      value={formData.nomineeTehsil}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeTehsil: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>जिला / District</Label>
                    <Input
                      required
                      placeholder="District"
                      value={formData.nomineeDistrict}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeDistrict: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>पिनकोड / Pincode</Label>
                    <Input
                      required
                      maxLength={6}
                      placeholder="Pincode"
                      value={formData.nomineePincode}
                      onChange={e => setFormData(prev => ({ ...prev, nomineePincode: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>नॉमिनी से सम्बन्ध (Relation)</Label>
                    <select
                      required
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1"
                      value={formData.nomineeRelation}
                      onChange={e => setFormData(prev => ({ ...prev, nomineeRelation: e.target.value }))}
                    >
                      <option value="" disabled>
                        सम्बन्ध चुनें / Select Relation
                      </option>
                      <option value="भांजा">भांजा / Bhanej</option>
                      <option value="भांजी">भांजी / Bhenji</option>
                      {formData.nomineeRelation &&
                        formData.nomineeRelation !== "भांजा" &&
                        formData.nomineeRelation !== "भांजी" && (
                          <option value={formData.nomineeRelation}>{formData.nomineeRelation}</option>
                        )}
                    </select>
                  </div>
                  <div>
                    <Label>कार्यकर्त्ता का नाम (Worker Name)</Label>
                    <select
                      required
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white"
                      value={formData.selectedAgentId}
                      onChange={e => setFormData(prev => ({ ...prev, selectedAgentId: e.target.value }))}
                    >
                      <option value="">Select Worker</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id.toString()}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Affidavit */}
              <div className="space-y-4 pt-4 border-t">
                <Label htmlFor="affidavit">शपथ पत्र / Affidavit</Label>
                <Textarea
                  id="affidavit"
                  value={formData.affidavit}
                  onChange={e => setFormData(prev => ({ ...prev, affidavit: e.target.value }))}
                  rows={4}
                  className="bg-gray-50"
                  placeholder="शपथ पत्र का विवरण दर्ज करें"
                />
              </div>

              {/* Section 4: Payment Details (read-only, same position as add) */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">भुगतान विवरण (Payment Details)</h2>

                {paymentStatus === 'paid' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium">Payment Completed Successfully</p>
                    {paymentData?.payment_id && (
                      <p className="text-green-600 text-sm">Payment ID: {paymentData.payment_id}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>भुगतान की राशि (Amount)</Label>
                    <Input
                      readOnly
                      className="bg-gray-50"
                      value={formData.paymentAmount}
                    />
                    {formData.fee && (
                      <p className="text-xs text-gray-500 mt-1">Calculated fee: ₹{formData.fee}</p>
                    )}
                  </div>

                  <div>
                    <Label>भुगतान का माध्यम (Mode)</Label>
                    <Input
                      readOnly
                      className="bg-gray-50"
                      value={
                        PAYMENT_MODE_OPTIONS.find((o) => o.value === formData.paymentMode)?.label ||
                        formData.paymentMode
                      }
                    />
                  </div>

                  <div>
                    <Label>भुगतान की तिथि (Date)</Label>
                    <Input
                      readOnly
                      className="bg-gray-50"
                      value={formData.paymentDate}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t">
                <div className="space-y-2">
                  <Label>भाणेज/भाणजी फोटो (Applicant Photo)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setFormData(prev => ({ ...prev, passportPhoto: e.target.files?.[0] || null }))}
                  />
                  {(formData.passportPhoto || formData.existingPassportPhoto) && (
                    <img
                      src={
                        formData.passportPhoto
                          ? URL.createObjectURL(formData.passportPhoto)
                          : getProxiedPhotoSrc(formData.existingPassportPhoto)
                      }
                      alt="Applicant Preview"
                      className="h-24 w-24 object-cover rounded border"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>नॉमिनी फोटो (Nominee Photo)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setFormData(prev => ({ ...prev, nomineePassportPhoto: e.target.files?.[0] || null }))}
                  />
                  {(formData.nomineePassportPhoto || formData.existingNomineePassportPhoto) && (
                    <img
                      src={
                        formData.nomineePassportPhoto
                          ? URL.createObjectURL(formData.nomineePassportPhoto)
                          : getProxiedPhotoSrc(formData.existingNomineePassportPhoto)
                      }
                      alt="Nominee Preview"
                      className="h-24 w-24 object-cover rounded border"
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                  रद्द करें / Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? "Updating..." : "अपडेट करें / Update Registration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
