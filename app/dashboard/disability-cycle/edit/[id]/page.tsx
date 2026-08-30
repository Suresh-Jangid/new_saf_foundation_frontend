"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { DatePicker } from "@/components/ui/date-picker"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"

import { formatBilingual } from '@/lib/translations'
import { formatDate, parseDateFromDDMMYYYY, calculateAge as calculateAgeUtil, getApplicantPhotoPath, getProxiedPhotoSrc } from '@/lib/utils'
import React from "react";
import { X } from "lucide-react";

interface DisabilityCycleRecord {
  id: string;

  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  age: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  photo?: string;
  createdAt: string;
}

export default function EditDisabilityCyclePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Helper function to convert dd-mm-yyyy to yyyy-mm-dd format
  const convertToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return "";
    const parsedDate = parseDateFromDDMMYYYY(dateString);
    if (!parsedDate) return "";
    
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Helper function to convert yyyy-mm-dd to dd-mm-yyyy format
  const convertToDDMMYYYY = (dateString: string): string => formatDate(dateString);

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

  const [formData, setFormData] = useState({
   
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
  })

  // Age calculation state
  const [computedAge, setComputedAge] = useState("");
  
  // State for existing photo
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

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

  const { readByIdApi, updateApi } = useCRUD<DisabilityCycleRecord>("disabilityCycleRecords", [], {
    readById: API_ENDPOINTS.GET_DISABILITY_CYCLES,
    update: API_ENDPOINTS.UPDATE_DISABILITY_CYCLE,
  });

  // Fetch disability cycle data on component mount
  useEffect(() => {
    const fetchDisabilityCycleData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const disabilityCycleData = await readByIdApi(id);
        
        if (disabilityCycleData) {
          setFormData({
            
            applicationDate: convertToDDMMYYYY(disabilityCycleData.applicationDate || ""),
            applicantName: disabilityCycleData.applicantName || "",
            fatherName: disabilityCycleData.fatherName || "",
            motherName: disabilityCycleData.motherName || "",
            dateOfBirth: convertToDDMMYYYY(disabilityCycleData.dateOfBirth || ""),
            aadharNumber: disabilityCycleData.aadharNumber || "",
            gotra: disabilityCycleData.gotra || "",
            age: disabilityCycleData.age || "",
            mobile: disabilityCycleData.mobile || "",
            address: disabilityCycleData.address || "",
            pinCode: disabilityCycleData.pinCode || "",
            tehsil: disabilityCycleData.tehsil || "",
            district: disabilityCycleData.district || "",
            state: disabilityCycleData.state || "",
            photo: null,
          });
          
          // Set existing photo URL if available
          const photoPath = getApplicantPhotoPath(disabilityCycleData as unknown as Record<string, unknown>);
          if (photoPath) {
            setExistingPhotoUrl(photoPath);
          }
          
          // Set computed age when loading data
          if (disabilityCycleData.dateOfBirth) {
            const calculatedAge = calculateAge(convertToDDMMYYYY(disabilityCycleData.dateOfBirth));
            setComputedAge(calculatedAge);
          }
        } else {
          toast.error("दिव्यांग साइकिल डेटा नहीं मिला");
          router.push("/dashboard/disability-cycle");
        }
      } catch (error) {
        console.error("Error fetching disability cycle data:", error);
        toast.error("दिव्यांग साइकिल डेटा लोड करने में त्रुटि");
        router.push("/dashboard/disability-cycle");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDisabilityCycleData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if ( !formData.applicationDate || !formData.applicantName || !formData.fatherName || !formData.age || !formData.mobile) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert dates to YYYY-MM-DD format for API
      const apiFormData: Record<string, unknown> = {
        applicationDate: convertToYYYYMMDD(formData.applicationDate),
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        aadharNumber: formData.aadharNumber,
        gotra: formData.gotra,
        age: formData.age,
        mobile: formData.mobile,
        address: formData.address,
        pinCode: formData.pinCode,
        tehsil: formData.tehsil,
        district: formData.district,
        state: formData.state,
      };

      if (formData.photo) {
        apiFormData.photo = formData.photo;
      } else if (existingPhotoUrl) {
        apiFormData.existingPhotoUrl = existingPhotoUrl;
      } else {
        apiFormData.existingPhotoUrl = "";
      }
      
      const success = await updateApi(id, apiFormData);

      console.log("success", success);
      
      
      if (success) {
        router.push("/dashboard/disability-cycle");
      }
    } catch (error) {
      console.error("Error updating disability cycle application:", error);
      toast.error("दिव्यांग साइकिल आवेदन अपडेट करने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading disability cycle data...</div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">दिव्यांग साइकिल संपादित करें</h1>
          <p className="text-sm text-gray-600">Edit Disability Cycle</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Edit Disability Cycle Application Details</CardTitle>
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
                <Label htmlFor="dateOfBirth">जन्म तिथि (Date of Birth)</Label>
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

           
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Village / गाँव</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="गांव का नाम दर्ज करे"
              />
            </div>


            <div>
                <Label htmlFor="pinCode">पिन कोड (Pin Code)</Label>
                <Input
                  id="pinCode"
                  value={formData.pinCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pinCode: e.target.value }))}
                  placeholder="Enter pin code"
                />
              </div>

              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
              <div>
                <Label htmlFor="tehsil">तहसील (Tehsil)</Label>
                <Input
                  id="tehsil"
                  value={formData.tehsil}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tehsil: e.target.value }))}
                  placeholder="Enter tehsil"
                />
              </div>
              <div>
                <Label htmlFor="district">जिला (District)</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="Enter district"
                />
              </div>
              <div>
                <Label htmlFor="state">राज्य (State)</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="photo">फोटो (Photo)</Label>
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
                {/* Image preview - show existing photo or new selected photo */}
                {(existingPhotoUrl || formData.photo) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={
                        formData.photo
                          ? URL.createObjectURL(formData.photo)
                          : getProxiedPhotoSrc(existingPhotoUrl)
                      }
                      alt="Photo Preview"
                      className="h-32 w-auto border rounded"
                      onError={(e) => {
                        // Handle image loading error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <X
                      className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, photo: null }));
                        setExistingPhotoUrl(null);
                      }}
                      aria-label="Remove"
                    />
                    {existingPhotoUrl && !formData.photo && (
                      <p className="text-xs text-gray-500 mt-1">Existing photo loaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting} className="w-full sm:w-auto">
                रद्द करें / Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "अपडेट हो रहा है..." : "अपडेट करें (Update)"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 
