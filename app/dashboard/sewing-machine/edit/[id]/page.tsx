"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, isValidDate, parseDateFromDDMMYYYY, calculateAge, getApplicantPhotoPath, getProxiedPhotoSrc } from "@/lib/utils"
import React from "react";

interface SewingMachineRecord {
  id: string
  campNumber: string
  formNumber: string
  applicationDate: string
  applicantName: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  aadharNumber: string
  gotra: string
  age: string
  mobile: string
  address: string
  pinCode: string
  tehsil: string
  district: string
  state: string
  passportPhoto?: string
  createdAt: string
}

export default function EditSewingMachinePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

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



  const [formData, setFormData] = useState({
    campNumber: "",
    formNumber: "",
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
    passportPhoto: null as File | null,
  })

  // Age calculation state
  const [computedAge, setComputedAge] = useState("");
  
  // Photo state for existing photos
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>("");

  const { readByIdApi, updateApi } = useCRUD<SewingMachineRecord>("sewingMachineRecords", [], {
    readById: API_ENDPOINTS.GET_SEWING_CAMP,
    update: API_ENDPOINTS.UPDATE_SEWING_CAMP,
  });

  // Date pickers
  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(undefined)
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState("")

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(undefined)
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState("")

  // Calculate age when date of birth changes
  React.useEffect(() => {
    const dateToCalculate = dateOfBirthValue || formData.dateOfBirth;
    
    console.log("Age calculation triggered:", {
      dateOfBirthValue,
      formDataDateOfBirth: formData.dateOfBirth,
      dateToCalculate
    });
    
    if (!dateToCalculate) {
      setComputedAge("");
      setFormData((prev) => ({ ...prev, age: "" }));
      return;
    }
    
    const calculatedAge = calculateAge(dateToCalculate);
    console.log("Calculated age result:", calculatedAge);
    
    if (calculatedAge !== null) {
      setComputedAge(calculatedAge.toString());
      setFormData((prev) => ({ ...prev, age: calculatedAge.toString() }));
    } else {
      setComputedAge("");
      setFormData((prev) => ({ ...prev, age: "" }));
    }
  }, [dateOfBirthValue, formData.dateOfBirth]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const record = await readByIdApi(id);
        
        if (record) {
          console.log("API Response:", record);
          
          setFormData({
            campNumber: record.campNumber || "",
            formNumber: record.formNumber || "",
            applicationDate: formatDate(record.applicationDate || ""),
            applicantName: record.applicantName || "",
            fatherName: record.fatherName || "",
            motherName: record.motherName || "",
            dateOfBirth: formatDate(record.dateOfBirth || ""),
            aadharNumber: record.aadharNumber || "",
            gotra: record.gotra || "",
            age: record.age || "",
            mobile: record.mobile || "",
            address: record.address || "",
            pinCode: record.pinCode || "",
            tehsil: record.tehsil || "",
            district: record.district || "",
            state: record.state || "",
            passportPhoto: null,
          });
          
          const photoPath = getApplicantPhotoPath(record as unknown as Record<string, unknown>);
          if (photoPath) {
            setExistingPhotoUrl(photoPath);
          }
          
          if (record.applicationDate) {
            const appDate = parseDateFromDDMMYYYY(formatDate(record.applicationDate));
            if (appDate) {
              setApplicationDateObj(appDate);
              setApplicationDateValue(formatDate(appDate));
            }
          }
          if (record.dateOfBirth) {
            const dobDate = parseDateFromDDMMYYYY(formatDate(record.dateOfBirth));
            if (dobDate) {
              setDateOfBirthObj(dobDate);
              setDateOfBirthValue(formatDate(dobDate));
            }

            const calculatedAge = calculateAge(formatDate(record.dateOfBirth));
            if (calculatedAge !== null) {
              setComputedAge(calculatedAge.toString());
            } else {
              setComputedAge("");
            }
          }
        } else {
          toast.error("Sewing machine record not found");
          router.push("/dashboard/sewing-machine");
        }
      } catch (error: any) {
        console.error("Error fetching sewing machine record:", error);
        toast.error("Failed to load sewing machine data");
        router.push("/dashboard/sewing-machine");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.campNumber || !formData.formNumber || !formData.applicantName || !formData.fatherName || !formData.motherName || !formData.aadharNumber || !formData.gotra || !formData.mobile || !formData.address) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    setIsLoading(true)

    try {
      const apiFormData: Record<string, unknown> = {
        campNumber: formData.campNumber,
        formNumber: formData.formNumber,
        applicationDate: convertToYYYYMMDD(formData.applicationDate),
        dateOfBirth: convertToYYYYMMDD(formData.dateOfBirth),
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        aadharNumber: formData.aadharNumber,
        gotra: formData.gotra,
        age: formData.age || computedAge,
        mobile: formData.mobile,
        address: formData.address,
        pinCode: formData.pinCode,
        tehsil: formData.tehsil,
        district: formData.district,
        state: formData.state,
      };

      if (formData.passportPhoto) {
        apiFormData.passportPhoto = formData.passportPhoto;
      } else if (existingPhotoUrl) {
        apiFormData.existingPassportPhoto = existingPhotoUrl;
      } else {
        apiFormData.existingPassportPhoto = "";
      }
      
      const success = await updateApi(id, apiFormData);
      
      if (success) {
        router.push("/dashboard/sewing-machine");
      }
    } catch (error: any) {
      console.error("Error updating sewing machine record:", error);
      toast.error("सिलाई मशीन कैंप रिकॉर्ड अपडेट करने में त्रुटि");
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading sewing machine data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="flex">
       <div className="mb-4">
        <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading}>
          ← वापस जाएं / <br/>Go Back
        </Button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">सिलाई मशीन कैंप रिकॉर्ड संपादित करें</h1>
        <p className="text-sm text-gray-600">Edit Sewing Machine Camp Record</p>
      </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Sewing Machine Camp Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="campNumber">कैंप नंबर (Camp Number) *</Label>
                <Input
                  id="campNumber"
                  name="campNumber"
                  disabled
                  value={formData.campNumber}
                  onChange={handleChange}
                  placeholder="कैंप नंबर"
                  required
                />
              </div>
              <div>
                <Label htmlFor="formNumber">फॉर्म नंबर (Form Number) *</Label>
                <Input
                  id="formNumber"
                  name="formNumber"
                  disabled
                  value={formData.formNumber}
                  onChange={handleChange}
                  placeholder="फॉर्म नंबर"
                  required
                />
              </div>
              <div>
                <Label htmlFor="applicationDate">आवेदन तिथि (Application Date)</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="applicationDate"
                    value={applicationDateValue}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const inputValue = e.target.value
                      setApplicationDateValue(inputValue)
                      
                      // Try to parse the date from dd-mm-yyyy format
                      const parsedDate = parseDateFromDDMMYYYY(inputValue)
                      if (parsedDate) {
                        setApplicationDateObj(parsedDate)
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: inputValue,
                        }))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setApplicationDateOpen(true)
                      }
                    }}
                  />
                  <Popover open={applicationDateOpen} onOpenChange={setApplicationDateOpen}>
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
                        selected={applicationDateObj}
                        captionLayout="dropdown"
                        month={applicationDateObj}
                        onMonthChange={setApplicationDateObj}
                        onSelect={(date: any) => {
                          setApplicationDateObj(date)
                          setApplicationDateValue(formatDate(date))
                          setFormData((prev) => ({
                            ...prev,
                            applicationDate: date ? formatDate(date) : "",
                          }))
                          setApplicationDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="applicantName">आवेदक का नाम (Applicant Name) *</Label>
                <Input
                  id="applicantName"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  placeholder="आवेदक का नाम"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम (Father Name) *</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="पिता का नाम"
                  required
                />
              </div>
              <div>
                <Label htmlFor="motherName">माता का नाम (Mother Name) *</Label>
                <Input
                  id="motherName"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="माता का नाम"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="dateOfBirth">जन्म तिथि (Date of Birth)</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="dateOfBirth"
                    value={dateOfBirthValue}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const inputValue = e.target.value
                      setDateOfBirthValue(inputValue)
                      
                      // Always update form data with the input value
                      setFormData((prev) => ({
                        ...prev,
                        dateOfBirth: inputValue,
                      }))
                      
                      // Try to parse the date from dd-mm-yyyy format
                      const parsedDate = parseDateFromDDMMYYYY(inputValue)
                      if (parsedDate) {
                        setDateOfBirthObj(parsedDate)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setDateOfBirthOpen(true)
                      }
                    }}
                  />
                  <Popover open={dateOfBirthOpen} onOpenChange={setDateOfBirthOpen}>
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
                        selected={dateOfBirthObj}
                        captionLayout="dropdown"
                        month={dateOfBirthObj}
                        onMonthChange={setDateOfBirthObj}
                        onSelect={(date: any) => {
                          setDateOfBirthObj(date)
                          setDateOfBirthValue(formatDate(date))
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: date ? formatDate(date) : "",
                          }))
                          setDateOfBirthOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="aadharNumber">आधार नंबर (Aadhar Number) *</Label>
                <Input
                  id="aadharNumber"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  placeholder="आधार नंबर"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                <Input
                  id="gotra"
                  name="gotra"
                  value={formData.gotra}
                  onChange={handleChange}
                  placeholder="गोत्र"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="age">आयु (Age)</Label>
                <Input
                  id="age"
                  name="age"
                  value={computedAge}
                  placeholder="आयु / Age"
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर (Mobile Number) *</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="मोबाइल नंबर"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pinCode">पिन कोड (Pin Code)</Label>
                <Input
                  id="pinCode"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  placeholder="पिन कोड"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Village / गाँव *</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="गांव का नाम दर्ज करे"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="tehsil">तहसील (Tehsil)</Label>
                <Input
                  id="tehsil"
                  name="tehsil"
                  value={formData.tehsil}
                  onChange={handleChange}
                  placeholder="तहसील"
                />
              </div>
              <div>
                <Label htmlFor="district">जिला (District)</Label>
                <Input
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="जिला"
                />
              </div>
              <div>
                <Label htmlFor="state">राज्य (State)</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="राज्य"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="passportPhoto">पासपोर्ट साइज रंगीन फोटो / Passport Size Color Photo</Label>
                <Input
                  id="passportPhoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passportPhoto: e.target.files?.[0] || null,
                    }))
                  }
                />
                {/* Image preview - show existing photo or new selected photo */}
                {(existingPhotoUrl || formData.passportPhoto) && (
                  <div className="mt-2">
                    <img
                      src={
                        formData.passportPhoto
                          ? URL.createObjectURL(formData.passportPhoto)
                          : getProxiedPhotoSrc(existingPhotoUrl)
                      }
                      alt="पासपोर्ट फोटो प्रीव्यू"
                      className="h-24 rounded border"
                      onError={(e) => {
                        // Handle image loading error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {existingPhotoUrl && !formData.passportPhoto && (
                      <p className="text-xs text-gray-500 mt-1">Existing photo loaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                रद्द करें
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "अपडेट हो रहा है..." : "रिकॉर्ड अपडेट करें"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 