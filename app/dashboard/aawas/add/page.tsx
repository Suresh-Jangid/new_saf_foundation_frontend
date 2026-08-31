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
  Home,
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
  Sparkles,
  Users,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import { AawasService, CreateAawasPayload } from "@/lib/aawas-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { EpinValidationResponse } from "@/lib/config-types";
import { validatePhoneNumber } from "@/lib/utils";

export default function AddAawasPage() {
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
    houseType: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineeMobile: string;
    nomineeAadhar: string;
    gender: "Male" | "Female" | "Other";
    category: "A" | "B" | "C" | "D" | "E" | "F";
    totalAmount: string;
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
    houseType: "कच्चा मकान (Kaccha House)",
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    nomineeAadhar: "",
    gender: "Male",
    category: "A",
    totalAmount: "15000",
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
        .then((res) => {
          if (res && res.data && Array.isArray(res.data)) {
            setAgents(
              res.data.map((a: any) => ({
                id: a.id || a.user_id,
                name: a.name || a.agent_name || "Agent",
                mobile: a.mobile || a.phone || "",
              }))
            );
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
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setFormData((prev) => {
      let calculatedAge = prev.age;
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0) {
          calculatedAge = age.toString();
        }
      }
      return { ...prev, dateOfBirth: dob, age: calculatedAge };
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Photo handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("फ़ोटो 2MB से कम होनी चाहिए / Photo size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPassportPhotoBase64(base64String);
      setPhotoPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Document handler
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("दस्तावेज़ 5MB से कम होना चाहिए / Document size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentBase64(reader.result as string);
      toast.success("दस्तावेज़ सफलतापूर्वक चुना गया / Document selected");
    };
    reader.readAsDataURL(file);
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    if (!formData.applicantName.trim()) {
      toast.error("कृपया आवेदक का नाम दर्ज करें / Enter applicant name");
      return false;
    }
    if (!formData.fatherName.trim()) {
      toast.error("कृपया पिता का नाम दर्ज करें / Enter father name");
      return false;
    }
    if (!formData.aadharNumber.trim() || formData.aadharNumber.replace(/\D/g, "").length !== 12) {
      toast.error("कृपया 12 अंकों का वैध आधार नंबर दर्ज करें / Enter valid 12-digit Aadhaar number");
      return false;
    }
    if (!formData.mobile.trim() || !validatePhoneNumber(formData.mobile)) {
      toast.error("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें / Enter valid 10-digit mobile number");
      return false;
    }
    if (!formData.gotra.trim()) {
      toast.error("कृपया गोत्र दर्ज करें / Enter Gotra");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("कृपया पूरा पता दर्ज करें / Enter complete address");
      return false;
    }
    if (!formData.district.trim()) {
      toast.error("कृपया जिला दर्ज करें / Enter District");
      return false;
    }
    if (!formData.tehsil.trim()) {
      toast.error("कृपया तहसील दर्ज करें / Enter Tehsil");
      return false;
    }
    if (!formData.pinCode.trim() || formData.pinCode.replace(/\D/g, "").length !== 6) {
      toast.error("कृपया 6 अंकों का वैध पिन कोड दर्ज करें / Enter valid 6-digit PIN code");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submit

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const payload: CreateAawasPayload = {
        applicationDate: formData.applicationDate,
        applicantName: formData.applicantName.trim(),
        fatherName: formData.fatherName.trim(),
        husbandName: formData.husbandName.trim() || undefined,
        motherName: formData.motherName.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        aadharNumber: formData.aadharNumber.replace(/\D/g, ""),
        gotra: formData.gotra.trim(),
        mobile: formData.mobile.replace(/\D/g, ""),
        address: formData.address.trim(),
        pinCode: formData.pinCode.replace(/\D/g, ""),
        tehsil: formData.tehsil.trim(),
        district: formData.district.trim(),
        state: formData.state.trim() || "Rajasthan",
        houseType: formData.houseType.trim() || undefined,
        nomineeName: formData.nomineeName.trim() || undefined,
        nomineeRelation: formData.nomineeRelation.trim() || undefined,
        nomineeMobile: formData.nomineeMobile.replace(/\D/g, "") || undefined,
        nomineeAadhar: formData.nomineeAadhar.replace(/\D/g, "") || undefined,
        passportPhotoUrl: passportPhotoBase64 || undefined,
        documentUrl: documentBase64 || undefined,
        gender: formData.gender,
        category: formData.category,
        totalAmount: 15000,
        paymentAmount: formData.paymentAmount ? Number(formData.paymentAmount) : 0,
        paymentMode: formData.paymentMode,
        selectedAgentId: formData.selectedAgentId || undefined,
        epinCode: formData.epinCode.trim() || epinVerified?.code || undefined,
      };

      const res = await AawasService.createRegistration(payload);

      if (res && res.success) {
        toast.success(
          `गृह प्रवेश आवास योजना आवेदन सफलतापूर्वक दर्ज किया गया! फॉर्म नंबर: ${res.data?.formNumber || "AW-OK"}`
        );
        router.push("/dashboard/aawas");
      } else {
        toast.error(res?.message || "आवास पंजीकरण असफल / Failed to register application");
      }
    } catch (err: any) {
      console.error("Error creating Aawas application:", err);
      const errMsg = err.response?.data?.message || err.message || "पंजीकरण में त्रुटि हुई / An error occurred";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard requiredModule="aawas" requiredAction="create">
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Top Breadcrumb & Scheme Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/aawas")}
              className="h-9 w-9 p-0 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Home className="h-6 w-6 text-[#0B4A8F]" />
                गृह प्रवेश आवास योजना पंजीकरण (New Aawas Application)
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                नया आवास योजना पंजीकरण फॉर्म भरें (Scheme Form: AW-XXXXX)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-medium">
              कुल अनुदान: ₹15,000
            </Badge>
            <Badge className="bg-amber-600 text-white font-medium">
              किश्त: ₹1,000
            </Badge>
          </div>
        </div>

        {/* Scheme Constants Info Callout */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-xl border border-blue-200/60 dark:border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#0B4A8F] shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-blue-900 dark:text-blue-200">योजना विवरण: </span>
              <span>गृह प्रवेश आवास योजना • कुल अनुदान ₹15,000 • प्रति किश्त ₹1,000 • कोई आयु सीमा नहीं (All Ages Eligible)</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Applicant Personal Information */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <User className="h-4 w-4 text-[#0B4A8F]" />
                १. आवेदक का व्यक्तिगत विवरण (Applicant Personal Details)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="applicantName">आवेदक का पूरा नाम (Applicant Name) *</Label>
                  <Input
                    id="applicantName"
                    name="applicantName"
                    required
                    value={formData.applicantName}
                    onChange={handleInputChange}
                    placeholder="जैसे: रामलाल सुथार"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fatherName">पिता का नाम (Father's Name) *</Label>
                  <Input
                    id="fatherName"
                    name="fatherName"
                    required
                    value={formData.fatherName}
                    onChange={handleInputChange}
                    placeholder="जैसे: मोहनलाल सुथार"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="husbandName">पति का नाम (Husband's Name - यदि लागू हो)</Label>
                  <Input
                    id="husbandName"
                    name="husbandName"
                    value={formData.husbandName}
                    onChange={handleInputChange}
                    placeholder="वैकल्पिक"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="motherName">माता का नाम (Mother's Name)</Label>
                  <Input
                    id="motherName"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleInputChange}
                    placeholder="वैकल्पिक"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth">जन्म तिथि (Date of Birth)</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleDobChange}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="age">आयु (Age - वर्ष में)</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="उदा. 35 (कोई आयु सीमा नहीं)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">लिंग (Gender) *</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Male">पुरुष (Male)</option>
                    <option value="Female">महिला (Female)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="aadharNumber">आधार कार्ड नंबर (12 Digit Aadhaar) *</Label>
                  <Input
                    id="aadharNumber"
                    name="aadharNumber"
                    required
                    maxLength={12}
                    value={formData.aadharNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, aadharNumber: val }));
                    }}
                    placeholder="12 अंकों का आधार नंबर"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile">मोबाइल नंबर (Mobile Number) *</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    required
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, mobile: val }));
                    }}
                    placeholder="10 अंकों का मोबाइल नंबर"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                  <Input
                    id="gotra"
                    name="gotra"
                    required
                    value={formData.gotra}
                    onChange={handleInputChange}
                    placeholder="जैसे: जांगिड़ / सुथार"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">श्रेणी (Category) *</Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="A">वर्ग A (Category A)</option>
                    <option value="B">वर्ग B (Category B)</option>
                    <option value="C">वर्ग C (Category C)</option>
                    <option value="D">वर्ग D (Category D)</option>
                    <option value="E">वर्ग E (Category E)</option>
                    <option value="F">वर्ग F (Category F)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="applicationDate">आवेदन तिथि (Application Date) *</Label>
                  <Input
                    id="applicationDate"
                    name="applicationDate"
                    type="date"
                    required
                    value={formData.applicationDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Address & Housing Details */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <MapPin className="h-4 w-4 text-[#0B4A8F]" />
                २. आवासीय व पता विवरण (Residential & Address Details)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2 md:col-span-3 space-y-1.5">
                  <Label htmlFor="address">स्थाई पता (Permanent Address) *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    required
                    rows={2}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="मकान नंबर, गली/मोहल्ला, गाँव/शहर..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district">जिला (District) *</Label>
                  <Input
                    id="district"
                    name="district"
                    required
                    value={formData.district}
                    onChange={handleInputChange}
                    placeholder="उदा. जोधपुर / जयपुर"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tehsil">तहसील (Tehsil) *</Label>
                  <Input
                    id="tehsil"
                    name="tehsil"
                    required
                    value={formData.tehsil}
                    onChange={handleInputChange}
                    placeholder="उदा. लूणी / ओसियां"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pinCode">पिन कोड (PIN Code) *</Label>
                  <Input
                    id="pinCode"
                    name="pinCode"
                    required
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, pinCode: val }));
                    }}
                    placeholder="6 अंकों का पिन कोड"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state">राज्य (State)</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="राजस्थान"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="houseType">मकान का प्रकार / वर्तमान स्थिति (House Type)</Label>
                  <select
                    id="houseType"
                    name="houseType"
                    value={formData.houseType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="कच्चा मकान (Kaccha House)">कच्चा मकान (Kaccha House)</option>
                    <option value="अर्ध-पक्का मकान (Semi-Pucca House)">अर्ध-पक्का मकान (Semi-Pucca House)</option>
                    <option value="किराए का मकान (Rented Accommodation)">किराए का मकान (Rented Accommodation)</option>
                    <option value="भूमि उपलब्ध - नवनिर्माण (Plot Available - New Construction)">भूमि उपलब्ध - नवनिर्माण (Plot Available - New Construction)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Nominee Details */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Users className="h-4 w-4 text-[#0B4A8F]" />
                ३. नामांकित व्यक्ति विवरण (Nominee Information)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nomineeName">नॉमिनी का नाम (Nominee Name)</Label>
                  <Input
                    id="nomineeName"
                    name="nomineeName"
                    value={formData.nomineeName}
                    onChange={handleInputChange}
                    placeholder="नाम दर्ज करें"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeRelation">आवेदक से संबंध (Relation)</Label>
                  <Input
                    id="nomineeRelation"
                    name="nomineeRelation"
                    value={formData.nomineeRelation}
                    onChange={handleInputChange}
                    placeholder="जैसे: पत्नी / पुत्र / माता"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeMobile">नॉमिनी मोबाइल नंबर (Mobile)</Label>
                  <Input
                    id="nomineeMobile"
                    name="nomineeMobile"
                    maxLength={10}
                    value={formData.nomineeMobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, nomineeMobile: val }));
                    }}
                    placeholder="10 अंकों का मोबाइल"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nomineeAadhar">नॉमिनी आधार (Aadhaar)</Label>
                  <Input
                    id="nomineeAadhar"
                    name="nomineeAadhar"
                    maxLength={12}
                    value={formData.nomineeAadhar}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, nomineeAadhar: val }));
                    }}
                    placeholder="12 अंकों का आधार"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Photo and Supporting Document Upload */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Upload className="h-4 w-4 text-[#0B4A8F]" />
                ४. फ़ोटो एवं दस्तावेज़ (Photo & Documents)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passportPhoto">आवेदक का पासपोर्ट फ़ोटो (Passport Photo)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="passportPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="cursor-pointer"
                    />
                    {photoPreview && (
                      <div className="h-14 w-14 rounded-lg overflow-hidden border shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">अधिकतम आकार: 2MB (JPG/PNG)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentFile">आवश्यक दस्तावेज (Supporting Document / Affidavit)</Label>
                  <Input
                    id="documentFile"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDocumentUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground">राशन कार्ड / आधार / निवास प्रमाण (Max: 5MB)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. E-PIN & Financial Information */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <KeyRound className="h-4 w-4 text-[#0B4A8F]" />
                ५. ई-पिन एवं वित्तीय विवरण (E-PIN & Financials)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* EpinInputVerifier Integration */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border">
                <EpinInputVerifier
                  value={formData.epinCode}
                  onChange={(val) => setFormData((prev) => ({ ...prev, epinCode: val }))}
                  onVerified={handleEpinVerified}
                  agentId={formData.selectedAgentId || undefined}
                  required={false}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="totalAmount">कुल योजना राशि (Total Benefit)</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    disabled
                    value="₹15,000 (गृह प्रवेश आवास योजना)"
                    className="font-semibold text-emerald-600 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentAmount">प्रारंभिक जमा राशि (Initial Deposit Amount)</Label>
                  <Input
                    id="paymentAmount"
                    name="paymentAmount"
                    type="number"
                    min="0"
                    value={formData.paymentAmount}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                  <p className="text-[11px] text-muted-foreground">मानक किश्त: ₹1,000</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMode">भुगतान माध्यम (Payment Mode)</Label>
                  <select
                    id="paymentMode"
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="CASH">नकद (Cash)</option>
                    <option value="ONLINE">ऑनलाइन (Online)</option>
                    <option value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</option>
                  </select>
                </div>

                {isAdmin() && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="selectedAgentId">संबंधित एजेंट (Assign Agent - Admin Only)</Label>
                    <select
                      id="selectedAgentId"
                      name="selectedAgentId"
                      value={formData.selectedAgentId}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">-- स्वतः / Default Agent --</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.mobile})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions with Double Submission Protection */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/aawas")}
              disabled={isLoading}
            >
              रद्द करें / Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#0B4A8F] hover:bg-[#0D5EB3] text-white px-6 font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  आवेदन जमा हो रहा है... / Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  आवास आवेदन जमा करें / Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
