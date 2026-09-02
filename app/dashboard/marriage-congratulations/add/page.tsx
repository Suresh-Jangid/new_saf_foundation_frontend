"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover as ComboboxPopover,
  PopoverContent as ComboboxPopoverContent,
  PopoverTrigger as ComboboxPopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS, post, postUrlEncoded } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatBilingual } from "@/lib/translations";
import { getCurrentUserInfo } from "@/lib/utils";
import { formatDate, formatDateForAPI, validatePhoneNumber, parseDateFromDDMMYYYY, calculateDuration } from "@/lib/utils";
import { GENDER_OPTIONS, isMale, isFemale } from "@/lib/form-values";
import { useSchemeTypes, useDeductions } from "@/hooks/use-app-config";
import ConfigService from "@/lib/config-service";

// Interface for application data from the API
interface ApplicationData {
  id: number;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  nomineeName: string;
  nomineeRelation: string;
  workerName: string;
  workerMobile: string;
  affidavit: string;
  passportPhoto: string;
  gender: string;
  category: string;
  paymentAmount: number;
  paymentMode: string;
  paymentDate: string;
  created_at: string;
  is_active: number;
  totalAmount: number;
  pendingAmount: number;
  age: number;
}

// Interface for count data
interface CountData {
  category: string;
  total: number;
}

// Interface for API response structure
interface ApiResponse {
  status: boolean;
  data: ApplicationData;
  counts: Array<CountData>;
}

export default function AddMarriageCongratulationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { schemeTypes } = useSchemeTypes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isLoadingMarriageData, setIsLoadingMarriageData] = useState(false);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>("");
  const [categoryCounts, setCategoryCounts] = useState<
    Array<{ category: string; total: number }>
  >([]);
  const [applicationDate, setApplicationDate] = useState<string>("");
  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(undefined);
  const [applicationDateOpen, setApplicationDateOpen] = useState(false);
  const [applicationDateValue, setApplicationDateValue] = useState("");

  // Pagination and search states for applications
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  const [filteredApplications, setFilteredApplications] = useState<ApplicationData[]>([]);

  // Autocomplete states
  const [applicationSelectOpen, setApplicationSelectOpen] = useState(false);
  const [applicantNameOpen, setApplicantNameOpen] = useState(false);
  const [fatherNameOpen, setFatherNameOpen] = useState(false);
  const [wifeOfOpen, setWifeOfOpen] = useState(false);
  const [gotraOpen, setGotraOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  // Generate marriage number function
  const generateMarriageNumber = () => {
    const randomNumber = Math.floor(Math.random() * 90000) + 10000;
    return `PM-${randomNumber.toString()}`;
  };

  const [formData, setFormData] = useState<{
    date: string;
    applicantName: string;
    fatherName: string;
    wifeOf: string;
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
    memberContribution: string; // New field for member contribution
    gender: string;
    application_id?: string; // Add this field that was referenced in the code
  }>({
    date: formatDateForAPI(new Date()), // Initialize with today's date
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
    deductionPercent: "15",
    deductedAmount: "",
    totalPaidAmount: "",
    memberContribution: "", // Initialize new field
    gender: "",
    application_id: "",
  });

  const { createApi } = useCRUD("marriageCongratulationsRecords", [], {
    create: API_ENDPOINTS.CREATE_MARRIAGE_CONGRATS,
  });

  // Get unique values for autocomplete
  const getUniqueValues = (field: keyof ApplicationData) => {
    const values = applications
      .map((app) => app[field])
      .filter(Boolean) as string[];
    return Array.from(new Set(values));
  };

  // Filter applications based on search term
  const filterApplications = React.useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredApplications(applications);
      return;
    }

    const filtered = applications.filter((app) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        app.formNumber?.toLowerCase().includes(searchLower) ||
        app.applicantName?.toLowerCase().includes(searchLower) ||
        app.fatherName?.toLowerCase().includes(searchLower) ||
        app.mobile.includes(searchTerm) ||
        app.aadharNumber.includes(searchTerm)
      );
    });
    setFilteredApplications(filtered);
  }, [applications]);

  // Get paginated applications
  const getPaginatedApplications = React.useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

  // Fetch applications from the API
  const fetchApplications = React.useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      console.log("Fetching applications...");
      const formData = new FormData();
      formData.append("is_active", "1");
      const response = await post("?apicall=getApplications", formData);
      const data = response.data;

      console.log("API Response:", data);

      if (data.status && data.data) {
        // Handle both array and single object responses
        const applicationsData = Array.isArray(data.data)
          ? data.data
          : [data.data];
        console.log("Setting applications:", applicationsData);
        setApplications(applicationsData);
      } else {
        console.error("API returned error:", data);
        toast({
          title: "Error",
          description: "Failed to fetch applications",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Error fetching applications",
        variant: "destructive",
      });
    } finally {
      setIsLoadingApplications(false);
    }
  }, [toast]);

  // Fetch marriage congratulations data when application is selected
  const fetchMarriageCongratulationsData = React.useCallback(
    async (applicationId: string) => {
      if (!applicationId || !formData.date) return;

      try {
        setIsLoadingMarriageData(true);

        const response = await postUrlEncoded("?apicall=getMarriageCongratulations", {
          application_id: applicationId,
          date: formData.date,
        });

        const data = response.data;

        console.log("Marriage Congratulations API Response:", data);

        if (data.status && data.data) {
          // Pre-fill the form with the returned data
          const applicationData = data.data;

        // Handle counts data if available
        if (data.counts && Array.isArray(data.counts)) {
          setCategoryCounts(data.counts);
        }

        // Map category counts to rate fields
        let rate100 = "0";
        let rate200 = "0";
        let rate300 = "0";
        let totalMembersServing = "0";

        if (data.counts && Array.isArray(data.counts)) {
          data.counts.forEach((count: CountData) => {
            if (count.category === "A") {
              rate100 = count.total.toString();
            } else if (count.category === "B") {
              rate200 = count.total.toString();
            } else if (count.category === "C") {
              rate300 = count.total.toString();
            }
          });

          // Calculate total members serving
          totalMembersServing = data.counts
            .reduce((sum: number, count: CountData) => sum + count.total, 0)
            .toString();
        }

        // Dynamic rate resolution from active scheme types
        const activeSchemes = ConfigService.getSchemeTypesSync();
        const r1 = activeSchemes[0]?.amount ?? 100;
        const r2 = activeSchemes[1]?.amount ?? 200;
        const r3 = activeSchemes[2]?.amount ?? 300;

        let calculatedTotal = 0;
        calculatedTotal += parseInt(rate100) * r1;
        calculatedTotal += parseInt(rate200) * r2;
        calculatedTotal += parseInt(rate300) * r3;

        // Get totalEMI from API response
        const totalEMI = data.totalEMI || 0;

        // Dynamic deduction calculation from authoritative configuration
        const deductionPercent = ConfigService.getDeductionPercentForScheme("general_marriage") || 15;
        const deductionAmount = Math.round(
          (calculatedTotal * deductionPercent) / 100
        );

        // Calculate final paid amount after deduction
        const totalPaidAmount = calculatedTotal - deductionAmount;

        console.log("Calculated values:", {
          rate100,
          rate200,
          rate300,
          totalMembersServing,
          calculatedTotal,
          deductionAmount,
          totalPaidAmount,
          totalEMI,
          counts: data.counts,
          payments: data.payments,
        });

        setFormData((prev) => {
          const updatedFormData = {
            ...prev,
            application_id: applicationData.id.toString() || "",
            applicantName: applicationData.applicantName || "",
            fatherName: applicationData.fatherName || "",
            wifeOf: "", // This will be filled based on gender
            gotra: applicationData.gotra || "",
            address: applicationData.address || "",
            gender: applicationData.gender || "",
            membershipJoinDate: applicationData.applicationDate || "",
            associatedUntil: "",
            permanentFee: applicationData.totalAmount?.toString() || "",
            installmentAmount: totalEMI.toString(),
            totalGrantAmount: (Number(applicationData.totalAmount) + Number(totalEMI)).toString(),
            totalMembersServing: totalMembersServing,
            rate100: rate100,
            rate200: rate200,
            rate300: rate300,
            deductionPercent: String(deductionPercent),
            deductedAmount: deductionAmount.toString(),
            totalPaidAmount: totalPaidAmount.toString(),
          };

          console.log("Updating form data:", updatedFormData);
          return updatedFormData;
        });

          if (applicationData.applicationDate) {
            const joinDate = new Date(applicationData.applicationDate);
            setMembershipJoinDateObj(joinDate);
            setMembershipJoinDateValue(formatDate(joinDate));
          }

          // Set wifeOf field based on gender
          if (isFemale(applicationData.gender)) {
            setFormData((prev) => ({
              ...prev,
              wifeOf: applicationData.nomineeName || "",
            }));
          }

          toast({
            title: "Success",
            description: "Form pre-filled with application data",
          });
        } else {
          toast({
            title: "Error",
            description: data.message || "No application data found",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching application data:", error);
        toast({
          title: "Error",
          description: "Error fetching application data",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMarriageData(false);
      }
    },
    [toast, formData.date]
  );

  // Calculate totals based on current form data
  const calculateTotals = React.useCallback(() => {
    const rate100Count = parseInt(formData.rate100) || 0;
    const rate200Count = parseInt(formData.rate200) || 0;
    const rate300Count = parseInt(formData.rate300) || 0;
    const deductionPercent =
      parseInt(formData.deductionPercent) ||
      ConfigService.getDeductionPercentForScheme("general_marriage") ||
      15;

    // Resolve multipliers dynamically from active scheme types
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

    console.log("Recalculating totals with dynamic scheme rates:", {
      r1,
      r2,
      r3,
      rate100Count,
      rate200Count,
      rate300Count,
      deductionPercent,
      calculatedTotal,
      deductionAmount,
      totalPaidAmount,
      memberContribution,
    });

    // Update form data
    setFormData((prev) => ({
      ...prev,
      deductedAmount: deductionAmount.toString(),
      totalPaidAmount: totalPaidAmount.toString(),
      memberContribution: memberContribution.toString(),
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

  // Handle application selection
  const handleApplicationSelect = React.useCallback(
    (applicationId: string) => {
      if (!formData.date) {
        toast({
          title: "Validation Error",
          description: "Please select a date first before selecting an application",
          variant: "destructive",
        });
        return;
      }
      setSelectedApplicationId(applicationId);
      if (applicationId) {
        fetchMarriageCongratulationsData(applicationId);
      }
    },
    [fetchMarriageCongratulationsData, formData.date, toast]
  );

  // Load applications on component mount
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]); // Add fetchApplications as dependency

  // Update filtered applications when applications or search term changes
  useEffect(() => {
    filterApplications(applicationSearchTerm);
  }, [applications, applicationSearchTerm, filterApplications]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [applicationSearchTerm]);

  // Debug effect to log applications changes
  useEffect(() => {
    console.log("Applications state updated:", applications);
  }, [applications]);

  // Debug effect to log formData changes
  useEffect(() => {
    console.log("Form data updated:", formData);
  }, [formData]);

  // Auto-recalculate totals when rate values change
  useEffect(() => {
    if (formData.rate100 || formData.rate200 || formData.rate300) {
      calculateTotals();
    }
  }, [
    formData.rate100,
    formData.rate200,
    formData.rate300,
    formData.deductionPercent,
    formData.permanentFee,
    formData.installmentAmount,
    // Removed calculateTotals from dependencies to prevent infinite loops
  ]);

  // Calculate duration between membership join date and marriage date
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
    e.preventDefault();

    // Check if date is selected
    if (!formData.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    // Check if an application is selected
    if (!selectedApplicationId) {
      toast({
        title: "Validation Error",
        description: "Please select an application first to pre-fill the form",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (
      !formData.date ||
      !formData.applicantName ||
      !formData.gender ||
      !formData.gotra ||
      !formData.address
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields. Make sure to select an application first.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation based on gender
    if (isMale(formData.gender) && !formData.fatherName) {
      toast({
        title: "Validation Error",
        description: "Father's name is required for Male applicants",
        variant: "destructive",
      });
      return;
    }
    if (isFemale(formData.gender) && !formData.wifeOf) {
      toast({
        title: "Validation Error",
        description: "Husband's name is required for Female applicants",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const marriageNumber = generateMarriageNumber();

      const submissionData = {
        date: formData.date,
        marriageNumber,
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        wifeOf: formData.wifeOf,
        gotra: formData.gotra,
        address: formData.address,
        membershipJoinDate: formData.membershipJoinDate,
        associatedUntil: formData.associatedUntil,
        permanentFee: formData.permanentFee,
        installmentAmount: formData.installmentAmount,
        totalGrantAmount: formData.totalGrantAmount,
        totalMembersServing: formData.totalMembersServing,
        rate100: formData.rate100,
        rate200: formData.rate200,
        rate300: formData.rate300,
        deductionPercent: formData.deductionPercent,
        deductedAmount: formData.deductedAmount,
        totalPaidAmount: formData.totalPaidAmount,
        gender: formData.gender,
        application_id: formData.application_id || selectedApplicationId,
        addedby,
        addedby_id,
      };

      console.log("Submitting form data:", submissionData);

      const result = await createApi(submissionData);

      console.log("API result:", result);

      if (result) {
        router.push("/dashboard/marriage-congratulations");
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: formatBilingual("common.error"),
        description:
          error.response?.data?.message ||
          error.message ||
          formatBilingual("messages.failedToSave"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove local formatDate function - using imported one from utils
  function isValidDate(date: Date | undefined) {
    if (!date) return false;
    return !isNaN(date.getTime());
  }

  const [marriageDateObj, setMarriageDateObj] = useState<Date | undefined>(
    new Date() // Initialize with today's date
  );
  const [marriageDateOpen, setMarriageDateOpen] = useState(false);
  const [marriageDateValue, setMarriageDateValue] = useState(
    formatDate(new Date()) // Set to today's date by default
  );

  // Add these states for membership join date
  const [membershipJoinDateObj, setMembershipJoinDateObj] = useState<
    Date | undefined
  >(
    formData.membershipJoinDate
      ? new Date(formData.membershipJoinDate)
      : undefined
  );
  const [membershipJoinDateOpen, setMembershipJoinDateOpen] = useState(false);
  const [membershipJoinDateValue, setMembershipJoinDateValue] = useState(
    formatDate(membershipJoinDateObj as any)
  );

  // Add these states for associated until date
  const [associatedUntilObj, setAssociatedUntilObj] = useState<
    Date | undefined
  >(formData.associatedUntil ? new Date(formData.associatedUntil) : undefined);
  const [associatedUntilOpen, setAssociatedUntilOpen] = useState(false);
  const [associatedUntilValue, setAssociatedUntilValue] = useState(
    formatDate(associatedUntilObj as any)
  );

  return (
    <div className="p-6">
      {/* Top Back Button */}
      <div className="flex ">
        <div className="mb-4">
          <Button type="button" variant="link" onClick={() => router.back()}>
            ← वापस जाएं / <br />
            Go Back
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            नया विवाह बधाई रिकॉर्ड जोड़ें
          </h1>
          <p className="text-sm text-gray-600">
            Add New Marriage Congratulation Record
          </p>
        </div>
      </div>

      {/* Application Selection Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Application to Pre-fill Form</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicationDate">दिनांक (Date) *</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="applicationDate"
                    value={applicationDateValue}
                    placeholder={formatBilingual("placeholders.selectDate")}
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const value = e.target.value;
                      setApplicationDateValue(value);
                      const parsed = parseDateFromDDMMYYYY(value) || undefined;
                      if (parsed) {
                        setApplicationDateObj(parsed);
                        setApplicationDate(formatDateForAPI(parsed));
                        // Also update the form data date field
                        setFormData((prev) => ({
                          ...prev,
                          date: formatDateForAPI(parsed),
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
                          setApplicationDateValue(formatDate(date));
                          setApplicationDate(date ? formatDateForAPI(date) : "");
                          // Also update the form data date field
                          setFormData((prev) => ({
                            ...prev,
                            date: date ? formatDateForAPI(date) : "",
                          }));
                          setApplicationDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="applicationSelect">
                  आवेदन चुनें (Select Application)
                </Label>
                <ComboboxPopover
                  open={applicationSelectOpen}
                  onOpenChange={(open) => {
                    setApplicationSelectOpen(open);
                    if (!open) {
                      // Reset search and pagination when popover closes
                      setApplicationSearchTerm("");
                      setCurrentPage(1);
                    }
                  }}
                >
                  <ComboboxPopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={applicationSelectOpen}
                      className="w-full justify-between"
                      disabled={isLoadingApplications || !formData.date}
                    >
                      {selectedApplicationId
                        ? (() => {
                            const selectedApp = applications.find(
                              (app) => app.id.toString() === selectedApplicationId
                            );
                            if (selectedApp) {
                              const genderLabel = isMale(selectedApp.gender) ? "पुरुष" : "महिला";
                              return `${selectedApp.formNumber} - ${selectedApp.applicantName} (${genderLabel})`;
                            }
                            return "Select an application to pre-fill form";
                          })()
                        : isLoadingApplications
                        ? "Loading applications..."
                        : !formData.date
                        ? "Please select date first"
                        : "Select an application to pre-fill form"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </ComboboxPopoverTrigger>
                  <ComboboxPopoverContent className="w-full p-0 max-h-96">
                    <Command>
                      <CommandInput
                        placeholder="Search by form number, name, mobile, or Aadhar..."
                        value={applicationSearchTerm}
                        onValueChange={setApplicationSearchTerm}
                      />
                      <CommandList className="max-h-64">
                        <CommandEmpty>
                          {isLoadingApplications ? "Loading applications..." : "No application found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {getPaginatedApplications().map((app) => (
                            <CommandItem
                              key={app.id}
                              value={`${app.formNumber} ${app.applicantName} ${app.fatherName} ${app.mobile} ${app.aadharNumber} ${app.gender}`}
                              onSelect={() => {
                                handleApplicationSelect(app.id.toString());
                                setApplicationSelectOpen(false);
                              }}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedApplicationId === app.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div>
                                  <div className="font-medium">
                                    {app.formNumber} - {app.applicantName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {isMale(app.gender) ? "पुरुष" : "महिला"} | {app.mobile}
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
                  </ComboboxPopoverContent>
                </ComboboxPopover>
              </div>
            </div>
            {isLoadingMarriageData && (
              <div className="text-sm text-blue-600">
                Loading marriage congratulations data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Marriage Congratulation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {/* <div>
                <Label htmlFor="date">दिनांक (Date) *</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={marriageDateValue}
                    placeholder={formatBilingual("placeholders.selectDate")}
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const value = e.target.value;
                      setMarriageDateValue(value);
                      const parsed = parseDateFromDDMMYYYY(value) || undefined;
                      if (parsed) {
                        setMarriageDateObj(parsed);
                        setFormData((prev) => ({
                          ...prev,
                          date: formatDateForAPI(parsed),
                        }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMarriageDateOpen(true);
                      }
                    }}
                    required
                  />
                  <Popover
                    open={marriageDateOpen}
                    onOpenChange={setMarriageDateOpen}
                  >
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
                          setMarriageDateObj(date);
                          setMarriageDateValue(formatDate(date));
                          setFormData((prev) => ({
                            ...prev,
                            date: date ? formatDateForAPI(date) : "",
                          }));
                          setMarriageDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div> */}

              <div>
                <Label htmlFor="applicantName">
                  आवेदक का नाम (Applicant Name) *
                </Label>
                  <Input
                  id="applicantName"
                  disabled
                  value={formData.applicantName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      applicantName: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="gender">लिंग (Gender) *</Label>
                <select
                  id="gender"
                  disabled
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  required
                >
                  <option value="">
                    {formatBilingual("placeholders.selectGender")}
                  </option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Applicant Name with Autocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {isMale(formData.gender) && (
                  <div>
                    <Label htmlFor="fatherName">
                      पिता का नाम (Father Name) *
                    </Label>

                    <Input
                    id="fatherName"
                    value={formData.fatherName}
                    disabled
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fatherName: e.target.value,
                      }))
                    }
                    required
                  />

                  </div>
                )}
              {isFemale(formData.gender) && (
                <div>
                  <Label htmlFor="wifeOf">पति का नाम (Wife Of) *</Label>
              <Input
                  id="wifeOf"
                  value={formData.wifeOf}
                  disabled
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      wifeOf: e.target.value,
                    }))
                  }
                  required
                 />
                </div>
              )}

              <div>
                <Label htmlFor="gotra">गोत्र (Gotra) *</Label>
                <Input
                  id="gotra"
                  disabled
                  value={formData.gotra}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      gotra: e.target.value,
                    }))
                  }
                  required
                 />
              </div>

              <div>
              <Label htmlFor="address">Village / गांव *</Label>
              <Input
                  id="address"
                  value={formData.address}
                  disabled
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
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
                    disabled
                    placeholder={formatBilingual("placeholders.selectDate")}
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const value = e.target.value;
                      setMembershipJoinDateValue(value);
                      const parsed = parseDateFromDDMMYYYY(value) || undefined;
                      if (parsed) {
                        setMembershipJoinDateObj(parsed);
                        setFormData((prev) => ({
                          ...prev,
                          membershipJoinDate: formatDateForAPI(parsed),
                        }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMembershipJoinDateOpen(true);
                      }
                    }}
                  />
                  <Popover
                    open={membershipJoinDateOpen}
                    onOpenChange={setMembershipJoinDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="membership-join-date-picker"
                        variant="ghost"
                        disabled
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
                          setMembershipJoinDateObj(date);
                          setMembershipJoinDateValue(formatDate(date));
                          setFormData((prev) => ({
                            ...prev,
                            membershipJoinDate: date
                              ? formatDateForAPI(date)
                              : "",
                          }));
                          setMembershipJoinDateOpen(false);
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
                    value={associatedUntilValue}
                    disabled
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
                  disabled
                  value={formData.permanentFee}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      permanentFee: e.target.value,
                    }))
                  }
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
                  disabled
                  value={formData.installmentAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      installmentAmount: e.target.value,
                    }))
                  }
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
                  disabled
                  value={formData.totalGrantAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalGrantAmount: e.target.value,
                    }))
                  }
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
                  disabled
                  value={formData.totalMembersServing}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalMembersServing: e.target.value,
                    }))
                  }
                  placeholder="सदस्यों की संख्या दर्ज करें"
                />
              </div>
            </div>

            {/* Table for calculation */}
            <div>
              <Label>किस दर x सदस्य = योग (Rate x Members = Total)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schemeTypes.length > 0 ? (
                  schemeTypes.slice(0, 3).map((scheme, idx) => {
                    const fieldKey = idx === 0 ? "rate100" : idx === 1 ? "rate200" : "rate300";
                    return (
                      <div key={scheme.id || idx}>
                        <Label htmlFor={fieldKey}>₹{scheme.amount} x</Label>
                        <Input
                          id={fieldKey}
                          disabled
                          value={(formData as any)[fieldKey]}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            setTimeout(calculateTotals, 100);
                          }}
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
                        disabled
                        value={formData.rate100}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            rate100: e.target.value,
                          }));
                          setTimeout(calculateTotals, 100);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate200">200 x</Label>
                      <Input
                        id="rate200"
                        value={formData.rate200}
                        disabled
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            rate200: e.target.value,
                          }));
                          setTimeout(calculateTotals, 100);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate300">300 x</Label>
                      <Input
                        id="rate300"
                        value={formData.rate300}
                        disabled
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            rate300: e.target.value,
                          }));
                          setTimeout(calculateTotals, 100);
                        }}
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
                  onChange={(e) => {
                    const newPercent = e.target.value;
                    console.log("Deduction percentage changed to:", newPercent);
                    setFormData((prev) => ({
                      ...prev,
                      deductionPercent: newPercent,
                    }));
                    setTimeout(calculateTotals, 50);
                  }}
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
                  disabled
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deductedAmount: e.target.value,
                    }))
                  }
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
                  disabled
                  value={formData.totalPaidAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      totalPaidAmount: e.target.value,
                    }))
                  }
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
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                {formatBilingual("common.cancel")}
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.date || !selectedApplicationId}
                title={!formData.date ? "Please select a date first" : !selectedApplicationId ? "Please select an application first" : ""}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {formatBilingual("common.loading")}
                  </>
                ) : (
                  formatBilingual("common.submit")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
