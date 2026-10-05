"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { MediaUploadControl } from "@/components/media-upload";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  KeyRound,
  User,
  MapPin,
  Heart,
  Shield,
  CreditCard,
  Upload,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  LadoBahinService,
  LadoBahinRegistration,
  UpdateLadoBahinPayload,
  LadoBahinAccountType,
} from "@/lib/lado-bahin-service";
import {
  cn,
  formatDate,
  formatDateForAPI,
  parseDateFromDDMMYYYY,
  validatePhoneNumber,
  getProxiedPhotoSrc,
} from "@/lib/utils";
import { uploadMediaFile } from "@/lib/upload-client";
import { WorkerSearchSelector, WorkerOption } from "@/components/worker-search-selector";
import { agentRegistrationAPI, post } from "@/lib/api";

export default function EditLadoBahinPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

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
  const [isFetching, setIsFetching] = useState(true);
  const [record, setRecord] = useState<LadoBahinRegistration | null>(null);
  const [agents, setAgents] = useState<WorkerOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Date Popover States
  const [appDateOpen, setAppDateOpen] = useState(false);
  const [appDateObj, setAppDateObj] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [muklawaDateOpen, setMuklawaDateOpen] = useState(false);
  const [muklawaDateObj, setMuklawaDateObj] = useState<Date | undefined>(undefined);

  // Field Validation Error States
  const [nomineeAadharError, setNomineeAadharError] = useState("");

  // Form State
  const [formData, setFormData] = useState<{
    applicationDate: string;
    formNumber: string;
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
    totalAmount: string;
    pendingAmount: string;
    epinCode: string;
    selectedAgentId: string;
  }>({
    applicationDate: "",
    formNumber: "",
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
    totalAmount: "5100",
    pendingAmount: "0",
    epinCode: "",
    selectedAgentId: "",
  });

  // Photo state
  const [passportPhotoBase64, setPassportPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  const [nomineePhotoBase64, setNomineePhotoBase64] = useState<string | null>(null);
  const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);
  const [existingNomineePhotoUrl, setExistingNomineePhotoUrl] = useState<string | null>(null);

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

  const processPhotoFile = (file: File) => {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPhotoFile(file);
  };

  const removeNewPhoto = () => {
    setPassportPhotoBase64(null);
    setPhotoPreview(existingPhotoUrl ? getProxiedPhotoSrc(existingPhotoUrl) : null);
  };

  const processNomineePhotoFile = (file: File) => {
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

  const handleNomineePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processNomineePhotoFile(file);
  };

  const removeNewNomineePhoto = () => {
    setNomineePhotoBase64(null);
    setNomineePhotoPreview(existingNomineePhotoUrl ? getProxiedPhotoSrc(existingNomineePhotoUrl) : null);
  };

  // Fetch agents list
  const fetchAgentsList = useCallback(async (): Promise<WorkerOption[]> => {
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

      if (list.length > 0) {
        const mapped: WorkerOption[] = list.map((a: any) => ({
          id: String(a.id || a.userId || a.user_id || a.user?.id),
          name: a.name || a.applicantName || "Worker",
          mobile: a.mobile || a.mobileNumber || "",
          offlineFormNumber:
            a.offlineFormNumber ||
            a.offline_form_number ||
            a.agentProfile?.offlineFormNumber ||
            "",
          level: a.level || a.agentProfile?.level || a.hierarchy?.level,
        }));
        setAgents(mapped);
        return mapped;
      }
    } catch (err: any) {
      console.warn("Could not load agents list in Edit page:", err);
    } finally {
      setLoadingAgents(false);
    }
    return [];
  }, []);

  // Fetch existing record and hydrate fields
  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setIsFetching(true);
    try {
      // Fetch agents first
      const currentAgents = await fetchAgentsList();

      const res = await LadoBahinService.getRegistrationById(id);
      if (res && res.data) {
        const data = res.data;
        setRecord(data);

        // Normalize Dates
        const formattedAppDate = data.applicationDate ? formatDate(data.applicationDate) : "";
        const formattedDob = data.dateOfBirth ? formatDate(data.dateOfBirth) : "";
        const rawMuklawa = data.muklawaDate || data.muklawa_date;
        const formattedMuklawa = rawMuklawa ? formatDate(rawMuklawa) : "";

        if (data.applicationDate) {
          const parsed = parseDateFromDDMMYYYY(formattedAppDate);
          if (parsed && !isNaN(parsed.getTime())) setAppDateObj(parsed);
        }
        if (data.dateOfBirth) {
          const parsed = parseDateFromDDMMYYYY(formattedDob);
          if (parsed && !isNaN(parsed.getTime())) setDobObj(parsed);
        }
        if (rawMuklawa) {
          const parsed = parseDateFromDDMMYYYY(formattedMuklawa);
          if (parsed && !isNaN(parsed.getTime())) setMuklawaDateObj(parsed);
        }

        // Applicant Photo
        if (data.passportPhotoUrl) {
          setExistingPhotoUrl(data.passportPhotoUrl);
          setPhotoPreview(getProxiedPhotoSrc(data.passportPhotoUrl));
        } else {
          setExistingPhotoUrl(null);
          setPhotoPreview(null);
        }

        // Nominee Photo
        const rawNomineePhoto = data.nomineePhotoUrl || data.nominee_photo_url;
        if (rawNomineePhoto) {
          setExistingNomineePhotoUrl(rawNomineePhoto);
          setNomineePhotoPreview(getProxiedPhotoSrc(rawNomineePhoto));
        } else {
          setExistingNomineePhotoUrl(null);
          setNomineePhotoPreview(null);
        }

        // Resolve Assigned Worker (matching General Marriage proven hydration pattern)
        const explicitAgentId =
          data.selectedAgentId ??
          data.addedById ??
          (data.addedBy && (data.addedBy.id || data.addedBy.userId)) ??
          (data as any).agentId ??
          (data as any).addedby_id ??
          "";

        const workerName =
          data.workerName ||
          data.worker_name ||
          (data.addedBy && data.addedBy.name) ||
          "";
        const workerMobile =
          data.workerMobile ||
          (data.addedBy && data.addedBy.mobile) ||
          "";
        const workerOfflineForm =
          data.workerOfflineFormNumber ||
          (data.addedBy && (data.addedBy.offlineFormNumber || data.addedBy.offline_form_number)) ||
          "";

        const rawAgentId = explicitAgentId ? String(explicitAgentId).trim() : "";
        let resolvedAgentId = rawAgentId;

        // If worker ID is resolved but not in fetched agents, inject synthetic option
        if (resolvedAgentId) {
          const exists = currentAgents.some((a) => String(a.id) === resolvedAgentId);
          if (!exists) {
            const syntheticWorker: WorkerOption = {
              id: resolvedAgentId,
              name: workerName || "Assigned Worker",
              mobile: workerMobile || "",
              offlineFormNumber: workerOfflineForm || "",
              level: 1,
            };
            setAgents((prev) => {
              if (prev.some((a) => String(a.id) === resolvedAgentId)) return prev;
              return [...prev, syntheticWorker];
            });
          }
        }

        setFormData({
          applicationDate: formattedAppDate,
          formNumber: data.formNumber || "",
          offlineFormNumber: data.offlineFormNumber || data.offline_form_number || "",
          applicantName: data.applicantName || "",
          fatherName: data.fatherName || "",
          husbandName: data.husbandName || "",
          motherName: data.motherName || "",
          dateOfBirth: formattedDob,
          age: data.age != null ? String(data.age) : calculateAgeFromDate(formattedDob),
          aadharNumber: data.aadharNumber || "",
          gotra: data.gotra || "",
          mobile: data.mobile || "",
          address: data.address || "",
          pinCode: data.pinCode || "",
          tehsil: data.tehsil || "",
          district: data.district || "",
          state: data.state || "Rajasthan",
          muklawaDate: formattedMuklawa,
          nomineeName: data.nomineeName || "",
          nomineeRelation: data.nomineeRelation || "",
          nomineeMobile: data.nomineeMobile || "",
          nomineeAadhar: data.nomineeAadhar || "",
          gender: "Female",
          category: (data.category as any) || "A",
          schemeType: "LADO_BAHIN",
          pool: "FEMALE_POOL",
          accountType: data.accountType || "LADO_BAHIN_300",
          membershipFee: 5100,
          totalAmount: String(data.totalAmount || 5100),
          pendingAmount: String(data.pendingAmount ?? 0),
          epinCode: data.epinCode || "",
          selectedAgentId: rawAgentId,
        });
      }
    } catch (err: any) {
      console.error("Failed to load registration details:", err);
      toast.error(err.message || "विवरण लोड करने में विफल / Failed to load details");
    } finally {
      setIsFetching(false);
    }
  }, [id, fetchAgentsList]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const selectedAgent = agents.find(
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

    const nomineeAadharDigits = (formData.nomineeAadhar || "").replace(/\D/g, "");
    if (formData.nomineeAadhar.trim() && nomineeAadharDigits.length !== 12) {
      setNomineeAadharError("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Please enter a valid 12-digit Aadhaar number");
      toast.error("नामांकित आधार नंबर 12 अंकों का होना चाहिए / Invalid 12-digit Nominee Aadhaar number");
      return;
    } else {
      setNomineeAadharError("");
    }

    setIsLoading(true);

    try {
      const normalizedMuklawa = convertToYYYYMMDD(formData.muklawaDate);
      let updatedPassportUrl: string | undefined = undefined;
      if (passportPhotoBase64 && passportPhotoBase64.startsWith("data:")) {
        try {
          const uploadRes = await uploadMediaFile(passportPhotoBase64, {
            category: "passport",
            entityType: "lado_bahin",
            entityId: String(id),
          });
          if (uploadRes.success && uploadRes.url) {
            updatedPassportUrl = uploadRes.url;
          } else {
            updatedPassportUrl = passportPhotoBase64;
          }
        } catch (err) {
          console.warn("Lado Bahin edit passport upload note:", err);
        }
      }

      let updatedNomineeUrl: string | undefined = undefined;
      if (nomineePhotoBase64 && nomineePhotoBase64.startsWith("data:")) {
        try {
          const uploadRes = await uploadMediaFile(nomineePhotoBase64, {
            category: "nominee",
            entityType: "lado_bahin",
            entityId: String(id),
          });
          if (uploadRes.success && uploadRes.url) {
            updatedNomineeUrl = uploadRes.url;
          } else {
            updatedNomineeUrl = nomineePhotoBase64;
          }
        } catch (err) {
          console.warn("Lado Bahin edit nominee upload note:", err);
        }
      }

      const resolvedAgentId = formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined;

      const payload: UpdateLadoBahinPayload = {
        offlineFormNumber: formData.offlineFormNumber ? formData.offlineFormNumber.trim() : null,
        offline_form_number: formData.offlineFormNumber ? formData.offlineFormNumber.trim() : null,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || null,
        motherName: formData.motherName.trim() || null,
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        age: formData.age ? Number(formData.age) : null,
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
        gender: "Female",
        category: formData.category,
        totalAmount: Number(formData.totalAmount) || 5100,
        pendingAmount: Number(formData.pendingAmount) || 0,
        selectedAgentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        addedById: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        agentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        addedby_id: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined,
        ...(updatedPassportUrl ? { passportPhotoUrl: updatedPassportUrl } : {}),
        ...(updatedNomineeUrl ? { nomineePhotoUrl: updatedNomineeUrl, nominee_photo_url: updatedNomineeUrl } : {}),
      };

      const res = await LadoBahinService.updateRegistration(id, payload);
      if (res && res.data) {
        toast.success("लाडो बहिन पंजीयन सफलतापूर्वक अपडेट किया गया / Registration updated successfully");
        router.push("/dashboard/lado-bahin");
      } else {
        throw new Error(res?.message || "Failed to update registration");
      }
    } catch (err: any) {
      console.error("Error updating registration:", err);
      toast.error(err.message || "पंजीकरण अपडेट करने में विफल / Failed to update registration");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">विवरण लोड हो रहा है... / Loading details...</p>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="lado_bahin" requiredAction="edit">
      <div className="min-h-screen bg-white">
        <div className="w-full">
          {/* Top Header matching General Marriage Edit Form */}
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
                  लाडो बहिन पंजीयन संपादित करें (Edit Lado Bahin Registration)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  फॉर्म क्र. {formData.formNumber || id} का विवरण अपडेट करें / Update Registration Details
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
                      आवेदन दिनांक (Application Date)
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

                  {/* Form Number */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">फॉर्म नं. (Form No)</Label>
                    <Input
                      value={formData.formNumber}
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    />
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
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">खाता प्रकार (Account Type)</Label>
                    <Input
                      value={formData.accountType === "LADO_BAHIN_300" ? "लाडो बहिन ₹300 (मासिक)" : "लाडो बहिन ₹1000 (मासिक)"}
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-medium cursor-not-allowed"
                    />
                  </div>

                  {/* Scheme Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">योजना प्रकार (Scheme Type)</Label>
                    <Input
                      value="लाडो बहिन योजना (LADO_BAHIN)"
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-medium cursor-not-allowed"
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
                      value={formData.aadharNumber}
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground">आधार संख्या अपरिवर्तनीय है / Aadhaar is immutable</p>
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
                          {passportPhotoBase64 && (
                            <button
                              type="button"
                              onClick={removeNewPhoto}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-xs hover:bg-rose-700 shadow-xs"
                              title="नई फोटो हटाएं / Remove new photo"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/30 shrink-0">
                          <User className="w-7 h-7 opacity-40 mb-1" />
                          <span className="text-[10px]">फोटो नहीं है</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="edit-photo-upload" className="cursor-pointer inline-block">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-sm font-medium transition-colors">
                              <Upload className="w-4 h-4" />
                              <span>{photoPreview ? "फोटो बदलें / Replace" : "फोटो चुनें / Choose"}</span>
                            </div>
                            <input
                              id="edit-photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </Label>
                          <MediaUploadControl
                            mode="image"
                            standaloneCameraOnly
                            onFileSelect={processPhotoFile}
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
                          {nomineePhotoBase64 && (
                            <button
                              type="button"
                              onClick={removeNewNomineePhoto}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-xs hover:bg-rose-700 shadow-xs"
                              title="नई फोटो हटाएं / Remove new photo"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/30 shrink-0">
                          <User className="w-7 h-7 opacity-40 mb-1" />
                          <span className="text-[10px]">फोटो नहीं है</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="edit-nominee-upload" className="cursor-pointer inline-block">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-sm font-medium transition-colors">
                              <Upload className="w-4 h-4" />
                              <span>{nomineePhotoPreview ? "फोटो बदलें / Replace" : "फोटो चुनें / Choose"}</span>
                            </div>
                            <input
                              id="edit-nominee-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleNomineePhotoUpload}
                            />
                          </Label>
                          <MediaUploadControl
                            mode="image"
                            standaloneCameraOnly
                            onFileSelect={processNomineePhotoFile}
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
                      कार्यकर्ता / एजेंट (Worker / Agent Selection) <span className="text-rose-500">*</span>
                    </Label>
                    <WorkerSearchSelector
                      id="selectedAgentId"
                      value={formData.selectedAgentId}
                      onValueChange={(val) => handleInputChange("selectedAgentId", val)}
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

                  {/* Assigned Worker Info Summary Box */}
                  {selectedAgent && (
                    <div className="p-3.5 bg-muted/40 rounded-lg border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          {selectedAgent.name}
                        </p>
                        <p className="text-muted-foreground">
                          Mobile: {selectedAgent.mobile || "N/A"}
                        </p>
                      </div>
                      {selectedAgent.offlineFormNumber && (
                        <span className="px-2.5 py-1 bg-primary/10 text-primary font-mono font-medium rounded-md">
                          Code / Form: {selectedAgent.offlineFormNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* E-PIN Status / Voucher Display (Immutable & Read Only) */}
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">
                      ई-पिन स्थिति (E-PIN Voucher Status)
                    </Label>
                    {formData.epinCode ? (
                      <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 shrink-0">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-violet-900">
                              संबद्ध ई-पिन वाउचर (Linked E-PIN Voucher)
                            </p>
                            <p className="font-mono text-sm font-bold text-violet-950 tracking-wide">
                              {formData.epinCode}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          सत्यापित / Verified (सुरक्षित / Read Only)
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/40 border border-border/60 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        <span>इस पंजीकरण के साथ कोई ई-पिन कोड लिंक नहीं है / No E-PIN was attached to this registration.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. Payment & Financial Summary Card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    7. वित्तीय स्थिति (Financial Status)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">कुल शुल्क (Total Fee)</Label>
                    <Input
                      value={`₹${(Number(formData.totalAmount) || 5100).toLocaleString("hi-IN")}`}
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">बकाया राशि (Pending Amount)</Label>
                    <Input
                      value={`₹${(Number(formData.pendingAmount) || 0).toLocaleString("hi-IN")}`}
                      disabled
                      className="h-10 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground">जमा स्थिति (Status)</Label>
                    <div className="h-10 flex items-center">
                      {(Number(formData.pendingAmount) || 0) === 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-md">
                          ✓ पूर्ण भुगतान (Fully Paid)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-md">
                          आंशिक / बकाया (Partial / Pending)
                        </span>
                      )}
                    </div>
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
                      अपडेट किया जा रहा है... / Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      अपडेट करें / Update Registration
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
