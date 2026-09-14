"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Info,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleGuard } from "@/components/role-guard";
import {
  DhundhotsavService,
  UpdateDhundhotsavPayload,
  DhundhotsavRegistration,
} from "@/lib/dhundhotsav-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";

export default function EditDhundhotsavPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [initialOfflineFormNumber, setInitialOfflineFormNumber] = useState<string>("");
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
    formNumber: string;
    offlineFormNumber: string;
    applicationDate: string;
    dhundhDate: string;
    childName: string;
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
    selectedAgentId: string;
    epinCode: string;
  }>({
    formNumber: "",
    offlineFormNumber: "",
    applicationDate: "",
    dhundhDate: "",
    childName: "",
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
    gender: "Male",
    category: "A",
    schemeType: "DHUNDHOTSAV",
    pool: "MALE_POOL",
    membershipFee: 5100,
    selectedAgentId: "",
    epinCode: "",
  });

  // Photo / Document state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);

  // Load Record Data
  const loadRecord = useCallback(async () => {
    if (!id) return;
    setIsFetching(true);
    try {
      const res = await DhundhotsavService.getRegistrationById(id);
      if (res && res.data) {
        const reg = res.data;
        const offNo = String(
          reg.offlineFormNumber ||
          (reg as any).offline_form_number ||
          (reg as any).offlineFormNo ||
          ""
        ).trim();
        setInitialOfflineFormNumber(offNo);

        // Format dates safely
        const appDate = reg.applicationDate ? reg.applicationDate.split("T")[0] : "";
        const dhDate = reg.dhundhDate ? reg.dhundhDate.split("T")[0] : "";
        const dob = reg.dateOfBirth ? reg.dateOfBirth.split("T")[0] : "";

        const rawWorkerId = String(
          reg.addedById ||
          (reg as any).addedby_id ||
          reg.addedBy?.id ||
          (reg as any).agentId ||
          (reg as any).selectedAgentId ||
          ""
        ).trim();

        setFormData({
          formNumber: reg.formNumber || (reg as any).form_number || "",
          offlineFormNumber: offNo,
          applicationDate: appDate,
          dhundhDate: dhDate,
          childName: reg.childName || (reg as any).child_name || "",
          applicantName: reg.applicantName || (reg as any).applicant_name || "",
          fatherName: reg.fatherName || (reg as any).father_name || "",
          husbandName: reg.husbandName || (reg as any).husband_name || "",
          motherName: reg.motherName || (reg as any).mother_name || "",
          dateOfBirth: dob,
          age: reg.age ? String(reg.age) : "",
          aadharNumber: reg.aadharNumber || (reg as any).aadhar_number || "",
          gotra: reg.gotra || "",
          mobile: reg.mobile || "",
          address: reg.address || "",
          pinCode: reg.pinCode || (reg as any).pin_code || "",
          tehsil: reg.tehsil || "",
          district: reg.district || "",
          state: reg.state || "Rajasthan",
          nomineeName: reg.nomineeName || (reg as any).nominee_name || "",
          nomineeRelation: reg.nomineeRelation || (reg as any).nominee_relation || "",
          nomineeMobile: reg.nomineeMobile || (reg as any).nominee_mobile || "",
          nomineeAadhar: reg.nomineeAadhar || (reg as any).nominee_aadhar || "",
          gender: (reg.gender as any) || "Male",
          category: (reg.category as any) || "A",
          schemeType: "DHUNDHOTSAV",
          pool: "MALE_POOL",
          membershipFee: 5100,
          selectedAgentId: rawWorkerId,
          epinCode: reg.epinCode || (reg as any).epin_code || "",
        });

        if (reg.passportPhotoUrl) {
          setPhotoPreview(reg.passportPhotoUrl);
        }
      } else {
        toast.error("पंजीकरण विवरण नहीं मिला / Registration details not found");
        router.push("/dashboard/dhundhotsav");
      }
    } catch (err: any) {
      toast.error(err.message || "विवरण लोड करने में विफल / Failed to load details");
      router.push("/dashboard/dhundhotsav");
    } finally {
      setIsFetching(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

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

            // Reconcile selectedAgentId if set with Agent Profile ID
            setFormData((prev) => {
              if (!prev.selectedAgentId) return prev;
              const cur = prev.selectedAgentId.trim();
              const matched = mappedAgents.find(
                (a: any) => a.userId === cur || a.id === cur || a.agentProfileId === cur
              );
              if (matched && matched.userId && matched.userId !== cur) {
                return { ...prev, selectedAgentId: matched.userId };
              }
              return prev;
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

  // Form Submission Validation
  const validateForm = (): boolean => {
    if (!formData.applicantName.trim()) {
      toast.error("कृपया आवेदक का नाम दर्ज करें / Applicant Name is required");
      return false;
    }
    if (!formData.fatherName.trim()) {
      toast.error("कृपया पिता का नाम दर्ज करें / Father Name is required");
      return false;
    }
    if (!formData.dateOfBirth) {
      toast.error("कृपया जन्म तिथि दर्ज करें / Date of Birth is required");
      return false;
    }
    if (!formData.gotra.trim()) {
      toast.error("कृपया गोत्र दर्ज करें / Gotra is required");
      return false;
    }
    if (!formData.mobile.trim() || formData.mobile.replace(/\D/g, "").length !== 10) {
      toast.error("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें / Enter valid 10-digit mobile number");
      return false;
    }
    if (!formData.aadharNumber.trim() || formData.aadharNumber.replace(/\D/g, "").length !== 12) {
      toast.error("आधार कार्ड नंबर 12 अंकों का होना चाहिए / Aadhaar must be 12 digits");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("कृपया पूरा पता दर्ज करें / Address is required");
      return false;
    }
    if (!formData.district.trim()) {
      toast.error("कृपया जिला दर्ज करें / District is required");
      return false;
    }
    if (!formData.tehsil.trim()) {
      toast.error("कृपया तहसील दर्ज करें / Tehsil is required");
      return false;
    }
    if (!formData.pinCode.trim() || formData.pinCode.replace(/\D/g, "").length !== 6) {
      toast.error("कृपया 6 अंकों का वैध पिन कोड दर्ज करें / Enter valid 6-digit PIN code");
      return false;
    }
    return true;
  };

  // Handle Form Submit with Offline Form Number Confirmation Check
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const currentOffline = (formData.offlineFormNumber || "").trim();
    const initialOffline = (initialOfflineFormNumber || "").trim();

    // Check if offline form number changed meaningfully
    if (currentOffline !== initialOffline) {
      setConfirmDialogOpen(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setConfirmDialogOpen(false);
    setIsLoading(true);

    try {
      const trimmedOffline = (formData.offlineFormNumber || "").trim();
      const payload: UpdateDhundhotsavPayload = {
        offlineFormNumber: trimmedOffline || null,
        offline_form_number: trimmedOffline || null,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || null,
        motherName: formData.motherName.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        age: formData.age ? Number(formData.age) : null,
        gotra: formData.gotra.trim(),
        mobile: formData.mobile.replace(/\D/g, ""),
        address: formData.address.trim(),
        pinCode: formData.pinCode.replace(/\D/g, ""),
        tehsil: formData.tehsil.trim(),
        district: formData.district.trim(),
        state: formData.state.trim() || "Rajasthan",
        childName: formData.childName.trim() || null,
        dhundhDate: formData.dhundhDate || null,
        nomineeName: formData.nomineeName.trim() || null,
        nomineeRelation: formData.nomineeRelation.trim() || null,
        nomineeMobile: formData.nomineeMobile.replace(/\D/g, "") || null,
        nomineeAadhar: formData.nomineeAadhar.replace(/\D/g, "") || null,
        passportPhotoUrl: passportPhotoBase64 || undefined,
        documentUrl: documentBase64 || undefined,
        gender: formData.gender,
        category: formData.category,
        selectedAgentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        agentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        addedById: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
      };

      const res = await DhundhotsavService.updateRegistration(id, payload);

      if (res && res.success !== false) {
        toast.success("ढूंढोत्सव विवरण सफलतापूर्वक अपडेट किया गया / Details updated successfully");
        router.push("/dashboard/dhundhotsav");
      } else {
        toast.error(res.message || "विवरण अपडेट करने में विफल / Failed to update details");
      }
    } catch (err: any) {
      console.error("Update error:", err);
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorDetails = err.response.data.errors
          .map((e: any) => `${e.field ? e.field.replace(/^body\./, "") + ": " : ""}${e.message}`)
          .join(", ");
        toast.error(`सत्यापन त्रुटि (Validation Error): ${errorDetails}`);
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "विवरण अपडेट करने में विफल / Failed to update details"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">विवरण लोड हो रहा है / Loading details...</p>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="dhundhotsav" requiredAction="create">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Header Section matching General Marriage Form */}
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
                    ढूंढोत्सव योजना पंजीकरण संपादित करें
                  </h1>
                  <Badge variant="outline" className="bg-muted/50 text-foreground border-border text-xs">
                    Fixed Fee: ₹5,100
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-xs">
                    {formData.formNumber}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Dhundhotsav Registration Edit — Scheme Type: DHUNDHOTSAV | Pool: MALE_POOL | Installment: ₹300
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Application Details Section with System & Offline Form Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
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
                    value={formData.offlineFormNumber}
                    placeholder="उदा. 1259"
                    maxLength={50}
                    className="bg-background mt-1 font-medium"
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
              </div>

              {/* Child Name, Gender, Category, and Fee Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Label htmlFor="husbandName">पति/अभिभावक का नाम / Husband / Guardian Name</Label>
                  <Input
                    id="husbandName"
                    value={formData.husbandName}
                    onChange={(e) => setFormData({ ...formData, husbandName: e.target.value })}
                    placeholder="पति या अभिभावक का नाम दर्ज करें"
                    className="mt-1"
                  />
                </div>
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

              {/* Nominee Details Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  नामांकित व्यक्ति का विवरण / Nominee Details (वैकल्पिक)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomineeName">नामांकित व्यक्ति का नाम / Nominee Name</Label>
                    <Input
                      id="nomineeName"
                      value={formData.nomineeName}
                      onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                      placeholder="नामांकित का नाम दर्ज करें"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nomineeRelation">संबंध / Relationship with Nominee</Label>
                    <Input
                      id="nomineeRelation"
                      value={formData.nomineeRelation}
                      onChange={(e) =>
                        setFormData({ ...formData, nomineeRelation: e.target.value })
                      }
                      placeholder="उदा. माता, पिता, भाई..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomineeMobile">नामांकित मोबाइल नंबर / Nominee Mobile</Label>
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
                      placeholder="10 अंकों का मोबाइल नंबर"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nomineeAadhar">नामांकित आधार संख्या / Nominee Aadhaar</Label>
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
                      placeholder="12 अंकों का आधार नंबर"
                      className="font-mono mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Worker / Agent Selection (Admin Only) */}
              {isAdmin() && (
                <div>
                  <Label htmlFor="selectedAgentId">
                    कार्यकर्ता चुनें / Select Worker / Agent (वैकल्पिक)
                  </Label>
                  <select
                    id="selectedAgentId"
                    className="w-full border rounded px-3 py-2 mt-1 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.selectedAgentId}
                    onChange={(e) =>
                      setFormData({ ...formData, selectedAgentId: e.target.value })
                    }
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passportPhoto">पासपोर्ट साइज रंगीन फोटो / Passport Photo (&lt; 2MB)</Label>
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
                      alt="पासपोर्ट फोटो प्रीव्यू"
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

              {/* Financial & E-PIN Information (Read-Only on Edit) */}
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  वित्तीय विवरण / Financial Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editFee">नियत सदस्यता शुल्क / Entry Fee</Label>
                    <Input
                      id="editFee"
                      value="₹5,100 (Fixed Entry Fee)"
                      readOnly
                      className="bg-muted font-bold text-foreground mt-1"
                    />
                  </div>

                  {formData.epinCode && (
                    <div>
                      <Label htmlFor="editEpin">ई-पिन वाउचर कोड / E-PIN Voucher</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="editEpin"
                          value={formData.epinCode}
                          readOnly
                          className="bg-muted font-mono font-semibold text-foreground"
                        />
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 shrink-0">
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> लागू / Applied
                        </Badge>
                      </div>
                    </div>
                  )}
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

              {/* Action Buttons matching General Marriage Edit Form */}
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
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      सहेज रहे हैं / Saving...
                    </>
                  ) : (
                    "ढूंढोत्सव विवरण अपडेट करें / Update Details"
                  )}
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
                ऑफलाइन फॉर्म नं. <span className="font-bold text-primary">{formData.offlineFormNumber ? formData.offlineFormNumber.trim() : ""}</span> सही है?
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
  );
}
