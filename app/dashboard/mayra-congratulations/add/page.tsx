"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, Check, ChevronsUpDown } from "lucide-react";
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
import { post, postUrlEncoded, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatBilingual } from "@/lib/translations";
import { getCurrentUserInfo, formatDate, formatDateForAPI, parseDateFromDDMMYYYY, MAYRA_ASSOCIATION_DURATION_HI } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard";
import { Pagination } from "@/components/ui/pagination";

// Helper function to check gender
const isMale = (gender: string): boolean => {
  return gender?.toLowerCase() === "male" || gender === "Male";
};

const isFemale = (gender: string): boolean => {
  return gender?.toLowerCase() === "female" || gender === "Female";
};

// Interface for application data from the API
interface MayraApplication {
  id: number | string;
  formNumber: string;
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
  gender: string;
  category: string;
  totalAmount: number;
  applicationDate?: string;
  nomineeName?: string;
}

interface CountData {
  category: string;
  total: number;
}

export default function AddMayraCongratulationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isLoadingMayraData, setIsLoadingMayraData] = useState(false);
  const [applications, setApplications] = useState<MayraApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  
  // Search and pagination states
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [filteredApplications, setFilteredApplications] = useState<MayraApplication[]>([]);
  const [applicationSelectOpen, setApplicationSelectOpen] = useState(false);

  // Date states
  const [applicationDateObj, setApplicationDateObj] = useState<Date | undefined>(new Date());
  const [applicationDateOpen, setApplicationDateOpen] = useState(false);
  const [applicationDateValue, setApplicationDateValue] = useState(formatDate(new Date()));

  const [formData, setFormData] = useState({
    date: formatDateForAPI(new Date()),
    mayra_id: "",
    codeNumber: "",
    applicantName: "",
    fatherName: "",
    wifeOf: "",
    gotra: "",
    address: "",
    membershipJoinDate: "",
    associatedUntil: MAYRA_ASSOCIATION_DURATION_HI,
    permanentFee: "",
    installmentAmount: "",
    totalGrantAmount: "",
    totalMembersServing: "",
    rate200: "0",
    rate300: "0",
    deductionPercent: "20",
    deductedAmount: "0",
    totalPaidAmount: "0",
    memberContribution: "0",
    gender: "",
  });

  // Filter applications
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
        app.mobile?.includes(searchTerm) ||
        app.aadharNumber?.includes(searchTerm)
      );
    });
    setFilteredApplications(filtered);
  }, [applications]);

  // Paginated applications
  const getPaginatedApplications = React.useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

  // Fetch all Mayra applications
  const fetchApplications = React.useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      const [appsResponse, congratsResponse] = await Promise.all([
        post(API_ENDPOINTS.GET_MAYRA_APPLICATIONS, { is_active: "1" }),
        post(API_ENDPOINTS.GET_MAYRA_CONGRATS, {}),
      ]);

      if (appsResponse.data.status && appsResponse.data.data) {
        const apps = Array.isArray(appsResponse.data.data)
          ? appsResponse.data.data
          : [appsResponse.data.data];

        const existingMayraIds = new Set<string>();
        if (congratsResponse.data?.data) {
          const congrats = Array.isArray(congratsResponse.data.data)
            ? congratsResponse.data.data
            : [congratsResponse.data.data];
          congrats.forEach((record: { mayra_id?: string; mayraRegistrationId?: string }) => {
            const id = record.mayra_id || record.mayraRegistrationId;
            if (id) existingMayraIds.add(String(id));
          });
        }

        setApplications(apps.filter((app: MayraApplication) => !existingMayraIds.has(String(app.id))));
      } else {
        toast({ title: "Error", description: "Failed to fetch applications", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({ title: "Error", description: "Error fetching applications", variant: "destructive" });
    } finally {
      setIsLoadingApplications(false);
    }
  }, [toast]);

  // Fetch Mayra congratulations details
  const fetchMayraCongratulationsData = React.useCallback(async (mayraId: string) => {
    if (!mayraId || !formData.date) return;

    try {
      setIsLoadingMayraData(true);
      const response = await postUrlEncoded(API_ENDPOINTS.GET_MAYRA_CONGRATULATIONS_DETAILS, { 
        mayra_id: mayraId,
        date: formData.date 
      });

      const data = response.data;
      if (data.status && data.data) {
        const apiData = data.data;
        
        const selectedApp = applications.find((a) => a.id.toString() === mayraId);

        // Handle counts and rates (B=200, C=300)
        let r200 = "0", r300 = "0";
        let totalServing = 0;
        
        if (data.counts && Array.isArray(data.counts)) {
          data.counts.forEach((count: CountData) => {
            if (count.category === "B") r200 = count.total.toString();
            else if (count.category === "C") r300 = count.total.toString();
            if (count.category === "B" || count.category === "C") {
              totalServing += count.total;
            }
          });
        }

        const calculatedTotal = (parseInt(r200) * 200) + (parseInt(r300) * 300);
        const deductionPercent = 20;
        const deductionAmount = Math.round((calculatedTotal * deductionPercent) / 100);
        const totalPaidAmount = calculatedTotal - deductionAmount;
        const totalEMI = data.totalEMI || 0;

        setFormData(prev => ({
          ...prev,
          mayra_id: mayraId,
          codeNumber: apiData.formNumber || selectedApp?.formNumber || "",
          applicantName: apiData.applicantName || "",
          fatherName: apiData.fatherName || "",
          wifeOf: isFemale(apiData.gender) ? (apiData.nomineeName || "") : "",
          gotra: apiData.gotra || "",
          address: apiData.address || "",
          gender: apiData.gender || "",
          membershipJoinDate: apiData.applicationDate || "",
          permanentFee: apiData.totalAmount?.toString() || "0",
          installmentAmount: totalEMI.toString(),
          totalGrantAmount: (Number(apiData.totalAmount || 0) + Number(totalEMI)).toString(),
          totalMembersServing: totalServing.toString(),
          rate200: r200,
          rate300: r300,
          deductedAmount: deductionAmount.toString(),
          totalPaidAmount: totalPaidAmount.toString(),
          memberContribution: calculatedTotal.toString(),
          associatedUntil: MAYRA_ASSOCIATION_DURATION_HI,
        }));

        toast({ title: "Success", description: "Form pre-filled with application data" });
      } else {
        toast({ title: "Note", description: data.message || "Could not fetch details", variant: "default" });
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      toast({ title: "Error", description: "Failed to fetch application details", variant: "destructive" });
    } finally {
      setIsLoadingMayraData(false);
    }
  }, [toast, formData.date, applications]);

  // Recalculate totals
  const calculateTotals = React.useCallback(() => {
    const r200 = parseInt(formData.rate200) || 0;
    const r300 = parseInt(formData.rate300) || 0;
    const dPercent = parseInt(formData.deductionPercent) || 20;

    const total = (r200 * 200) + (r300 * 300);
    const dAmount = Math.round((total * dPercent) / 100);
    const paid = total - dAmount;

    setFormData(prev => ({
      ...prev,
      deductedAmount: dAmount.toString(),
      totalPaidAmount: paid.toString(),
      memberContribution: total.toString(),
      totalMembersServing: (r200 + r300).toString(),
    }));
  }, [formData.rate200, formData.rate300, formData.deductionPercent]);

  // Effects
  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  
  useEffect(() => { filterApplications(applicationSearchTerm); setCurrentPage(1); }, [applications, applicationSearchTerm, filterApplications]);

  useEffect(() => { calculateTotals(); }, [formData.rate200, formData.rate300, formData.deductionPercent]);

  const handleApplicationSelect = (id: string) => {
    if (!formData.date) {
      toast({ title: "Validation Error", description: "Please select a date first", variant: "destructive" });
      return;
    }
    setSelectedApplicationId(id);
    fetchMayraCongratulationsData(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicationId) {
      toast({ title: "Error", description: "Please select an application first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const apiFormData = new FormData();
      Object.entries(formData).forEach(([k, v]) => apiFormData.append(k, String(v ?? "")));
      apiFormData.append("addedby", addedby);
      apiFormData.append("addedby_id", addedby_id);

      const response = await post(API_ENDPOINTS.CREATE_MAYRA_CONGRATS, apiFormData);
      const { status, error, message } = response.data ?? {};

      if (status === true && error !== true) {
        toast({ title: "Success", description: "Mayra congratulation record added successfully" });
        router.push("/dashboard/mayra-congratulations");
      } else {
        toast({
          title: "Error",
          description: message || "Failed to save Mayra congratulations record",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const apiMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : undefined;
      toast({
        title: "Error",
        description: apiMessage || "An error occurred while saving",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [membershipJoinDateValue, setMembershipJoinDateValue] = useState("");

  useEffect(() => {
    if (formData.membershipJoinDate) {
      setMembershipJoinDateValue(formatDate(new Date(formData.membershipJoinDate)));
    } else {
      setMembershipJoinDateValue("");
    }
  }, [formData.membershipJoinDate]);

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="create">
      <div className="p-6">
        {/* Header - Matching Marriage Design */}
        <div className="flex">
          <div className="mb-4">
            <Button type="button" variant="link" onClick={() => router.back()}>
              ← वापस जाएं / <br />
              Go Back
            </Button>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              नया मायरा बधाई रिकॉर्ड जोड़ें
            </h1>
            <p className="text-sm text-gray-600">
              Add New Mayra Congratulation Record
            </p>
          </div>
        </div>

        {/* Application Selection Card - Matching Marriage Design */}
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
                      readOnly
                    />
                    <Popover open={applicationDateOpen} onOpenChange={setApplicationDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                          type="button"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={applicationDateObj}
                          onSelect={(date: any) => {
                            setApplicationDateObj(date);
                            setApplicationDateValue(formatDate(date));
                            setFormData(prev => ({ ...prev, date: formatDateForAPI(date) }));
                            setApplicationDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="applicationSelect">आवेदन चुनें (Select Application)</Label>
                  <ComboboxPopover open={applicationSelectOpen} onOpenChange={setApplicationSelectOpen}>
                    <ComboboxPopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between mt-1"
                        disabled={isLoadingApplications || !formData.date}
                      >
                        {selectedApplicationId
                          ? (() => {
                              const app = applications.find(a => a.id.toString() === selectedApplicationId);
                              return app ? `${app.formNumber} - ${app.applicantName}` : "Select Application";
                            })()
                          : "आवेदन चुनें (Search Application)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </ComboboxPopoverTrigger>
                    <ComboboxPopoverContent className="w-full p-0 max-h-96">
                      <Command>
                        <CommandInput placeholder="Search application..." value={applicationSearchTerm} onValueChange={setApplicationSearchTerm} />
                        <CommandList>
                          <CommandEmpty>No application found.</CommandEmpty>
                          <CommandGroup>
                            {getPaginatedApplications().map((app) => (
                              <CommandItem
                                key={app.id}
                                value={`${app.formNumber} ${app.applicantName} ${app.mobile}`}
                                onSelect={() => {
                                  handleApplicationSelect(app.id.toString());
                                  setApplicationSelectOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedApplicationId === app.id.toString() ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <div className="font-medium">{app.formNumber} - {app.applicantName}</div>
                                  <div className="text-sm text-gray-500">{app.mobile}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
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
              {isLoadingMayraData && <p className="text-sm text-blue-600">Loading data...</p>}
            </div>
          </CardContent>
        </Card>

        {/* Main Form Card - Matching Marriage Design */}
        <Card>
          <CardHeader>
            <CardTitle>Mayra Congratulation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>आवेदक का नाम (Applicant Name) *</Label>
                  <Input value={formData.applicantName} disabled />
                </div>
                <div>
                  <Label>लिंग (Gender) *</Label>
                  <Input value={formData.gender || ""} disabled className="capitalize" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isMale(formData.gender) && (
                  <div>
                    <Label>पिता का नाम (Father Name) *</Label>
                    <Input value={formData.fatherName} disabled />
                  </div>
                )}
                {isFemale(formData.gender) && (
                  <div>
                    <Label>पति का नाम (Wife Of) *</Label>
                    <Input value={formData.wifeOf} disabled />
                  </div>
                )}
                <div>
                  <Label>गोत्र (Gotra) *</Label>
                  <Input value={formData.gotra} disabled />
                </div>
                <div>
                  <Label>Village / गांव *</Label>
                  <Input value={formData.address} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>सदस्यता से जुड़ने की तारीख (Membership Join Date)</Label>
                  <Input value={membershipJoinDateValue} disabled />
                </div>
                <div>
                  <Label>यह सदस्य कब तक इस संस्था से जुड़ी रही (How long associated)</Label>
                  <Input value={formData.associatedUntil} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>स्थायी शुल्क (अनुदान) दी गई राशि (Permanent Fee/Grant Amount)</Label>
                  <Input value={formData.permanentFee} disabled />
                </div>
                <div>
                  <Label>किस्त के तौर पर दी गई राशि (Installment Amount)</Label>
                  <Input value={formData.installmentAmount} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>संस्था में कुल दी गई अनुदान राशि (Total Grant Amount)</Label>
                  <Input value={formData.totalGrantAmount} disabled />
                </div>
                <div>
                  <Label>संस्था में कुल सदस्य सेवा दे रहे हैं (Total Members Serving)</Label>
                  <Input value={formData.totalMembersServing} disabled />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>किस दर x सदस्य = योग (Rate x Members = Total)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>200 x</Label>
                    <Input value={formData.rate200} disabled />
                  </div>
                  <div>
                    <Label>300 x</Label>
                    <Input value={formData.rate300} disabled />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>कटौती प्रतिशत चुनें (Select Deduction Percent)</Label>
                  <select
                    value={formData.deductionPercent}
                    onChange={(e) => setFormData(p => ({ ...p, deductionPercent: e.target.value }))}
                    className="w-full border rounded px-3 py-2 mt-1"
                  >
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                  </select>
                </div>
                <div>
                  <Label>कटौती राशि ({formData.deductionPercent}% Deducted Amount)</Label>
                  <Input value={formData.deductedAmount} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>संस्था द्वारा कुल भुगतान राशि (Total Paid Amount)</Label>
                  <Input value={formData.totalPaidAmount} disabled />
                </div>
                <div>
                  <Label>सदस्य द्वारा दी गयी राशि (Amount given by member)</Label>
                  <Input value={formData.memberContribution} readOnly className="bg-gray-50" />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-6">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedApplicationId}>
                  {isSubmitting ? "Saving..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
