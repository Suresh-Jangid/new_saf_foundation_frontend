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
  Building,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import {
  LadoBahinService,
  CreateLadoBahinPayload,
  LadoBahinAccountType,
} from "@/lib/lado-bahin-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { EpinValidationResponse } from "@/lib/config-types";
import { formatDate, parseDateFromDDMMYYYY, validatePhoneNumber } from "@/lib/utils";

export default function AddLadoBahinPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; mobile: string }>>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Date Popover States
  const [appDateOpen, setAppDateOpen] = useState(false);
  const [appDateObj, setAppDateObj] = useState<Date | undefined>(new Date());
  const [dobOpen, setDobOpen] = useState(false);
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [muklawaDateOpen, setMuklawaDateOpen] = useState(false);
  const [muklawaDateObj, setMuklawaDateObj] = useState<Date | undefined>(undefined);

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

  // E-PIN Validation State
  const [epinVerified, setEpinVerified] = useState<EpinValidationResponse | null>(null);

  const handleEpinVerified = (result: EpinValidationResponse | null) => {
    setEpinVerified(result);
    if (result && result.valid && result.schemeAmount) {
      toast.success(
        `E-PIN Validated: ₹${result.schemeAmount.toLocaleString("hi-IN")} voucher applied / ई-पिन मान्य है`
      );
    }
  };

  // Load agents if Admin
  useEffect(() => {
    if (isAdmin()) {
      setLoadingAgents(true);
      agentRegistrationAPI
        .getAll()
        .then((res: any) => {
          if (res && res.data && Array.isArray(res.data)) {
            setAgents(
              res.data.map((a: any) => ({
                id: String(a.id || a.user_id),
                name: a.name || a.applicantName || "Agent",
                mobile: a.mobile || a.mobileNumber || "",
              }))
            );
          }
        })
        .catch((err: any) => {
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
    return age >= 0 ? String(age) : "";
  };

  const handleInputChange = (
    field: string,
    value: any
  ) => {
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
      toast.error("कृपया केवल इमेज फाइल अपलोड करें (JPEG/PNG) / Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("इमेज का आकार 5MB से कम होना चाहिए / Image must be under 5MB");
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
    if (!formData.aadharNumber.trim() || formData.aadharNumber.replace(/\D/g, "").length !== 12) {
      toast.error("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Invalid 12-digit Aadhaar number");
      return;
    }
    if (!formData.district.trim()) {
      toast.error("कृपया जिला चुनें / Please enter District");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("कृपया पता दर्ज करें / Please enter Address");
      return;
    }

    setIsLoading(true);

    try {
      const payload: CreateLadoBahinPayload = {
        applicationDate: formData.applicationDate,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || null,
        motherName: formData.motherName.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        age: formData.age ? Number(formData.age) : null,
        aadharNumber: formData.aadharNumber.replace(/\D/g, ""),
        gotra: formData.gotra.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        pinCode: formData.pinCode.trim(),
        tehsil: formData.tehsil.trim(),
        district: formData.district.trim(),
        state: formData.state.trim() || "Rajasthan",
        muklawaDate: formData.muklawaDate || null,
        nomineeName: formData.nomineeName.trim() || null,
        nomineeRelation: formData.nomineeRelation.trim() || null,
        nomineeMobile: formData.nomineeMobile.trim() || null,
        nomineeAadhar: formData.nomineeAadhar.replace(/\D/g, "") || null,
        passportPhotoUrl: passportPhotoBase64 || null,
        gender: "Female",
        category: formData.category,
        schemeType: "LADO_BAHIN",
        pool: "FEMALE_POOL",
        accountType: formData.accountType,
        membershipFee: 5100,
        grantFee: 5100,
        totalAmount: 5100,
        paymentAmount: Number(formData.paymentAmount) || 0,
        paymentMode: formData.paymentMode,
        epinCode: formData.epinCode.trim() || null,
        selectedAgentId: formData.selectedAgentId || undefined,
      };

      const res = await LadoBahinService.createRegistration(payload);
      if (res && res.data) {
        toast.success("लाडो बहिन पंजीकरण सफलतापूर्वक सुरक्षित किया गया / Registration created successfully");
        router.push("/dashboard/lado-bahin");
      } else {
        throw new Error(res?.message || "Failed to create registration");
      }
    } catch (err: any) {
      console.error("Error creating registration:", err);
      toast.error(err.message || "पंजीकरण सुरक्षित करने में विफल / Failed to create registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard requiredModule="lado_bahin" requiredAction="create">
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/dashboard/lado-bahin")}
              className="h-9 w-9 rounded-lg border-border/60"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                नया लाडो बहिन पंजीकरण (New Lado Bahin Registration)
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                लाडो बहिन (मुकलावा) सहायता योजना के लिए नया आवेदन दर्ज करें
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Scheme & Application Details Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                1. आवेदन एवं योजना विवरण (Application & Scheme Details)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Application Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  आवेदन दिनांक (Application Date) <span className="text-rose-500">*</span>
                </Label>
                <Popover open={appDateOpen} onOpenChange={setAppDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-input bg-background"
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.applicationDate || "दिनांक चुनें / Select Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appDateObj}
                      onSelect={(date) => {
                        setAppDateObj(date);
                        if (date) {
                          handleInputChange("applicationDate", formatDate(date));
                        }
                        setAppDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
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
                <Label className="text-xs font-semibold text-foreground">
                  खाता प्रकार (Account Type) <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={formData.accountType}
                  onChange={(e) => handleInputChange("accountType", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="LADO_BAHIN_300">लाडो बहिन ₹300 (मासिक / Monthly)</option>
                  <option value="LADO_BAHIN_1000">लाडो बहिन ₹1000 (मासिक / Monthly)</option>
                </select>
              </div>

              {/* Scheme Type (Fixed) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">योजना (Scheme)</Label>
                <Input
                  value="लाडो बहिन (LADO_BAHIN)"
                  disabled
                  className="h-10 bg-muted text-muted-foreground font-medium"
                />
              </div>

              {/* Pool (Fixed) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">पूल (Pool)</Label>
                <Input
                  value="महिला पूल (FEMALE_POOL)"
                  disabled
                  className="h-10 bg-muted text-muted-foreground font-medium"
                />
              </div>

              {/* Scheme Value (Fixed) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">योजना राशि (Scheme Fee)</Label>
                <Input
                  value="₹5,100"
                  disabled
                  className="h-10 bg-muted text-muted-foreground font-semibold"
                />
              </div>
            </div>
          </div>

          {/* 2. Personal & Family Details Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                2. व्यक्तिगत एवं पारिवारिक विवरण (Personal & Family Details)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Applicant Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  आवेदक का नाम (Applicant Name) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="उदा. सुनीता प्रजापत"
                  value={formData.applicantName}
                  onChange={(e) => handleInputChange("applicantName", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Father Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  पिता का नाम (Father&apos;s Name) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="उदा. रमेश प्रजापत"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange("fatherName", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Husband Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  पति का नाम (Husband&apos;s Name)
                </Label>
                <Input
                  placeholder="उदा. विक्रम प्रजापत"
                  value={formData.husbandName}
                  onChange={(e) => handleInputChange("husbandName", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Mother Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  माता का नाम (Mother&apos;s Name)
                </Label>
                <Input
                  placeholder="उदा. शांति देवी"
                  value={formData.motherName}
                  onChange={(e) => handleInputChange("motherName", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  जन्म दिनांक (Date of Birth)
                </Label>
                <Popover open={dobOpen} onOpenChange={setDobOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-input bg-background"
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.dateOfBirth || "जन्म दिनांक चुनें"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dobObj}
                      onSelect={(date) => {
                        setDobObj(date);
                        if (date) {
                          handleInputChange("dateOfBirth", formatDate(date));
                        }
                        setDobOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  उम्र (Age in Years)
                </Label>
                <Input
                  placeholder="उदा. 24"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Gotra */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  गोत्र (Gotra) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="उदा. प्रजापत"
                  value={formData.gotra}
                  onChange={(e) => handleInputChange("gotra", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Aadhaar Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  आधार कार्ड संख्या (Aadhaar Number) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="12 अंकों का आधार नंबर"
                  maxLength={14}
                  value={formData.aadharNumber}
                  onChange={(e) => handleInputChange("aadharNumber", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  मोबाइल नंबर (Mobile Number) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="10 अंकों का मोबाइल नंबर"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Muklawa Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  मुकलावा दिनांक (Muklawa Date)
                </Label>
                <Popover open={muklawaDateOpen} onOpenChange={setMuklawaDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-input bg-background"
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.muklawaDate || "मुकलावा दिनांक चुनें"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={muklawaDateObj}
                      onSelect={(date) => {
                        setMuklawaDateObj(date);
                        if (date) {
                          handleInputChange("muklawaDate", formatDate(date));
                        }
                        setMuklawaDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Gender (Fixed) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">लिंग (Gender)</Label>
                <Input
                  value="महिला (Female)"
                  disabled
                  className="h-10 bg-muted text-muted-foreground font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. Address & Location Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                3. पता एवं स्थान विवरण (Address & Location Details)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  पूरा पता (Full Address) <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  placeholder="मकान नं., गली, गाँव/मोहल्ला"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  तहसील (Tehsil) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="उदा. समदड़ी"
                  value={formData.tehsil}
                  onChange={(e) => handleInputChange("tehsil", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  जिला (District) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="उदा. बालोतरा"
                  value={formData.district}
                  onChange={(e) => handleInputChange("district", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  राज्य (State)
                </Label>
                <Input
                  placeholder="उदा. राजस्थान"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  पिन कोड (Pin Code)
                </Label>
                <Input
                  placeholder="6 अंकों का पिन कोड"
                  maxLength={6}
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange("pinCode", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* 4. Nominee Details Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Heart className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                4. नॉमिनी विवरण (Nominee Details)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  नॉमिनी का नाम (Nominee Name)
                </Label>
                <Input
                  placeholder="उदा. विक्रम प्रजापत"
                  value={formData.nomineeName}
                  onChange={(e) => handleInputChange("nomineeName", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  नॉमिनी मोबाइल (Mobile)
                </Label>
                <Input
                  placeholder="10 अंकों का मोबाइल"
                  maxLength={10}
                  value={formData.nomineeMobile}
                  onChange={(e) => handleInputChange("nomineeMobile", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  नॉमिनी आधार (Aadhaar)
                </Label>
                <Input
                  placeholder="12 अंकों का आधार"
                  maxLength={14}
                  value={formData.nomineeAadhar}
                  onChange={(e) => handleInputChange("nomineeAadhar", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* 5. Photo Upload Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Upload className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                5. आवेदक फोटो (Applicant Photo)
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {photoPreview ? (
                <div className="relative w-28 h-36 rounded-lg border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
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
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-28 h-36 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                  <User className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[10px]">कोई फोटो नहीं</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>फोटो चुनें / Choose Photo</span>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </Label>
                <p className="text-xs text-muted-foreground">
                  पासपोर्ट साइज़ फोटो (JPG, PNG). अधिकतम साइज़: 5MB
                </p>
              </div>
            </div>
          </div>

          {/* 6. E-PIN & Payment Details Card */}
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                6. ई-पिन एवं भुगतान विवरण (E-PIN & Payment Details)
              </h2>
            </div>

            <div className="space-y-4">
              {/* E-PIN Verifier Component */}
              <EpinInputVerifier
                value={formData.epinCode}
                onChange={(val) => handleInputChange("epinCode", val)}
                onVerified={handleEpinVerified}
                disabled={isLoading}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {/* Initial Payment Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    प्रारंभिक जमा राशि (Initial Paid Amount)
                  </Label>
                  <Input
                    placeholder="₹ 0"
                    type="number"
                    value={formData.paymentAmount}
                    onChange={(e) => handleInputChange("paymentAmount", e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    भुगतान माध्यम (Payment Mode)
                  </Label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => handleInputChange("paymentMode", e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="CASH">नकद (CASH)</option>
                    <option value="ONLINE">ऑनलाइन (ONLINE)</option>
                    <option value="BANK_TRANSFER">बैंक ट्रांसफर (BANK_TRANSFER)</option>
                    <option value="RAZORPAY">रेज़रपे (RAZORPAY)</option>
                  </select>
                </div>

                {/* Agent Selection if Admin */}
                {isAdmin() && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      कार्यकर्ता / एजेंट (Worker / Agent)
                    </Label>
                    <select
                      value={formData.selectedAgentId}
                      onChange={(e) => handleInputChange("selectedAgentId", e.target.value)}
                      disabled={loadingAgents}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">स्वयं / Self</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.mobile})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4">
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
                  सुरक्षित कर रहे हैं... / Saving...
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
    </RoleGuard>
  );
}
