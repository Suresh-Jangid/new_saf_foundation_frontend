"use client"

import { useState, useEffect } from "react"
import { GENDER_OPTIONS } from "@/lib/form-values"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, isValidDate, parseDateFromDDMMYYYY, formatDateForAPI, getCurrentUserInfo } from "@/lib/utils";

// Phone number validation function
const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian phone number (10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  
  return phoneRegex.test(cleanPhone);
};

export default function AddDonationPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createApi } = useCRUD("financialHelpRecords", [], {
    create: API_ENDPOINTS.CREATE_FINANCIAL_HELP,
  });

  const [formData, setFormData] = useState({
    formNumber: "",
    date: "",
    name: "",
    gender: "",
    fatherName: "",
    gotra: "",
    district: "",
    village: "",
    tehsil: "",
    phone: "",
    donatedAmount: "",
  })

  const [dateObj, setDateObj] = useState<Date | undefined>(undefined)
  const [dateOpen, setDateOpen] = useState(false)
  const [dateValue, setDateValue] = useState(
    formData.date
      ? formatDate(new Date(formData.date))
      : ""
  )

  // Phone validation state
  const [phoneError, setPhoneError] = useState("")

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle phone number change with validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    setFormData((prev) => ({ ...prev, phone }));
    
    // Clear error if field is empty (optional field)
    if (!phone) {
      setPhoneError("");
      return;
    }
    
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      setPhoneError("कृपया एक वैध 10 अंकों का फोन नंबर दर्ज करें");
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.date || !formData.name || !formData.gender || !formData.fatherName || !formData.donatedAmount) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    // Phone number validation
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      toast.error("कृपया एक वैध फोन नंबर दर्ज करें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert date to yyyy-mm-dd format for API
      let apiDate = "";
      if (dateObj) {
        apiDate = formatDateForAPI(dateObj);
      } else if (formData.date) {
        // If we have a date string, try to parse it
        const parsedDate = parseDateFromDDMMYYYY(formData.date);
        if (parsedDate) {
          apiDate = formatDateForAPI(parsedDate);
        } else {
          // If we can't parse it, try to create a Date object directly
          const directDate = new Date(formData.date);
          if (isValidDate(directDate)) {
            apiDate = formatDateForAPI(directDate);
          }
        }
      }
      
      if (!apiDate) {
        toast.error("कृपया एक वैध तिथि दर्ज करें");
        return;
      }
      
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      const apiData: Record<string, unknown> = {
        date: apiDate,
        name: formData.name,
        gender: formData.gender,
        fatherName: formData.fatherName,
        gotra: formData.gotra,
        district: formData.district,
        village: formData.village,
        tehsil: formData.tehsil,
        phone: formData.phone,
        donatedAmount: formData.donatedAmount,
        addedby,
        addedby_id,
      };

      if (formData.formNumber.trim()) {
        apiData.formNumber = formData.formNumber.trim();
      }
      
      const result = await createApi(apiData);
      
      if (result) {
        router.push("/dashboard/financal-help");
      }
    } catch (error) {
      console.error("Error creating donation:", error);
      toast.error("दान जोड़ने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  }



  return (
    <div className="p-6">
      <div className="flex ">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()}>
            ← वापस जाएं / <br />Go Back
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">नया दान जोड़ें</h1>
          <p className="text-sm text-gray-600">Add New Donation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>दान विवरण / Donation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="formNumber">फॉर्म नंबर / Form Number</Label>
                <Input
                  id="formNumber"
                  value={formData.formNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, formNumber: e.target.value }))}
                  placeholder="फॉर्म नंबर दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="date">तिथि / Date *</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={dateValue}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const str = e.target.value
                      setDateValue(str)
                      const date = parseDateFromDDMMYYYY(str)
                      if (date) {
                        setDateObj(date)
                        setFormData((prev) => ({
                          ...prev,
                          date: formatDate(date),
                        }))
                      } else {
                        // Clear dateObj if invalid date
                        setDateObj(undefined)
                        setFormData((prev) => ({
                          ...prev,
                          date: str,
                        }))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setDateOpen(true)
                      }
                    }}
                    required
                  />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
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
                        selected={dateObj}
                        captionLayout="dropdown"
                        month={dateObj}
                        onMonthChange={setDateObj}
                        onSelect={(date: any) => {
                          setDateObj(date)
                          setDateValue(date ? formatDate(date) : "")
                          setFormData((prev) => ({
                            ...prev,
                            date: date ? formatDate(date) : "",
                          }))
                          setDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="name">नाम / Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="नाम / Name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gender">लिंग / Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="लिंग चुनें" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fatherName">पिता का नाम / Father's Name *</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="पिता का नाम / Father's Name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gotra">Gotra / गोत्र</Label>
                <Input
                  id="gotra"
                  value={formData.gotra}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gotra: e.target.value }))}
                  placeholder="गोत्र दर्ज करे"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="district">जिला / District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="जिला / District"
                />
              </div>
              <div>
                <Label htmlFor="village">गांव / Village</Label>
                <Input
                  id="village"
                  value={formData.village}
                  onChange={(e) => setFormData((prev) => ({ ...prev, village: e.target.value }))}
                  placeholder="गांव / Village"
                />
              </div>
              <div>
                <Label htmlFor="tehsil">तहसील / Tehsil</Label>
                <Input
                  id="tehsil"
                  value={formData.tehsil}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tehsil: e.target.value }))}
                  placeholder="तहसील / Tehsil"
                />
              </div>
              <div>
                <Label htmlFor="phone">फोन नंबर / Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="फोन नंबर / Phone Number"
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="donatedAmount">दान राशि / Donated Amount *</Label>
              <Input
                id="donatedAmount"
                type="number"
                value={formData.donatedAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, donatedAmount: e.target.value }))}
                placeholder="दान राशि / Donated Amount"
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                रद्द करें / Cancel
              </Button>
            
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "जमा हो रहा है..." : "जमा करें / Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


