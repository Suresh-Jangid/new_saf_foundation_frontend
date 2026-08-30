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
import { formatDate, formatDateForAPI, calculateAge } from "@/lib/utils"

interface SewingMachineRecord {
  id: string
  marriageNumber: string
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
  createdAt: string
}

export default function EditMarriageSewingMachineDistribution() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    marriageNumber: "",
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
  })

  // Add computed age state
  const [computedAge, setComputedAge] = useState("")

  const { readByIdApi, updateApi } = useCRUD<SewingMachineRecord>("marriageSewingMachineRecords", [], {
    readById: API_ENDPOINTS.GET_MARRIAGE_SEWING,
    update: API_ENDPOINTS.UPDATE_MARRIAGE_SEWING,
  });

  // Date pickers
  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(undefined)
  const [applicationDateOpen, setApplicationDateOpen] = useState(false)
  const [applicationDateValue, setApplicationDateValue] = useState("")

  const [dateOfBirthObj, setDateOfBirthObj] = useState<Date | undefined>(undefined)
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false)
  const [dateOfBirthValue, setDateOfBirthValue] = useState("")

  // Calculate age when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      if (age !== null) {
        setComputedAge(age.toString())
        setFormData(prev => ({ ...prev, age: age.toString() }))
      } else {
        setComputedAge("")
        setFormData(prev => ({ ...prev, age: "" }))
      }
    } else {
      setComputedAge("")
      setFormData(prev => ({ ...prev, age: "" }))
    }
  }, [formData.dateOfBirth])

  function isValidDate(date: Date | undefined) {
    if (!date) return false
    return !isNaN(date.getTime())
  }

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
            marriageNumber: record.marriageNumber || "",
            applicationDate: record.applicationDate || "",
            applicantName: record.applicantName || "",
            fatherName: record.fatherName || "",
            motherName: record.motherName || "",
            dateOfBirth: record.dateOfBirth || "",
            aadharNumber: record.aadharNumber || "",
            gotra: record.gotra || "",
            age: record.age || "",
            mobile: record.mobile || "",
            address: record.address || "",
            pinCode: record.pinCode || "",
            tehsil: record.tehsil || "",
            district: record.district || "",
            state: record.state || "",
          });
          
          // Set date pickers
          if (record.applicationDate) {
            const appDate = new Date(record.applicationDate)
            setApplicationDateObj(appDate)
            setApplicationDateValue(formatDate(appDate))
          }
          if (record.dateOfBirth) {
            const dobDate = new Date(record.dateOfBirth)
            setDateOfBirthObj(dobDate)
            setDateOfBirthValue(formatDate(dobDate))
          }
        } else {
          toast.error("Sewing machine record not found");
          router.push("/dashboard/marriage-congratulations/sewing-machine-distribution");
        }
      } catch (error: any) {
        console.error("Error fetching sewing machine record:", error);
        toast.error("Failed to load sewing machine data");
        router.push("/dashboard/marriage-congratulations/sewing-machine-distribution");
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
    if (!formData.marriageNumber || !formData.applicantName || !formData.fatherName || !formData.motherName || !formData.aadharNumber || !formData.gotra || !formData.mobile || !formData.address) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    setIsLoading(true)

    try {
      const success = await updateApi(id, formData);
      
      if (success) {
        router.push("/dashboard/marriage-congratulations/sewing-machine-distribution");
      }
    } catch (error: any) {
      console.error("Error updating sewing machine record:", error);
      toast.error("सिलाई मशीन रिकॉर्ड अपडेट करने में त्रुटि");
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
    <div className="p-6">
      {/* Top Back Button */}
      <div className="flex">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading}>
            ← वापस जाएं / <br/>Go Back
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">विवाह सिलाई मशीन वितरण रिकॉर्ड संपादित करें</h1>
          <p className="text-sm text-gray-600">Edit Marriage Sewing Machine Distribution Record</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>सिलाई मशीन आवेदन विवरण / Sewing Machine Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Marriage Number Field */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-4">
              <div>
                <Label htmlFor="marriageNumber">विवाह नंबर / Marriage Number</Label>
                <Input
                  id="marriageNumber"
                  name="marriageNumber"
                  value={formData.marriageNumber}
                  onChange={handleChange}
                  placeholder="विवाह नंबर / Marriage Number"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="applicationDate">आवेदन तिथि / Application Date</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="applicationDate"
                    value={applicationDateValue}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      setApplicationDateValue(e.target.value)
                      if (isValidDate(date)) {
                        setApplicationDateObj(date)
                        setFormData((prev) => ({
                          ...prev,
                          applicationDate: formatDateForAPI(date),
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
                            applicationDate: date ? formatDateForAPI(date) : "",
                          }))
                          setApplicationDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="age">उम्र / Age</Label>
                <Input
                  id="age"
                  type="text"
                  value={computedAge}
                  placeholder="उम्र / Age"
                  readOnly
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <Label htmlFor="applicantName">आवेदक का नाम / Applicant Name</Label>
                <Input
                  id="applicantName"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  placeholder="आवेदक का नाम / Applicant Name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fatherName">पिता का नाम / Father's Name</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="पिता का नाम / Father's Name"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <Label htmlFor="motherName">माता का नाम / Mother's Name</Label>
                <Input
                  id="motherName"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="माता का नाम / Mother's Name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">जन्म तिथि / Date of Birth</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="dateOfBirth"
                    value={dateOfBirthValue}
                    placeholder="dd-mm-yyyy"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      setDateOfBirthValue(e.target.value)
                      if (isValidDate(date)) {
                        setDateOfBirthObj(date)
                        setFormData((prev) => ({
                          ...prev,
                          dateOfBirth: formatDateForAPI(date),
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
                          setDateOfBirthObj(date)
                          setDateOfBirthValue(formatDate(date))
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: date ? formatDateForAPI(date) : "",
                          }))
                          setDateOfBirthOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <Label htmlFor="aadharNumber">आधार नंबर / Aadhar Number</Label>
                <Input
                  id="aadharNumber"
                  name="aadharNumber"
                  inputMode="numeric"
                  value={formData.aadharNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                    setFormData((prev) => ({ ...prev, aadharNumber: digits }))
                  }}
                  placeholder="आधार नंबर / Aadhar Number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gotra">गोत्र / Gotra</Label>
                <Input
                  id="gotra"
                  name="gotra"
                  value={formData.gotra}
                  onChange={handleChange}
                  placeholder="गोत्र / Gotra"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <Label htmlFor="mobile">मोबाइल नंबर / Mobile Number</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  inputMode="numeric"
                  value={formData.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData((prev) => ({ ...prev, mobile: digits }))
                  }}
                  placeholder="मोबाइल नंबर / Mobile Number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Village / गाँव</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="गांव का नाम दर्ज करे"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 grid-cols-1 xl:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="pinCode">पिन कोड / Pin Code</Label>
                <Input
                  id="pinCode"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  placeholder="पिन कोड / Pin Code"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tehsil">तहसील / Tehsil</Label>
                <Input
                  id="tehsil"
                  name="tehsil"
                  value={formData.tehsil}
                  onChange={handleChange}
                  placeholder="तहसील / Tehsil"
                  required
                />
              </div>
              <div>
                <Label htmlFor="district">जिला / District</Label>
                <Input
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="जिला / District"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">राज्य / State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="राज्य / State"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                रद्द करें / Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "अपडेट हो रहा है..." : "रिकॉर्ड अपडेट करें / Update Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 