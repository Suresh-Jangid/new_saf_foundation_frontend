"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Shield,
  CreditCard,
  KeyRound,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  DollarSign,
  Info,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import {
  ShubhLaxmiService,
  CreateShubhLaxmiPayload,
} from "@/lib/shubh-laxmi-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { EpinValidationResponse } from "@/lib/config-types";

export default function AddShubhLaxmiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; mobile: string }>>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

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
    nomineeName: string;
    nomineeRelation: string;
    nomineeMobile: string;
    nomineeAadhar: string;
    gender: "Male" | "Female" | "Other";
    category: "A" | "B" | "C" | "D" | "E" | "F";
    schemeType: "SHUBH_LAXMI";
    pool: "UNIFIED_POOL";
    membershipFee: number;
    paymentAmount: string;
    paymentMode: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
    selectedAgentId: string;
    epinCode: string;
  }>({
    applicationDate: new Date().toISOString().split("T")[0],
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
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    nomineeAadhar: "",
    gender: "Female", // UNIFIED_POOL accepts Male and Female both
    category: "A",
    schemeType: "SHUBH_LAXMI",
    pool: "UNIFIED_POOL",
    membershipFee: 3100,
    paymentAmount: "0",
    paymentMode: "CASH",
    selectedAgentId: "",
    epinCode: "",
  });

  // Photo / Document state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);

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
          if (res && res.data) {
            setAgents(
              res.data.map((ag: any) => ({
                id: ag.id,
                name: ag.applicantName || ag.name || "Agent",
                mobile: ag.mobileNumber || ag.mobile || "",
              }))
            );
          }
        })
        .catch(() => {
          // non-blocking
        })
        .finally(() => {
          setLoadingAgents(false);
        });
    }
  }, []);

  // Calculate age when dateOfBirth changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setFormData((prev) => {
      let calculatedAge = prev.age;
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let calculated = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculated--;
        }
        if (calculated >= 0 && calculated <= 120) {
          calculatedAge = String(calculated);
        }
      }
      return { ...prev, dateOfBirth: dob, age: calculatedAge };
    });
  };

  // File Upload Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("फोटो का आकार 2MB से कम होना चाहिए / Photo size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setPassportPhotoBase64(b64);
      setPhotoPreview(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("दस्तावेज़ का आकार 5MB से कम होना चाहिए / Document size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!formData.applicantName.trim()) {
      toast.error("कृपया आवेदक का नाम दर्ज करें / Applicant Name is required");
      return;
    }
    if (!formData.fatherName.trim()) {
      toast.error("कृपया पिता का नाम दर्ज करें / Father Name is required");
      return;
    }
    if (!formData.gotra.trim()) {
      toast.error("कृपया गोत्र दर्ज करें / Gotra is required");
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.replace(/\D/g, "").length !== 10) {
      toast.error("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें / Enter valid 10-digit mobile number");
      return;
    }
    if (formData.aadharNumber.trim() && formData.aadharNumber.replace(/\D/g, "").length !== 12) {
      toast.error("आधार कार्ड नंबर 12 अंकों का होना चाहिए / Aadhaar must be 12 digits");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("कृपया पूरा पता दर्ज करें / Address is required");
      return;
    }
    if (!formData.district.trim()) {
      toast.error("कृपया जिला दर्ज करें / District is required");
      return;
    }
    if (!formData.tehsil.trim()) {
      toast.error("कृपया तहसील दर्ज करें / Tehsil is required");
      return;
    }
    if (!formData.pinCode.trim() || formData.pinCode.replace(/\D/g, "").length !== 6) {
      toast.error("कृपया 6 अंकों का वैध पिन कोड दर्ज करें / Enter valid 6-digit PIN code");
      return;
    }

    setIsLoading(true);

    try {
      const payload: CreateShubhLaxmiPayload = {
        applicationDate: formData.applicationDate,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || undefined,
        motherName: formData.motherName.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        aadharNumber: formData.aadharNumber.replace(/\D/g, ""),
        gotra: formData.gotra.trim(),
        mobile: formData.mobile.replace(/\D/g, ""),
        address: formData.address.trim(),
        pinCode: formData.pinCode.replace(/\D/g, ""),
        tehsil: formData.tehsil.trim(),
        district: formData.district.trim(),
        state: formData.state.trim() || "Rajasthan",
        nomineeName: formData.nomineeName.trim() || undefined,
        nomineeRelation: formData.nomineeRelation.trim() || undefined,
        nomineeMobile: formData.nomineeMobile.replace(/\D/g, "") || undefined,
        nomineeAadhar: formData.nomineeAadhar.replace(/\D/g, "") || undefined,
        passportPhotoUrl: passportPhotoBase64 || undefined,
        documentUrl: documentBase64 || undefined,
        gender: formData.gender,
        category: formData.category,
        schemeType: "SHUBH_LAXMI",
        pool: "UNIFIED_POOL",
        membershipFee: 3100,
        totalAmount: 3100,
        paymentAmount: Number(formData.paymentAmount) || 0,
        paymentMode: formData.paymentMode,
        selectedAgentId: formData.selectedAgentId || undefined,
        agentId: formData.selectedAgentId || undefined,
        epinCode: formData.epinCode.trim() || undefined,
        pinNumber: formData.epinCode.trim() || undefined,
      };

      const res = await ShubhLaxmiService.createRegistration(payload);

      if (res && res.success !== false) {
        toast.success(
          `शुभलक्ष्मी पंजीकरण सफलतापूर्वक संपन्न हुआ! फॉर्म नं: ${res.data?.formNumber || "SL-XXXX"}`
        );
        router.push("/dashboard/shubh-laxmi");
      } else {
        const errorMsg = res.message || "पंजीकरण में त्रुटि / Failed to create registration";
        if (/already|assigned|consumed|used/i.test(errorMsg)) {
          toast.error("यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।");
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      if (err.response?.status === 409 || err.status === 409) {
        const msg = err.response?.data?.message || "";
        if (/epin|pin|voucher/i.test(msg)) {
          toast.error("यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।");
        } else {
          toast.error(
            msg ||
              "समान आधार या मोबाइल नंबर से सक्रिय शुभलक्ष्मी पंजीकरण पहले से मौजूद है या E-PIN conflict (409 Conflict)"
          );
        }
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "पंजीकरण सहेजने में विफल / Failed to save registration"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard requiredModule="shubh_laxmi" requiredAction="create">
      <div className="space-y-6 p-4 md:p-6 pb-16 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/shubh-laxmi")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>शुभलक्ष्मी योजना पंजीकरण फॉर्म</span>
                <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
                  Fixed Fee ₹3,100
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                ShubhLaxmi Registration Application — Scheme Type: SHUBH_LAXMI | Pool: UNIFIED_POOL (Male + Female) | Installment: ₹300
              </p>
            </div>
          </div>
        </div>

        {/* Scheme Highlights & 12-Month Rule Banner */}
        <Card className="border-yellow-200 dark:border-yellow-900/40 bg-yellow-50/40 dark:bg-yellow-950/20 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-yellow-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                    शुभलक्ष्मी योजना नियम एवं अनुदान (ShubhLaxmi Rules)
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                    सदस्यता अनुदान शुल्क: <strong>₹3,100 (नियत)</strong> • एकल लेजर किश्त: <strong>₹300 (नियत)</strong> • पात्रता: <strong>पुरुष एवं महिला दोनों</strong>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white/80 dark:bg-black/40 text-yellow-700 dark:text-yellow-300 border-yellow-300">
                  Pool: UNIFIED_POOL
                </Badge>
                <Badge variant="outline" className="bg-white/80 dark:bg-black/40 text-yellow-700 dark:text-yellow-300 border-yellow-300">
                  No Age Slab
                </Badge>
                <Badge variant="outline" className="bg-white/80 dark:bg-black/40 text-yellow-700 dark:text-yellow-300 border-yellow-300">
                  Single Ledger (₹300)
                </Badge>
              </div>
            </div>

            {/* 12-Month & Deduction rule notice */}
            <div className="p-2.5 rounded-md bg-yellow-100/70 dark:bg-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-300 flex items-start gap-2 border border-yellow-300/50">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-700" />
              <div>
                <strong>12 माह लाभ एवं कटौती नियम (12-Month Benefit & Deduction Rule):</strong> 12 माह पूर्ण होने पर योजना लाभ/भुगतान सहायता उपलब्ध होती है, जिसमें 20% कटौती (20% deduction at payment assistance) लागू होती है। लगातार 3 किश्तें चूकने पर चेतावनी/नियमावली प्रभावी होती है।
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Applicant Information */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-yellow-600" />
                <span>1. आवेदक का व्यक्तिगत विवरण / Applicant Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Application Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="applicationDate" className="text-xs font-semibold">
                    आवेदन दिनांक / Application Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="applicationDate"
                    type="date"
                    value={formData.applicationDate}
                    onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                {/* Applicant Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="applicantName" className="text-xs font-semibold">
                    आवेदक का नाम / Applicant Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="applicantName"
                    placeholder="उदा. सीता देवी / रमेश कुमार"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                {/* Father Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fatherName" className="text-xs font-semibold">
                    पिता का नाम / Father Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fatherName"
                    placeholder="उदा. रामेश्वर लाल"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Husband / Guardian Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="husbandName" className="text-xs font-semibold">
                    पति / अभिभावक का नाम (Optional)
                  </Label>
                  <Input
                    id="husbandName"
                    placeholder="अभिभावक का नाम..."
                    value={formData.husbandName}
                    onChange={(e) => setFormData({ ...formData, husbandName: e.target.value })}
                    className="text-sm"
                  />
                </div>

                {/* Mother Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="motherName" className="text-xs font-semibold">
                    माता का नाम / Mother Name (Optional)
                  </Label>
                  <Input
                    id="motherName"
                    placeholder="माता का नाम..."
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="text-sm"
                  />
                </div>

                {/* Gender (UNIFIED_POOL: Male + Female both accepted) */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-semibold">
                    लिंग / Gender (UNIFIED_POOL) <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    required
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Female">महिला (Female)</option>
                    <option value="Male">पुरुष (Male)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth" className="text-xs font-semibold">
                    जन्म दिनांक / Date of Birth (Optional)
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleDobChange}
                    className="text-sm"
                  />
                </div>

                {/* Age (No pricing slab) */}
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="text-xs font-semibold">
                    आयु / Age (Years)
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="उदा. 25"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="text-sm"
                  />
                </div>

                {/* Caste / Social Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    वर्ग / Category <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    required
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                    <option value="C">Category C</option>
                    <option value="D">Category D</option>
                    <option value="E">Category E</option>
                    <option value="F">Category F</option>
                  </select>
                </div>

                {/* Gotra */}
                <div className="space-y-1.5">
                  <Label htmlFor="gotra" className="text-xs font-semibold">
                    गोत्र / Gotra <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gotra"
                    placeholder="उदा. जांगिड़ / शर्मा"
                    value={formData.gotra}
                    onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile */}
                <div className="space-y-1.5">
                  <Label htmlFor="mobile" className="text-xs font-semibold">
                    मोबाइल नंबर / Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    placeholder="10 अंकों का मोबाइल"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="aadharNumber" className="text-xs font-semibold">
                    आधार नंबर / Aadhaar Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="aadharNumber"
                    maxLength={12}
                    placeholder="12 अंकों का आधार नंबर"
                    value={formData.aadharNumber}
                    onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                    required
                    className="text-sm font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Residential Details */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-yellow-600" />
                <span>2. निवास एवं पता विवरण / Address Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold">
                  स्थाई पता / Full Residential Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="मकान संख्या, गली/मोहल्ला, ग्राम..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Tehsil */}
                <div className="space-y-1.5">
                  <Label htmlFor="tehsil" className="text-xs font-semibold">
                    तहसील / Tehsil <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tehsil"
                    placeholder="उदा. सांगानेर"
                    value={formData.tehsil}
                    onChange={(e) => setFormData({ ...formData, tehsil: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <Label htmlFor="district" className="text-xs font-semibold">
                    जिला / District <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="district"
                    placeholder="उदा. जयपुर"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                {/* PIN Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="pinCode" className="text-xs font-semibold">
                    पिन कोड / PIN Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pinCode"
                    maxLength={6}
                    placeholder="6 अंकों का पिन कोड"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    required
                    className="text-sm font-mono"
                  />
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold">
                    राज्य / State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Nominee Details */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-yellow-600" />
                <span>3. वारिसदार / नॉमिनी विवरण / Nominee Details (Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nomineeName" className="text-xs font-semibold">
                    नॉमिनी का नाम / Nominee Name
                  </Label>
                  <Input
                    id="nomineeName"
                    placeholder="नॉमिनी का नाम..."
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeRelation" className="text-xs font-semibold">
                    संबंध / Relationship
                  </Label>
                  <Input
                    id="nomineeRelation"
                    placeholder="उदा. पति / पत्नी / पुत्र / पिता"
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeMobile" className="text-xs font-semibold">
                    नॉमिनी मोबाइल / Nominee Mobile
                  </Label>
                  <Input
                    id="nomineeMobile"
                    maxLength={10}
                    placeholder="10 अंकों का मोबाइल"
                    value={formData.nomineeMobile}
                    onChange={(e) => setFormData({ ...formData, nomineeMobile: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeAadhar" className="text-xs font-semibold">
                    नॉमिनी आधार / Nominee Aadhaar
                  </Label>
                  <Input
                    id="nomineeAadhar"
                    maxLength={12}
                    placeholder="12 अंकों का आधार"
                    value={formData.nomineeAadhar}
                    onChange={(e) => setFormData({ ...formData, nomineeAadhar: e.target.value })}
                    className="text-sm font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Photo and Documents */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-yellow-600" />
                <span>4. फोटो एवं दस्तावेज़ / Photo & Documents (Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    पासपोर्ट फोटो / Passport Photo (&lt; 2MB)
                  </Label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-20 w-20 rounded-lg object-cover border border-border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-yellow-50 file:text-yellow-700"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        JPG, PNG, WebP supported
                      </p>
                    </div>
                  </div>
                </div>

                {/* Supporting Document */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    सहायक दस्तावेज़ / Supporting Document / Affidavit (&lt; 5MB)
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleDocumentUpload}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-yellow-50 file:text-yellow-700"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    PDF, JPG, PNG supported
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: E-PIN & Financials */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-yellow-600" />
                <span>5. ई-पिन एवं वित्तीय विवरण / E-PIN & Financial Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* E-PIN Input Verifier */}
              <div className="max-w-md">
                <EpinInputVerifier
                  value={formData.epinCode}
                  onChange={(val) => setFormData({ ...formData, epinCode: val })}
                  onVerified={handleEpinVerified}
                  agentId={formData.selectedAgentId || undefined}
                />
              </div>

              {/* Fixed Membership Fee & Scheme Installment Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                {/* Fixed Membership Fee */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    सदस्यता अनुदान शुल्क / Membership Fee
                  </Label>
                  <div className="relative">
                    <Input
                      value="₹3,100 (नियत अनुदान राशि)"
                      readOnly
                      className="bg-muted font-bold text-yellow-600 dark:text-yellow-400"
                    />
                  </div>
                </div>

                {/* Scheme Installment (Single Ledger ₹300 Fixed) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    किश्त योजना राशि / Scheme Installment
                  </Label>
                  <div className="relative">
                    <Input
                      value="₹300 (एकल लेजर किश्त)"
                      readOnly
                      className="bg-muted font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMode" className="text-xs font-semibold">
                    भुगतान माध्यम / Payment Mode
                  </Label>
                  <select
                    id="paymentMode"
                    value={formData.paymentMode}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMode: e.target.value as any })
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="CASH">नकद (Cash)</option>
                    <option value="ONLINE">ऑनलाइन (Online)</option>
                    <option value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</option>
                  </select>
                </div>
              </div>

              {/* Admin Agent Selector */}
              {isAdmin() && (
                <div className="space-y-1.5 max-w-md pt-2">
                  <Label htmlFor="agentSelect" className="text-xs font-semibold">
                    एजेंट का चयन करें / Assign Agent (Admin Only)
                  </Label>
                  <select
                    id="agentSelect"
                    value={formData.selectedAgentId}
                    onChange={(e) => setFormData({ ...formData, selectedAgentId: e.target.value })}
                    disabled={loadingAgents}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- स्वयं (Admin / No Specific Agent) --</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/shubh-laxmi")}
              disabled={isLoading}
            >
              रद्द करें / Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  सहेज रहे हैं...
                </>
              ) : (
                "पंजीकरण जमा करें / Submit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
