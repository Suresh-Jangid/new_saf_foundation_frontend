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
  const [agents, setAgents] = useState<any[]>([])
  const [initialOfflineFormNumber, setInitialOfflineFormNumber] = useState<string>("")
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    applicationDate: "",
    formNumber: "",
    offlineFormNumber: "",
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
    nomineeAadhar: "",
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

  const { age: calculatedAge, category: calculatedCategory, fee: calculatedFee } = useAgeCategory(formData.dateOfBirth);

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  const selectedAgent = agents.find(
    (a: any) =>
      String(a.id) === String(formData.selectedAgentId) ||
      String(a.agentProfile?.id) === String(formData.selectedAgentId) ||
      String(a.agentProfile?.userId) === String(formData.selectedAgentId)
  );
  const resolvedWorkerOfflineCode = selectedAgent
    ? String(
        selectedAgent.offlineFormNumber ||
        selectedAgent.agentProfile?.offlineFormNumber ||
        selectedAgent.offline_form_number ||
        selectedAgent.agent_profile?.offline_form_number ||
        selectedAgent.agentProfile?.offline_form_no ||
        selectedAgent.offlineFormNo ||
        selectedAgent.agentProfile?.employeeId ||
        selectedAgent.employeeId ||
        selectedAgent.employee_id ||
        selectedAgent.agent_profile?.employee_id ||
        selectedAgent.agentCode ||
        selectedAgent.agent_code ||
        selectedAgent.code ||
        ""
      ).trim()
    : "";

  const parentSeniorId = selectedAgent
    ? String(
        selectedAgent.agentProfile?.parentAgentId ||
        selectedAgent.parentAgentId ||
        selectedAgent.parent_agent_id ||
        selectedAgent.agentProfile?.seniorId ||
        selectedAgent.agent_profile?.parent_agent_id ||
        selectedAgent.seniorId ||
        selectedAgent.senior_id ||
        selectedAgent.agent_profile?.senior_id ||
        ""
      ).trim()
    : "";

  const parentSeniorCode = selectedAgent
    ? String(
        selectedAgent.agentProfile?.seniorEmployeeId ||
        selectedAgent.seniorEmployeeId ||
        selectedAgent.senior_employee_id ||
        selectedAgent.agentProfile?.seniorCode ||
        selectedAgent.seniorCode ||
        selectedAgent.senior_code ||
        selectedAgent.parentEmployeeId ||
        selectedAgent.parent_employee_id ||
        selectedAgent.uplineCode ||
        selectedAgent.upline_code ||
        selectedAgent.agent_profile?.senior_employee_id ||
        selectedAgent.agent_profile?.senior_code ||
        ""
      ).trim().toUpperCase()
    : "";

  const seniorAgent = selectedAgent
    ? (parentSeniorId &&
        agents.find((a: any) => {
          const candidateIds = [
            a.id,
            a.agentProfile?.id,
            a.agentProfile?.userId,
            a.agent_profile?.id,
            a.agent_profile?.userId,
          ]
            .map((v) => String(v ?? "").trim())
            .filter(Boolean);
          return candidateIds.includes(parentSeniorId);
        })) ||
      (parentSeniorCode &&
        parentSeniorCode !== "ADMIN" &&
        parentSeniorCode !== "SUPER ADMIN" &&
        agents.find((a: any) => {
          const candidateCodes = [
            a.employeeId,
            a.employee_id,
            a.agentProfile?.employeeId,
            a.agent_profile?.employee_id,
            a.agentCode,
            a.agent_code,
            a.code,
          ]
            .map((v) => String(v ?? "").trim().toUpperCase())
            .filter(Boolean);
          return candidateCodes.includes(parentSeniorCode);
        }))
    : null;

  const resolvedSeniorName = seniorAgent ? String(seniorAgent.name || "").trim() : "";
  const resolvedSeniorOfflineCode = seniorAgent
    ? String(
        seniorAgent.offlineFormNumber ||
        seniorAgent.agentProfile?.offlineFormNumber ||
        seniorAgent.offline_form_number ||
        seniorAgent.agent_profile?.offline_form_number ||
        seniorAgent.agentProfile?.offline_form_no ||
        seniorAgent.offlineFormNo ||
        seniorAgent.agentProfile?.employeeId ||
        seniorAgent.employeeId ||
        seniorAgent.employee_id ||
        seniorAgent.agent_profile?.employee_id ||
        seniorAgent.agentCode ||
        seniorAgent.agent_code ||
        seniorAgent.code ||
        ""
      ).trim()
    : (parentSeniorCode && parentSeniorCode !== "ADMIN" && parentSeniorCode !== "SUPER ADMIN" ? parentSeniorCode : "");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true)
        // Fetch agents
        const agentsResponse = await post('?apicall=getAgents')
        const agentsData = agentsResponse.data
        let fetchedAgents: any[] = []
        if (agentsData.status && agentsData.data && Array.isArray(agentsData.data)) {
          fetchedAgents = agentsData.data
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

            // Match worker/agent by ID, name, or mobile
            let agentId = "";
            const directAgentId = String(
              getRecordField(record, "selectedAgentId", "agentId", "agent_id", "addedby_id", "addedById") ||
              (record.addedBy as { id?: string | number } | undefined)?.id ||
              ""
            ).trim();
            const workerName = getRecordField(record, "workerName", "worker_name") || "";
            const workerMobile = getRecordField(record, "workerMobile", "worker_mobile") || "";

            if (directAgentId) {
              const matchedById = fetchedAgents.find((a: any) => {
                const candidateIds = [
                  a.id,
                  a.agentProfile?.id,
                  a.agentProfile?.userId,
                  a.agent_profile?.id,
                  a.agent_profile?.userId,
                ]
                  .map((v) => String(v ?? "").trim())
                  .filter(Boolean);
                return candidateIds.includes(directAgentId);
              });
              if (matchedById) {
                agentId = String(matchedById.id);
              }
            }

            if (!agentId && workerName) {
              const matchedByName = fetchedAgents.find(
                (a: any) =>
                  String(a.name || "").trim().toLowerCase() === workerName.trim().toLowerCase() ||
                  String(a.username || a.user_name || "").trim().toLowerCase() === workerName.trim().toLowerCase()
              );
              if (matchedByName) agentId = String(matchedByName.id);
            }

            if (!agentId && workerMobile) {
              const cleanMob = workerMobile.replace(/\D/g, "").slice(-10);
              if (cleanMob.length === 10) {
                const matchedByMob = fetchedAgents.find((a: any) => {
                  const m = String(a.mobile || a.phone || a.agentProfile?.mobile || "").replace(/\D/g, "").slice(-10);
                  return m === cleanMob;
                });
                if (matchedByMob) agentId = String(matchedByMob.id);
              }
            }

            if (!agentId && directAgentId) {
              agentId = directAgentId;
            }

            if (agentId && !fetchedAgents.some((a: any) => {
              const candidateIds = [
                a.id,
                a.agentProfile?.id,
                a.agentProfile?.userId,
                a.agent_profile?.id,
                a.agent_profile?.userId,
              ]
                .map((v) => String(v ?? "").trim())
                .filter(Boolean);
              return candidateIds.includes(agentId);
            })) {
              const nameToUse = workerName || "Admin";
              fetchedAgents.push({ id: agentId, name: nameToUse, mobile: "" });
              setAgents([...fetchedAgents]);
            }

            const offNo = String(
              getRecordField(
                record,
                "offlineFormNumber",
                "offline_form_number",
                "offlineFormNo",
                "membershipNumber"
              ) || ""
            )
            setInitialOfflineFormNumber(offNo)

            setFormData({
              applicationDate: formatDate(String(record.applicationDate || "")),
              formNumber: getRecordField(record, "formNumber", "form_number", "sr_no") || "",
              offlineFormNumber: offNo,
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
              nomineeAadhar: getRecordField(record, "nomineeAadhar", "nominee_aadhar", "nomineeAadhaar", "nominee_aadhaar", "nomineeAadharNumber", "nominee_aadhar_number", "nomineeAadhaarNumber", "nominee_aadhaar_number", "nomineeAadharNo", "nomineeAadhaarNo") || "",
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

  useEffect(() => {
    if (formData.dateOfBirth) {
      setFormData(prev => ({
        ...prev,
        age: calculatedAge || "",
        category: calculatedCategory || "",
        fee: calculatedFee || ""
      }))
    } else {
      setFormData(prev => ({ ...prev, age: "", category: "", fee: "" }))
    }
  }, [formData.dateOfBirth, calculatedAge, calculatedCategory, calculatedFee])

  const validateForm = () => {
    const aadharDigits = formData.aadharNumber.replace(/\D/g, '')
    if (aadharDigits.length !== 12) {
      toast.error('कृपया 12 अंकों का आधार नंबर दर्ज करें')
      return false
    }

    if (!validatePhoneNumber(formData.nomineeMobile)) {
      toast.error('कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें')
      return false
    }

    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const currentOffline = (formData.offlineFormNumber || '').trim()
    const initialOffline = (initialOfflineFormNumber || '').trim()

    if (currentOffline && currentOffline !== initialOffline) {
      setConfirmDialogOpen(true)
    } else {
      executeSubmit()
    }
  }

  const executeSubmit = async () => {
    setConfirmDialogOpen(false)
    setIsLoading(true)

    try {
      const aadharDigits = formData.aadharNumber.replace(/\D/g, '')
      const nomineeMobile = formData.nomineeMobile.replace(/\D/g, "")
      const selectedAgent = agents.find((a) => a.id.toString() === formData.selectedAgentId)

      const apiFormData = buildEditFormData(id as string, {
        applicationDate: convertToYYYYMMDD(formData.applicationDate),
        offlineFormNumber: formData.offlineFormNumber ? formData.offlineFormNumber.trim() : "",
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
        nomineeAadhar: formData.nomineeAadhar ? formData.nomineeAadhar.replace(/\D/g, "") : null,
        nominee_aadhar: formData.nomineeAadhar ? formData.nomineeAadhar.replace(/\D/g, "") : null,
        gender: formData.gender,
        selectedAgentId: formData.selectedAgentId || undefined,
        agentId: formData.selectedAgentId || undefined,
        addedby_id: formData.selectedAgentId || undefined,
        workerName: selectedAgent?.name,
        workerMobile: (selectedAgent as { mobile?: string } | undefined)?.mobile,
        workerOfflineFormNumber: resolvedWorkerOfflineCode || undefined,
        agentOfflineFormNumber: resolvedWorkerOfflineCode || undefined,
        seniorOfflineFormNumber: resolvedSeniorOfflineCode || undefined,
        seniorAgentOfflineFormNumber: resolvedSeniorOfflineCode || undefined,
        seniorWorker: resolvedSeniorName || undefined,
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
      toast.error(error.response?.data?.message || error.message || "Failed to update registration")
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

                {/* Row 1: System Form No, Offline Form No, Date, Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="formNumber">आवेदन क्र. / Form No. (System)</Label>
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
                      भौतिक फॉर्म संख्या / Physical offline form number
                    </p>
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
                      className="mt-1"
                      onChange={e => setFormData(prev => ({ ...prev, applicantName: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 2: Gender, Parent Name, Mother Name, DOB */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <div>
                    <Label>पुत्र/पुत्री (Son/Daughter of)</Label>
                    <Input
                      required
                      placeholder="पिता का नाम"
                      value={formData.parentName}
                      className="mt-1"
                      onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>माता का नाम</Label>
                    <Input
                      required
                      placeholder="माता का नाम"
                      value={formData.motherName}
                      className="mt-1"
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
                </div>

                {/* Row 3: Age, Category, Fee, Gotra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>उम्र / Age</Label>
                    <Input
                      readOnly
                      className="bg-gray-50 mt-1"
                      value={formData.age}
                    />
                  </div>

                  <div>
                    <Label>श्रेणी / Category</Label>
                    <Input
                      readOnly
                      placeholder="Category"
                      className="bg-gray-50 mt-1"
                      value={formData.category}
                    />
                  </div>

                  <div>
                    <Label>शुल्क / Fee</Label>
                    <Input
                      readOnly
                      placeholder="Fee"
                      className="bg-gray-50 mt-1"
                      value={formData.fee}
                    />
                  </div>

                  <div>
                    <Label>गोत्र / Gotra</Label>
                    <Input
                      required
                      placeholder="गोत्र"
                      value={formData.gotra}
                      className="mt-1"
                      onChange={e => setFormData(prev => ({ ...prev, gotra: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 4: Aadhar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>आधार नं. (Aadhar No.)</Label>
                    <Input
                      required
                      maxLength={12}
                      placeholder="12 digit Aadhar"
                      value={formData.aadharNumber}
                      className="mt-1"
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

                {formData.selectedAgentId && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <Label>एजेंट कोड (Agent Offline Code)</Label>
                      <Input
                        readOnly
                        className="bg-gray-50 mt-1 font-mono font-medium"
                        value={resolvedWorkerOfflineCode || "—"}
                        placeholder="Offline Code"
                      />
                    </div>
                    <div>
                      <Label>सीनियर / अपलाइन (Senior / Upline)</Label>
                      <Input
                        readOnly
                        className="bg-gray-50 mt-1"
                        value={resolvedSeniorName || "—"}
                        placeholder="Senior Name"
                      />
                    </div>
                    <div>
                      <Label>सीनियर कोड (Senior Offline Code)</Label>
                      <Input
                        readOnly
                        className="bg-gray-50 mt-1 font-mono font-medium"
                        value={resolvedSeniorOfflineCode || "—"}
                        placeholder="Senior Offline Code"
                      />
                    </div>
                  </div>
                )}
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

        {/* Human Error Protection Confirmation Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>फॉर्म संख्या पुष्टि / Confirm Offline Form Number</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-gray-800 font-medium pt-2">
                ऑफलाइन फॉर्म नं. <span className="font-bold text-primary">{(formData.offlineFormNumber || "").trim()}</span> सही है?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)}>
                रद्द करें / Edit
              </AlertDialogCancel>
              <AlertDialogAction onClick={executeSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : "हाँ, सही है / Confirm & Save"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  )
}
