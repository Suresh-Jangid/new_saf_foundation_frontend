"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { DatePicker } from "@/components/ui/date-picker"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, post } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, parseDateFromDDMMYYYY, formatDateForAPI, calculateAge, unwrapApiRecordById, getApplicantPhotoPath, getProxiedPhotoSrc } from "@/lib/utils"
import { X } from "lucide-react"

interface PensionYojanaRecord {
  id: string
  date: string
  dob: string
  name: string
  fatherName: string
  gotra: string
  age: string
  village: string
  tehsil: string
  district: string
  mobile: string
  photo: string
  bankName: string
  accountNumber: string
  ifscCode: string
  monthlyPension: string
  createdAt: string
}

export default function EditPensionYojanaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    date: "",
    dob: "",
    name: "",
    fatherName: "",
    gotra: "",
    age: "",
    village: "",
    tehsil: "",
    district: "",
    mobile: "",
    photo: null as File | null,
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    monthlyPension: "",
  })

  const { updateApi } = useCRUD<PensionYojanaRecord>("pensionYojanaRecords", [], {
    update: API_ENDPOINTS.UPDATE_PENSION_YOJANA,
  });

  // Calculate age when date of birth changes
  useEffect(() => {
    if (!formData.dob) {
      setFormData((prev) => ({ ...prev, age: "" }));
      return;
    }
    
    const calculatedAge = calculateAge(formData.dob);
    setFormData((prev) => ({ ...prev, age: calculatedAge !== null ? String(calculatedAge) : "" }));
  }, [formData.dob]);

  // Fetch data from API (similar to General Applications: POST with id)
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setIsLoadingData(true);
        const formData = new URLSearchParams();
        formData.append("id", id);
        const response = await post("?apicall=getPensionYojanas", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (response.data.status && response.data.data) {
          const record = unwrapApiRecordById<any>(response.data.data, id);
          if (!record) {
            toast.error("Pension yojana record not found");
            router.push("/dashboard/pension-yojana");
            return;
          }
          
          // Convert API dates to dd-mm-yyyy for display
          const convertToDisplayFormat = (dateString: string): string => formatDate(dateString);
          
          setFormData({
            date: convertToDisplayFormat(record.date || ""),
            dob: convertToDisplayFormat(record.dob || ""),
            name: record.name || "",
            fatherName: record.fatherName || "",
            gotra: record.gotra || "",
            age: record.age || "",
            village: record.village || "",
            tehsil: record.tehsil || "",
            district: record.district || "",
            mobile: record.mobile || "",
            photo: null,
            bankName: record.bankName || "",
            accountNumber: record.accountNumber || "",
            ifscCode: record.ifscCode || "",
            monthlyPension: record.monthlyPension || "",
          });

          // Set existing photo URL if available
          const photoPath = getApplicantPhotoPath(record as Record<string, unknown>);
          if (photoPath) {
            setExistingPhotoUrl(photoPath);
          }
        } else {
          toast.error("Pension yojana record not found");
          router.push("/dashboard/pension-yojana");
        }
      } catch (error: any) {
        console.error("Error fetching pension yojana:", error);
        toast.error("Failed to load pension yojana data");
        router.push("/dashboard/pension-yojana");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.date || !formData.dob || !formData.name || !formData.fatherName || !formData.gotra || !formData.age || !formData.village || !formData.mobile || !formData.monthlyPension) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    setIsLoading(true)

    try {
      // Convert dates to YYYY-MM-DD format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return ""
        const parsedDate = parseDateFromDDMMYYYY(dateString)
        return parsedDate ? formatDateForAPI(parsedDate) : ""
      }
      
      const apiFormData: Record<string, unknown> = {
        date: parseAndFormatDate(formData.date),
        dob: parseAndFormatDate(formData.dob),
        name: formData.name,
        fatherName: formData.fatherName,
        gotra: formData.gotra,
        age: formData.age,
        village: formData.village,
        tehsil: formData.tehsil,
        district: formData.district,
        mobile: formData.mobile,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        monthlyPension: formData.monthlyPension,
      };

      if (formData.photo) {
        apiFormData.photo = formData.photo;
      } else if (existingPhotoUrl) {
        apiFormData.existingPhotoUrl = existingPhotoUrl;
      } else {
        apiFormData.existingPhotoUrl = "";
      }
      
      const success = await updateApi(id, apiFormData);
      
      if (success) {
        router.push("/dashboard/pension-yojana");
      }
    } catch (error: any) {
      console.error("Error updating pension yojana:", error);
      toast.error("पेंशन योजना रिकॉर्ड अपडेट करने में त्रुटि");
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
            <p className="mt-2 text-gray-600">Loading pension yojana data...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">पेंशन योजना रिकॉर्ड संपादित करें</h1>
          <p className="text-sm text-gray-600">Edit Pension Yojana Application Payment Record</p>
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Pension Yojana Application Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="date">तिथि (Date) *</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(date) => setFormData(prev => ({ ...prev, date: date ? formatDate(date) : "" }))}
                  id="date"
                />
              </div>
              <div>
                <Label htmlFor="name">नाम (Name) *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="आवेदक का नाम"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम (Father's Name) *</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="पिता का नाम"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <div>
                <Label htmlFor="dob">जन्म तिथि (Date of Birth) *</Label>
                <DatePicker
                  value={formData.dob}
                  onChange={(date) => setFormData(prev => ({ ...prev, dob: date ? formatDate(date) : "" }))}
                  id="dob"
                />
              </div>
              <div>
                <Label htmlFor="age">आयु (Age) *</Label>
                <Input
                  id="age"
                  name="age"
                  disabled
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="आयु"
                  required
                />
              </div>
              <div>
                <Label htmlFor="village">गाँव (Village) *</Label>
                <Input
                  id="village"
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  placeholder="गाँव का नाम"
                  required
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="photo">फोटो (Photo)</Label>
                <Input
                  type="file"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  onChange={handleChange}
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
              <div>
                <Label htmlFor="monthlyPension">मासिक पेंशन (Monthly Pension) *</Label>
                <Input
                  id="monthlyPension"
                  name="monthlyPension"
                  value={formData.monthlyPension}
                  onChange={handleChange}
                  placeholder="मासिक पेंशन राशि"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="bankName">बैंक का नाम (Bank Name)</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="बैंक का नाम"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">खाता संख्या (Account Number)</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="खाता संख्या"
                />
              </div>
              <div>
                <Label htmlFor="ifscCode">IFSC कोड (IFSC Code)</Label>
                <Input
                  id="ifscCode"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="IFSC कोड"
                />
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
