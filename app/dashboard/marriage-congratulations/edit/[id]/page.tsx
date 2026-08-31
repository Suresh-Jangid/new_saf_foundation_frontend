"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, postUrlEncoded } from "@/lib/api"
import { toast } from "sonner"
import { formatDate, formatDateForAPI } from "@/lib/utils"
import { GENDER_OPTIONS } from "@/lib/form-values"
import { useSchemeTypes } from "@/hooks/use-app-config"
import ConfigService from "@/lib/config-service"

interface MarriageCongratulationRecord {
  id: string;
  date: string;
  application_id: string;
  marriageNumber: string;
  applicantName: string;
  gender: string;
  fatherName?: string;
  wifeOf?: string;
  gotra: string;
  address: string;
  membershipJoinDate: string;
  associatedUntil: string;
  permanentFee: string;
  installmentAmount: string;
  totalGrantAmount: string;
  totalMembersServing: string;
  rate100: string;
  rate200: string;
  rate300: string;
  deductionPercent: string;
  deductedAmount: string;
  totalPaidAmount: string;
  createdAt: string;
}

export default function EditMarriageCongratulationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { schemeTypes } = useSchemeTypes()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    date: "",
    application_id: "",
    marriageNumber: "",
    applicantName: "",
    fatherName: "",
    wifeOf: "",
    gotra: "",
    address: "",
    membershipJoinDate: "",
    associatedUntil: "",
    permanentFee: "",
    installmentAmount: "",
    totalGrantAmount: "",
    totalMembersServing: "",
    rate100: "",
    rate200: "",
    rate300: "",
    deductionPercent: "20",
    deductedAmount: "",
    totalPaidAmount: "",
    memberContribution: "", // New field for member contribution
    gender: "",
  })

  const { readByIdApi, updateApi } = useCRUD<MarriageCongratulationRecord>("marriageCongratulationsRecords", [], {
    readById: API_ENDPOINTS.GET_MARRIAGE_CONGRATS,
    update: API_ENDPOINTS.UPDATE_MARRIAGE_CONGRATS,
  });


  function isValidDate(date: Date | undefined) {
    if (!date) return false
    return !isNaN(date.getTime())
  }

  const [marriageDateObj, setMarriageDateObj] = useState<Date | undefined>(
    formData.date ? new Date(formData.date) : undefined
  )
  const [marriageDateOpen, setMarriageDateOpen] = useState(false)
  const [marriageDateValue, setMarriageDateValue] = useState(marriageDateObj ? formatDate(marriageDateObj) : "")

  // Add state for membershipJoinDate date picker
  const [membershipJoinDateObj, setMembershipJoinDateObj] = useState<Date | undefined>(
    formData.membershipJoinDate ? new Date(formData.membershipJoinDate) : undefined
  )
  const [membershipJoinDateOpen, setMembershipJoinDateOpen] = useState(false)
  const [membershipJoinDateValue, setMembershipJoinDateValue] = useState(membershipJoinDateObj ? formatDate(membershipJoinDateObj) : "")



  const [associatedUntilValue, setAssociatedUntilValue] = useState(formData.associatedUntil)

  const fetchLiveDetails = useCallback(async (targetDate: string) => {
    if (!id || !targetDate) return;
    try {
      const response = await postUrlEncoded("?apicall=getMarriageCongratulations", {
        marriage_congrats_id: id,
        date: targetDate,
      });
      const data = response.data;
      if (data.status && data.counts) {
        let rate100 = "0";
        let rate200 = "0";
        let rate300 = "0";
        let totalMembersServing = "0";

        data.counts.forEach((count: any) => {
          if (count.category === "A") {
            rate100 = count.total.toString();
          } else if (count.category === "B") {
            rate200 = count.total.toString();
          } else if (count.category === "C") {
            rate300 = count.total.toString();
          }
        });

        totalMembersServing = data.counts
          .reduce((sum: number, count: any) => sum + count.total, 0)
          .toString();

        const liveTotalEMI = data.totalEMI || 0;

        setFormData((prev) => {
          const permanentFeeVal = parseFloat(prev.permanentFee) || 0;
          return {
            ...prev,
            rate100,
            rate200,
            rate300,
            totalMembersServing,
            installmentAmount: liveTotalEMI.toString(),
            totalGrantAmount: (permanentFeeVal + liveTotalEMI).toString(),
          };
        });
      }
    } catch (error) {
      console.error("Error fetching live details:", error);
    }
  }, [id]);

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
            date: record.date || "",
            application_id: record.application_id || "",
            marriageNumber: record.marriageNumber || "",
            gotra: record.gotra || "",
            address: record.address || "",
            membershipJoinDate: record.membershipJoinDate || "",
            associatedUntil: record.associatedUntil || "",
            permanentFee: record.permanentFee || "",
            installmentAmount: record.installmentAmount || "",
            totalGrantAmount: record.totalGrantAmount || "",
            totalMembersServing: record.totalMembersServing || "",
            rate100: record.rate100 || "",
            rate200: record.rate200 || "",
            rate300: record.rate300 || "",
            deductionPercent: record.deductionPercent || "20",
            deductedAmount: record.deductedAmount || "",
            totalPaidAmount: record.totalPaidAmount || "",
            memberContribution: "",
            gender: record.gender
              ? record.gender.charAt(0).toUpperCase() + record.gender.slice(1).toLowerCase()
              : "",
            fatherName: record.fatherName || "",
            wifeOf: record.wifeOf || "",
            applicantName: record.applicantName || "",
          });

          // Set date objects
          if (record.date) {
            const dateObj = new Date(record.date)
            setMarriageDateObj(dateObj)
            setMarriageDateValue(formatDate(dateObj))
            fetchLiveDetails(record.date);
          }
          if (record.membershipJoinDate) {
            const joinDate = new Date(record.membershipJoinDate)
            setMembershipJoinDateObj(joinDate)
            setMembershipJoinDateValue(formatDate(joinDate))
          }
        } else {
          toast.error("Record not found")
          router.push("/dashboard/marriage-congratulations")
        }
      } catch (error) {
        console.error("Error fetching record:", error)
        toast.error("Failed to load record")
        router.push("/dashboard/marriage-congratulations")
      } finally {
        setIsLoadingData(false)
      }
    };

    fetchData();
  }, [id, router, fetchLiveDetails, readByIdApi]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  // Calculate totals based on current form data
  const calculateAmounts = useCallback(() => {
    const rate100Count = parseInt(formData.rate100) || 0;
    const rate200Count = parseInt(formData.rate200) || 0;
    const rate300Count = parseInt(formData.rate300) || 0;
    const deductionPercent =
      parseInt(formData.deductionPercent) ||
      ConfigService.getDeductionPercentForScheme("general_marriage") ||
      20;

    const activeSchemes = ConfigService.getSchemeTypesSync();
    const r1 = activeSchemes[0]?.amount ?? 100;
    const r2 = activeSchemes[1]?.amount ?? 200;
    const r3 = activeSchemes[2]?.amount ?? 300;

    // Calculate total grant amount
    const calculatedTotal =
      rate100Count * r1 + rate200Count * r2 + rate300Count * r3;

    // Calculate deduction amount
    const deductionAmount = Math.round(
      (calculatedTotal * deductionPercent) / 100
    );

    // Calculate final paid amount
    const totalPaidAmount = calculatedTotal - deductionAmount;
    const memberContribution = calculatedTotal;

    const permanentFeeVal = parseFloat(formData.permanentFee) || 0;
    const installmentAmountVal = parseFloat(formData.installmentAmount) || 0;
    const totalGrantVal = permanentFeeVal + installmentAmountVal;

    // Update form data
    setFormData((prev) => ({
      ...prev,
      deductedAmount: deductionAmount.toString(),
      totalPaidAmount: totalPaidAmount.toString(),
      memberContribution: memberContribution.toString(),
      totalGrantAmount: totalGrantVal.toString(),
      totalMembersServing: (
        rate100Count +
        rate200Count +
        rate300Count
      ).toString(),
    }));
  }, [
    formData.rate100,
    formData.rate200,
    formData.rate300,
    formData.deductionPercent,
    formData.permanentFee,
    formData.installmentAmount,
  ]);

  // Auto-recalculate totals when values change
  useEffect(() => {
    calculateAmounts();
  }, [calculateAmounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.date || !formData.marriageNumber || !formData.applicantName || !formData.gender || !formData.gotra || !formData.address) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    // Additional validation based on gender
    if (formData.gender.toLowerCase() === "male" && !formData.fatherName) {
      toast.error("पुरुष के लिए पिता का नाम आवश्यक है");
      return;
    }
    if (formData.gender.toLowerCase() === "female" && !formData.wifeOf) {
      toast.error("महिला के लिए पति का नाम आवश्यक है");
      return;
    }

    setIsLoading(true)

    try {
      const success = await updateApi(id, formData);

      if (success) {
        router.push("/dashboard/marriage-congratulations");
      }
    } catch (error: any) {
      console.error("Error updating marriage congratulations:", error);
      toast.error("विवाह बधाई रिकॉर्ड अपडेट करने में त्रुटि");
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
            <p className="mt-2 text-gray-600">Loading marriage congratulations data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full ">
      <div className="flex">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading}>
            ← वापस जाएं / <br/>Go Back
          </Button>
        </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">विवाह बधाई रिकॉर्ड संपादित करें</h1>
        <p className="text-sm text-gray-600">Edit Marriage Congratulation Record</p>
      </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Marriage Congratulation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">दिनांक (Date) *</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={marriageDateValue}
                    placeholder="01 June, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      setMarriageDateValue(e.target.value)
                      if (isValidDate(date)) {
                        setMarriageDateObj(date)
                        const formatted = formatDateForAPI(date)
                        setFormData((prev) => ({
                          ...prev,
                          date: formatted,
                        }))
                        fetchLiveDetails(formatted)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setMarriageDateOpen(true)
                      }
                    }}
                    required
                  />
                  <Popover open={marriageDateOpen} onOpenChange={setMarriageDateOpen}>
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
                        selected={marriageDateObj}
                        captionLayout="dropdown"
                        month={marriageDateObj}
                        onMonthChange={setMarriageDateObj}
                        onSelect={(date: any) => {
                          setMarriageDateObj(date)
                          setMarriageDateValue(formatDate(date))
                          const formatted = date ? formatDateForAPI(date) : ""
                          setFormData((prev) => ({
                            ...prev,
                            date: formatted,
                          }))
                          if (formatted) {
                            fetchLiveDetails(formatted)
                          }
                          setMarriageDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="marriageNumber">विवाह संख्या (Marriage Number) *</Label>
                <Input id="marriageNumber" value={formData.marriageNumber} onChange={handleChange} required />
              </div>

              <div>
                <Label htmlFor="applicantName">
                  आवेदक का नाम (Applicant Name) *
                </Label>
                <Input
                  id="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gender">लिंग (Gender) *</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={handleSelectChange}
                  required
                  className="bg-background border rounded px-3 py-2 w-full"
                >
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hidden field for application_id */}
            <input type="hidden" id="application_id" value={formData.application_id} />

            {/* Applicant Name with Autocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {formData.gender.toLowerCase() === "male" && (
                  <div>
                    <Label htmlFor="fatherName">
                      पिता का नाम (Father Name) *
                    </Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
              {formData.gender.toLowerCase() === "female" && (
                <div>
                  <Label htmlFor="wifeOf">पति का नाम (Wife Of) *</Label>
                  <Input
                    id="wifeOf"
                    value={formData.wifeOf}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                <Input
                  id="gotra"
                  value={formData.gotra}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Village / गांव *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="membershipJoinDate">
                  सदस्यता से जुड़ने की तारीख (Membership Join Date)
                </Label>
                <div className="relative flex gap-2">
                  <Input
                    id="membershipJoinDate"
                    value={membershipJoinDateValue}
                    placeholder="01 June, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      setMembershipJoinDateValue(e.target.value)
                      if (isValidDate(date)) {
                        setMembershipJoinDateObj(date)
                        setFormData((prev) => ({
                          ...prev,
                          membershipJoinDate: formatDateForAPI(date),
                        }))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setMembershipJoinDateOpen(true)
                      }
                    }}
                  />
                  <Popover open={membershipJoinDateOpen} onOpenChange={setMembershipJoinDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="membershipJoinDate-picker"
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
                        selected={membershipJoinDateObj}
                        captionLayout="dropdown"
                        month={membershipJoinDateObj}
                        onMonthChange={setMembershipJoinDateObj}
                        onSelect={(date: any) => {
                          setMembershipJoinDateObj(date)
                          setMembershipJoinDateValue(formatDate(date))
                                                     setFormData((prev) => ({
                             ...prev,
                             membershipJoinDate: date ? formatDateForAPI(date) : "",
                           }))
                          setMembershipJoinDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="associatedUntil">
                  यह सदस्य कब तक इस संस्था से जुड़ी रही (How long associated)
                </Label>
                <div className="relative flex gap-2">
                  <Input
                    id="associatedUntil"
                    disabled
                    value={formData.associatedUntil}
                    placeholder="01 June, 2025"
                    className="bg-background pr-10"

                  />

                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="permanentFee">
                  स्थायी शुल्क (अनुदान) दी गई राशि (Permanent Fee/Grant Amount)
                </Label>
                <Input
                  id="permanentFee"
                  type="number"
                  value={formData.permanentFee}
                  onChange={handleChange}
                  placeholder="राशि दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="installmentAmount">
                  किस्त के तौर पर दी गई राशि (Installment Amount)
                </Label>
                <Input
                  id="installmentAmount"
                  type="number"
                  value={formData.installmentAmount}
                  onChange={handleChange}
                  placeholder="राशि दर्ज करें"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="totalGrantAmount">
                  संस्था में कुल दी गई अनुदान राशि (Total Grant Amount)
                </Label>
                <Input
                  id="totalGrantAmount"
                  type="number"
                  value={formData.totalGrantAmount}
                  onChange={handleChange}
                  placeholder="कुल राशि दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="totalMembersServing">
                  संस्था में कुल सदस्य सेवा दे रहे हैं (Total Members Serving)
                </Label>
                <Input
                  id="totalMembersServing"
                  type="number"
                  value={formData.totalMembersServing}
                  onChange={handleChange}
                  placeholder="सदस्यों की संख्या दर्ज करें"
                />
              </div>
            </div>
            {/* Table for calculation */}
            <div>
              <Label>किस दर x सदस्य = योग (Rate x Members = Total)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schemeTypes && schemeTypes.length > 0 ? (
                  schemeTypes.slice(0, 3).map((scheme, idx) => {
                    const fieldKey = idx === 0 ? "rate100" : idx === 1 ? "rate200" : "rate300";
                    return (
                      <div key={scheme.id || idx}>
                        <Label htmlFor={fieldKey}>₹{scheme.amount} x</Label>
                        <Input
                          id={fieldKey}
                          value={(formData as any)[fieldKey]}
                          onChange={handleChange}
                          placeholder="0"
                        />
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div>
                      <Label htmlFor="rate100">100 x</Label>
                      <Input
                        id="rate100"
                        value={formData.rate100}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate200">200 x</Label>
                      <Input
                        id="rate200"
                        value={formData.rate200}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate300">300 x</Label>
                      <Input
                        id="rate300"
                        value={formData.rate300}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deductionPercent">
                  कटौती प्रतिशत चुनें (Select Deduction Percent)
                </Label>
                <select
                  id="deductionPercent"
                  value={formData.deductionPercent}
                  onChange={handleSelectChange}
                  className="bg-background border rounded px-3 py-2 w-full"
                >
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                </select>
              </div>
              <div>
                <Label htmlFor="deductedAmount">
                  संस्था के खाते के लिए कटौती गई {formData.deductionPercent}%
                  राशि ({formData.deductionPercent}% Deducted Amount)
                </Label>
                <Input
                  id="deductedAmount"
                  value={formData.deductedAmount || ""}
                  onChange={handleChange}
                  placeholder="कटौती राशि दर्ज करें"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
              <div>
                <Label htmlFor="totalPaidAmount">
                  संस्था द्वारा कुल भुगतान राशि (Total Paid Amount)
                </Label>
                <Input
                  id="totalPaidAmount"
                  type="number"
                  value={formData.totalPaidAmount}
                  onChange={handleChange}
                  placeholder="कुल भुगतान राशि दर्ज करें"
                />
              </div>
              <div>
                <Label htmlFor="memberContribution">
                  सदस्य द्वारा दी गयी राशि (Amount given by member)
                </Label>
                <Input
                  id="memberContribution"
                  type="number"
                  value={formData.memberContribution}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Auto calculated"
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
