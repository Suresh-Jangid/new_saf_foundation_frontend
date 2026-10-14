"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { formatBilingual } from "@/lib/translations";
import {
  formatDate,
  isValidDate,
  parseDateFromDDMMYYYY,
  getCurrentUserInfo,
  calculateAge as calculateAgeUtil,
} from "@/lib/utils";
import React from "react";
import { X } from "lucide-react";
import { MediaUploadControl } from "@/components/media-upload";
import { PincodeAddressFields } from "@/components/forms/pincode-address-fields";
import { useRegistrationDraft } from "@/hooks/use-registration-draft";
import { DraftBanner } from "@/components/drafts/draft-banner";
import { DraftActions } from "@/components/drafts/draft-actions";


export default function AddDisabilityCyclePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createApi } = useCRUD("disabilityCycleRecords", [], {
    create: API_ENDPOINTS.CREATE_DISABILITY_CYCLE,
  });

  // Helper function to convert dd-mm-yyyy to yyyy-mm-dd format
  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate) return "";

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Helper function to format date as dd-mm-yyyy
  const formatDateAsDDMMYYYY = (date: Date): string => formatDate(date);

  // Helper to calculate age from date of birth
  function calculateAge(dob: string) {
    console.log("calculateAge called with dob:", dob);
    if (!dob) return "";
    const age = calculateAgeUtil(dob);
    console.log("calculateAgeUtil returned:", age);
    return age !== null ? age.toString() : "";
  }

  const [formData, setFormData] = useState(() => ({
    
    applicationDate: "",
    applicantName: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    aadharNumber: "",
    gotra: "",
    age: "",
    mobile: "",
    address: "",
    pinCode: "",
    tehsil: "",
    district: "",
    state: "",
    photo: null as File | null,
  }));

  // Age calculation state
  const [computedAge, setComputedAge] = useState("");

  // Calculate age when date of birth changes
  React.useEffect(() => {
    console.log("Date of birth changed:", formData.dateOfBirth);
    
    if (!formData.dateOfBirth) {
      setComputedAge("");
      setFormData((prev) => ({ ...prev, age: "" }));
      return;
    }
    
    const calculatedAge = calculateAge(formData.dateOfBirth);
    console.log("Calculated age:", calculatedAge);
    setComputedAge(calculatedAge);
    setFormData((prev) => ({ ...prev, age: calculatedAge }));
  }, [formData.dateOfBirth]);

  const {
    draft,
    isDraftSaving,
    saveDraft,
    restoreDraft,
    discardDraft,
    clearDraftOnSubmit,
  } = useRegistrationDraft({
    moduleKey: "disability_cycle",
    moduleTitle: "निःशक्त साइकिल आवेदन (Disability Cycle)",
    formData,
    getApplicantName: () => formData.applicantName || "",
    onRestore: (loadedData) => {
      setFormData((prev) => ({ ...prev, ...loadedData, photo: null }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.applicationDate ||
      !formData.dateOfBirth ||
      !formData.applicantName ||
      !formData.fatherName ||
      !formData.age ||
      !formData.mobile
    ) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें (आवेदन दिनांक, जन्म तिथि, नाम, पिता का नाम, आयु, मोबाइल)");
      return;
    }

    try {
      setIsSubmitting(true);

      const { addedby, addedby_id } = getCurrentUserInfo();

      const apiFormData = {
        applicationDate: convertToYYYYMMDD(formData.applicationDate),
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        aadharNumber: formData.aadharNumber,
        gotra: formData.gotra,
        age: parseInt(formData.age || computedAge, 10) || 0,
        mobile: formData.mobile,
        address: formData.address,
        pinCode: formData.pinCode,
        tehsil: formData.tehsil,
        district: formData.district,
        state: formData.state,
        ...(formData.photo ? { photo: formData.photo } : {}),
        addedby,
        addedby_id,
      };

      const result = await createApi(apiFormData);

      if (result) {
        clearDraftOnSubmit();
        router.push("/dashboard/disability-cycle");
      }
    } catch (error) {
      console.error("Error creating disability cycle application:", error);
      toast.error("निःशक्त साइकिल आवेदन जोड़ने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col mb-6 sm:flex-row md:items-center sm:gap-4">
        <div className="mb-4 sm:mb-0">
          <Button type="button" variant="link" onClick={() => router.back()} className="p-0 h-auto">
            <span className="hidden sm:inline">← वापस जाएं /<br/> Go Back</span>
            <span className="sm:hidden">← वापस जाएं</span>
          </Button>
        </div>
        <div className="">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">नया निःशक्त साइकिल आवेदन जोड़ें</h1>
          <p className="text-sm text-gray-600">Add New Disability Cycle Application</p>
        </div>
      </div>

      {/* Draft Alert Banner */}
      <DraftBanner
        draft={draft}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Add Disability Cycle Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div>
                <Label htmlFor="applicationDate">आवेदन दिनांक (Application Date) *</Label>
                <DatePicker
                  id="applicationDate"
                  value={formData.applicationDate}
                  onChange={(date) =>
                    setFormData((prev) => ({
                      ...prev,
                      applicationDate: date ? formatDateAsDDMMYYYY(date) : "",
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="dateOfBirth">जन्म तिथि (Date of Birth) *</Label>
                <DatePicker
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(date) => {
                    console.log("DatePicker onChange - date:", date);
                    const formattedDate = date ? formatDateAsDDMMYYYY(date) : "";
                    console.log("DatePicker onChange - formattedDate:", formattedDate);
                    setFormData((prev) => ({
                      ...prev,
                      dateOfBirth: formattedDate,
                    }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="age">आयु (Age) *</Label>
                <Input
                  id="age"
                  type="text"
                  value={computedAge}
                  placeholder="आयु / Age"
                  readOnly
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicantName">आवेदक का नाम (Applicant Name) *</Label>
                <Input
                  id="applicantName"
                  value={formData.applicantName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicantName: e.target.value }))}
                  placeholder="Enter applicant name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम (Father's Name) *</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="Enter father's name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="motherName">माता का नाम (Mother's Name)</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motherName: e.target.value }))}
                  placeholder="Enter mother's name"
                />
              </div>

              <div>
                <Label htmlFor="gotra">गोत्र (Gotra)</Label>
                <Input
                  id="gotra"
                  value={formData.gotra}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gotra: e.target.value }))}
                  placeholder="Enter gotra"
                />
              </div>
             
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aadharNumber">आधार संख्या (Aadhar Number)</Label>
                <Input
                  id="aadharNumber"
                  inputMode="numeric"
                  value={formData.aadharNumber}
                  onChange={(e) => { 
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                    setFormData((prev) => ({ ...prev, aadharNumber: digits }))}}
                  placeholder="Enter Aadhar number"
                />
              </div>
             
              <div>
              <Label htmlFor="mobile">मोबाइल नंबर (Mobile Number) *</Label>
              <Input
                id="mobile"
                inputMode="numeric"
                value={formData.mobile}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData((prev) => ({ ...prev, mobile: digits }))
                }}
                placeholder={formatBilingual("placeholders.enterMobile")} 
                required
              />
            </div>

            </div>

           
            {/* Reusable Address Section */}
            <PincodeAddressFields
              values={{
                pinCode: formData.pinCode,
                state: formData.state,
                district: formData.district,
                tehsil: formData.tehsil,
                address: formData.address,
              }}
              onChange={(field, val) => setFormData((prev) => ({ ...prev, [field]: val }))}
              addressLabel="Village / गाँव"
              addressPlaceholder="गांव का नाम दर्ज करे"
            />


            {/* Photo Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="photo">फोटो (Photo)</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        photo: e.target.files?.[0] || null,
                      }))
                    }
                  />
                  <MediaUploadControl
                    mode="image"
                    standaloneCameraOnly
                    onFileSelect={(file) => setFormData((prev) => ({ ...prev, photo: file }))}
                    label="फोटो खींचें"
                  />
                </div>
                {/* Image preview */}
                {formData.photo && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={URL.createObjectURL(formData.photo)}
                      alt="Photo Preview"
                      className="h-32 w-auto border rounded"
                    />
                    <X
                      className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, photo: null }));
                      }}
                      aria-label="Remove"
                    />
                  </div>
                )}
              </div>
            </div>

            <DraftActions
              onSaveDraft={saveDraft}
              isSavingDraft={isDraftSaving}
              isSubmitting={isSubmitting}
              onCancel={() => router.back()}
              cancelHref="/dashboard/disability-cycle"
              submitLabel="आवेदन बनाएं (Create Application)"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
