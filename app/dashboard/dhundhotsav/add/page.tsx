"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Upload,
  Loader2,
  Info,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import {
  DhundhotsavService,
  CreateDhundhotsavPayload,
} from "@/lib/dhundhotsav-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { EpinValidationResponse } from "@/lib/config-types";
import { formatDate } from "@/lib/utils";

export default function AddDhundhotsavPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<
    Array<{
      id: string; // User ID (primary value)
      userId: string; // User ID
      agentProfileId: string; // Agent Profile ID
      name: string;
      mobile: string;
      employeeId?: string;
      offlineFormNumber?: string;
    }>
  >([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    applicationDate: string;
    offlineFormNumber: string;
    dhundhDate: string;
    childName: string;
    benefitDuration: string;
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
    schemeType: "DHUNDHOTSAV";
    pool: "MALE_POOL";
    membershipFee: number;
    paymentAmount: string;
    paymentMode: "CASH" | "ONLINE" | "RAZORPAY" | "BANK_TRANSFER";
    selectedAgentId: string;
    epinCode: string;
  }>({
    applicationDate: new Date().toISOString().split("T")[0],
    offlineFormNumber: "",
    dhundhDate: "",
    childName: "",
    benefitDuration: "",
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
    gender: "Male", // Default: Male (MALE_POOL)
    category: "A",
    schemeType: "DHUNDHOTSAV",
    pool: "MALE_POOL",
    membershipFee: 5100,
    paymentAmount: "5100",
    paymentMode: "CASH",
    selectedAgentId: "",
    epinCode: "",
  });

  // Photo / Document state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nomineePhotoBase64, setNomineePhotoBase64] = useState<string | null>(null);
  const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);
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

              const resolvedProfileId = String(
                ag.agentProfile?.id ||
                ag.agent_profile?.id ||
                ag.id ||
                ag.agentId ||
                ag.agent_id ||
                resolvedUserId
              ).trim();

              return {
                id: resolvedUserId,
                userId: resolvedUserId,
                agentProfileId: resolvedProfileId,
                name: ag.applicantName || ag.name || ag.user?.name || "Agent",
                mobile: ag.mobileNumber || ag.mobile || ag.phone || ag.user?.mobile || "",
                employeeId: ag.employeeId || ag.employee_id || ag.agentProfile?.employeeId || "",
                offlineFormNumber: ag.offlineFormNumber || ag.offline_form_number || ag.agentProfile?.offlineFormNumber || "",
              };
            });
            setAgents(mappedAgents);
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

  const handleNomineePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("नॉमिनी फोटो का आकार 2MB से कम होना चाहिए / Nominee photo size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setNomineePhotoBase64(b64);
      setNomineePhotoPreview(b64);
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
    if (!formData.dateOfBirth) {
      toast.error("कृपया जन्म तिथि दर्ज करें / Date of Birth is required");
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
    if (!formData.aadharNumber.trim() || formData.aadharNumber.replace(/\D/g, "").length !== 12) {
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

    const parsedPayment = Number(formData.paymentAmount);
    if (isNaN(parsedPayment) || parsedPayment < 0) {
      toast.error("कृपया वैध भुगतान राशि दर्ज करें / Enter valid payment amount");
      return;
    }

    // E-PIN Validation (Compulsory for Dhundhotsav)
    const trimmedEpin = formData.epinCode.trim();
    if (!trimmedEpin) {
      toast.error("E-PIN आवश्यक है / E-PIN is required for Dhundhotsav Registration");
      return;
    }

    if (!epinVerified || !epinVerified.valid) {
      toast.error("कृपया पहले E-PIN सत्यापित करें / Please verify E-PIN first");
      return;
    }

    setIsLoading(true);

    try {
      const trimmedOffline = (formData.offlineFormNumber || "").trim();
      const trimmedDuration = (formData.benefitDuration || "").trim();
      const payload: CreateDhundhotsavPayload = {
        applicationDate: formData.applicationDate,
        offlineFormNumber: trimmedOffline || undefined,
        offline_form_number: trimmedOffline || undefined,
        dhundhDate: formData.dhundhDate || undefined,
        childName: formData.childName.trim() || undefined,
        benefitDuration: trimmedDuration || undefined,
        duration: trimmedDuration || undefined,
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
        nomineePhotoUrl: nomineePhotoBase64 || undefined,
        nomineePhoto: nomineePhotoBase64 || undefined,
        passportPhotoUrl: passportPhotoBase64 || undefined,
        documentUrl: documentBase64 || undefined,
        gender: formData.gender,
        category: formData.category,
        schemeType: "DHUNDHOTSAV",
        pool: "MALE_POOL",
        membershipFee: 5100,
        totalAmount: 5100,
        paymentAmount: parsedPayment > 0 ? parsedPayment : 5100,
        paymentMode: formData.paymentMode,
        selectedAgentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        agentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        addedById: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        epinCode: trimmedEpin,
        pinNumber: trimmedEpin,
      };

      const res = await DhundhotsavService.createRegistration(payload);

      if (res && res.success !== false) {
        toast.success(
          `ढूंढोत्सव पंजीकरण सफलतापूर्वक संपन्न हुआ! फॉर्म नं: ${res.data?.formNumber || "DH-XXXX"}`
        );
        router.push("/dashboard/dhundhotsav");
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
      // Handle 409 Conflict cleanly
      if (err.response?.status === 409 || err.status === 409) {
        const msg = err.response?.data?.message || "";
        if (/epin|pin|voucher/i.test(msg)) {
          toast.error("यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।");
        } else {
          toast.error(
            msg ||
              "समान आधार या मोबाइल नंबर से सक्रिय पंजीकरण पहले से मौजूद है या E-PIN conflict (409 Conflict)"
          );
        }
      } else if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorDetails = err.response.data.errors
          .map((e: any) => `${e.field ? e.field.replace(/^body\./, "") + ": " : ""}${e.message}`)
          .join(", ");
        toast.error(`सत्यापन त्रुटि (Validation Error): ${errorDetails}`);
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
    <RoleGuard requiredModule="dhundhotsav" requiredAction="create">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section matching General Marriage Add Form */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/dashboard/dhundhotsav")}
                  disabled={isLoading}
                  className="p-0 h-auto text-primary"
                >
                  ← वापस जाएं / Go Back
                </Button>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                    ढूंढोत्सव योजना पंजीकरण जोड़ें
                  </h1>
                  <Badge variant="outline" className="bg-muted/50 text-foreground border-border text-xs">
                    Fixed Fee: ₹5,100
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Dhundhotsav Registration Application — Scheme Type: DHUNDHOTSAV | Pool: MALE_POOL | Installment: ₹300
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Application Details Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div>
                  <Label htmlFor="applicationDate">आवेदन दिनांक / Application Date <span className="text-destructive">*</span></Label>
                  <Input
                    id="applicationDate"
                    type="date"
                    value={formData.applicationDate}
                    onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                    required
                    className="bg-background mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="offlineFormNumber">ऑफलाइन फॉर्म नं. / Offline Form No.</Label>
                  <Input
                    id="offlineFormNumber"
                    name="offlineFormNumber"
                    value={formData.offlineFormNumber}
                    placeholder="उदा. 1259"
                    maxLength={50}
                    className="bg-background mt-1"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        offlineFormNumber: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number
                  </p>
                </div>

                <div>
                  <Label htmlFor="benefitDuration">लाभ अवधि / Benefit Duration</Label>
                  <Input
                    id="benefitDuration"
                    name="benefitDuration"
                    value={formData.benefitDuration}
                    placeholder="उदा. बारह महीने / 12 महीने"
                    className="bg-background mt-1"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        benefitDuration: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ऐच्छिक (उदा. बारह महीने) / Optional
                  </p>
                </div>

                <div>
                  <Label htmlFor="dhundhDate">ढूंढ दिनांक / Dhundh Date</Label>
                  <Input
                    id="dhundhDate"
                    type="date"
                    value={formData.dhundhDate}
                    onChange={(e) => setFormData({ ...formData, dhundhDate: e.target.value })}
                    className="bg-background mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ऐच्छिक / Optional
                  </p>
                </div>

                <div>
                  <Label htmlFor="childName">बालक/बच्चे का नाम / Child Name</Label>
                  <Input
                    id="childName"
                    value={formData.childName}
                    onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                    placeholder="बच्चे का नाम दर्ज करें"
                    className="bg-background mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ऐच्छिक / Optional
                  </p>
                </div>
              </div>

              {/* Gender, Category, and Fee Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gender">लिंग / Gender <span className="text-destructive">*</span></Label>
                  <select
                    id="gender"
                    className="w-full border rounded px-3 py-2 mt-1 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    required
                  >
                    <option value="Male">पुरुष (Male - Default)</option>
                    <option value="Female">महिला (Female)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="category">वर्ग / Category <span className="text-destructive">*</span></Label>
                  <select
                    id="category"
                    className="w-full border rounded px-3 py-2 mt-1 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    required
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
                  <Label htmlFor="fee">सदस्यता अनुदान शुल्क / Grant Fee</Label>
                  <Input
                    id="fee"
                    type="text"
                    value="₹5,100 (नियत अनुदान राशि)"
                    readOnly
                    className="bg-muted font-bold text-foreground mt-1"
                  />
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="applicantName">आवेदक का नाम / Applicant Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="आवेदक का नाम दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fatherName">पिता का नाम / Father's Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    placeholder="पिता का नाम दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="motherName">माता का नाम / Mother's Name</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    placeholder="माता का नाम दर्ज करें"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="husbandName">पति / अभिभावक का नाम / Husband/Guardian Name</Label>
                  <Input
                    id="husbandName"
                    value={formData.husbandName}
                    onChange={(e) => setFormData({ ...formData, husbandName: e.target.value })}
                    placeholder="अभिभावक का नाम दर्ज करें"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">जन्म तिथि / Date of Birth <span className="text-destructive">*</span></Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleDobChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="age">आयु / Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="आयु दर्ज करें"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gotra">गोत्र / Gotra <span className="text-destructive">*</span></Label>
                  <Input
                    id="gotra"
                    value={formData.gotra}
                    onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                    placeholder="गोत्र दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadharNumber">आधार संख्या / Aadhaar Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="aadharNumber"
                    type="tel"
                    inputMode="numeric"
                    maxLength={12}
                    value={formData.aadharNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      setFormData({ ...formData, aadharNumber: digits });
                    }}
                    placeholder="12 अंकों का आधार संख्या दर्ज करें"
                    required
                    className="font-mono mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">मोबाइल नंबर / Mobile Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, mobile: digits });
                    }}
                    placeholder="10 अंकों का मोबाइल नंबर दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Full Address Section */}
              <div>
                <Label htmlFor="address">पूरा पता / Full Residential Address <span className="text-destructive">*</span></Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="मकान संख्या, गली/मोहल्ला, ग्राम..."
                  rows={3}
                  required
                  className="mt-1"
                />
              </div>

              {/* Address Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pinCode">पिन कोड / PIN Code <span className="text-destructive">*</span></Label>
                  <Input
                    id="pinCode"
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setFormData({ ...formData, pinCode: digits });
                    }}
                    placeholder="पिन कोड दर्ज करें"
                    required
                    className="font-mono mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tehsil">तहसील / Tehsil <span className="text-destructive">*</span></Label>
                  <Input
                    id="tehsil"
                    value={formData.tehsil}
                    onChange={(e) => setFormData({ ...formData, tehsil: e.target.value })}
                    placeholder="तहसील दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="district">जिला / District <span className="text-destructive">*</span></Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="जिला दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state">राज्य / State <span className="text-destructive">*</span></Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="राज्य दर्ज करें"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Nominee Information Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="nomineeName">नॉमिनी का नाम / Nominee Name</Label>
                  <Input
                    id="nomineeName"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    placeholder="नॉमिनी का नाम दर्ज करें"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nomineeRelation">नामित व्यक्ति से संबंध / Nominee Relation</Label>
                  <Input
                    id="nomineeRelation"
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    placeholder="संबंध दर्ज करें (उदा. पत्नी/माता)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nomineeMobile">नॉमिनी मोबाइल / Nominee Mobile</Label>
                  <Input
                    id="nomineeMobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.nomineeMobile}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, nomineeMobile: digits });
                    }}
                    placeholder="नॉमिनी मोबाइल नंबर"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nomineeAadhar">नॉमिनी आधार / Nominee Aadhaar</Label>
                  <Input
                    id="nomineeAadhar"
                    type="tel"
                    inputMode="numeric"
                    maxLength={12}
                    value={formData.nomineeAadhar}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      setFormData({ ...formData, nomineeAadhar: digits });
                    }}
                    placeholder="12 अंकों का आधार"
                    className="font-mono mt-1"
                  />
                </div>
              </div>

              {/* Worker / Agent Information Section (if Admin) */}
              {isAdmin() && (
                <div>
                  <Label htmlFor="selectedAgentId">कार्यकर्ता का नाम / Worker Name (Admin Only)</Label>
                  <select
                    id="selectedAgentId"
                    className="w-full border rounded px-3 py-2 mt-1 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.selectedAgentId}
                    onChange={(e) => setFormData({ ...formData, selectedAgentId: e.target.value })}
                    disabled={loadingAgents}
                  >
                    <option value="">-- स्वयं / Self (No Specific Worker) --</option>
                    {agents.map((agent) => (
                      <option key={agent.userId || agent.id} value={agent.userId || agent.id}>
                        {agent.name} {agent.mobile ? `(${agent.mobile})` : ""}
                      </option>
                    ))}
                  </select>
                  {loadingAgents && (
                    <p className="text-xs text-muted-foreground mt-1">कार्यकर्ता सूची लोड हो रही है...</p>
                  )}
                </div>
              )}

              {/* Photo & Document Upload Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="passportPhoto">फोटो / Applicant Photo (&lt; 2MB)</Label>
                  <Input
                    id="passportPhoto"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="mt-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted"
                  />
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="आवेदक फोटो प्रीव्यू"
                      className="mt-2 h-24 w-24 object-cover rounded border"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="nomineePhoto">नॉमिनी फोटो / Nominee Photo (&lt; 2MB)</Label>
                  <Input
                    id="nomineePhoto"
                    type="file"
                    accept="image/*"
                    onChange={handleNomineePhotoUpload}
                    className="mt-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted"
                  />
                  {nomineePhotoPreview && (
                    <img
                      src={nomineePhotoPreview}
                      alt="नॉमिनी फोटो प्रीव्यू"
                      className="mt-2 h-24 w-24 object-cover rounded border"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="documentUpload">सहायक दस्तावेज़ / Supporting Document / Affidavit (&lt; 5MB)</Label>
                  <Input
                    id="documentUpload"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleDocumentUpload}
                    className="mt-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG समर्थित
                  </p>
                </div>
              </div>

              {/* Payment & E-PIN Details Section */}
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  वित्तीय एवं भुगतान विवरण / Financial & Payment Details
                </h2>

                {/* E-PIN Voucher Verification (Mandatory) */}
                <div className="p-4 bg-muted/20 border rounded-lg">
                  <EpinInputVerifier
                    value={formData.epinCode}
                    onChange={(epinVal) => {
                      setFormData({ ...formData, epinCode: epinVal });
                      if (epinVerified) {
                        setEpinVerified(null);
                      }
                    }}
                    onVerified={handleEpinVerified}
                    agentId={formData.selectedAgentId || undefined}
                    required={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="membershipFee">नियत सदस्यता शुल्क / Entry Fee</Label>
                    <Input
                      id="membershipFee"
                      value="₹5,100 (Fixed Entry Fee)"
                      readOnly
                      className="bg-muted font-bold text-foreground mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      नियत सदस्यता शुल्क: <strong>₹5,100</strong>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="paymentAmount">भुगतान राशि / Payment Amount (₹)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      value={formData.paymentAmount}
                      onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                      placeholder="5100"
                      className="mt-1 font-semibold"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      पंजीकरण प्रवेश शुल्क: <strong>₹5,100</strong>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="paymentMode">भुगतान माध्यम / Payment Mode</Label>
                    <select
                      id="paymentMode"
                      className="w-full border rounded px-3 py-2 mt-1 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMode: e.target.value as any })
                      }
                    >
                      <option value="CASH">नकद (Cash)</option>
                      <option value="ONLINE">ऑनलाइन (Online / UPI)</option>
                      <option value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</option>
                      <option value="RAZORPAY">Razorpay Gateway</option>
                    </select>
                  </div>
                </div>

                {/* Informational note for future Dhundh contribution */}
                <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">महत्वपूर्ण सूचना / Note:</p>
                    <p>
                      धुंध आयोजन के समय प्रति सदस्य ₹300 अंशदान देय होगा। / ₹300 per-member contribution will be collected during the Dhundh event.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons matching General Marriage Add Form */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/dhundhotsav")}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      सहेज रहे हैं...
                    </>
                  ) : (
                    "आवेदन बनाएं / Create Application"
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
