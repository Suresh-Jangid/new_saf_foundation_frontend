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
import { CalendarDays } from "lucide-react"
import { post } from "@/lib/api"
import { toast } from "sonner"


import { formatBilingual } from '@/lib/translations'
import { formatDate, isValidDate, parseDateFromDDMMYYYY, validatePhoneNumber, processImageForPDF } from "@/lib/utils";
import { PAYMENT_MODE, PAYMENT_MODE_OPTIONS, isRazorpayPaymentMode, GENDER_OPTIONS, isMale, isFemale } from "@/lib/form-values";
import { RoleGuard } from "@/components/role-guard"
import { RazorpayPayment } from "@/components/razorpay-payment"
import { sendWhatsAppMessage, sendWhatsAppFile } from "@/lib/fireconnect-whatsapp-service"
import { useAgeCategory } from "@/hooks/use-age-category"
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier"
import { EpinService } from "@/lib/epin-service"


export default function AddGeneralApplicationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<{
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
    epinNumber?: string;
  }>({
    // Auto-fill today's date on the add form (same behaviour as Mayra registration)
    applicationDate: formatDate(new Date()),
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
    pendingAmount: '',
    selectedAgentId: "",
    epinNumber: ""
  })

  // Helper function to convert dd-mm-yyyy to yyyymmdd format
  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate) return "";

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Debug: Log the current form data before submission
    console.log("Current form data before submission:", {
      nomineeName: formData.nomineeName,
      nomineeRelation: formData.nomineeRelation,
      selectedAgentId: formData.selectedAgentId
    })

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

      // Validate Razorpay payment completion
      if (isRazorpayPaymentMode(formData.paymentMode) && paymentStatus !== 'paid') {
        toast.error('कृपया ऑनलाइन भुगतान पूरा करें / Please complete the online payment to proceed')
        setIsLoading(false)
        return
      }

      const apiFormData = new FormData()


      apiFormData.append("applicationDate", convertToYYYYMMDD(formData.applicationDate))
      apiFormData.append("applicantName", formData.applicantName)
      apiFormData.append("fatherName", formData.fatherName)
      apiFormData.append("motherName", formData.motherName)
      apiFormData.append("dateOfBirth", convertToYYYYMMDD(formData.dateOfBirth))
      apiFormData.append("aadharNumber", aadharDigits)
      apiFormData.append("gotra", formData.gotra)
      apiFormData.append("mobile", mobileDigits)
      apiFormData.append("address", formData.address)
      apiFormData.append("pinCode", formData.pinCode)
      apiFormData.append("tehsil", formData.tehsil)
      apiFormData.append("district", formData.district)
      apiFormData.append("state", formData.state)
      // Handle optional fields - only append if they have values
      if (formData.nomineeName && formData.nomineeName.trim()) {
        apiFormData.append("nomineeName", formData.nomineeName.trim())
      } else {
        apiFormData.append("nomineeName", "")
      }

      if (formData.nomineeRelation && formData.nomineeRelation.trim()) {
        apiFormData.append("nomineeRelation", formData.nomineeRelation.trim())
      } else {
        apiFormData.append("nomineeRelation", "")
      }

      apiFormData.append("affidavit", formData.affidavit)
      apiFormData.append("gender", formData.gender)
      apiFormData.append("category", formData.category)

      // Include computed fee as totalAmount for API consumption
      if (fee) {
        apiFormData.append("totalAmount", fee)
      }

      // Add payment details if available
      if (formData.paymentAmount) {
        apiFormData.append("paymentAmount", formData.paymentAmount)
      }
      if (formData.paymentMode) {
        apiFormData.append("paymentMode", formData.paymentMode)
      }
      if (formData.paymentDate) {
        apiFormData.append("paymentDate", convertToYYYYMMDD(formData.paymentDate))
      }

      // Add Razorpay payment details if payment was made online
      if (paymentData && paymentStatus === 'paid') {
        apiFormData.append("razorpay_payment_id", paymentData.payment_id)
        apiFormData.append("razorpay_order_id", paymentData.order_id)
        apiFormData.append("payment_status", "completed")
      }

      // Add passport photo if available
      if (formData.passportPhoto) {
        apiFormData.append("passportPhoto", formData.passportPhoto)
      }

      apiFormData.append('age', computedAge)

      if (formData.epinNumber) {
        apiFormData.append('epin', formData.epinNumber)
        apiFormData.append('epinNumber', formData.epinNumber)
      }

      // Use selected agent for addedby and addedby_id
      apiFormData.append('pendingAmount', String(Number(fee) - Number(formData.paymentAmount || 0)))
      apiFormData.append('addedby', 'agent')
      apiFormData.append('addedby_id', formData.selectedAgentId || '')

      // Debug: Log the form data being sent
      console.log("Form data being sent:", {
        nomineeName: formData.nomineeName,
        nomineeRelation: formData.nomineeRelation,
        selectedAgentId: formData.selectedAgentId,
        formData: Object.fromEntries(apiFormData.entries())
      })

      const response = await post("?apicall=createApplication", apiFormData)

      if (response.data.status) {
        toast.success("Application added successfully")

        const applicationNumber: any = response.data.applicationNumber || response.data.id || response.data.formNumber || response.data.form_number;

        // Atomically consume E-PIN if applied
        if (formData.epinNumber) {
          try {
            await EpinService.consumeEpin({
              pinNumber: formData.epinNumber,
              applicationId: String(applicationNumber || response.data.id || ""),
              applicantName: formData.applicantName,
              agentId: formData.selectedAgentId,
              moduleType: "applicant_registration",
              remarks: "Consumed for General Marriage Application",
            });
          } catch (epinErr) {
            console.error("E-PIN post-registration consumption note:", epinErr);
          }
        }

        // Find selected agent name for the bond
        const selectedAgent = agents.find(a => a.id.toString() === formData.selectedAgentId);
        const agentName = selectedAgent ? selectedAgent.name : '';

        // Prepare record data for bond generation
        const recordData = {
          id: response.data.id,
          formNumber: applicationNumber,
          applicationDate: convertToYYYYMMDD(formData.applicationDate),
          applicantName: formData.applicantName,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
          aadharNumber: aadharDigits,
          gotra: formData.gotra,
          mobile: mobileDigits,
          address: formData.address,
          pinCode: formData.pinCode,
          tehsil: formData.tehsil,
          district: formData.district,
          state: formData.state,
          nomineeName: formData.nomineeName || '',
          nomineeRelation: formData.nomineeRelation || '',
          affidavit: formData.affidavit,
          gender: formData.gender,
          category: formData.category,
          age: computedAge,
          workerName: agentName,
          added_name: agentName,
        };

        router.push("/dashboard/general-applications")

        // WhatsApp + bond delivery should not block navigation
        void (async () => {
          try {
            const message = `नमस्ते ${formData.applicantName},\n\n पुरबिया प्रजापति बालिका विवाह & सशक्तिकरण फाउण्डेशन के विवाह योजना मे जुड़ने के लिए आपका बहुत बहुत धन्यवाद 🙏 \n\nअधिक जानकारी हेतु संपर्क करे \nपीराराम तेनगरिया जसोल \n9413032072, 8209467238`;
            await sendWhatsAppMessage(mobileDigits, message);
            toast.success("WhatsApp message sent successfully");

            toast.info("Generating and sending bond...");
            const imageData = await processImageForPDF(formData.passportPhoto);
            const bondResponse = await fetch("/api/generate-bond-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                record: recordData,
                imageData,
                duration: "अठारह महीने",
              }),
            });

            if (bondResponse.ok) {
              const bondBlob = await bondResponse.blob();
              const bondFile = new File(
                [bondBlob],
                `Bond_${applicationNumber}.pdf`,
                { type: "application/pdf" }
              );
              await sendWhatsAppFile(mobileDigits, bondFile, `Bond - ${applicationNumber}`);
              toast.success("Bond sent to WhatsApp successfully");
            } else {
              console.error("Failed to generate bond for WhatsApp");
              toast.error("Failed to generate bond for WhatsApp");
            }
          } catch (waError) {
            console.error("WhatsApp integration error:", waError);
            toast.error("Failed to send WhatsApp message/file");
          }
        })()
      } else {
        toast.error(response.data.message || "Failed to add application")
      }
    } catch (error: any) {
      console.error("Error adding application:", error)
      toast.error(error.response?.data?.message || "Failed to add application")
    } finally {
      setIsLoading(false)
    }
  }

  // Remove the local formatDate function since we're importing it from utils

  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(
    new Date()
  )
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState(
    formatDate(new Date())
  )

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(
    formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
  )
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    formatDate(dateOfBirthObj as any)
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

  // Phone validation state
  const [phoneError, setPhoneError] = useState("");

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  // Agents state
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true);
        const response = await post('?apicall=getAgents');
        const data = response.data;
        if (data.status && data.data) {
          setAgents(data.data.map((agent: any) => ({
            id: agent.id,
            name: agent.name
          })));
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast.error('Failed to load agents');
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  const { age: calculatedAge, category: calculatedCategory, fee: calculatedFee } = useAgeCategory(formData.dateOfBirth);

  // Category calculation logic based on centralized A-F age slabs
  React.useEffect(() => {
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


  // Handle payment success
  const handlePaymentSuccess = (paymentData: any) => {
    setPaymentStatus('paid');
    setPaymentData(paymentData);
    setFormData((prev) => ({
      ...prev,
      paymentAmount: String(paymentData.amount),
      paymentMode: PAYMENT_MODE.RAZORPAY,
      paymentDate: formatDate(new Date()),
    }));
    toast.success('Payment completed successfully!');
  };

  // Handle payment mode change
  const handlePaymentModeChange = (mode: string) => {
    setFormData((prev) => ({ ...prev, paymentMode: mode }));

    // Reset payment status when changing from Razorpay to other modes
    if (mode !== PAYMENT_MODE.RAZORPAY && paymentStatus === 'paid') {
      setPaymentStatus('pending');
      setPaymentData(null);
    }

    // Reset payment status when changing to Razorpay
    if (mode === PAYMENT_MODE.RAZORPAY) {
      setPaymentStatus('pending');
      setPaymentData(null);
    }
  };

  // Handle payment error
  const handlePaymentError = (error: any) => {
    setPaymentStatus('failed');
    console.error('Payment error:', error);
  };

  return (
    <RoleGuard requiredModule="applicant_registration" requiredAction="create">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">नया सामान्य आवेदन जोड़ें</h1>
                <p className="text-sm text-gray-600 mt-1">Add New General Marriage Application</p>
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
                        const str = e.target.value
                        setApplicationDateValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setApplicationDateObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            applicationDate: formatDate(date),
                          }))
                        } else {
                          setApplicationDateObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            applicationDate: str,
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
                                ? formatDate(date)
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
                        const str = e.target.value
                        setDateOfBirthValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setDateOfBirthObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: formatDate(date),
                          }))
                        } else {
                          setDateOfBirthObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: str,
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
                    type="number"
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
                  {/* Image preview */}
                  {formData.passportPhoto && (
                    <img
                      src={URL.createObjectURL(formData.passportPhoto)}
                      alt="पासपोर्ट फोटो प्रीव्यू"
                      className="mt-2 h-24 w-24 object-cover rounded border"
                    />
                  )}
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold">Payment Details</h2>

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

                {/* Payment Status Display */}
                {paymentStatus === 'paid' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium">✅ Payment Completed Successfully</p>
                    <p className="text-green-600 text-sm">Payment ID: {paymentData?.payment_id}</p>
                  </div>
                )}

                {paymentStatus === 'failed' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 font-medium">❌ Payment Failed</p>
                    <p className="text-red-600 text-sm">Please try again or use manual payment method</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="paymentAmount">Payment Amount</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      value={formData.paymentAmount || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paymentAmount: e.target.value }))}
                      placeholder={formatBilingual("placeholders.enterAmount")}
                    />
                    {fee && Number(fee) > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Calculated fee: ₹{fee} (enter this amount for online payment)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <select
                      id="paymentMode"
                      className="w-full border rounded px-3 py-2"
                      value={formData.paymentMode || ""}
                      onChange={(e) => handlePaymentModeChange(e.target.value)}
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
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="paymentDate"
                        value={paymentDateValue}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value
                          setPaymentDateValue(str)
                          const date = parseDateFromDDMMYYYY(str)
                          if (date) {
                            setPaymentDateObj(date)
                            setFormData((prev) => ({
                              ...prev,
                              paymentDate: formatDate(date),
                            }));
                          } else {
                            setPaymentDateObj(undefined)
                            setFormData((prev) => ({
                              ...prev,
                              paymentDate: str,
                            }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setPaymentDateOpen(true);
                          }
                        }}
                      />
                      <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="paymentDate-picker"
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
                            selected={paymentDateObj}
                            captionLayout="dropdown"
                            month={paymentDateObj}
                            onMonthChange={setPaymentDateObj}
                            onSelect={(date: any) => {
                              setPaymentDateObj(date);
                              setPaymentDateValue(formatDate(date));
                              setFormData((prev) => ({
                                ...prev,
                                paymentDate: date ? formatDate(date) : "",
                              }));
                              setPaymentDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Razorpay Payment Button - Only show when Razorpay is selected */}
                {isRazorpayPaymentMode(formData.paymentMode) && formData.paymentAmount && Number(formData.paymentAmount) > 0 && paymentStatus !== 'paid' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-blue-900">Online Payment</h3>
                        <p className="text-sm text-blue-700">
                          Pay ₹{formData.paymentAmount} securely using Razorpay
                        </p>
                        {(!formData.applicantName || !formData.mobile || !formData.aadharNumber) && (
                          <p className="text-xs text-orange-600 mt-1">
                            Please fill in applicant name, mobile, and Aadhaar number before making payment
                          </p>
                        )}
                      </div>
                      <RazorpayPayment
                        amount={Number(formData.paymentAmount)}
                        description={`General Marriage Application Fee - ${formData.applicantName || 'Applicant'}`}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={isLoading || !formData.applicantName || !formData.mobile || !formData.aadharNumber || !formData.paymentAmount}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                      >
                        Pay ₹{formData.paymentAmount} Now
                      </RazorpayPayment>
                    </div>
                  </div>
                )}

                {/* Payment Status Warning for Razorpay */}
                {isRazorpayPaymentMode(formData.paymentMode) && paymentStatus !== 'paid' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 font-medium">⚠️ Payment Required</p>
                    <p className="text-yellow-600 text-sm">Please complete the online payment to proceed with application submission.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || (isRazorpayPaymentMode(formData.paymentMode) && paymentStatus !== 'paid')}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Adding..." : "आवेदन बनाएं / Create Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
