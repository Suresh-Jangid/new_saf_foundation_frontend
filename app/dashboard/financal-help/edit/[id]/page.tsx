"use client"

import { useState, useEffect } from "react"
import { GENDER_OPTIONS } from "@/lib/form-values"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS, post } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, isValidDate, formatDateForAPI, parseDateFromDDMMYYYY, unwrapApiRecordById } from "@/lib/utils";

interface FinancialHelpRecord {
  id: string;
  date: string;
  name: string;
  gender: string;
  fatherName: string;
  gotra: string;
  district: string;
  village: string;
  tehsil: string;
  phone: string;
  donatedAmount: string;
  createdAt: string;
}

export default function EditDonationPage() {
  const router = useRouter()
  const params = useParams();
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const { updateApi } = useCRUD<FinancialHelpRecord>("financialHelpRecords", [], {
    update: API_ENDPOINTS.UPDATE_FINANCIAL_HELP,
  });

  const [formData, setFormData] = useState({
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
  const [dateValue, setDateValue] = useState("")

  // Fetch financial help data on component mount
  useEffect(() => {
    const fetchFinancialHelpData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const params = new URLSearchParams();
        params.append("id", id);
        const response = await post("?apicall=getFinancialHelps", params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (response.data?.status && response.data.data) {
          const record = unwrapApiRecordById<any>(response.data.data, id);
          if (!record) {
            toast.error("दान डेटा नहीं मिला");
            router.push("/dashboard/financal-help");
            return;
          }
          setFormData({
            date: formatDate(record.date || ""),
            name: record.name || "",
            gender: record.gender || "",
            fatherName: record.fatherName || "",
            gotra: record.gotra || record.address || "",
            district: record.district || "",
            village: record.village || "",
            tehsil: record.tehsil || "",
            phone: record.phone || "",
            donatedAmount: record.donatedAmount || "",
          });

          if (record.date) {
            const displayDate = formatDate(record.date);
            const parsedDate = parseDateFromDDMMYYYY(displayDate);
            if (parsedDate) {
              setDateObj(parsedDate);
              setDateValue(displayDate);
            }
          }
        } else {
          toast.error("दान डेटा नहीं मिला");
          router.push("/dashboard/financal-help");
        }
      } catch (error) {
        console.error("Error fetching financial help data:", error);
        toast.error("दान डेटा लोड करने में त्रुटि");
        router.push("/dashboard/financal-help");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchFinancialHelpData();
  }, [id, router]);

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.date || !formData.name || !formData.gender || !formData.fatherName || !formData.donatedAmount) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert date to yyyy-dd-mm format for API
      const parsedDate = parseDateFromDDMMYYYY(formData.date) ?? dateObj;
      if (!parsedDate) {
        toast.error("कृपया एक वैध तिथि दर्ज करें");
        return;
      }

      const apiData = {
        date: formatDateForAPI(parsedDate),
        name: formData.name,
        gender: formData.gender,
        fatherName: formData.fatherName,
        gotra: formData.gotra,
        district: formData.district,
        village: formData.village,
        tehsil: formData.tehsil,
        phone: formData.phone,
        donatedAmount: formData.donatedAmount,
      };
      
      const success = await updateApi(id, apiData);
      
      if (success) {
        router.push("/dashboard/financal-help");
      }
    } catch (error) {
      console.error("Error updating donation:", error);
      toast.error("दान अपडेट करने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  }

 

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading donation data...</div>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">दान संपादित करें</h1>
          <p className="text-sm text-gray-600">Edit Donation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>दान विवरण संपादित करें / Edit Donation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
                          setDateValue(formatDate(date))
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="फोन नंबर / Phone Number"
                />
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
                {isSubmitting ? "अपडेट हो रहा है..." : "अपडेट करें / Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
