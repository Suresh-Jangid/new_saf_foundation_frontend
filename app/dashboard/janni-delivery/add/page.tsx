"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  HeartHandshake,
  ArrowLeft,
  Calendar,
  User,
  Baby,
  MapPin,
  Shield,
  CreditCard,
  KeyRound,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier";
import { JanniDeliveryService, CreateJanniDeliveryPayload } from "@/lib/janni-delivery-service";
import { agentRegistrationAPI } from "@/lib/api";
import { isAdmin, getUserRole } from "@/lib/permissions";
import { EpinValidationResponse } from "@/lib/config-types";
import { validatePhoneNumber } from "@/lib/utils";

export default function AddJanniDeliveryPage() {
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
    childName: string;
    childGender: "Male" | "Female" | "Other" | "";
    deliveryDate: string;
    hospitalName: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineeMobile: string;
    gender: "Female" | "Male" | "Other";
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
    childName: "",
    childGender: "",
    deliveryDate: "",
    hospitalName: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    gender: "Female",
    category: "A",
    totalAmount: "0",
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
        if (age >= 0 && age <= 120) {
          calculatedAge = String(age);
        }
      }
      return { ...prev, dateOfBirth: dob, age: calculatedAge };
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    const rawMobile = formData.mobile.replace(/\D/g, "");
    const rawAadhar = formData.aadharNumber.replace(/\D/g, "");

    if (rawAadhar.length !== 12) {
      toast.error("कृपया 12 अंकों का आधार नंबर दर्ज करें / Enter a valid 12-digit Aadhaar number");
      return;
    }

    if (!validatePhoneNumber(rawMobile)) {
      toast.error("कृपया 10 अंकों का मोबाइल नंबर दर्ज करें / Enter a valid 10-digit mobile number");
      return;
    }

    if (!formData.applicantName.trim()) {
      toast.error("कृपया माता/आवेदक का नाम दर्ज करें / Enter applicant (mother) name");
      return;
    }

    if (!formData.fatherName.trim()) {
      toast.error("कृपया पिता का नाम दर्ज करें / Enter father's name");
      return;
    }

    if (!formData.gotra.trim()) {
      toast.error("कृपया गोत्र दर्ज करें / Enter gotra");
      return;
    }

    if (!formData.dateOfBirth) {
      toast.error("कृपया जन्म तिथि चुनें / Select date of birth");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("कृपया पता दर्ज करें / Enter full address");
      return;
    }

    if (!formData.tehsil.trim()) {
      toast.error("कृपया तहसील दर्ज करें / Enter tehsil");
      return;
    }

    if (!formData.district.trim()) {
      toast.error("कृपया ज़िला दर्ज करें / Enter district");
      return;
    }

    if (!formData.pinCode.trim() || formData.pinCode.trim().length < 5) {
      toast.error("कृपया वैध पिन कोड दर्ज करें / Enter valid PIN code");
      return;
    }

    // Prepare payload
    const payload: CreateJanniDeliveryPayload = {
      applicationDate: formData.applicationDate,
      applicantName: formData.applicantName.trim(),
      fatherName: formData.fatherName.trim(),
      husbandName: formData.husbandName.trim() || null,
      motherName: formData.motherName.trim() || null,
      dateOfBirth: formData.dateOfBirth,
      age: formData.age ? Number(formData.age) : undefined,
      aadharNumber: rawAadhar,
      gotra: formData.gotra.trim(),
      mobile: rawMobile,
      address: formData.address.trim(),
      pinCode: formData.pinCode.trim(),
      tehsil: formData.tehsil.trim(),
      district: formData.district.trim(),
      state: formData.state.trim() || "Rajasthan",
      childName: formData.childName.trim() || null,
      childGender: formData.childGender || null,
      deliveryDate: formData.deliveryDate || null,
      hospitalName: formData.hospitalName.trim() || null,
      nomineeName: formData.nomineeName.trim() || null,
      nomineeRelation: formData.nomineeRelation.trim() || null,
      nomineeMobile: formData.nomineeMobile.replace(/\D/g, "") || null,
      passportPhotoUrl: passportPhotoBase64 || null,
      gender: formData.gender,
      category: formData.category,
      totalAmount: Number(formData.totalAmount) || 0,
      paymentAmount: Number(formData.paymentAmount) || 0,
      paymentMode: formData.paymentMode,
      selectedAgentId: formData.selectedAgentId || undefined,
      epinCode: formData.epinCode.trim() || null,
      pinNumber: formData.epinCode.trim() || null,
    };

    setIsLoading(true);
    try {
      const response = await JanniDeliveryService.createRegistration(payload);
      toast.success(
        "जननी प्रसूति पंजीकरण सफलतापूर्वक दर्ज किया गया! / Janni Delivery Registration Created Successfully!"
      );
      router.push("/dashboard/janni-delivery");
    } catch (err: any) {
      console.error("Submission error:", err);
      if (err.response?.status === 409 || err.status === 409) {
        toast.error(
          err.response?.data?.message ||
            "यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।"
        );
      } else {
        const msg =
          err.response?.data?.message ||
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
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/janni-delivery")}
              className="h-9 w-9 p-0 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                जननी प्रसूति पंजीकरण फॉर्म / Janni Delivery Registration Form
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Enter mother and delivery details to register under the SAF Janni Delivery scheme
              </p>
            </div>
          </div>
        </div>

        {/* Main Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Header & Scheme Categorization */}
          <Card className="border-t-4 border-t-[#0B4A8F] shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-[#0B4A8F]" />
                Application Metadata & Categorization / आवेदन विवरण
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="appDate" className="font-semibold text-xs">
                  Application Date (दिनांक) *
                </Label>
                <Input
                  id="appDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, applicationDate: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-semibold text-xs">
                  Category (श्रेणी) *
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as any,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                >
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                  <option value="C">Category C</option>
                  <option value="D">Category D</option>
                  <option value="E">Category E</option>
                  <option value="F">Category F</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totalAmount" className="font-semibold text-xs">
                  Total Scheme Value (कुल राशि ₹)
                </Label>
                <Input
                  id="totalAmount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.totalAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, totalAmount: e.target.value }))
                  }
                />
              </div>

              {isAdmin() && (
                <div className="space-y-1.5">
                  <Label htmlFor="agentSelect" className="font-semibold text-xs">
                    Allocated Agent (कार्यकर्ता)
                  </Label>
                  <select
                    id="agentSelect"
                    value={formData.selectedAgentId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, selectedAgentId: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                  >
                    <option value="">Direct / Self / Current Admin</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Mother / Applicant Details */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-[#0B4A8F]" />
                Mother / Applicant Information / माता (आवेदक) का व्यक्तिगत विवरण
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="applicantName" className="font-semibold text-xs">
                  Mother / Applicant Name (माता का नाम) *
                </Label>
                <Input
                  id="applicantName"
                  placeholder="Enter Mother/Applicant Name"
                  value={formData.applicantName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, applicantName: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherName" className="font-semibold text-xs">
                  Father's Name (पिता का नाम) *
                </Label>
                <Input
                  id="fatherName"
                  placeholder="Enter Father's Name"
                  value={formData.fatherName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fatherName: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="husbandName" className="font-semibold text-xs">
                  Husband's Name (पति का नाम)
                </Label>
                <Input
                  id="husbandName"
                  placeholder="Enter Husband's Name"
                  value={formData.husbandName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, husbandName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motherName" className="font-semibold text-xs">
                  Mother's Name (नानी / माँ का नाम)
                </Label>
                <Input
                  id="motherName"
                  placeholder="Enter Mother's Name"
                  value={formData.motherName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, motherName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob" className="font-semibold text-xs">
                  Date of Birth (जन्म तिथि) *
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleDobChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="age" className="font-semibold text-xs">
                  Age in Years (उम्र)
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Auto-calculated from DOB"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, age: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aadhar" className="font-semibold text-xs">
                  Aadhaar Number (आधार कार्ड नंबर) *
                </Label>
                <Input
                  id="aadhar"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit Aadhaar Number"
                  value={formData.aadharNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gotra" className="font-semibold text-xs">
                  Gotra (गोत्र) *
                </Label>
                <Input
                  id="gotra"
                  placeholder="Enter Gotra"
                  value={formData.gotra}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gotra: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="font-semibold text-xs">
                  Mobile Number (मोबाइल नंबर) *
                </Label>
                <Input
                  id="mobile"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit Mobile Number"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Delivery & Child Details */}
          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Baby className="h-4 w-4 text-blue-600" />
                Delivery & Child Information / प्रसूति एवं शिशु का विवरण
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="childName" className="font-semibold text-xs">
                  Child Name (नवजात शिशु का नाम)
                </Label>
                <Input
                  id="childName"
                  placeholder="Enter Child Name (if named)"
                  value={formData.childName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, childName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="childGender" className="font-semibold text-xs">
                  Child Gender (शिशु का लिंग)
                </Label>
                <select
                  id="childGender"
                  value={formData.childGender}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      childGender: e.target.value as any,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                >
                  <option value="">Select Child Gender</option>
                  <option value="Male">Male / बालक</option>
                  <option value="Female">Female / बालिका</option>
                  <option value="Other">Other / अन्य</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliveryDate" className="font-semibold text-xs">
                  Delivery Date (प्रसूति दिनांक)
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospitalName" className="font-semibold text-xs">
                  Hospital Name / Place (अस्पताल का नाम)
                </Label>
                <Input
                  id="hospitalName"
                  placeholder="Enter Hospital / Place"
                  value={formData.hospitalName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hospitalName: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Address & Location Details */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-[#0B4A8F]" />
                Residential Address Details / स्थायी पता
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="address" className="font-semibold text-xs">
                  Full Residential Address (पूरा पता) *
                </Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="Enter house/street address, village, etc."
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pinCode" className="font-semibold text-xs">
                    PIN Code (पिन कोड) *
                  </Label>
                  <Input
                    id="pinCode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="PIN Code"
                    value={formData.pinCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pinCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tehsil" className="font-semibold text-xs">
                    Tehsil (तहसील) *
                  </Label>
                  <Input
                    id="tehsil"
                    placeholder="Enter Tehsil"
                    value={formData.tehsil}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tehsil: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district" className="font-semibold text-xs">
                    District (ज़िला) *
                  </Label>
                  <Input
                    id="district"
                    placeholder="Enter District"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, district: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="font-semibold text-xs">
                    State (राज्य)
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, state: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Nominee Details (Optional) */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-[#0B4A8F]" />
                Nominee Information (Optional) / नॉमिनी विवरण
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="nomineeName" className="font-semibold text-xs">
                  Nominee Name (नॉमिनी का नाम)
                </Label>
                <Input
                  id="nomineeName"
                  placeholder="Enter Nominee Name"
                  value={formData.nomineeName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nomineeName: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomineeRelation" className="font-semibold text-xs">
                  Relation with Applicant (संबंध)
                </Label>
                <Input
                  id="nomineeRelation"
                  placeholder="e.g. Husband, Mother, Sister"
                  value={formData.nomineeRelation}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nomineeRelation: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomineeMobile" className="font-semibold text-xs">
                  Nominee Mobile (नॉमिनी का मोबाइल)
                </Label>
                <Input
                  id="nomineeMobile"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit Mobile Number"
                  value={formData.nomineeMobile}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nomineeMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. E-PIN & Initial Payment Details */}
          <Card className="border-l-4 border-l-[#F57C00] shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <KeyRound className="h-4 w-4 text-[#F57C00]" />
                E-PIN Voucher & Initial Payment / ई-पिन एवं प्रारंभिक भुगतान
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* E-PIN Input Verifier */}
              <EpinInputVerifier
                value={formData.epinCode}
                onChange={(val) => setFormData((prev) => ({ ...prev, epinCode: val }))}
                onVerified={handleEpinVerified}
                agentId={formData.selectedAgentId || undefined}
                required={false}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount" className="font-semibold text-xs">
                    Initial Paid Amount (प्रारंभिक जमा राशि ₹)
                  </Label>
                  <Input
                    id="payAmount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.paymentAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paymentAmount: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payMode" className="font-semibold text-xs">
                    Payment Mode (भुगतान माध्यम)
                  </Label>
                  <select
                    id="payMode"
                    value={formData.paymentMode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMode: e.target.value as any,
                      }))
                    }
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                  >
                    <option value="CASH">Cash / नकद</option>
                    <option value="ONLINE">Online / ऑनलाइन</option>
                    <option value="RAZORPAY">Razorpay</option>
                    <option value="BANK_TRANSFER">Bank Transfer / बैंक ट्रांसफर</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. Attachments & Photos (Optional) */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Upload className="h-4 w-4 text-[#0B4A8F]" />
                Photo Upload (Optional) / फोटो संलग्न करें
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6 text-xs">
              <div className="flex-1 space-y-2">
                <Label htmlFor="passportPhoto" className="font-semibold text-xs">
                  Mother's Passport Size Photo / माता का पासपोर्ट साइज फोटो
                </Label>
                <Input
                  id="passportPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0B4A8F]/10 file:text-[#0B4A8F] hover:file:bg-[#0B4A8F]/20 cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  Supports JPG, PNG, WEBP (Max 5MB)
                </p>
              </div>

              {photoPreview && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-24 w-24 rounded-lg overflow-hidden border shadow-sm">
                    <img
                      src={photoPreview}
                      alt="Mother Photo Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    ✓ Photo Loaded
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/janni-delivery")}
              disabled={isLoading}
            >
              Cancel / रद्द करें
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white px-6 font-semibold shadow-md shadow-blue-950/20 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Registration / पंजीकरण सबमिट करें
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
