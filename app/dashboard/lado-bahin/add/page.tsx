"use client";

import React, { useState, useEffect } from "react";
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
  ArrowLeft,
  User,
  MapPin,
  Heart,
  Shield,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import {
  LadoBahinService,
  CreateLadoBahinPayload,
  LadoBahinAccountType,
} from "@/lib/lado-bahin-service";
import { agentRegistrationAPI, post } from "@/lib/api";
import { EpinValidationResponse } from "@/lib/config-types";
import { EpinService } from "@/lib/epin-service";
import { cn, formatDate, formatDateForAPI, parseDateFromDDMMYYYY, validatePhoneNumber } from "@/lib/utils";
import { uploadMediaFile } from "@/lib/upload-client";
import { WorkerSearchSelector, WorkerOption } from "@/components/worker-search-selector";

export default function AddLadoBahinPage() {
  const router = useRouter();

  const convertToYYYYMMDD = (dateString?: string | null): string | null => {
    if (!dateString || !dateString.trim()) return null;
    const trimmed = dateString.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.split("T")[0];
    const parsedDate = parseDateFromDDMMYYYY(trimmed);
    if (!parsedDate || isNaN(parsedDate.getTime())) return null;
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<WorkerOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Date Popover States
  const [appDateOpen, setAppDateOpen] = useState(false);
  const [appDateObj, setAppDateObj] = useState<Date | undefined>(new Date());
  const [dobOpen, setDobOpen] = useState(false);
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [muklawaDateOpen, setMuklawaDateOpen] = useState(false);
  const [muklawaDateObj, setMuklawaDateObj] = useState<Date | undefined>(undefined);

  // Field Validation Error States
  const [aadharError, setAadharError] = useState("");
  const [nomineeAadharError, setNomineeAadharError] = useState("");

  // Form State
  const [formData, setFormData] = useState<{
    applicationDate: string;
    offlineFormNumber: string;
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
    muklawaDate: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineeMobile: string;
    nomineeAadhar: string;
    gender: "Female" | "Male" | "Other";
    category: "A" | "B" | "C" | "D" | "E" | "F";
    schemeType: "LADO_BAHIN";
    pool: "FEMALE_POOL";
    accountType: LadoBahinAccountType;
    membershipFee: number;
    paymentAmount: string;
    paymentMode: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
    selectedAgentId: string;
    epinCode: string;
  }>({
    applicationDate: formatDate(new Date()),
    offlineFormNumber: "",
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
    muklawaDate: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    nomineeAadhar: "",
    gender: "Female",
    category: "A",
    schemeType: "LADO_BAHIN",
    pool: "FEMALE_POOL",
    accountType: "LADO_BAHIN_300",
    membershipFee: 5100,
    paymentAmount: "0",
    paymentMode: "CASH",
    selectedAgentId: "",
    epinCode: "",
  });

  // Photo state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nomineePhotoBase64, setNomineePhotoBase64] = useState<string | null>(null);
  const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);

  // E-PIN Validation State
  const [epinVerified, setEpinVerified] = useState<EpinValidationResponse | null>(null);

  const handleEpinVerified = (result: EpinValidationResponse | null) => {
    setEpinVerified(result);
    if (result && result.valid && result.schemeAmount) {
      toast.success(
        `E-PIN Validated: ₹${result.schemeAmount.toLocaleString("hi-IN")} voucher applied / ई-पिन स्वीकृत`
      );
    }
  };

  // Load agents on component mount (matching General Marriage & Mayra reference pattern)
  useEffect(() => {
    let isMounted = true;
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        const response = await post("?apicall=getAgents").catch(() => null);
        let list: any[] = [];
        if (response?.data?.status && Array.isArray(response.data.data)) {
          list = response.data.data;
        } else {
          const apiRes = await agentRegistrationAPI.getAll().catch(() => null);
          if (apiRes && Array.isArray(apiRes.data)) {
            list = apiRes.data;
          }
        }

        if (isMounted && list.length > 0) {
          setAgents(
            list.map((a: any) => ({
              ...a,
              id: String(a.id || a.userId || a.user_id || a.user?.id),
              name: a.name || a.applicantName || "Worker",
              mobile: a.mobile || a.mobileNumber || "",
              offlineFormNumber:
                a.offlineFormNumber ||
                a.offline_form_number ||
                a.agentProfile?.offlineFormNumber ||
                "",
              level: a.level || a.agentProfile?.level || a.hierarchy?.level,
            }))
          );
        }
      } catch (err: any) {
        console.warn("Could not load agents list:", err);
      } finally {
        if (isMounted) setLoadingAgents(false);
      }
    };

    fetchAgents();
    return () => {
      isMounted = false;
    };
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
    return age >= 0 ? String(age) : "";
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "dateOfBirth") {
        next.age = calculateAgeFromDate(value);
      }
      return next;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("कृपया केवल इमेज फाइल चुनें (JPEG/PNG) / Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("फोटो का आकार 5MB से कम होना चाहिए / Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPassportPhotoBase64(result);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPassportPhotoBase64(null);
    setPhotoPreview(null);
  };

  const handleNomineePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("कृपया केवल इमेज फाइल चुनें (JPEG/PNG) / Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("फोटो का आकार 5MB से कम होना चाहिए / Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNomineePhotoBase64(result);
      setNomineePhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const removeNomineePhoto = () => {
    setNomineePhotoBase64(null);
    setNomineePhotoPreview(null);
  };

  const selectedWorker = agents.find(
    (a) => String(a.id) === String(formData.selectedAgentId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.applicantName.trim()) {
      toast.error("कृपया आवेदक का नाम दर्ज करें / Please enter Applicant Name");
      return;
    }
    if (!formData.fatherName.trim() && !formData.husbandName.trim()) {
      toast.error("कृपया पिता या पति का नाम दर्ज करें / Please enter Father or Husband Name");
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error("कृपया मोबाइल नंबर दर्ज करें / Please enter Mobile Number");
      return;
    }
    if (!validatePhoneNumber(formData.mobile)) {
      toast.error("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें / Invalid 10-digit mobile number");
      return;
    }

    let hasAadhaarError = false;
    const aadharDigits = (formData.aadharNumber || "").replace(/\D/g, "");
    const nomineeAadharDigits = (formData.nomineeAadhar || "").replace(/\D/g, "");

    if (!formData.aadharNumber.trim() || aadharDigits.length !== 12) {
      setAadharError("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Please enter a valid 12-digit Aadhaar number");
      hasAadhaarError = true;
    } else {
      setAadharError("");
    }

    if (formData.nomineeAadhar.trim() && nomineeAadharDigits.length !== 12) {
      setNomineeAadharError("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Please enter a valid 12-digit Aadhaar number");
      hasAadhaarError = true;
    } else {
      setNomineeAadharError("");
    }

    if (hasAadhaarError) {
      toast.error("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Please enter valid 12-digit Aadhaar number");
      return;
    }
    if (!formData.district.trim()) {
      toast.error("कृपया जिला चुनें या दर्ज करें / Please enter District");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("कृपया पता दर्ज करें / Please enter Address");
      return;
    }
    if (!formData.selectedAgentId) {
      toast.error("कृपया कार्यकर्ता / एजेंट चुनें / Please select a worker");
      return;
    }

    // E-PIN Validation guard: If E-PIN is entered, it MUST be successfully verified
    if (formData.epinCode.trim() && epinVerified && !epinVerified.valid) {
      toast.error(
        epinVerified?.message ||
          "ई-पिन अमान्य है / Invalid E-PIN. कृपया पंजीकरण सुरक्षित करने से पहले ई-पिन सत्यापित करें"
      );
      return;
    }
    if (formData.epinCode.trim() && !epinVerified) {
      toast.error(
        "कृपया पंजीकरण सुरक्षित करने से पहले ई-पिन सत्यापित करें / Please verify the E-PIN before submitting"
      );
      return;
    }

    setIsLoading(true);

    try {
      const normalizedMuklawa = convertToYYYYMMDD(formData.muklawaDate);
      let finalPassportUrl = passportPhotoBase64 || null;
      if (passportPhotoBase64 && passportPhotoBase64.startsWith("data:")) {
        try {
          const uploadRes = await uploadMediaFile(passportPhotoBase64, {
            category: "passport",
            entityType: "lado_bahin",
          });
          if (uploadRes.success && uploadRes.url) {
            finalPassportUrl = uploadRes.url;
          }
        } catch (err) {
          console.warn("Lado Bahin passport upload note:", err);
        }
      }

      let finalNomineeUrl = nomineePhotoBase64 || null;
      if (nomineePhotoBase64 && nomineePhotoBase64.startsWith("data:")) {
        try {
          const uploadRes = await uploadMediaFile(nomineePhotoBase64, {
            category: "nominee",
            entityType: "lado_bahin",
          });
          if (uploadRes.success && uploadRes.url) {
            finalNomineeUrl = uploadRes.url;
          }
        } catch (err) {
          console.warn("Lado Bahin nominee upload note:", err);
        }
      }

      const activeEpin = formData.epinCode.trim() || null;
      const resolvedAgentId = formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined;

      const payload: CreateLadoBahinPayload = {
        applicationDate: convertToYYYYMMDD(formData.applicationDate) || formatDateForAPI(new Date()),
        offlineFormNumber: formData.offlineFormNumber.trim() || null,
        offline_form_number: formData.offlineFormNumber.trim() || null,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || null,
        motherName: formData.motherName.trim() || null,
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        age: formData.age ? Number(formData.age) : null,
        aadharNumber: formData.aadharNumber.replace(/\D/g, ""),
        gotra: formData.gotra.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        pinCode: formData.pinCode.trim(),
        tehsil: formData.tehsil.trim(),
        district: formData.district.trim(),
        state: formData.state.trim() || "Rajasthan",
        muklawaDate: normalizedMuklawa,
        muklawa_date: normalizedMuklawa,
        nomineeName: formData.nomineeName.trim() || null,
        nomineeRelation: formData.nomineeRelation.trim() || null,
        nomineeMobile: formData.nomineeMobile.trim() || null,
        nomineeAadhar: formData.nomineeAadhar.replace(/\D/g, "") || null,
        passportPhotoUrl: finalPassportUrl,
        nomineePhotoUrl: finalNomineeUrl,
        nominee_photo_url: finalNomineeUrl,
        gender: "Female",
        category: formData.category,
        schemeType: "LADO_BAHIN",
        pool: "FEMALE_POOL",
        accountType: formData.accountType,
        initialAccountType: formData.accountType,
        membershipFee: 5100,
        grantFee: 5100,
        totalAmount: 5100,
        paymentAmount: epinVerified?.valid ? 5100 : (Number(formData.paymentAmount) || 0),
        paymentMode: formData.paymentMode,
        selectedAgentId: formData.selectedAgentId || undefined,
        addedById: formData.selectedAgentId || undefined,
        agentId: formData.selectedAgentId || undefined,
        addedby_id: formData.selectedAgentId || undefined,
        epinCode: formData.epinCode.trim() || null,
        pinNumber: formData.epinCode.trim() || null,
        epin: formData.epinCode.trim() || null,
      };

      const res = await LadoBahinService.createRegistration(payload);
      if (res && res.data) {
        toast.success("लाडो बहिन पंजीयन सफलतापूर्वक दर्ज किया गया / Registration created successfully");

        // Atomically consume E-PIN post-registration if applied
        if (activeEpin) {
          try {
            await EpinService.consumeEpin({
              pinNumber: activeEpin,
              applicationId: String(res.data.id || res.data.formNumber || ""),
              applicantName: formData.applicantName,
              agentId: resolvedAgentId,
              moduleType: "lado_bahin",
              remarks: "Consumed for Lado Bahin Registration",
            });
          } catch (epinErr) {
            console.error("E-PIN post-registration consumption note:", epinErr);
          }
        }

        router.push("/dashboard/lado-bahin");
      } else {
        throw new Error(res?.message || "Failed to create registration");
      }
    } catch (err: any) {
      console.error("Error creating registration:", err);
      toast.error(err.message || "पंजीकरण विफल रहा / Failed to create registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard requiredModule="lado_bahin" requiredAction="create">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section matching General Marriage Add Form */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/dashboard/lado-bahin")}
                  disabled={isLoading}
                  className="p-0 h-auto text-primary"
                >
                  ← वापस जाएं / Go Back
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
                  नया लाडो बहिन पंजीयन (New Lado Bahin Registration)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  लाडो बहिन (मुकलावा) सहायता योजना पंजीयन फॉर्म भरें / Add New Lado Bahin Registration
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Scheme & Application Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    1. आवेदन एवं योजना विवरण (Application & Scheme Details)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Application Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="applicationDate" className="text-xs sm:text-sm font-semibold text-foreground">
                      आवेदन दिनांक (Application Date) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="applicationDate"
                        value={formData.applicationDate}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value;
                          const date = parseDateFromDDMMYYYY(str);
                          if (date) {
                            setAppDateObj(date);
                            handleInputChange("applicationDate", formatDate(date));
                          } else {
                            setAppDateObj(undefined);
                            handleInputChange("applicationDate", str);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setAppDateOpen(true);
                          }
                        }}
                        required
                      />
                      <Popover open={appDateOpen} onOpenChange={setAppDateOpen}>
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
                            selected={appDateObj}
                            captionLayout="dropdown"
                            month={appDateObj}
                            onMonthChange={setAppDateObj}
                            onSelect={(date: any) => {
                              setAppDateObj(date);
                              handleInputChange("applicationDate", date ? formatDate(date) : "");
                              setAppDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Offline Form Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="offlineFormNumber" className="text-xs sm:text-sm font-semibold text-foreground">
                      ऑफलाइन फॉर्म नं. (Offline Form No.)
                    </Label>
                    <Input
                      id="offlineFormNumber"
                      name="offlineFormNumber"
                      value={formData.offlineFormNumber}
                      placeholder="उदा. 1259"
                      maxLength={50}
                      onChange={(e) => handleInputChange("offlineFormNumber", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      श्रेणी (Category) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="A">Category A</option>
                      <option value="B">Category B</option>
                      <option value="C">Category C</option>
                      <option value="D">Category D</option>
                      <option value="E">Category E</option>
                      <option value="F">Category F</option>
                    </select>
                  </div>

                  {/* Account Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      खाता प्रकार (Account Type) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => handleInputChange("accountType", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="LADO_BAHIN_300">लाडो बहिन ₹300 (मासिक)</option>
                      <option value="LADO_BAHIN_1000">लाडो बहिन ₹1000 (मासिक)</option>
                    </select>
                  </div>

                  {/* Scheme Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">योजना प्रकार (Scheme Type)</Label>
                    <Input
                      value="लाडो बहिन योजना (LADO_BAHIN)"
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-medium"
                    />
                  </div>

                  {/* Pool */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">पूल प्रकार (Pool Type)</Label>
                    <Input
                      value="फीमेल पूल (FEMALE_POOL)"
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Personal & Family Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    2. व्यक्तिगत एवं पारिवारिक विवरण (Personal & Family Details)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Applicant Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="applicantName" className="text-xs sm:text-sm font-semibold text-foreground">
                      आवेदक का नाम (Applicant Name) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="applicantName"
                      placeholder="आवेदक का पूरा नाम"
                      value={formData.applicantName}
                      onChange={(e) => handleInputChange("applicantName", e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>

                  {/* Father Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fatherName" className="text-xs sm:text-sm font-semibold text-foreground">
                      पिता का नाम (Father Name)
                    </Label>
                    <Input
                      id="fatherName"
                      placeholder="पिता का पूरा नाम"
                      value={formData.fatherName}
                      onChange={(e) => handleInputChange("fatherName", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Husband Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="husbandName" className="text-xs sm:text-sm font-semibold text-foreground">
                      पति का नाम (Husband Name)
                    </Label>
                    <Input
                      id="husbandName"
                      placeholder="पति का पूरा नाम (यदि विवाहित हों)"
                      value={formData.husbandName}
                      onChange={(e) => handleInputChange("husbandName", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Mother Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="motherName" className="text-xs sm:text-sm font-semibold text-foreground">
                      माता का नाम (Mother Name)
                    </Label>
                    <Input
                      id="motherName"
                      placeholder="माता का पूरा नाम"
                      value={formData.motherName}
                      onChange={(e) => handleInputChange("motherName", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth" className="text-xs sm:text-sm font-semibold text-foreground">
                      जन्म तिथि (Date of Birth)
                    </Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="dateOfBirth"
                        value={formData.dateOfBirth}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value;
                          const date = parseDateFromDDMMYYYY(str);
                          if (date) {
                            setDobObj(date);
                            handleInputChange("dateOfBirth", formatDate(date));
                          } else {
                            setDobObj(undefined);
                            handleInputChange("dateOfBirth", str);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setDobOpen(true);
                          }
                        }}
                      />
                      <Popover open={dobOpen} onOpenChange={setDobOpen}>
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
                            selected={dobObj}
                            captionLayout="dropdown"
                            month={dobObj}
                            onMonthChange={setDobObj}
                            onSelect={(date: any) => {
                              setDobObj(date);
                              handleInputChange("dateOfBirth", date ? formatDate(date) : "");
                              setDobOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Age */}
                  <div className="space-y-1.5">
                    <Label htmlFor="age" className="text-xs sm:text-sm font-semibold text-foreground">
                      उम्र (Age)
                    </Label>
                    <Input
                      id="age"
                      value={formData.age}
                      readOnly
                      placeholder="स्वतः गणना"
                      className="h-10 bg-muted font-medium text-foreground cursor-not-allowed"
                    />
                  </div>

                  {/* Muklawa Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="muklawaDate" className="text-xs sm:text-sm font-semibold text-foreground">
                      मुकलावा दिनांक (Muklawa Date)
                    </Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="muklawaDate"
                        value={formData.muklawaDate}
                        placeholder="dd-mm-yyyy"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const str = e.target.value;
                          const date = parseDateFromDDMMYYYY(str);
                          if (date) {
                            setMuklawaDateObj(date);
                            handleInputChange("muklawaDate", formatDate(date));
                          } else {
                            setMuklawaDateObj(undefined);
                            handleInputChange("muklawaDate", str);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setMuklawaDateOpen(true);
                          }
                        }}
                      />
                      <Popover open={muklawaDateOpen} onOpenChange={setMuklawaDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="muklawaDate-picker"
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
                            selected={muklawaDateObj}
                            captionLayout="dropdown"
                            month={muklawaDateObj}
                            onMonthChange={setMuklawaDateObj}
                            onSelect={(date: any) => {
                              setMuklawaDateObj(date);
                              handleInputChange("muklawaDate", date ? formatDate(date) : "");
                              setMuklawaDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Gotra */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gotra" className="text-xs sm:text-sm font-semibold text-foreground">
                      गोत्र (Gotra) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="gotra"
                      placeholder="उदा. प्रजापत / सुथार"
                      value={formData.gotra}
                      onChange={(e) => handleInputChange("gotra", e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs sm:text-sm font-semibold text-foreground">
                      मोबाइल नंबर (Mobile) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      placeholder="10 अंकों का मोबाइल नंबर"
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        handleInputChange("mobile", digits);
                      }}
                      required
                      className="h-10"
                    />
                  </div>

                  {/* Aadhaar Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="aadharNumber" className="text-xs sm:text-sm font-semibold text-foreground">
                      आधार नंबर (Aadhaar Number) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="aadharNumber"
                      type="tel"
                      inputMode="numeric"
                      placeholder="12 अंकों का आधार नंबर"
                      maxLength={12}
                      value={formData.aadharNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        handleInputChange("aadharNumber", digits);
                        if (aadharError) {
                          if (!digits || digits.length === 12) {
                            setAadharError("");
                          }
                        }
                      }}
                      required
                      className={cn("h-10", aadharError && "border-rose-500 focus-visible:ring-rose-500")}
                    />
                    {aadharError && (
                      <p className="text-xs text-rose-500 mt-1">{aadharError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Address & Location Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    3. पता एवं स्थान विवरण (Address & Location Details)
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs sm:text-sm font-semibold text-foreground">
                      पूर्ण पता (Full Address) <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="मकान नं., गली/मोहल्ला, गाँव/वार्ड विवरण"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      required
                      className="min-h-[70px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* State */}
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs sm:text-sm font-semibold text-foreground">
                        राज्य (State) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    {/* District */}
                    <div className="space-y-1.5">
                      <Label htmlFor="district" className="text-xs sm:text-sm font-semibold text-foreground">
                        जिला (District) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="district"
                        placeholder="जिला दर्ज करें"
                        value={formData.district}
                        onChange={(e) => handleInputChange("district", e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    {/* Tehsil */}
                    <div className="space-y-1.5">
                      <Label htmlFor="tehsil" className="text-xs sm:text-sm font-semibold text-foreground">
                        तहसील (Tehsil) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="tehsil"
                        placeholder="तहसील दर्ज करें"
                        value={formData.tehsil}
                        onChange={(e) => handleInputChange("tehsil", e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    {/* Pin Code */}
                    <div className="space-y-1.5">
                      <Label htmlFor="pinCode" className="text-xs sm:text-sm font-semibold text-foreground">
                        पिन कोड (Pin Code) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="pinCode"
                        type="tel"
                        inputMode="numeric"
                        placeholder="6 अंकों का पिन कोड"
                        maxLength={6}
                        value={formData.pinCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                          handleInputChange("pinCode", digits);
                        }}
                        required
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Nominee Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Heart className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    4. नामांकित विवरण (Nominee Details)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Nominee Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nomineeName" className="text-xs sm:text-sm font-semibold text-foreground">
                      नामांकित का नाम (Nominee Name)
                    </Label>
                    <Input
                      id="nomineeName"
                      placeholder="नामांकित व्यक्ति का नाम"
                      value={formData.nomineeName}
                      onChange={(e) => handleInputChange("nomineeName", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Relation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      संबंध (Relationship)
                    </Label>
                    <select
                      value={formData.nomineeRelation}
                      onChange={(e) => handleInputChange("nomineeRelation", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">संबंध चुनें / Select</option>
                      <option value="पति (Husband)">पति (Husband)</option>
                      <option value="पिता (Father)">पिता (Father)</option>
                      <option value="माता (Mother)">माता (Mother)</option>
                      <option value="पुत्र (Son)">पुत्र (Son)</option>
                      <option value="पुत्री (Daughter)">पुत्री (Daughter)</option>
                      <option value="भाई (Brother)">भाई (Brother)</option>
                      <option value="अन्य (Other)">अन्य (Other)</option>
                    </select>
                  </div>

                  {/* Nominee Mobile */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nomineeMobile" className="text-xs sm:text-sm font-semibold text-foreground">
                      नामांकित मोबाइल (Nominee Mobile)
                    </Label>
                    <Input
                      id="nomineeMobile"
                      type="tel"
                      inputMode="numeric"
                      placeholder="10 अंकों का मोबाइल"
                      maxLength={10}
                      value={formData.nomineeMobile}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        handleInputChange("nomineeMobile", digits);
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Nominee Aadhaar */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nomineeAadhar" className="text-xs sm:text-sm font-semibold text-foreground">
                      नामांकित आधार (Nominee Aadhaar)
                    </Label>
                    <Input
                      id="nomineeAadhar"
                      type="tel"
                      inputMode="numeric"
                      placeholder="12 अंकों का आधार"
                      maxLength={12}
                      value={formData.nomineeAadhar}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        handleInputChange("nomineeAadhar", digits);
                        if (nomineeAadharError) {
                          if (!digits || digits.length === 12) {
                            setNomineeAadharError("");
                          }
                        }
                      }}
                      className={cn("h-10", nomineeAadharError && "border-rose-500 focus-visible:ring-rose-500")}
                    />
                    {nomineeAadharError && (
                      <p className="text-xs text-rose-500 mt-1">{nomineeAadharError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Photo Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Upload className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    5. फोटो विवरण (Photo Details)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Applicant Photo */}
                  <div className="space-y-3 p-4 rounded-lg border border-border/40 bg-muted/10">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground block">
                      आवेदक फोटो (Applicant Photo)
                    </Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {photoPreview ? (
                        <div className="relative w-24 h-32 rounded-lg border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="Applicant Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-xs hover:bg-rose-700 shadow-xs"
                            title="फोटो हटाएं / Remove Photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/30 shrink-0">
                          <User className="w-7 h-7 opacity-40 mb-1" />
                          <span className="text-[10px]">फोटो नहीं है</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="passport-photo-upload" className="cursor-pointer inline-block">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-sm font-medium transition-colors">
                              <Upload className="w-4 h-4" />
                              <span>{photoPreview ? "फोटो बदलें / Replace" : "फोटो चुनें / Choose"}</span>
                            </div>
                            <input
                              id="passport-photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </Label>
                          <MediaUploadControl
                            mode="image"
                            standaloneCameraOnly
                            onFileSelect={(file) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const result = reader.result as string;
                                setPassportPhotoBase64(result);
                                setPhotoPreview(result);
                              };
                              reader.readAsDataURL(file);
                            }}
                            label="कैमरा से लें"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          पासपोर्ट साइज फोटो (JPG, PNG). अधिकतम 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nominee Photo */}
                  <div className="space-y-3 p-4 rounded-lg border border-border/40 bg-muted/10">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground block">
                      नामांकित फोटो (Nominee Photo)
                    </Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {nomineePhotoPreview ? (
                        <div className="relative w-24 h-32 rounded-lg border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={nomineePhotoPreview}
                            alt="Nominee Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeNomineePhoto}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-xs hover:bg-rose-700 shadow-xs"
                            title="फोटो हटाएं / Remove Photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/30 shrink-0">
                          <User className="w-7 h-7 opacity-40 mb-1" />
                          <span className="text-[10px]">फोटो नहीं है</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="nominee-photo-upload" className="cursor-pointer inline-block">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-sm font-medium transition-colors">
                              <Upload className="w-4 h-4" />
                              <span>{nomineePhotoPreview ? "फोटो बदलें / Replace" : "फोटो चुनें / Choose"}</span>
                            </div>
                            <input
                              id="nominee-photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleNomineePhotoUpload}
                            />
                          </Label>
                          <MediaUploadControl
                            mode="image"
                            standaloneCameraOnly
                            onFileSelect={(file) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const result = reader.result as string;
                                setNomineePhotoBase64(result);
                                setNomineePhotoPreview(result);
                              };
                              reader.readAsDataURL(file);
                            }}
                            label="कैमरा से लें"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          नामांकित पासपोर्ट फोटो (JPG, PNG). अधिकतम 5MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. E-PIN & Worker Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    6. ई-पिन एवं कार्यकर्ता विवरण (E-PIN & Worker Details)
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Worker / Agent Selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="selectedAgentId" className="text-xs sm:text-sm font-semibold text-foreground">
                      कार्यकर्ता / एजेंट (Worker / Agent) <span className="text-rose-500">*</span>
                    </Label>
                    <WorkerSearchSelector
                      id="selectedAgentId"
                      value={formData.selectedAgentId}
                      onValueChange={(val) => {
                        handleInputChange("selectedAgentId", val);
                        // Invalidate previous E-PIN verification when agent changes
                        setEpinVerified(null);
                      }}
                      agents={agents}
                      isLoading={loadingAgents}
                      disabled={loadingAgents}
                      defaultOption={{
                        value: "",
                        label: "स्वयं / Self",
                        secondary: "No Specific Worker",
                      }}
                      placeholder="कार्यकर्ता चुनें / Select Worker"
                    />
                  </div>

                  {/* Selected Worker Info Summary Box */}
                  {selectedWorker && (
                    <div className="p-3.5 bg-muted/40 rounded-lg border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          {selectedWorker.name}
                        </p>
                        <p className="text-muted-foreground">
                          Mobile: {selectedWorker.mobile || "N/A"}
                        </p>
                      </div>
                      {selectedWorker.offlineFormNumber && (
                        <span className="px-2.5 py-1 bg-primary/10 text-primary font-mono font-medium rounded-md">
                          Code / Form: {selectedWorker.offlineFormNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* E-PIN Verifier Component */}
                  <div className="p-4 bg-muted/20 border rounded-lg space-y-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      ई-पिन वाउचर (E-PIN Voucher)
                    </Label>
                    <EpinInputVerifier
                      value={formData.epinCode}
                      onChange={(val) => {
                        handleInputChange("epinCode", val);
                        // Reset verification if E-PIN code text is modified
                        setEpinVerified(null);
                      }}
                      onVerified={handleEpinVerified}
                      disabled={isLoading}
                      agentId={formData.selectedAgentId || undefined}
                    />

                    {epinVerified && epinVerified.valid && (
                      <div className="mt-2 flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-md">
                        <span className="flex items-center font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                          E-PIN Status: Verified
                        </span>
                        <span className="font-semibold">
                          Voucher Amount: ₹{(epinVerified.schemeAmount || 5100).toLocaleString("hi-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. Financial Status & Payment Details Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    7. वित्तीय स्थिति (Financial Status)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Total Membership Fee */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      कुल सदस्यता शुल्क (Membership Fee)
                    </Label>
                    <Input
                      value="₹5,100"
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Initial Paid Amount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      प्रारंभिक जमा राशि (Initial Paid Amount)
                    </Label>
                    <Input
                      placeholder="₹ 0"
                      type="number"
                      value={epinVerified?.valid ? "5100" : formData.paymentAmount}
                      disabled={Boolean(epinVerified?.valid)}
                      onChange={(e) => handleInputChange("paymentAmount", e.target.value)}
                      className={cn("h-10", epinVerified?.valid && "bg-muted cursor-not-allowed font-medium")}
                    />
                    {epinVerified?.valid && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        ✓ ई-पिन द्वारा ₹5,100 पूर्णतः समाहित / Covered by E-PIN voucher
                      </p>
                    )}
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      भुगतान माध्यम (Payment Mode)
                    </Label>
                    <select
                      value={formData.paymentMode}
                      disabled={Boolean(epinVerified?.valid)}
                      onChange={(e) => handleInputChange("paymentMode", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:cursor-not-allowed"
                    >
                      <option value="CASH">नकद (CASH)</option>
                      <option value="ONLINE">ऑनलाइन (ONLINE)</option>
                      <option value="BANK_TRANSFER">बैंक ट्रांसफर (BANK_TRANSFER)</option>
                      <option value="RAZORPAY">रेज़रपे (RAZORPAY)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/lado-bahin")}
                  className="w-full sm:w-auto h-11 px-6 border-border/80"
                  disabled={isLoading}
                >
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      सुरक्षित किया जा रहा है... / Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      पंजीकरण सुरक्षित करें / Save Registration
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
