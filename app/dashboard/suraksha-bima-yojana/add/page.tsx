"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays, Check, ChevronsUpDown } from "lucide-react"
import { Select, SelectItem , SelectContent, SelectTrigger, SelectValue, } from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover as CommandPopover,
  PopoverContent as CommandPopoverContent,
  PopoverTrigger as CommandPopoverTrigger,
} from "@/components/ui/popover"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, postUrlEncoded } from "@/lib/api"
import { APIService } from "@/lib/services"
import { toast } from "sonner"
import { formatDate, isValidDate, parseDateFromDDMMYYYY, cn, formatDateForAPI, getCurrentUserInfo, calculateDuration } from "@/lib/utils"
import { GENDER_OPTIONS } from "@/lib/form-values"
import { Pagination } from "@/components/ui/pagination"

interface InsuranceApplication {
  id: string
  formNumber: string
  applicantName: string
  fatherName: string
  wifeName: string
  motherName: string
  dateOfBirth: string
  aadharNumber: string
  gotra: string
  mobile: string
  address: string
  pinCode: string
  tehsil: string
  district: string
  state: string
  nomineeName: string
  nomineeRelation: string
  workerName: string
  workerMobile: string
  affidavit: string
  passportPhoto: string
  gender: string
  category: string
  paymentAmount: string
  paymentMode: string
  paymentDate: string
  created_at: string
  totalAmount: string
  pendingAmount: string
  is_active: number
  age: number
}

export default function AddSurakshaBimaYojanaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [insuranceApplications, setInsuranceApplications] = useState<InsuranceApplication[]>([])
  const [selectedInsuranceApplication, setSelectedInsuranceApplication] = useState<InsuranceApplication | null>(null)
  const [insuranceApplicationOpen, setInsuranceApplicationOpen] = useState(false)
  const [isLoadingInsuranceApplications, setIsLoadingInsuranceApplications] = useState(false)
  
  // Date and pagination states for insurance applications
  const [applicationDate, setApplicationDate] = useState<string>("");
  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(undefined);
  const [applicationDateOpen, setApplicationDateOpen] = useState(false);
  const [applicationDateValue, setApplicationDateValue] = useState("");
  
  // Pagination and search states for insurance applications
  const [insuranceSearchTerm, setInsuranceSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  const [filteredInsuranceApplications, setFilteredInsuranceApplications] = useState<InsuranceApplication[]>([]);
  const [formData, setFormData] = useState({
    date: "",
    codeNumber: "",
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
    rate200: "",
    totalPaidAmount: "",
    gender: "",
    deductionPercent: "10",
    deductionAmount: "",
    insuranceApplication_id: "",
    memberCount: "", // New field for member count
    memberContribution :"",
  })

  const { createApi } = useCRUD("surakshaBimaYojanaRecords", [], {
    create: API_ENDPOINTS.CREATE_SURAKSHA_BIMA,
  });

  // Filter insurance applications based on search term
  const filterInsuranceApplications = React.useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredInsuranceApplications(insuranceApplications);
      return;
    }

    const filtered = insuranceApplications.filter((app) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (app.formNumber || "").toLowerCase().includes(searchLower) ||
        (app.applicantName || "").toLowerCase().includes(searchLower) ||
        (app.fatherName || "").toLowerCase().includes(searchLower) ||
        (app.wifeName || "").toLowerCase().includes(searchLower) ||
        (app.mobile || "").includes(searchTerm) ||
        (app.aadharNumber || "").includes(searchTerm)
      );
    });
    setFilteredInsuranceApplications(filtered);
  }, [insuranceApplications]);

  // Get paginated insurance applications
  const getPaginatedInsuranceApplications = React.useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInsuranceApplications.slice(startIndex, endIndex);
  }, [filteredInsuranceApplications, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredInsuranceApplications.length / itemsPerPage);

  // Load insurance applications on component mount
  useEffect(() => {
    loadInsuranceApplications()
  }, [])

  // Update filtered insurance applications when applications or search term changes
  useEffect(() => {
    filterInsuranceApplications(insuranceSearchTerm);
  }, [insuranceApplications, insuranceSearchTerm, filterInsuranceApplications]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [insuranceSearchTerm]);

  const loadInsuranceApplications = async () => {
    setIsLoadingInsuranceApplications(true)
    try {
      const response = await APIService.getInsuranceApplications()
      if (response.status && response.data) {
        const normalized = response.data.map((item: any) => ({
          id: item.id,
          formNumber: item.form_number || item.formNumber || "",
          applicantName: item.applicant_name || item.applicantName || "",
          fatherName: item.father_name || item.fatherName || "",
          wifeName: item.wife_name || item.wifeName || "",
          motherName: item.mother_name || item.motherName || "",
          dateOfBirth: item.date_of_birth || item.dateOfBirth || "",
          aadharNumber: item.aadhar_number || item.aadharNumber || "",
          gotra: item.gotra || "",
          mobile: item.mobile || "",
          address: item.address || "",
          pinCode: item.pin_code || item.pinCode || "",
          tehsil: item.tehsil || "",
          district: item.district || "",
          state: item.state || "",
          nomineeName: item.nominee_name || item.nomineeName || "",
          nomineeRelation: item.nominee_relation || item.nomineeRelation || "",
          workerName: item.added_name || item.workerName || item.addedBy?.name || "",
          workerMobile: item.added_mobile || item.workerMobile || item.addedBy?.mobile || "",
          affidavit: item.affidavit || item.affidavitUrl || "",
          passportPhoto: item.passport_photo || item.passportPhoto || item.passportPhotoUrl || "",
          gender: item.gender || "",
          category: item.category || "",
          paymentAmount: item.payment_amount || item.paymentAmount || "",
          paymentMode: item.payment_mode || item.paymentMode || "",
          paymentDate: item.payment_date || item.paymentDate || "",
          created_at: item.created_at || item.createdAt || "",
          totalAmount: String(item.total_amount ?? item.totalAmount ?? ""),
          pendingAmount: String(item.pending_amount ?? item.pendingAmount ?? ""),
          is_active: item.is_active ?? (item.isActive ? 1 : 0),
          age: item.age ?? 0,
        }))
        setInsuranceApplications(normalized)
      }
    } catch (error) {
      console.error("Error loading insurance applications:", error)
      toast.error("बीमा आवेदन लोड करने में त्रुटि")
    } finally {
      setIsLoadingInsuranceApplications(false)
    }
  }

  const handleInsuranceApplicationSelect = async (applicationId: string) => {
    if (!applicationDate) {
      toast.error("कृपया पहले दिनांक चुनें (Please select date first)");
      return;
    }

    try {
      const response = await postUrlEncoded("?apicall=getSurakshaBimaData", {
        insuranceApplication_id: applicationId,
        date: applicationDate,
      });

      const data = response.data;
      console.log("Suraksha Bima API Response:", data);

      if (data.status && data.data) {
        // Prefill form with fetched data
        const fetchedData = data.data
        const memberCount = data?.totalCount || 0
        const totalEmiPaid = data?.totalEmiPaid || 0
        const totalGrantAmount = memberCount * 200
        
        // Preserve user-selected date if it exists, otherwise use fetched date
        const dateToSet = applicationDate || "";
        
        setFormData(prev => ({
          ...prev,
          insuranceApplication_id: applicationId,
          codeNumber: fetchedData.formNumber || "",
          date: dateToSet,
          applicantName: fetchedData.applicantName || "",
          fatherName: fetchedData.fatherName || "",
          wifeOf: fetchedData.wifeName || "",
          gotra: fetchedData.gotra || "",
          address: fetchedData.address || "",
          gender: fetchedData.gender || "",
          membershipJoinDate: fetchedData.applicationDate || "",
          associatedUntil: "",
          permanentFee: String(fetchedData.totalAmount ?? ""),
          installmentAmount: String(totalEmiPaid),
          totalGrantAmount: String(totalGrantAmount),
          totalMembersServing: memberCount.toString(),
          rate200: memberCount.toString(),
          memberCount: memberCount.toString(),
          deductionPercent: fetchedData.deductionPercent || "10",
          deductionAmount: fetchedData.deductionAmount || "",
          totalPaidAmount: fetchedData.totalPaidAmount || "",
          memberContribution: String(memberCount * 200),
        }))

        // Update date values for the date pickers
        if (fetchedData.applicationDate) {
          const membershipDate = new Date(fetchedData.applicationDate)
          if (!isNaN(membershipDate.getTime())) {
            setMembershipJoinDateObj(membershipDate)
            setMembershipJoinDateValue(formatDate(membershipDate))
          }
        }

        const deductionPercent = parseFloat(fetchedData.deductionPercent) || 10
        const deductionAmount = (totalGrantAmount * deductionPercent) / 100
        const totalPaidAmount = totalGrantAmount - deductionAmount
        
        setFormData(prev => ({
          ...prev,
          deductionAmount: deductionAmount.toFixed(2),
          totalPaidAmount: totalPaidAmount.toFixed(2)
        }))

        toast.success("फॉर्म डेटा सफलतापूर्वक भरा गया")
      } else {
        toast.error("बीमा आवेदन डेटा प्राप्त करने में त्रुटि")
      }
    } catch (error) {
      console.error("Error fetching insurance application data:", error)
      toast.error("बीमा आवेदन डेटा प्राप्त करने में त्रुटि")
    }
  }

 

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    
    // Auto-calculate amounts when relevant fields change
    if (['memberCount', 'deductionPercent'].includes(id)) {
      calculateAmounts()
    }
  }

  const calculateAmounts = () => {
    const memberCount = parseInt(formData.memberCount) || 0
    const deductionPercent = parseFloat(formData.deductionPercent) || 10
    const totalEmiPaid = formData.totalGrantAmount
    
    // Calculate rate200 (member count)
    const rate200 = memberCount
    
    // Calculate total grant amount (member count * 200)
    const totalGrantAmount  =  memberCount * 200
    
    // Calculate deduction amount
    const deductionAmount = (totalGrantAmount * deductionPercent) / 100
    
    // Calculate total paid amount
    const totalPaidAmount = totalGrantAmount - deductionAmount
    
    setFormData(prev => ({
      ...prev,
      memberCount: memberCount.toString(),
      rate200: rate200.toString(),
      totalMembersServing: memberCount.toString(),
      deductionAmount: deductionAmount.toFixed(2),
      totalPaidAmount: totalPaidAmount.toFixed(2)
    }))
  }

  const [marriageDateObj, setMarriageDateObj] = useState<Date | undefined>(
    formData.date ? new Date(formData.date) : undefined
  )
  const [marriageDateOpen, setMarriageDateOpen] = useState(false)
  const [marriageDateValue, setMarriageDateValue] = useState(marriageDateObj ? formatDate(marriageDateObj) : "")

  const [membershipJoinDateObj, setMembershipJoinDateObj] = useState<Date | undefined>(
    formData.membershipJoinDate ? new Date(formData.membershipJoinDate) : undefined
  )
  const [membershipJoinDateOpen, setMembershipJoinDateOpen] = useState(false)
  const [membershipJoinDateValue, setMembershipJoinDateValue] = useState(membershipJoinDateObj ? formatDate(membershipJoinDateObj) : "")

  const [associatedUntilValue, setAssociatedUntilValue] = useState("")

  // Recalculate amounts when memberCount or deductionPercent changes
  useEffect(() => {
    if (formData.memberCount || formData.deductionPercent) {
      calculateAmounts()
    }
  }, [formData.memberCount, formData.deductionPercent])

  // Calculate duration between membership join date and current date for associatedUntil
  useEffect(() => {
    if (formData.membershipJoinDate && formData.date) {
      const duration = calculateDuration(formData.membershipJoinDate, formData.date);
      setAssociatedUntilValue(duration);
      setFormData((prev) => ({
        ...prev,
        associatedUntil: duration,
      }));
    } else {
      // Clear the associated until value if either date is missing
      setAssociatedUntilValue("");
      setFormData((prev) => ({
        ...prev,
        associatedUntil: "",
      }));
    }
  }, [formData.membershipJoinDate, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if date is selected
    if (!applicationDate) {
      toast.error("कृपया पहले दिनांक चुनें (Please select date first)");
      return;
    }

    // Check if an insurance application is selected
    if (!selectedInsuranceApplication) {
      toast.error("कृपया पहले बीमा आवेदन चुनें (Please select an insurance application first)");
      return;
    }
    
    // Basic validation (date is already checked above via applicationDate)
    if (!formData.applicantName || !formData.gender || !formData.gotra || !formData.address || !formData.memberCount) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    // Additional validation based on gender
    if (formData.gender === "Male" && !formData.fatherName) {
      toast.error("पुरुष के लिए पिता का नाम आवश्यक है");
      return;
    }
    if (formData.gender === "Female" && !formData.wifeOf) {
      toast.error("महिला के लिए पति का नाम आवश्यक है");
      return;
    }

    // Validate numeric fields
    if (formData.memberCount && isNaN(parseInt(formData.memberCount))) {
      toast.error("सदस्य संख्या एक वैध संख्या होनी चाहिए");
      return;
    }

    // The account registration date (membershipJoinDate) is loaded from the
    // selected insurance application. The entry/marriage date must NOT fall
    // before it — a date earlier than the account registration date is invalid.
    if (applicationDateObj && membershipJoinDateObj) {
      const entry = new Date(applicationDateObj); entry.setHours(0, 0, 0, 0);
      const reg = new Date(membershipJoinDateObj); reg.setHours(0, 0, 0, 0);
      if (entry < reg) {
        toast.error("दिनांक खाता पंजीकरण दिनांक से पूर्व नहीं हो सकती / Date cannot be earlier than the account registration date");
        return;
      }
    }

    setIsLoading(true)

    try {
      // Format dates for API (yyyy-mm-dd format)
      // Parse dates from dd-mm-yyyy format first, then format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return ""
        
        // First try to parse as dd-mm-yyyy format (from user input)
        let parsedDate = parseDateFromDDMMYYYY(dateString)
        
        // If that fails, try to parse as ISO date (from API)
        if (!parsedDate) {
          parsedDate = new Date(dateString)
          if (isNaN(parsedDate.getTime())) {
            return ""
          }
        }
        
        return formatDateForAPI(parsedDate)
      }

      const { addedby, addedby_id } = getCurrentUserInfo();
      
      const dateToUse = applicationDate || parseAndFormatDate(formData.date);
      const deductionPercent = parseFloat(formData.deductionPercent) || 10;
      const deductionAmount = parseFloat(formData.deductionAmount) || 0;
      const insuranceApplicationId =
        formData.insuranceApplication_id || selectedInsuranceApplication.id;

      const apiFormData = {
        insuranceApplicationId,
        insuranceApplication_id: insuranceApplicationId,
        bimaNumber: `SB-${Math.floor(Math.random() * 90000) + 10000}`,
        date: dateToUse,
        codeNumber: formData.codeNumber,
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        wifeOf: formData.wifeOf,
        gotra: formData.gotra,
        address: formData.address,
        gender: formData.gender,
        membershipJoinDate: parseAndFormatDate(formData.membershipJoinDate),
        associatedUntil: dateToUse,
        permanentFee: formData.permanentFee,
        installmentAmount: formData.installmentAmount,
        totalGrantAmount: formData.totalGrantAmount,
        totalMembersServing: formData.totalMembersServing,
        rate200: formData.rate200,
        deductionPercent: formData.deductionPercent,
        deductionAmount: formData.deductionAmount,
        deducted10Percent: deductionPercent === 10 ? deductionAmount : 0,
        deducted25Percent: deductionPercent === 25 ? deductionAmount : 0,
        totalPaidAmount: formData.totalPaidAmount,
        memberContribution: formData.memberContribution,
        addedby,
        addedby_id,
      }

      const success = await createApi(apiFormData);
      
      if (success) {
        router.push("/dashboard/suraksha-bima-yojana");
      }
    } catch (error: any) {
      console.error("Error creating suraksha bima yojana application:", error);
      toast.error("सुरक्षा बीमा योजना आवेदन जोड़ने में त्रुटि");
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full">
        {/* Header Section */}
        <div className="border-b border-gray-200 flex bg-white px-6 py-4">
          <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4">
            
              <Button type="button" variant="link" onClick={() => router.back()} disabled={isLoading} className="p-0 h-auto">
                ← वापस जाएं /<br /> Go Back
              </Button>
              <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-2">नया सुरक्षा बीमा योजना आवेदन जोड़ें</h1>
              <p className="text-sm text-gray-600 mt-1">Add New Insurance Bima Payment</p>
              </div>
            
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Insurance Bima Application Selection Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">बीमा आवेदन चयन / Insurance Bima Application Selection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="applicationDate">दिनांक (Date) *</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="applicationDate"
                      value={applicationDateValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const value = e.target.value;
                        setApplicationDateValue(value);
                        const parsed = parseDateFromDDMMYYYY(value) || undefined;
                        if (parsed) {
                          setApplicationDateObj(parsed);
                          const apiDate = formatDateForAPI(parsed);
                          setApplicationDate(apiDate);
                          // Also update formData.date for consistency
                          setFormData((prev) => ({
                            ...prev,
                            date: formatDate(parsed),
                          }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setApplicationDateOpen(true);
                        }
                      }}
                      required
                    />
                    <Popover
                      open={applicationDateOpen}
                      onOpenChange={setApplicationDateOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="application-date-picker"
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
                            setApplicationDateObj(date);
                            if (date) {
                              setApplicationDateValue(formatDate(date));
                              const apiDate = formatDateForAPI(date);
                              setApplicationDate(apiDate);
                              // Also update formData.date for consistency
                              setFormData((prev) => ({
                                ...prev,
                                date: formatDate(date),
                              }));
                            } else {
                              setApplicationDateValue("");
                              setApplicationDate("");
                              setFormData((prev) => ({
                                ...prev,
                                date: "",
                              }));
                            }
                            setApplicationDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="insuranceApplication">बीमा आवेदन चुनें (Select Insurance Bima Application)</Label>
                  <CommandPopover 
                    open={insuranceApplicationOpen} 
                    onOpenChange={(open) => {
                      setInsuranceApplicationOpen(open);
                      if (!open) {
                        // Reset search and pagination when popover closes
                        setInsuranceSearchTerm("");
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <CommandPopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={insuranceApplicationOpen}
                        className="w-full justify-between"
                        disabled={isLoadingInsuranceApplications || !applicationDate}
                      >
                        {selectedInsuranceApplication 
                          ? `${selectedInsuranceApplication.formNumber} - ${selectedInsuranceApplication.applicantName}`
                          : isLoadingInsuranceApplications
                          ? "Loading applications..."
                          : !applicationDate
                          ? "Please select date first"
                          : "बीमा आवेदन चुनें..."
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </CommandPopoverTrigger>
                    <CommandPopoverContent className="w-full p-0 max-h-96">
                      <Command>
                        <CommandInput 
                          placeholder="Search by form number, name, mobile, or Aadhar..." 
                          value={insuranceSearchTerm}
                          onValueChange={setInsuranceSearchTerm}
                        />
                        <CommandList className="max-h-64">
                          <CommandEmpty>
                            {isLoadingInsuranceApplications ? "Loading applications..." : "No insurance application found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {getPaginatedInsuranceApplications().map((application) => (
                              <CommandItem
                                key={application.id}
                                value={`${application.formNumber} ${application.applicantName} ${application.fatherName || application.wifeName}`}
                                onSelect={() => {
                                  setSelectedInsuranceApplication(application)
                                  handleInsuranceApplicationSelect(application.id)
                                  setInsuranceApplicationOpen(false)
                                }}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedInsuranceApplication?.id === application.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <div className="font-medium">
                                      {application.formNumber} - {application.applicantName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {application.fatherName || application.wifeName} | {application.mobile}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <Pagination
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={setCurrentPage}
                            />
                          )}
                        </CommandList>
                      </Command>
                    </CommandPopoverContent>
                  </CommandPopover>
                </div>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">मूल जानकारी / Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-1  gap-4 sm:gap-6">
                {/* <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="date">दिनांक (Date) *</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="date"
                      value={marriageDateValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value
                        setMarriageDateValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setMarriageDateObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            date: formatDate(date),
                          }))
                        } else {
                          setMarriageDateObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            date: str,
                          }))
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
                            setFormData((prev) => ({
                              ...prev,
                              date: date ? formatDate(date) : "",
                            }))
                            setMarriageDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div> */}
                <div>
                  <Label htmlFor="codeNumber">कोड नंबर (Code Number) *</Label>
                  <Input id="codeNumber" value={formData.codeNumber} disabled onChange={handleChange} required />
                </div>                
              </div>
            </div>          

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">व्यक्तिगत जानकारी / Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="applicantName">आवेदक का नाम (Applicant Name) *</Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="gender">लिंग (Gender) *</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    disabled
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
                {formData.gender === "Male" && (
                  <div>
                    <Label htmlFor="fatherName">पिता का नाम (Father Name) *</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      required
                      disabled
                    />
                  </div>
                )}
                {formData.gender === "Female" && (
                  <div>
                    <Label htmlFor="wifeOf">पति का नाम (Wife Of) *</Label>
                    <Input
                      id="wifeOf"
                      value={formData.wifeOf}
                      onChange={handleChange}
                      required
                      disabled
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                  <Input id="gotra" value={formData.gotra} disabled onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="address"> Village / गांव*</Label>
                  <Input id="address" value={formData.address} disabled onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* Membership Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">सदस्यता जानकारी / Membership Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="membershipJoinDate">सदस्यता से जुड़ने की तारीख (Membership Join Date)</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="membershipJoinDate"
                      value={membershipJoinDateValue}
                      placeholder="dd-mm-yyyy"
                      disabled
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value
                        setMembershipJoinDateValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setMembershipJoinDateObj(date)
                          setFormData((prev) => ({
                            ...prev,
                            membershipJoinDate: formatDate(date),
                          }))
                        } else {
                          setMembershipJoinDateObj(undefined)
                          setFormData((prev) => ({
                            ...prev,
                            membershipJoinDate: str,
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
                          disabled
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
                              membershipJoinDate: date ? formatDate(date) : "",
                            }))
                            setMembershipJoinDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="associatedUntil">यह सदस्य कब तक इस संस्था से जुड़ी रही (How long associated)</Label>
                  <Input
                    id="associatedUntil"
                    value={associatedUntilValue}
                    placeholder="Duration will be calculated automatically"
                    className="bg-gray-50"
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">वित्तीय जानकारी / Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="permanentFee">स्थायी शुल्क (अनुदान) दी गई राशि (Permanent Fee/Grant Amount)</Label>
                  <Input 
                    id="permanentFee" 
                    type="number"
                    step="0.01"
                    value={formData.permanentFee} 
                    onChange={handleChange} 
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="installmentAmount">किस्त के तौर पर दी गई राशि (Installment Amount)</Label>
                  <Input 
                    id="installmentAmount" 
                    type="number"
                    step="0.01"
                    value={formData.installmentAmount} 
                    onChange={handleChange} 
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="memberCount">सदस्य संख्या (Member Count) *</Label>
                  <Input 
                    id="memberCount" 
                    type="number"
                    disabled
                    value={formData.memberCount} 
                    onChange={handleChange}
                    placeholder="Enter member count"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalMembersServing">संस्था में कुल सदस्य सेवा दे रहे हैं (Total Members Serving)</Label>
                  <Input 
                    id="totalMembersServing" 
                    type="number"
                    value={formData.totalMembersServing} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="rate200">200 x सदस्य संख्या (Rate 200 x Members)</Label>
                  <Input 
                    id="rate200" 
                    type="number"
                    value={formData.rate200} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="totalGrantAmount">संस्था में कुल दी गई अनुदान राशि (Total Grant Amount)</Label>
                  <Input 
                    id="totalGrantAmount" 
                    type="number"
                    step="0.01"
                    value={formData.totalGrantAmount} 
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Deduction and Payment Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">कटौती और भुगतान जानकारी / Deduction & Payment Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="deductionPercent">कटौती प्रतिशत चुनें (Select Deduction Percent)</Label>
                  <select
                    id="deductionPercent"
                    value={formData.deductionPercent}
                    onChange={handleChange}
                    className="bg-background border rounded px-3 py-2 w-full"
                  >
                    <option value="10">10%</option>
                    <option value="25">25%</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="deductionAmount">
                    संस्था के खाते के लिए कटौती गई {formData.deductionPercent}% राशि ({formData.deductionPercent}% Deducted Amount)
                  </Label>
                  <Input
                    id="deductionAmount"
                    value={formData.deductionAmount || ""}
                    onChange={handleChange}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="totalPaidAmount">संस्था द्वारा कुल भुगतान राशि (Total Paid Amount)</Label>
                  <Input 
                    id="totalPaidAmount" 
                    value={formData.totalPaidAmount} 
                    onChange={handleChange} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>


                <div>
                  <Label htmlFor="totalPaidAmount">सदस्य द्वारा दी गयी राशि (Amount given by member)</Label>
                  <Input 
                    id="memberContribution" 
                    value={formData.memberContribution} 
                    onChange={handleChange} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                रद्द करें / Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !applicationDate || !selectedInsuranceApplication}
                className="w-full sm:w-auto"
                title={!applicationDate ? "Please select a date first" : !selectedInsuranceApplication ? "Please select an insurance application first" : ""}
              >
                {isLoading ? "Adding..." : "आवेदन जोड़ें / Create Application"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
