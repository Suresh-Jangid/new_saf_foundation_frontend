"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MediaUploadControl } from "@/components/media-upload";
import {
  CalendarDays,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import { JanniDeliveryService, CreateJanniDeliveryPayload } from "@/lib/janni-delivery-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { EpinValidationResponse, JANNI_PER_DELIVERY_AMOUNT } from "@/lib/config-types";
import { formatDate, parseDateFromDDMMYYYY, validatePhoneNumber } from "@/lib/utils";
import { uploadMediaFile } from "@/lib/upload-client";
import { WorkerSearchSelector, WorkerOption } from "@/components/worker-search-selector";
import { PincodeAddressFields } from "@/components/forms/pincode-address-fields";

export default function AddJanniDeliveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<WorkerOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Date Popover States
  const [appDateOpen, setAppDateOpen] = useState(false);
  const [appDateObj, setAppDateObj] = useState<Date | undefined>(new Date());
  const [dobOpen, setDobOpen] = useState(false);
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false);
  const [deliveryDateObj, setDeliveryDateObj] = useState<Date | undefined>(undefined);

  // Form State
  const [formData, setFormData] = useState<{
    applicationDate: string;
    applicantName: string;
    fatherName: string;
    husbandName: string;
    motherName: string;
    dateOfBirth: string;
    age: string;
    aadharNumber: string;
    gotra: string;
    mobile: string;
    address: string;
    pinCode: string;
    tehsil: string;
    district: string;
    state: string;
    childName: string;
    childGender: "Male" | "Female" | "Other" | "";
    deliveryDate: string;
    hospitalName: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineeMobile: string;
    nomineeAadhar: string;
    offlineFormNumber: string;
    gender: "Female" | "Male" | "Other";
    category: "A" | "B" | "C" | "D" | "E" | "F";
    totalAmount: string;
    paymentAmount: string;
    paymentMode: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
    selectedAgentId: string;
    epinCode: string;
  }>({
    applicationDate: formatDate(new Date()),
    applicantName: "",
    fatherName: "",
    husbandName: "",
    motherName: "",
    dateOfBirth: "",
    age: "",
    aadharNumber: "",
    gotra: "",
    mobile: "",
    address: "",
    pinCode: "",
    tehsil: "",
    district: "",
    state: "Rajasthan",
    childName: "",
    childGender: "",
    deliveryDate: "",
    hospitalName: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    nomineeAadhar: "",
    offlineFormNumber: "",
    gender: "Female",
    category: "A",
    totalAmount: "0",
    paymentAmount: "0",
    paymentMode: "CASH",
    selectedAgentId: "",
    epinCode: "",
  });

  // Validation error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Photo state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Nominee Photo state
  const [nomineePhotoBase64, setNomineePhotoBase64] = useState<string | null>(null);
  const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);

  // E-PIN Validation State
  const [, setEpinVerified] = useState<EpinValidationResponse | null>(null);

  // Load agents if Admin
  useEffect(() => {
    if (isAdmin()) {
      setLoadingAgents(true);
      agentRegistrationAPI
        .getAll()
        .then((res) => {
          if (res && res.data && Array.isArray(res.data)) {
            const mappedAgents = res.data.map((ag: any) => {
              const resolvedUserId = String(
                ag.userId ||
                ag.user_id ||
                ag.user?.id ||
                ag.agentProfile?.userId ||
                ag.agentProfile?.user_id ||
                ag.agent_profile?.user_id ||
                ag.id ||
                ""
              ).trim();

              return {
                id: resolvedUserId,
                userId: resolvedUserId,
                name: ag.applicantName || ag.name || ag.agent_name || ag.user?.name || "Agent",
                mobile: ag.mobileNumber || ag.mobile || ag.phone || ag.user?.mobile || "",
                offlineFormNumber: ag.offlineFormNumber || ag.offline_form_number || ag.agentProfile?.offlineFormNumber || "",
                level: ag.level || ag.agentProfile?.level || ag.hierarchy?.level,
              };
            });
            setAgents(mappedAgents);
          }
        })
        .catch((err) => {
          console.warn("Could not load agents list:", err);
        })
        .finally(() => {
          setLoadingAgents(false);
        });
    }
  }, []);

  // Calculate age when DOB changes
  const calculateAgeFromDate = (dateVal: string) => {
    if (!dateVal) return "";
    let birthDate: Date | null | undefined = null;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
      birthDate = parseDateFromDDMMYYYY(dateVal);
    } else {
      birthDate = new Date(dateVal);
    }

    if (!birthDate || isNaN(birthDate.getTime())) return "";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age <= 120 ? String(age) : "";
  };

  const handleDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const age = calculateAgeFromDate(val);
    setFormData((prev) => ({ ...prev, dateOfBirth: val, age }));
  };

  // Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("कृपया 5MB से छोटी फ़ाइल अपलोड करें / Photo must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPassportPhotoBase64(base64);
      setPhotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // Nominee Photo Upload handler
  const handleNomineePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("कृपया 5MB से छोटी फ़ाइल अपलोड करें / Nominee photo must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNomineePhotoBase64(base64);
      setNomineePhotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // E-PIN Verification callback
  const handleEpinVerified = useCallback((result: EpinValidationResponse | null) => {
    setEpinVerified(result);
    if (result && result.valid) {
      toast.success(
        `ई-पिन सत्यापित! (वाउचर राशि: ₹${result.schemeAmount || 0}) / E-PIN Verified!`
      );
      if (result.schemeAmount && Number(result.schemeAmount) > 0) {
        setFormData((prev) => ({
          ...prev,
          paymentAmount: String(result.schemeAmount),
        }));
      }
    }
  }, []);

  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate || isNaN(parsedDate.getTime())) return dateString;
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset previous errors
    const errors: Record<string, string> = {};

    const rawMobile = formData.mobile.replace(/\D/g, "");
    const rawAadhar = formData.aadharNumber.replace(/\D/g, "");
    const rawPinCode = formData.pinCode.replace(/\D/g, "");
    const rawNomineeMobile = formData.nomineeMobile.replace(/\D/g, "");
    const rawNomineeAadhar = formData.nomineeAadhar.replace(/\D/g, "");
    const cleanEpin = formData.epinCode.trim().toUpperCase();

    // Client-side validations
    if (!formData.applicantName.trim() || formData.applicantName.trim().length < 2) {
      errors.applicantName = "कृपया माता/आवेदक का नाम दर्ज करें (कम से कम 2 अक्षर) / Enter applicant (mother) name";
    }

    if (!formData.fatherName.trim() || formData.fatherName.trim().length < 2) {
      errors.fatherName = "कृपया पिता का नाम दर्ज करें (कम से कम 2 अक्षर) / Enter father's name";
    }

    if (!formData.dateOfBirth.trim()) {
      errors.dateOfBirth = "कृपया जन्म तिथि चुनें / Select date of birth";
    } else {
      const ymdDob = convertToYYYYMMDD(formData.dateOfBirth);
      if (!ymdDob || isNaN(new Date(ymdDob).getTime())) {
        errors.dateOfBirth = "कृपया वैध जन्म तिथि दर्ज करें / Enter a valid date of birth";
      }
    }

    if (!formData.gotra.trim() || formData.gotra.trim().length < 2) {
      errors.gotra = "कृपया गोत्र दर्ज करें (कम से कम 2 अक्षर) / Enter gotra";
    }

    if (rawAadhar.length !== 12) {
      errors.aadharNumber = "कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Enter a valid 12-digit Aadhaar number";
    }

    if (rawMobile.length !== 10 || !validatePhoneNumber(rawMobile)) {
      errors.mobile = "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें / Enter a valid 10-digit mobile number";
    }

    if (!formData.address.trim() || formData.address.trim().length < 3) {
      errors.address = "कृपया पूरा पता दर्ज करें (कम से कम 3 अक्षर) / Enter complete address";
    }

    if (!formData.tehsil.trim() || formData.tehsil.trim().length < 2) {
      errors.tehsil = "कृपया तहसील दर्ज करें / Enter tehsil";
    }

    if (!formData.district.trim() || formData.district.trim().length < 2) {
      errors.district = "कृपया ज़िला दर्ज करें / Enter district";
    }

    if (rawPinCode.length < 5 || rawPinCode.length > 10) {
      errors.pinCode = "कृपया वैध पिन कोड दर्ज करें (कम से कम 5 अंक) / Enter valid PIN code (min 5 digits)";
    }

    // Nominee validations (optional, but if provided must follow format)
    if (rawNomineeMobile && rawNomineeMobile.length !== 10) {
      errors.nomineeMobile = "कृपया नॉमिनी का 10 अंकों का मोबाइल नंबर दर्ज करें / Enter a valid 10-digit Nominee mobile number";
    }

    if (rawNomineeAadhar && rawNomineeAadhar.length !== 12) {
      errors.nomineeAadhar = "कृपया नॉमिनी का 12 अंकों का आधार नंबर दर्ज करें / Enter a valid 12-digit Nominee Aadhaar number";
    }

    // Mandatory E-PIN check for Janni Delivery
    if (!cleanEpin) {
      errors.epinCode = "ई-पिन आवश्यक है / E-PIN is required for Janni Delivery Registration";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorMessage = Object.values(errors)[0];
      toast.error(firstErrorMessage);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    let finalPassportUrl = passportPhotoBase64 || null;
    if (passportPhotoBase64 && passportPhotoBase64.startsWith("data:")) {
      try {
        const uploadRes = await uploadMediaFile(passportPhotoBase64, {
          category: "passport",
          entityType: "janni",
        });
        if (uploadRes.success && uploadRes.url) {
          finalPassportUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn("Janni passport upload note:", err);
      }
    }

    let finalNomineeUrl = nomineePhotoBase64 || null;
    if (nomineePhotoBase64 && nomineePhotoBase64.startsWith("data:")) {
      try {
        const uploadRes = await uploadMediaFile(nomineePhotoBase64, {
          category: "nominee",
          entityType: "janni",
        });
        if (uploadRes.success && uploadRes.url) {
          finalNomineeUrl = uploadRes.url;
        }
      } catch (err) {
        console.warn("Janni nominee upload note:", err);
      }
    }

    // Prepare payload
    const isValidUuid = (id?: string) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()));

    const payload: CreateJanniDeliveryPayload = {
      applicationDate: convertToYYYYMMDD(formData.applicationDate),
      applicantName: formData.applicantName.trim(),
      fatherName: formData.fatherName.trim(),
      husbandName: formData.husbandName.trim() || null,
      motherName: formData.motherName.trim() || null,
      dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
      age: formData.age ? Number(formData.age) : undefined,
      aadharNumber: rawAadhar,
      gotra: formData.gotra.trim(),
      mobile: rawMobile,
      address: formData.address.trim(),
      pinCode: rawPinCode,
      tehsil: formData.tehsil.trim(),
      district: formData.district.trim(),
      state: formData.state.trim() || "Rajasthan",
      childName: formData.childName.trim() || null,
      childGender: (formData.childGender as any) || null,
      deliveryDate: formData.deliveryDate ? convertToYYYYMMDD(formData.deliveryDate) : null,
      hospitalName: formData.hospitalName.trim() || null,
      nomineeName: formData.nomineeName.trim() || null,
      nomineeRelation: formData.nomineeRelation.trim() || null,
      nomineeMobile: rawNomineeMobile || null,
      nomineeAadhar: rawNomineeAadhar || null,
      passportPhotoUrl: finalPassportUrl,
      nomineePhotoUrl: finalNomineeUrl,
      offlineFormNumber: formData.offlineFormNumber.trim() || null,
      gender: formData.gender,
      category: formData.category,
      totalAmount: Number(formData.totalAmount) || 0,
      paymentAmount: Number(formData.paymentAmount) || 0,
      paymentMode: formData.paymentMode,
      selectedAgentId: isValidUuid(formData.selectedAgentId) ? formData.selectedAgentId.trim() : undefined,
      epinCode: cleanEpin,
      pinNumber: cleanEpin,
    };

    try {
      await JanniDeliveryService.createRegistration(payload);
      toast.success(
        "जननी प्रसूति पंजीकरण सफलतापूर्वक दर्ज किया गया! / Janni Delivery Registration Created Successfully!"
      );
      router.push("/dashboard/janni-delivery");
    } catch (err: any) {
      console.error("Submission error:", err);
      const resData = err.response?.data;
      if (err.response?.status === 409 || err.status === 409) {
        const conflictMsg =
          resData?.message ||
          "यह E-PIN या आधार नंबर पहले ही पंजीकृत है / Record or E-PIN conflict (409)";
        if (/epin|pin|voucher/i.test(conflictMsg)) {
          setFieldErrors((prev) => ({ ...prev, epinCode: conflictMsg }));
        } else if (/aadhar|aadhaar/i.test(conflictMsg)) {
          setFieldErrors((prev) => ({ ...prev, aadharNumber: conflictMsg }));
        } else if (/offline/i.test(conflictMsg)) {
          setFieldErrors((prev) => ({ ...prev, offlineFormNumber: conflictMsg }));
        }
        toast.error(conflictMsg);
      } else if (
        err.response?.status === 400 &&
        Array.isArray(resData?.errors) &&
        resData.errors.length > 0
      ) {
        const newFieldErrors: Record<string, string> = {};
        const messages: string[] = [];

        for (const errorItem of resData.errors) {
          const rawField = String(errorItem.field || "");
          const cleanField = rawField.replace(/^(body|query|params)\./, "");
          const errorMsg = errorItem.message || "अमान्य मान / Invalid value";
          messages.push(errorMsg);

          if (cleanField) {
            newFieldErrors[cleanField] = errorMsg;
            if (cleanField === "pinNumber") {
              newFieldErrors["epinCode"] = errorMsg;
            }
          }
        }

        setFieldErrors((prev) => ({ ...prev, ...newFieldErrors }));
        toast.error(messages.join(" | ") || "मान्यकरण त्रुटि / Validation Error");
      } else {
        const msg =
          resData?.message ||
          err.message ||
          "पंजीकरण दर्ज करने में त्रुटि / Failed to create registration";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard requiredModule="janni_delivery" requiredAction="create">
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
                  className="p-0 h-auto text-sm text-[#0B4A8F] hover:underline"
                  disabled={isLoading}
                >
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
                  जननी प्रसूति सहायता फॉर्म आवेदन पत्र
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Add New Janni Delivery Registration Application
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Application Metadata & Categorization */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  आवेदन विवरण (Application & Scheme Details)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      आवेदन तिथि / Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        value={formData.applicationDate}
                        readOnly
                        className="bg-gray-50 text-xs sm:text-sm"
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
                              if (date) {
                                setAppDateObj(date);
                                setFormData((prev) => ({
                                  ...prev,
                                  applicationDate: formatDate(date),
                                }));
                              }
                              setAppDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      श्रेणी / Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value as any,
                        }))
                      }
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                    >
                      <option value="A">Category A</option>
                      <option value="B">Category B</option>
                      <option value="C">Category C</option>
                      <option value="D">Category D</option>
                      <option value="E">Category E</option>
                      <option value="F">Category F</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      कुल सहायता राशि / Scheme Value (₹)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.totalAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, totalAmount: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      प्रति प्रसव सहायता राशि / Per Delivery Assistance Amount (₹)
                    </Label>
                    <Input
                      readOnly
                      disabled
                      value={`₹${JANNI_PER_DELIVERY_AMOUNT}`}
                      className="mt-1 text-xs sm:text-sm bg-gray-50 text-gray-700 cursor-not-allowed font-medium"
                    />
                  </div>

                  {isAdmin() && (
                    <div className="space-y-1.5">
                      <Label htmlFor="selectedAgentId" className="text-xs sm:text-sm font-medium text-gray-700">
                        कार्यकर्ता / Allocated Worker
                      </Label>
                      <WorkerSearchSelector
                        id="selectedAgentId"
                        value={formData.selectedAgentId}
                        onValueChange={(val) => {
                          setFormData((prev) => ({ ...prev, selectedAgentId: val, epinCode: "" }));
                          clearFieldError("selectedAgentId");
                        }}
                        agents={agents}
                        isLoading={loadingAgents}
                        disabled={loadingAgents}
                        defaultOption={{
                          value: "",
                          label: "Direct / Self / Admin",
                          secondary: "No Specific Worker",
                        }}
                        placeholder="कार्यकर्ता चुनें / Select Worker"
                      />
                      {fieldErrors.selectedAgentId && (
                        <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.selectedAgentId}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      ऑफलाइन फॉर्म नं. / Offline Form No.
                    </Label>
                    <p className="text-[10px] text-gray-400 mb-0.5">
                      भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number
                    </p>
                    <Input
                      id="offlineFormNumber"
                      name="offlineFormNumber"
                      placeholder="ऑफलाइन फॉर्म नं."
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.offlineFormNumber ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.offlineFormNumber}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, offlineFormNumber: e.target.value }));
                        clearFieldError("offlineFormNumber");
                      }}
                    />
                    {fieldErrors.offlineFormNumber && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.offlineFormNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Mother / Applicant Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  माता (आवेदक) का व्यक्तिगत विवरण (Mother / Applicant Details)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      माता / आवेदक का नाम <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="माता का नाम दर्ज करें"
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.applicantName ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.applicantName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, applicantName: e.target.value }));
                        clearFieldError("applicantName");
                      }}
                    />
                    {fieldErrors.applicantName && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.applicantName}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      पिता का नाम (Father's Name) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="पिता का नाम दर्ज करें"
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.fatherName ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.fatherName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, fatherName: e.target.value }));
                        clearFieldError("fatherName");
                      }}
                    />
                    {fieldErrors.fatherName && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.fatherName}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      पति का नाम (Husband's Name)
                    </Label>
                    <Input
                      placeholder="पति का नाम दर्ज करें"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.husbandName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, husbandName: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नानी / माँ का नाम (Mother's Name)
                    </Label>
                    <Input
                      placeholder="माँ का नाम दर्ज करें"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.motherName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, motherName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      जन्म तिथि (DOB) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        required
                        placeholder="dd-mm-yyyy"
                        className={`text-xs sm:text-sm ${
                          fieldErrors.dateOfBirth ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                        value={formData.dateOfBirth}
                        onChange={(e) => {
                          handleDobTextChange(e);
                          clearFieldError("dateOfBirth");
                        }}
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
                            fromYear={1950}
                            toYear={new Date().getFullYear()}
                            onSelect={(date: any) => {
                              if (date) {
                                setDobObj(date);
                                const formatted = formatDate(date);
                                const age = calculateAgeFromDate(formatted);
                                setFormData((prev) => ({
                                  ...prev,
                                  dateOfBirth: formatted,
                                  age,
                                }));
                                clearFieldError("dateOfBirth");
                              }
                              setDobOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {fieldErrors.dateOfBirth && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.dateOfBirth}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      उम्र / Age (Years)
                    </Label>
                    <Input
                      readOnly
                      placeholder="Auto calculated"
                      className="bg-gray-50 mt-1 text-xs sm:text-sm"
                      value={formData.age}
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      गोत्र / Gotra <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="गोत्र दर्ज करें"
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.gotra ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.gotra}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, gotra: e.target.value }));
                        clearFieldError("gotra");
                      }}
                    />
                    {fieldErrors.gotra && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.gotra}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      आधार कार्ड नंबर <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="12 digit Aadhaar No."
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.aadharNumber ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.aadharNumber}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                        }));
                        clearFieldError("aadharNumber");
                      }}
                    />
                    {fieldErrors.aadharNumber && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.aadharNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      मोबाइल नंबर / Mobile <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10 digit Mobile No."
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.mobile ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.mobile}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                        }));
                        clearFieldError("mobile");
                      }}
                    />
                    {fieldErrors.mobile && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.mobile}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      लिंग / Gender
                    </Label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gender: e.target.value as any,
                        }))
                      }
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                    >
                      <option value="Female">Female / महिला</option>
                      <option value="Male">Male / पुरुष</option>
                      <option value="Other">Other / अन्य</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Delivery & Child Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  प्रसूति एवं शिशु का विवरण (Delivery & Child Information)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नवजात शिशु का नाम (Child Name)
                    </Label>
                    <Input
                      placeholder="शिशु का नाम (यदि रखा गया हो)"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.childName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, childName: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      शिशु का लिंग (Child Gender)
                    </Label>
                    <select
                      value={formData.childGender}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          childGender: e.target.value as any,
                        }))
                      }
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                    >
                      <option value="">लिंग चुनें / Select Gender</option>
                      <option value="Male">Male / बालक</option>
                      <option value="Female">Female / बालिका</option>
                      <option value="Other">Other / अन्य</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      प्रसूति दिनांक (Delivery Date)
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        placeholder="dd-mm-yyyy"
                        className="text-xs sm:text-sm"
                        value={formData.deliveryDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))
                        }
                      />
                      <Popover open={deliveryDateOpen} onOpenChange={setDeliveryDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="absolute right-0 top-0 h-full px-3">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={deliveryDateObj}
                            onSelect={(date: any) => {
                              if (date) {
                                setDeliveryDateObj(date);
                                setFormData((prev) => ({
                                  ...prev,
                                  deliveryDate: formatDate(date),
                                }));
                              }
                              setDeliveryDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      अस्पताल का नाम / स्थान (Hospital)
                    </Label>
                    <Input
                      placeholder="अस्पताल का नाम दर्ज करें"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.hospitalName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, hospitalName: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Address Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  स्थायी पता (Residential Address Details)
                </h2>

                <PincodeAddressFields
                  pinCode={formData.pinCode}
                  state={formData.state}
                  district={formData.district}
                  tehsil={formData.tehsil}
                  address={formData.address}
                  addressLabel="पूरा पता (Full Address)"
                  addressPlaceholder="मकान नंबर, गली/मोहल्ला, गांव आदि दर्ज करें"
                  addressAsTextarea={true}
                  errors={fieldErrors}
                  onClearError={clearFieldError}
                  onFieldChange={(field, val) => setFormData((prev) => ({ ...prev, [field]: val }))}
                  required={true}
                />

              </div>

              {/* Section 5: Nominee Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  नॉमिनी का विवरण (Nominee Information)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नॉमिनी का नाम (Nominee Name)
                    </Label>
                    <Input
                      placeholder="नॉमिनी का नाम दर्ज करें"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.nomineeName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, nomineeName: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      संबंध / Relation
                    </Label>
                    <Input
                      placeholder="उदा. पति, सास, माता, बहन"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.nomineeRelation}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, nomineeRelation: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नॉमिनी मोबाइल / Mobile
                    </Label>
                    <Input
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10 digit Mobile No."
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.nomineeMobile ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.nomineeMobile}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          nomineeMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                        }));
                        clearFieldError("nomineeMobile");
                      }}
                    />
                    {fieldErrors.nomineeMobile && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nomineeMobile}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नॉमिनी आधार नंबर / Nominee Aadhaar No.
                    </Label>
                    <Input
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="12 digit Aadhaar No."
                      className={`mt-1 text-xs sm:text-sm ${
                        fieldErrors.nomineeAadhar ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={formData.nomineeAadhar}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        setFormData((prev) => ({ ...prev, nomineeAadhar: digits }));
                        clearFieldError("nomineeAadhar");
                      }}
                    />
                    {fieldErrors.nomineeAadhar && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.nomineeAadhar}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 6: E-PIN & Initial Payment Details */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ई-पिन एवं भुगतान विवरण (E-PIN & Payment Details)
                </h2>

                {/* E-PIN Voucher Verification */}
                <div className={`p-4 bg-muted/20 border rounded-lg ${fieldErrors.epinCode ? "border-red-500" : ""}`}>
                  <EpinInputVerifier
                    value={formData.epinCode}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, epinCode: val }));
                      clearFieldError("epinCode");
                    }}
                    onVerified={handleEpinVerified}
                    agentId={formData.selectedAgentId || undefined}
                    schemeCode="JANNI_DELIVERY"
                    required={true}
                    externalError={fieldErrors.epinCode}
                    onClearExternalError={() => clearFieldError("epinCode")}
                  />
                  {fieldErrors.epinCode && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.epinCode}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      प्रारंभिक भुगतान राशि / Initial Amount (₹)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="mt-1 text-xs sm:text-sm"
                      value={formData.paymentAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentAmount: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      भुगतान माध्यम / Payment Mode
                    </Label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentMode: e.target.value as any,
                        }))
                      }
                      className="w-full h-10 border border-gray-200 rounded-md px-3 bg-white mt-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                    >
                      <option value="CASH">Cash / नकद</option>
                      <option value="ONLINE">Online / ऑनलाइन</option>
                      <option value="RAZORPAY">Razorpay</option>
                      <option value="BANK_TRANSFER">Bank Transfer / बैंक ट्रांसफर</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 7: Photos */}
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  फोटो संलग्न करें (Photo Upload)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      माता का पासपोर्ट साइज फोटो (Mother's Photo)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="flex-1 text-xs sm:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0B4A8F]/10 file:text-[#0B4A8F] hover:file:bg-[#0B4A8F]/20 cursor-pointer"
                      />
                      <MediaUploadControl
                        id="janni-mother-photo-camera"
                        mode="image"
                        label="माता का फोटो"
                        standaloneCameraOnly
                        onFileSelect={(file) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const b64 = reader.result as string;
                            setPassportPhotoBase64(b64);
                            setPhotoPreview(b64);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP (Max 5MB)</p>
                    {photoPreview && (
                      <div className="mt-2">
                        <img
                          src={photoPreview}
                          alt="Mother Preview"
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      नॉमिनी फोटो (Nominee Photo)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleNomineePhotoUpload}
                        className="flex-1 text-xs sm:text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0B4A8F]/10 file:text-[#0B4A8F] hover:file:bg-[#0B4A8F]/20 cursor-pointer"
                      />
                      <MediaUploadControl
                        id="janni-nominee-photo-camera"
                        mode="image"
                        label="नॉमिनी फोटो"
                        standaloneCameraOnly
                        onFileSelect={(file) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const b64 = reader.result as string;
                            setNomineePhotoBase64(b64);
                            setNomineePhotoPreview(b64);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP (Max 5MB)</p>
                    {nomineePhotoPreview && (
                      <div className="mt-2">
                        <img
                          src={nomineePhotoPreview}
                          alt="Nominee Preview"
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-[#0B4A8F] hover:bg-[#072E5C] text-white font-medium flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      सहेजें / Save Registration
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
