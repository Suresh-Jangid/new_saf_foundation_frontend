"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays, Upload } from "lucide-react"
import { post, postUrlEncoded, API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, parseDateFromDDMMYYYY, validatePhoneNumber } from "@/lib/utils"
import { PAYMENT_MODE, PAYMENT_MODE_OPTIONS, isRazorpayPaymentMode, GENDER_OPTIONS } from "@/lib/form-values"
import { RoleGuard } from "@/components/role-guard"
import { RazorpayPayment } from "@/components/razorpay-payment"
import { getCurrentUserInfo } from "@/lib/utils"
import { useAgeCategory } from "@/hooks/use-age-category"
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier"
import { EpinService } from "@/lib/epin-service"

export default function AddMayraRegistrationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([])

  const [formData, setFormData] = useState({
    applicationDate: formatDate(new Date()),
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
    nomineeState: "Rajasthan",
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
    gender: "",
    epinNumber: "",
  })

  const { age: calculatedAge, category: calculatedCategory, fee: calculatedFee } = useAgeCategory(formData.dateOfBirth);

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true)
        const response = await post('?apicall=getAgents')
        const data = response.data
        if (data.status && data.data) {
          setAgents(data.data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            mobile: agent.mobile // Store mobile as well
          })))
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
        toast.error('Failed to load agents')
      } finally {
        setIsLoadingAgents(false)
      }
    }
    fetchAgents()
  }, [])

  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return ""
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

      const { addedby, addedby_id } = getCurrentUserInfo()
      const totalAmount = Number(formData.fee) || 0
      const paymentAmount = Number(formData.paymentAmount) || 0
      const pendingAmount = totalAmount - paymentAmount

      const apiFormData = new FormData()
      apiFormData.append("applicationDate", convertToYYYYMMDD(formData.applicationDate))
      apiFormData.append("applicantName", formData.applicantName)
      apiFormData.append("fatherName", formData.parentName) // Map parentName to fatherName
      apiFormData.append("motherName", formData.motherName)
      apiFormData.append("dateOfBirth", convertToYYYYMMDD(formData.dateOfBirth))
      apiFormData.append("age", formData.age)
      apiFormData.append("gotra", formData.gotra)
      apiFormData.append("address", formData.address)
      apiFormData.append("aadharNumber", aadharDigits)
      apiFormData.append("mobile", formData.nomineeMobile) // Map nomineeMobile to mobile
      apiFormData.append("pinCode", formData.nomineePincode)
      apiFormData.append("tehsil", formData.nomineeTehsil)
      apiFormData.append("district", formData.nomineeDistrict)
      apiFormData.append("state", formData.nomineeState)
      apiFormData.append("nomineeName", formData.nomineeName)
      apiFormData.append("nomineeFathername", formData.nomineeFathername)
      apiFormData.append("nomineeHusbandName", formData.nomineeHusbandName)
      apiFormData.append("nomineeGotra", formData.nomineeGotra)
      apiFormData.append("nomineeAddress", formData.nomineeAddress)
      apiFormData.append("nomineeRelation", formData.nomineeRelation)
      apiFormData.append("affidavit", formData.affidavit)
      apiFormData.append("category", formData.category)
      apiFormData.append("totalAmount", totalAmount.toString())
      apiFormData.append("paymentAmount", paymentAmount.toString())
      apiFormData.append("pendingAmount", pendingAmount.toString())
      apiFormData.append("gender", formData.gender)
      apiFormData.append("addedby", addedby)
      apiFormData.append("addedby_id", addedby_id)

      const selectedAgent = agents.find(a => a.id.toString() === formData.selectedAgentId)
      if (selectedAgent) {
        apiFormData.append("workerName", selectedAgent.name)
        apiFormData.append("workerMobile", (selectedAgent as any).mobile || "")
        apiFormData.append("selectedAgentId", String(selectedAgent.id))
      }

      if (formData.paymentMode) apiFormData.append("paymentMode", formData.paymentMode)
      if (formData.paymentDate) apiFormData.append("paymentDate", convertToYYYYMMDD(formData.paymentDate))

      if (formData.epinNumber) {
        apiFormData.append("epin", formData.epinNumber)
        apiFormData.append("epinNumber", formData.epinNumber)
      }

      if (paymentData && paymentStatus === 'paid') {
        apiFormData.append("razorpay_payment_id", paymentData.payment_id)
        apiFormData.append("razorpay_order_id", paymentData.order_id)
        apiFormData.append("payment_status", "completed")
      }

      if (formData.passportPhoto) apiFormData.append("passportPhoto", formData.passportPhoto)
      if (formData.nomineePassportPhoto) apiFormData.append("nomineePassportPhoto", formData.nomineePassportPhoto)

      const response = await post(API_ENDPOINTS.CREATE_MAYRA_APPLICATION, apiFormData)

      if (response.data.status) {
        toast.success("Mayra Registration added successfully")

        // Atomically consume E-PIN if applied
        if (formData.epinNumber) {
          try {
            const appId = response.data.applicationNumber || response.data.id || response.data.formNumber || "";
            await EpinService.consumeEpin({
              pinNumber: formData.epinNumber,
              applicationId: String(appId),
              applicantName: formData.applicantName,
              agentId: formData.selectedAgentId,
              moduleType: "mayra_registration",
              remarks: "Consumed for Mayra Registration",
            });
          } catch (epinErr) {
            console.error("E-PIN post-registration consumption note:", epinErr);
          }
        }

        router.push("/dashboard/mayra-registration")
      } else {
        toast.error(response.data.message || "Failed to add registration")
      }
    } catch (error: any) {
      console.error("Error adding registration:", error)
      toast.error(error.response?.data?.message || "Failed to add registration")
    } finally {
      setIsLoading(false)
    }
  }

  const [appDateObj, setAppDateObj] = useState<Date | undefined>(new Date())
  const [appDateOpen, setAppDateOpen] = useState(false)

  const [dobObj, setDobObj] = useState<Date | undefined>(undefined)
  const [dobOpen, setDobOpen] = useState(false)

  const [paymentDateObj, setPaymentDateObj] = useState<Date | undefined>(undefined)
  const [paymentDateOpen, setPaymentDateOpen] = useState(false)

  const handlePaymentSuccess = (data: any) => {
    setPaymentStatus('paid');
    setPaymentData(data);
    setFormData(prev => ({
      ...prev,
      paymentAmount: formData.fee,
      paymentMode: PAYMENT_MODE.RAZORPAY,
      paymentDate: formatDate(new Date())
    }));
    toast.success('Payment completed successfully!');
  };

  const handlePaymentModeChange = (mode: string) => {
    setFormData(prev => ({ ...prev, paymentMode: mode }));
    if (mode === PAYMENT_MODE.CASH) {
      setPaymentStatus('pending');
      setPaymentData(null);
    }
  };

  const handlePaymentError = (error: any) => {
    setPaymentStatus('failed');
    console.error('Payment error:', error);
  };

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="create">
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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">मायरा फॉर्म आवेदन पत्र</h1>
                <p className="text-sm text-gray-600 mt-1">Add New Mayra Registration</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Applicant Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">भाणेज/भाणजी का विवरण (Applicant Details)</h2>

                {/* Row 1: 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>आवेदन तिथि / Date</Label>
                    <div className="relative mt-1">
                      <Input
                        value={formData.applicationDate}
                        readOnly
                        className="bg-gray-50"
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
                            selected={appDateObj}
                            onSelect={(date: any) => {
                              setAppDateObj(date)
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

                  <div>
                    <Label>पुत्र/पुत्री (Son/Daughter of)</Label>
                    <Input
                      required
                      placeholder="पिता का नाम"
                      value={formData.parentName}
                      onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 3: DOB, Age, Gotra, Aadhar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            selected={dobObj}
                            captionLayout="dropdown"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            onSelect={(date: any) => {
                              setDobObj(date)
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

              {/* Section 4: Payment Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">भुगतान विवरण (Payment Details)</h2>

                {/* E-PIN Voucher Verification */}
                <div className="p-4 bg-muted/20 border rounded-lg">
                  <EpinInputVerifier
                    value={formData.epinNumber || ""}
                    onChange={(pin) =>
                      setFormData((prev) => ({ ...prev, epinNumber: pin }))
                    }
                    agentId={formData.selectedAgentId}
                  />
                </div>

                {paymentStatus === 'paid' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium">✅ Payment Completed Successfully</p>
                    <p className="text-green-600 text-sm">Payment ID: {paymentData?.payment_id}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>भुगतान की राशि (Amount)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={formData.paymentAmount}
                      onChange={e => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                    />
                    {formData.fee && (
                      <p className="text-xs text-gray-500 mt-1">Calculated fee: ₹{formData.fee}</p>
                    )}
                  </div>

                  <div>
                    <Label>भुगतान का माध्यम (Mode)</Label>
                    <select
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1"
                      value={formData.paymentMode}
                      onChange={e => handlePaymentModeChange(e.target.value)}
                    >
                      <option value="">Select Mode</option>
                      {PAYMENT_MODE_OPTIONS.filter(
                        (option) =>
                          option.value === PAYMENT_MODE.CASH ||
                          option.value === PAYMENT_MODE.RAZORPAY
                      ).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>भुगतान की तिथि (Date)</Label>
                    <div className="relative mt-1">
                      <Input
                        value={formData.paymentDate}
                        placeholder="dd-mm-yyyy"
                        onChange={e => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                      />
                      <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={parseDateFromDDMMYYYY(formData.paymentDate) || undefined}
                            onSelect={(date: any) => {
                              setFormData(prev => ({ ...prev, paymentDate: formatDate(date) }))
                              setPaymentDateOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {isRazorpayPaymentMode(formData.paymentMode) && paymentStatus !== 'paid' && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-center">
                    <p className="mb-4 text-sm text-gray-600">You have selected Online Payment. Please pay the calculated fee of ₹{formData.fee} to proceed.</p>
                    <div className="flex justify-center">
                      <RazorpayPayment
                        amount={Number(formData.fee)}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        description={`Mayra Registration Fee - ${formData.applicantName}`}
                      />
                    </div>
                  </div>
                )}
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
                  {formData.passportPhoto && (
                    <img
                      src={URL.createObjectURL(formData.passportPhoto)}
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
                  {formData.nomineePassportPhoto && (
                    <img
                      src={URL.createObjectURL(formData.nomineePassportPhoto)}
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
                  {isLoading ? "Saving..." : "सहेजें / Save Registration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
