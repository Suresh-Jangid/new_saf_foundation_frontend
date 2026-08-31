"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
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
import { get, post, buildEditFormData } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, isValidDate, calculateAge, formatDateForAPI, formatDateForInput, parseDateFromDDMMYYYY, validatePhoneNumber, unwrapApiRecordById, getApplicantPhotoPath, getProxiedPhotoSrc } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard"
import { GENDER_OPTIONS, isMale, isFemale } from "@/lib/form-values"
import { formatBilingual } from '@/lib/translations'
import { useAgeCategory } from "@/hooks/use-age-category"

export type GeneralApplicationFormData = {
  formNumber? : string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
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
  affidavit: string;
  passportPhoto: File | null;
  gender: string;
  category: string;
  paymentAmount?: string;
  paymentMode?: string;
  paymentDate?: string;
  pendingAmount?: string;
  selectedAgentId?: string;
};

export default function EditGeneralApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [formData, setFormData] = useState<GeneralApplicationFormData>({
    formNumber: "",
    applicationDate: "",
    applicantName: "",
    fatherName: "",
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
    affidavit: "",
    passportPhoto: null,
    gender: "",
    category: "",
    paymentAmount: "",
    paymentMode: "",
    paymentDate: "",
    pendingAmount: "",
    selectedAgentId: "",
  })

  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(
    formData.applicationDate ? new Date(formData.applicationDate) : undefined
  )
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState(
    applicationDateObj ? formatDate(applicationDateObj) : ""
  )

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(
    formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
  )
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    dateOfBirthObj ? formatDate(dateOfBirthObj) : ""
  )

  const [paymentDateObj, setPaymentDateObj] = useState<Date | undefined>(
    formData.paymentDate ? new Date(formData.paymentDate) : undefined
  );
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);
  const [paymentDateValue, setPaymentDateValue] = useState(
    formatDate(paymentDateObj as any)
  );

  // Category and fee state
  const [category, setCategory] = useState("");
  const [fee, setFee] = useState("");
  const [computedAge, setComputedAge] = useState("");

  // Photo state
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>("");

  // Phone validation state
  const [phoneError, setPhoneError] = useState("");

  const { age: calculatedAge, category: calculatedCategory, fee: calculatedFee } = useAgeCategory(formData.dateOfBirth);

  // Agents state
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Category calculation logic based on centralized A-F age slabs
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

  // Handle phone number change with validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: digits }));

    // Clear error if field is empty (required field)
    if (!digits) {
      setPhoneError("");
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(digits)) {
      setPhoneError("कृपया एक वैध 10 अंकों का फोन नंबर दर्ज करें");
    } else {
      setPhoneError("");
    }
  };

  // Fetch agents and then data from API
  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;

      let fetchedAgents: Array<{ id: string; name: string }> = [];
      try {
        setIsLoadingData(true);
        setIsLoadingAgents(true);

        // Fetch agents first
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
        toast.error('Failed to load agents');
      } finally {
        setIsLoadingAgents(false);
      }

      try {
        const formData = new URLSearchParams();
        formData.append('id', id);

        const response = await post('?apicall=getApplications', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (response.data.status && response.data.data) {
          const record = unwrapApiRecordById<any>(response.data.data, id);
          if (!record) {
            toast.error("Application not found");
            router.push("/dashboard/general-applications");
            return;
          }

          console.log("API Response:", record);

          // Parse the date of birth first to get the proper format
          let formattedDateOfBirth = record.dateOfBirth || "";
          if (record.dateOfBirth) {
            const dobDate = record.dateOfBirth.includes('-') && record.dateOfBirth.split('-')[0].length === 4
              ? new Date(record.dateOfBirth)
              : parseDateFromDDMMYYYY(record.dateOfBirth);
            formattedDateOfBirth = dobDate ? formatDate(dobDate) : record.dateOfBirth;
          }

          // Try to match agent by explicit id fields first, then by name.
          // The API may store the worker/agent under several possible field names,
          // so check all common variants to avoid losing the selection on edit.
          let agentId = "";
          const explicitAgentId =
            record.selectedAgentId ??
            record.agent_id ??
            record.agentId ??
            record.worker_id ??
            record.workerId ??
            (record.agent && (record.agent.id ?? record.agent.agent_id)) ??
            record.addedby_id ??
            "";
          if (explicitAgentId && fetchedAgents.some((a) => String(a.id) === String(explicitAgentId))) {
            agentId = String(explicitAgentId);
          }
          const workerName =
            record.workerName ||
            record.worker_name ||
            record.added_name ||
            (record.addedBy && record.addedBy.name) ||
            (record.agent && record.agent.name) ||
            "";
          if (!agentId && workerName && fetchedAgents.length > 0) {
            const agentByName = fetchedAgents.find((a) => a.name === workerName);
            if (agentByName) agentId = String(agentByName.id);
          }
          if (!agentId) {
            agentId = explicitAgentId ? String(explicitAgentId) : "";
          }

          if (agentId && !fetchedAgents.some(a => String(a.id) === agentId)) {
            const nameToUse = workerName || "Admin";
            fetchedAgents.push({ id: agentId, name: nameToUse });
            setAgents([...fetchedAgents] as any);
          }

          setFormData({
            formNumber: record.formNumber || "",
            applicationDate: record.applicationDate || "",
            applicantName: record.applicantName || "",
            fatherName: record.fatherName || "",
            motherName: record.motherName || "",
            dateOfBirth: formattedDateOfBirth,
            aadharNumber: record.aadharNumber || "",
            gotra: record.gotra || "",
            mobile: record.mobile || "",
            address: record.address || "",
            pinCode: record.pinCode || "",
            tehsil: record.tehsil || "",
            district: record.district || "",
            state: record.state || "",
            nomineeName: record.nomineeName || "",
            nomineeRelation: record.nomineeRelation || "",
            affidavit: record.affidavit || "",
            passportPhoto: null,
            gender: record.gender || "",
            category: record.category || "",
            paymentAmount: record.paymentAmount || "",
            paymentMode: record.paymentMode || "",
            paymentDate: record.paymentDate || "",
            pendingAmount: record.pendingAmount || "",
            selectedAgentId: agentId,
          });

          // Set existing photo URL if available
          const photoPath = getApplicantPhotoPath(record);
          if (photoPath) {
            setExistingPhotoUrl(photoPath);
          }

          // Set date objects - handle both API format (YYYY-MM-DD) and display format (DD-MM-YYYY)
          if (record.applicationDate) {
            const appDate = record.applicationDate.includes('-') && record.applicationDate.split('-')[0].length === 4
              ? new Date(record.applicationDate)
              : parseDateFromDDMMYYYY(record.applicationDate);
            setApplicationDateObj(appDate);
            setApplicationDateValue(appDate ? formatDate(appDate) : "");
          }

          if (record.dateOfBirth) {
            const dobDate = record.dateOfBirth.includes('-') && record.dateOfBirth.split('-')[0].length === 4
              ? new Date(record.dateOfBirth)
              : parseDateFromDDMMYYYY(record.dateOfBirth);
            setDateOfBirthObj(dobDate);
            setDateOfBirthValue(dobDate ? formatDate(dobDate) : "");
          }

          if (record.paymentDate) {
            const payDate = record.paymentDate.includes('-') && record.paymentDate.split('-')[0].length === 4
              ? new Date(record.paymentDate)
              : parseDateFromDDMMYYYY(record.paymentDate);
            setPaymentDateObj(payDate);
            setPaymentDateValue(payDate ? formatDate(payDate) : "");
          }

          // Set category and fee based on loaded data
          setCategory(record.category || "");
          // Age calculation will be handled by the useEffect that depends on formData.gender and formData.dateOfBirth
        } else {
          toast.error("Application not found");
          router.push("/dashboard/general-applications");
        }
      } catch (error: any) {
        console.error("Error fetching application:", error);
        toast.error("Failed to load application data");
        router.push("/dashboard/general-applications");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAllData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate and normalize numeric fields
      const mobileDigits = (formData.mobile || '').replace(/\D/g, '')
      const aadharDigits = (formData.aadharNumber || '').replace(/\D/g, '')

      if (!validatePhoneNumber(mobileDigits)) {
        toast.error('कृपया एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें / Enter a valid 10-digit mobile number')
        setIsLoading(false)
        return
      }
      if (aadharDigits.length !== 12) {
        toast.error('कृपया 12 अंकों का आधार नंबर दर्ज करें / Enter a 12-digit Aadhaar number')
        setIsLoading(false)
        return
      }
      if (!formData.selectedAgentId) {
        toast.error('कृपया कार्यकर्ता का नाम चुनें / Please select a worker')
        setIsLoading(false)
        return
      }

      const apiFormData = buildEditFormData(id, {
        applicationDate: formatDateForAPI(applicationDateObj),
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
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
        affidavit: formData.affidavit,
        gender: formData.gender,
        category: formData.category,
        selectedAgentId: formData.selectedAgentId,
        passportPhoto: formData.passportPhoto ?? undefined,
        existingPhotoUrl: !formData.passportPhoto && existingPhotoUrl ? existingPhotoUrl : undefined,
      })

      const response = await post("?apicall=updateApplication", apiFormData)

      if (response.data.status) {
        toast.success("Application updated successfully")
        router.push("/dashboard/general-applications")
      } else {
        toast.error(response.data.message || "Failed to update application")
      }
    } catch (error: any) {
      console.error("Error updating application:", error)
      toast.error(error.response?.data?.message || "Failed to update application")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading application data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="applicant_registration" requiredAction="update">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">सामान्य आवेदन संपादित करें</h1>
                <p className="text-sm text-gray-600 mt-1">Edit General Marriage Application</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Application and Birth Date Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        // Parse the date string manually to avoid timezone issues
                        const parsedDate = parseDateFromDDMMYYYY(e.target.value)
                        if (parsedDate) {
                          setApplicationDateObj(parsedDate)
                          setFormData((prev) => ({
                            ...prev,
                            applicationDate: formatDateForAPI(parsedDate),
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
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        setDateOfBirthValue(e.target.value)
                        // Parse the date string manually to avoid timezone issues
                        const parsedDate = parseDateFromDDMMYYYY(e.target.value)
                        if (parsedDate) {
                          setDateOfBirthObj(parsedDate)
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: formatDate(parsedDate),
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
                                ? formatDate(date)
                                : "",
                            }))
                            setDateOfBirthOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Gender, Category, and Fee Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gender">लिंग / Gender</Label>
                  <select
                    id="gender"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={formData.gender}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
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

                <div>
                  <Label htmlFor="category">श्रेणी / Category</Label>
                  <Input
                    id="category"
                    type="text"
                    value={category}
                    placeholder="श्रेणी / Category"
                    readOnly
                  />
                </div>
                <div>
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

              {/* Personal Information Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="fatherName">पिता का नाम / Father's Name</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                    placeholder="पिता का नाम दर्ज करें"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadharNumber">आधार संख्या / Aadhar Number</Label>
                  <Input
                    id="aadharNumber"
                    type="tel"
                    inputMode="numeric"
                    value={formData.aadharNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setFormData((prev) => ({ ...prev, aadharNumber: digits }))
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

              <div>
                <Label htmlFor="mobile">मोबाइल नंबर / Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={handlePhoneChange}
                  placeholder="मोबाइल नंबर दर्ज करें"
                  className={phoneError ? "border-red-500" : ""}
                  required
                />
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                )}
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

              {/* Address Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pinCode">पिन कोड / Pin Code</Label>
                  <Input
                    id="pinCode"
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

              {/* Nominee Information Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Worker Information Section */}
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

              {/* Document Upload Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {/* Image preview - show existing photo or new selected photo */}
                  {(existingPhotoUrl || formData.passportPhoto) && (
                    <div className="mt-2">
                      <img
                        src={formData.passportPhoto ? URL.createObjectURL(formData.passportPhoto) : getProxiedPhotoSrc(existingPhotoUrl)}
                        alt="पासपोर्ट फोटो प्रीव्यू"
                        className="h-24 w-24 object-cover rounded border"
                      />
                      {existingPhotoUrl && !formData.passportPhoto && (
                        <p className="text-xs text-gray-500 mt-1">Existing photo loaded</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                  रद्द करें / Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? "Updating..." : "आवेदन अपडेट करें / Update Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
