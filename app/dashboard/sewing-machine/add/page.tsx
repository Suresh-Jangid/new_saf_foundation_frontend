"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, isValidDate, parseDateFromDDMMYYYY, validatePhoneNumber, getCurrentUserInfo } from "@/lib/utils"

export default function AddSewingMachinePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

 

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

  // Helper to calculate age from date of birth
  function calculateAge(dob: string) {
    if (!dob) return "";
    const birthDate = parseDateFromDDMMYYYY(dob);
    if (!birthDate) return "";
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  }

  const [formData, setFormData] = useState({
    campNumber: 'C-',
    
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

  const { createApi } = useCRUD("sewingMachineRecords", [], {
    create: API_ENDPOINTS.CREATE_SEWING_CAMP,
  });

  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(
    formData.applicationDate ? new Date(formData.applicationDate) : undefined
  )
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState(
    formatDate(applicationDateObj as any)
  )

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(
    formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
  )
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState(
    formatDate(dateOfBirthObj as any)
  )

  // Phone validation state
  const [phoneError, setPhoneError] = useState("")

  // Calculate age when date of birth changes
  useEffect(() => {
    if (!formData.dateOfBirth) {
      setComputedAge("");
      setFormData((prev) => ({ ...prev, age: "" }));
      return;
    }
    
    const calculatedAge = calculateAge(formData.dateOfBirth);
    setComputedAge(calculatedAge);
    setFormData((prev) => ({ ...prev, age: calculatedAge }));
  }, [formData.dateOfBirth]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle phone number change with validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: digits }));
    
    // Clear error if field is empty (required field)
    if (!digits) {
      setPhoneError("");
      return;
    }
    
    // Validate phone number
    if (!validatePhoneNumber(digits)) {
      setPhoneError("कृपया एक वैध 10 अंकों का फोन नंबर दर्ज करें");
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (
      !formData.campNumber ||
      !formData.applicationDate ||
      !formData.dateOfBirth ||
      !formData.applicantName ||
      !formData.fatherName ||
      !formData.motherName ||
      !formData.aadharNumber ||
      !formData.gotra ||
      !formData.mobile ||
      !formData.address
    ) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें (कैंप नंबर, आवेदन तिथि, जन्म तिथि सहित)");
      return;
    }

    // Phone number validation
    if (!validatePhoneNumber(formData.mobile)) {
      toast.error("कृपया एक वैध फोन नंबर दर्ज करें");
      return;
    }

    setIsLoading(true)

    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      const apiFormData: Record<string, unknown> = {
        campNumber: formData.campNumber,
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
        addedby,
        addedby_id,
      };

      if (formData.passportPhoto) {
        apiFormData.passportPhoto = formData.passportPhoto;
      }
      
      const success = await createApi(apiFormData);
      
      if (success) {
        router.push("/dashboard/sewing-machine");
      }
    } catch (error: any) {
      console.error("Error creating sewing machine camp application:", error);
      toast.error("सिलाई मशीन कैंप आवेदन जोड़ने में त्रुटि");
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Top Back Button and Title */}
      <div className="flex items-center mb-6">
        <Button type="button" variant="link" onClick={() => router.back()} className="mr-4">
          ← वापस जाएं / <br />Go Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">नया सिलाई मशीन कैंप आवेदन जोड़ें</h1>
          <p className="text-sm text-gray-600">Add New Sewing Machine Camp Application</p>
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>सिलाई मशीन कैंप आवेदन विवरण / Sewing Machine Camp Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="campNumber">कैंप नंबर (Camp Number) *</Label>
                <Input
                  id="campNumber"
                  name="campNumber"
                  value={formData.campNumber}
                  onChange={handleChange}
                  placeholder="कैंप नंबर"
                  required
                  // readOnly
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
                      
                      // Try to parse the date from DD-MM-YYYY format
                      const parsedDate = parseDateFromDDMMYYYY(inputValue)
                      if (parsedDate) {
                        setApplicationDateObj(parsedDate)
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: inputValue,
                        }))
                      } else {
                        // If parsing fails, still store the raw input
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
                          if (date) {
                            setApplicationDateObj(date)
                            const formattedDate = formatDate(date)
                            setApplicationDateValue(formattedDate)
                            setFormData((prev) => ({
                              ...prev,
                              applicationDate: formattedDate,
                            }))
                          }
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
                      
                      // Try to parse the date from DD-MM-YYYY format
                      const parsedDate = parseDateFromDDMMYYYY(inputValue)
                      if (parsedDate) {
                        setDateOfBirthObj(parsedDate)
                        setFormData((prev) => ({
                          ...prev,
                          dateOfBirth: inputValue,
                        }))
                      } else {
                        // If parsing fails, still store the raw input
                        setFormData((prev) => ({
                          ...prev,
                          dateOfBirth: inputValue,
                        }))
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
                          if (date) {
                            setDateOfBirthObj(date)
                            const formattedDate = formatDate(date)
                            setDateOfBirthValue(formattedDate)
                            setFormData((prev) => ({
                              ...prev,
                              dateOfBirth: formattedDate,
                            }))
                          }
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
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={formData.aadharNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aadharNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                    }))
                  }
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
                />
              </div>
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर (Mobile Number) *</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={handlePhoneChange}
                  placeholder="मोबाइल नंबर"
                  className={phoneError ? "border-red-500" : ""}
                  required
                />
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pinCode">पिन कोड (Pin Code)</Label>
                <Input
                  id="pinCode"
                  type="number"
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
                {/* Image preview */}
                {formData.passportPhoto && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(formData.passportPhoto)}
                      alt="पासपोर्ट फोटो प्रीव्यू"
                      className="h-24 rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                रद्द करें
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "जोड़ रहा है..." : "आवेदन जोड़ें"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
