'use client'

import { Input } from "@/components/ui/input";
import { GENDER_OPTIONS } from "@/lib/form-values"
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS, postUrlEncoded, agentRegistrationAPI } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, mapAgentFormRecord, unwrapApiRecordById, getProxiedPhotoSrc, fileToBase64, formatAgentLevel } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard";
import { isAdmin, isAgent } from "@/lib/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EligibleSenior {
  id?: string;
  userId?: string;
  user_id?: string;
  employee_id?: string;
  employeeId?: string;
  employeeCode?: string;
  code?: string;
  name?: string;
  fullName?: string;
  employeeName?: string;
  level?: string | number;
  designation?: string;
  is_active?: number | boolean;
  status?: string;
}

interface AgentRecord {
  id: string;
  date: string;
  employee_id: string;
  offlineFormNumber?: string;
  offline_form_number?: string;
  name: string;
  fatherName: string;
  gotra: string;
  age: string;
  village: string;
  address: string;
  tehsil: string;
  district: string;
  mobile: string;
  aadhaar: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  nomineeName: string;
  nomineeMobile: string;
  nomineeRelation: string;
  workArea: string;
  gender: string;
  doj: string;
  designation: string;
  password: string;
  profile_image?: string;
  seniorEmployeeId?: string;
  parentAgentId?: string;
  seniorName?: string;
  seniorCode?: string;
  level?: string;
  createdAt: string;
}

const VALIDATION_MESSAGE_MAP: Record<string, string> = {
  "Password must be at least 6 characters": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
  "Mobile number must contain digits only": "मोबाइल नंबर में केवल अंक होने चाहिए",
  "Mobile number must be at least 10 digits": "मोबाइल नंबर कम से कम 10 अंकों का होना चाहिए",
  "Name must be at least 2 characters": "नाम कम से कम 2 अक्षरों का होना चाहिए",
  "Invalid enum value. Expected 'Male' | 'Female' | 'Other', received ''": "कृपया जेंडर चुनें",
  "Invalid email format": "ईमेल का फॉर्मेट सही नहीं है",
};

function formatValidationErrorMessage(error: any, defaultFallback: string): string {
  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const messages = validationErrors
      .map((item: any) => {
        const rawMsg = (item?.message || (typeof item === "string" ? item : "")).trim();
        if (!rawMsg) return "";
        return VALIDATION_MESSAGE_MAP[rawMsg] || rawMsg;
      })
      .filter(Boolean);

    if (messages.length === 1) {
      return messages[0];
    }
    if (messages.length > 1) {
      const uniqueMessages = Array.from(new Set(messages));
      return `कृपया जानकारी सही करें:\n• ${uniqueMessages.join("\n• ")}`;
    }
  }

  return error?.response?.data?.message || error?.message || defaultFallback;
}

const initialState = {
  date: "",
  employee_id: "",
  offlineFormNumber: "",
  name: "",
  fatherName: "",
  gotra: "",
  age: "",
  village: "",
  address: "",
  tehsil: "",
  district: "",
  mobile: "",
  aadhaar: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  nomineeName: "",
  nomineeMobile: "",
  nomineeRelation: "",
  workArea: "",
  gender: "",
  dateOfBirth: "",
  doj: "",
  designation: "",
  seniorEmployeeId: "",
  parentAgentId: "",
  seniorName: "",
  seniorCode: "",
  level: "1",
  password: "",
  profile_image: null as File | string | null,
};

export default function EditAgentRegistrationForm() {
  const [form, setForm] = useState(initialState);
  const [initialOfflineFormNumber, setInitialOfflineFormNumber] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [eligibleSeniors, setEligibleSeniors] = useState<EligibleSenior[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [existingProfileImage, setExistingProfileImage] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Load eligible seniors
  useEffect(() => {
    let isMounted = true;
    const loadSeniors = async () => {
      try {
        const res = await agentRegistrationAPI.getEligibleSeniors();
        if (!isMounted) return;
        const rawList = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const validList = rawList.filter((s: any) => {
          if (!s) return false;
          if (s.is_active === 0 || s.is_active === false || s.status === "inactive") return false;
          if (s.is_deleted || s.deleted_at) return false;
          return true;
        });
        setEligibleSeniors(validList);

        // Sync senior selection if form was loaded before eligible seniors
        setForm((prev) => {
          if (!prev.parentAgentId && !prev.seniorCode && !prev.seniorEmployeeId) return prev;
          const match = validList.find(
            (s: any) =>
              (prev.parentAgentId && (s.id === prev.parentAgentId || s.userId === prev.parentAgentId || s.user_id === prev.parentAgentId)) ||
              (prev.seniorEmployeeId && (s.id === prev.seniorEmployeeId || s.userId === prev.seniorEmployeeId || s.user_id === prev.seniorEmployeeId)) ||
              (prev.seniorCode && (s.employeeId === prev.seniorCode || s.employee_id === prev.seniorCode || s.employeeCode === prev.seniorCode || s.code === prev.seniorCode))
          );
          if (match) {
            const matchedUserId = String(match.id || match.userId || match.user_id);
            const seniorLvlNum = match.level ? Number(match.level) : 1;
            return {
              ...prev,
              seniorEmployeeId: matchedUserId,
              parentAgentId: matchedUserId,
              seniorCode: match.employeeId || match.employee_id || prev.seniorCode,
              seniorName: match.name || match.fullName || prev.seniorName,
              level: prev.level || String(seniorLvlNum + 1),
            };
          }
          return prev;
        });
      } catch (err) {
        console.error("Failed to load eligible seniors in edit form:", err);
      }
    };
    loadSeniors();
    return () => {
      isMounted = false;
    };
  }, []);

  const { updateApi } = useCRUD<AgentRecord>("agentRecords", [], {
    update: API_ENDPOINTS.UPDATE_AGENT,
  }, { autoLoad: false });

  const [dateValue, setDateValue] = useState("");
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [dobValue, setDobValue] = useState("");
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);
  // Date of Joining picker state
  const [dojValue, setDojValue] = useState("");
  const [dojObj, setDojObj] = useState<Date | undefined>(undefined);
  const [dojOpen, setDojOpen] = useState(false);

  function isValidDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Fetch agent data on component mount
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const response = await agentRegistrationAPI.getById(id);
        const raw = unwrapApiRecordById<Record<string, unknown>>(response?.data, id) || response?.data || response;
        const mapped = mapAgentFormRecord(raw);
        
        if (mapped && (response?.status || response?.success || response?.data)) {
          // Resolve senior ID from mapped data
          const rawParentId = mapped.parentAgentId || mapped.seniorEmployeeId || "";
          const rawOffline = mapped.offlineFormNumber || (raw as any)?.offlineFormNumber || (raw as any)?.agentProfile?.offlineFormNumber || "";
          setInitialOfflineFormNumber(rawOffline);
          
          setForm((prev) => ({
            ...initialState,
            ...mapped,
            offlineFormNumber: rawOffline,
            seniorEmployeeId: rawParentId,
            password: "",
            profile_image: null,
          }));

          if (mapped.profile_image) {
            setExistingProfileImage(getProxiedPhotoSrc(mapped.profile_image));
          }

          if (mapped.date) {
            const date = parseDateFromDDMMYYYY(mapped.date) ?? new Date(mapped.date);
            if (isValidDate(date)) {
              setDateObj(date);
              setDateValue(formatDate(date));
            }
          }

          if (mapped.doj) {
            const dojDate = parseDateFromDDMMYYYY(mapped.doj) ?? new Date(mapped.doj);
            if (isValidDate(dojDate)) {
              setDojObj(dojDate);
              setDojValue(formatDate(dojDate));
            }
          }

          if (mapped.dateOfBirth) {
            const dobDate = parseDateFromDDMMYYYY(mapped.dateOfBirth) ?? new Date(mapped.dateOfBirth);
            if (isValidDate(dobDate)) {
              setDobObj(dobDate);
              setDobValue(formatDate(dobDate));
            }
          }
        } else {
          toast.error("एजेंट डेटा नहीं मिला");
          router.push("/dashboard/agent-registration");
        }
      } catch (error) {
        console.error("Error fetching agent data:", error);
        toast.error("एजेंट डेटा लोड करने में त्रुटि");
        router.push("/dashboard/agent-registration");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAgentData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;
    
    if (type === "file" && files) {
      const file = files[0];
      setForm({ ...form, [name]: file });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const hasParent = Boolean(
    form.parentAgentId ||
    form.seniorEmployeeId ||
    (form.seniorCode && form.seniorCode !== "ADMIN") ||
    (form.seniorName && form.seniorName !== "Super Admin")
  );
  const isRootLevel = !hasParent && (form.level === "1" || form.level === "LEVEL_1" || form.level === "LEVEL-1" || !form.level);
  const currentFormattedLevel = formatAgentLevel(form.level || (hasParent ? 2 : 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.date || !form.employee_id || !form.name || !form.fatherName || !form.gender) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    const currentOffline = (form.offlineFormNumber || '').trim();
    const initialOffline = (initialOfflineFormNumber || '').trim();

    if (currentOffline !== initialOffline) {
      setConfirmDialogOpen(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setConfirmDialogOpen(false);
    try {
      setIsSubmitting(true);
      
      // Helper function to convert dd-mm-yyyy to YYYY-MM-DD format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return "";
        const parsedDate = parseDateFromDDMMYYYY(dateString);
        return parsedDate ? formatDateForAPI(parsedDate) : "";
      };

      const selectedSeniorId = hasParent
        ? (form.seniorEmployeeId && form.seniorEmployeeId.trim() !== ""
            ? form.seniorEmployeeId.trim()
            : (form.parentAgentId && form.parentAgentId.trim() !== "" ? form.parentAgentId.trim() : null))
        : null;

      let serializedProfileImage: string | null = null;
      if (form.profile_image instanceof File) {
        serializedProfileImage = await fileToBase64(form.profile_image);
      } else if (typeof form.profile_image === "string" && form.profile_image.trim() !== "") {
        serializedProfileImage = form.profile_image;
      } else if (existingProfileImage && typeof existingProfileImage === "string") {
        serializedProfileImage = existingProfileImage;
      }

      const submissionData: Record<string, unknown> = {
        ...form,
        offlineFormNumber: form.offlineFormNumber ? form.offlineFormNumber.trim() : "",
        seniorEmployeeId: selectedSeniorId,
        parentAgentId: selectedSeniorId,
        senior_employee_id: selectedSeniorId,
        parent_agent_id: selectedSeniorId,
        date: parseAndFormatDate(form.date),
        dateOfBirth: parseAndFormatDate(form.dateOfBirth),
        doj: parseAndFormatDate(form.doj),
        profile_image: serializedProfileImage,
      };

      if (!form.password) {
        delete submissionData.password;
      }
  
      const res = await agentRegistrationAPI.update(id, submissionData);
      
      if (res?.status || res?.success || res) {
        toast.success("एजेंट सफलतापूर्वक अपडेट हुआ");
        router.push("/dashboard/agent-registration");
      }
    } catch (error: any) {
      console.error("Error updating agent:", error);
      const errorMessage = formatValidationErrorMessage(error, "एजेंट अपडेट करने में त्रुटि");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading agent data...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="agent_registration" requiredAction="update">
      <div className="p-6">
        {/* Top Back Button */}
        <div className="flex">
          <div className="mb-4">
            <Button type="button" variant="link" onClick={() => router.back()}>
              ← वापस जाएं / <br />Go Back
            </Button>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">एजेंट पंजीकरण संपादित करें</h1>
            <p className="text-sm text-gray-600">Edit Agent Registration</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>एजेंट पंजीकरण विवरण संपादित करें / Edit Agent Registration Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form key={id} className="space-y-4" autoComplete="off" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="date">दिनांक (Date) *</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="date"
                      value={dateValue}
                      placeholder="01 June, 2000"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value;
                        setDateValue(str);
                        const date = parseDateFromDDMMYYYY(str);
                        if (date) {
                          setDateObj(date);
                          setForm({ ...form, date: formatDate(date) });
                        } else {
                          // Clear dateObj if invalid date
                          setDateObj(undefined);
                          setForm({ ...form, date: str });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDateOpen(true);
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
                            setDateObj(date);
                            setDateValue(formatDate(date));
                            setForm({ ...form, date: date ? formatDate(date) : "" });
                            setDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="employee_id">कर्मचारी आईडी (Employee ID) *</Label>
                  <Input id="employee_id" name="employee_id" disabled value={form.employee_id} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="offlineFormNumber">ऑफलाइन फॉर्म नं. / Offline Form No.</Label>
                  <Input
                    id="offlineFormNumber"
                    name="offlineFormNumber"
                    value={form.offlineFormNumber || ""}
                    placeholder="उदा. 1259"
                    maxLength={50}
                    className="bg-background"
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number
                  </p>
                </div>
                <div>
                  <Label htmlFor="name">नाम (Name) *</Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                </div>
              </div>

              {/* Profile Image Upload */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="profile_image">प्रोफाइल फोटो (Profile Photo)</Label>
                  <Input 
                    id="profile_image" 
                    name="profile_image" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleChange} 
                  />
                  {(form.profile_image || existingProfileImage) && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={form.profile_image instanceof File ? URL.createObjectURL(form.profile_image) : (typeof form.profile_image === "string" ? form.profile_image : existingProfileImage!)}
                        alt="Profile Preview"
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
                          setForm(prev => ({ ...prev, profile_image: null }));
                          setExistingProfileImage(null);
                        }}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                  {existingProfileImage && !form.profile_image && (
                    <p className="text-xs text-gray-500 mt-1">Existing photo loaded</p>
                  )}
                </div>
              </div>

              {/* Date of Birth & Joining */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">जन्म तिथि (Date of Birth)</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="dateOfBirth"
                      value={dobValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value;
                        setDobValue(str);
                        const date = parseDateFromDDMMYYYY(str);
                        if (date) {
                          setDobObj(date);
                          setForm({ ...form, dateOfBirth: formatDate(date) });
                        } else {
                          setDobObj(undefined);
                          setForm({ ...form, dateOfBirth: str });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDobOpen(true);
                        }
                      }}
                    />
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="dob-picker"
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
                          selected={dobObj}
                          captionLayout="dropdown"
                          month={dobObj}
                          onMonthChange={setDobObj}
                          onSelect={(date: any) => {
                            setDobObj(date);
                            setDobValue(formatDate(date));
                            setForm({ ...form, dateOfBirth: date ? formatDate(date) : "" });
                            setDobOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="doj">कार्यभार ग्रहण तिथि (Date of Joining)</Label>
                  <div className="relative flex gap-2">
                    <Input
                      id="doj"
                      value={dojValue}
                      placeholder="dd-mm-yyyy"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const str = e.target.value;
                        setDojValue(str);
                        const date = parseDateFromDDMMYYYY(str);
                        if (date) {
                          setDojObj(date);
                          setForm({ ...form, doj: formatDate(date) });
                        } else {
                          setDojObj(undefined);
                          setForm({ ...form, doj: str });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDojOpen(true);
                        }
                      }}
                    />
                    <Popover open={dojOpen} onOpenChange={setDojOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="doj-picker"
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
                          selected={dojObj}
                          captionLayout="dropdown"
                          month={dojObj}
                          onMonthChange={setDojObj}
                          onSelect={(date: any) => {
                            setDojObj(date);
                            setDojValue(formatDate(date));
                            setForm({ ...form, doj: date ? formatDate(date) : "" });
                            setDojOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Designation & Senior Employee Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="designation">पद (Designation)</Label>
                  <Input id="designation" name="designation" value={form.designation} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="seniorEmployeeId">
                    सीनियर कर्मचारी / Senior Employee
                  </Label>
                  {isRootLevel ? (
                    <div className="space-y-1.5">
                      <div className="p-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-900 flex items-center justify-between">
                        <span>सीधे Admin के अंतर्गत / Direct Under Admin</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {currentFormattedLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Level-1 कर्मचारी सीधे Admin के अधीन हैं।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">वर्तमान स्तर / Current Hierarchy:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                          {currentFormattedLevel}
                        </span>
                      </div>
                      <Select
                        disabled={isAgent()}
                        value={form.seniorEmployeeId ? form.seniorEmployeeId : "direct_admin"}
                        onValueChange={(val) => {
                          if (val === "direct_admin") {
                            setForm((prev) => ({
                              ...prev,
                              seniorEmployeeId: "",
                              parentAgentId: "",
                              seniorCode: "ADMIN",
                              seniorName: "Super Admin",
                              level: "1",
                            }));
                          } else {
                            const found = eligibleSeniors.find(
                              (s) => String(s.id || s.userId || s.user_id) === val
                            );
                            const seniorLvlNum = found?.level ? Number(found.level) : 1;
                            setForm((prev) => ({
                              ...prev,
                              seniorEmployeeId: val,
                              parentAgentId: val,
                              seniorCode: found?.employeeId || found?.employee_id || prev.seniorCode,
                              seniorName: found?.name || found?.fullName || prev.seniorName,
                              level: String(seniorLvlNum + 1),
                            }));
                          }
                        }}
                      >
                        <SelectTrigger id="seniorEmployeeId">
                          <SelectValue placeholder="सीनियर कर्मचारी चुनें / Select Senior" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct_admin">
                            सीधे Admin के अंतर्गत / Direct Under Admin (Promote to Level-1 Senior)
                          </SelectItem>
                          {eligibleSeniors
                            .filter((senior) => {
                              // Cannot select oneself as senior
                              const sId = String(senior.id || senior.userId || senior.user_id || "");
                              return sId !== id;
                            })
                            .map((senior) => {
                              const sId = String(senior.id || senior.userId || senior.user_id || senior.employee_id || "");
                              const sCode = senior.employee_id || senior.employeeId || senior.employeeCode || senior.code || "";
                              const sName = senior.name || senior.fullName || senior.employeeName || "";
                              const seniorLvl = formatAgentLevel(senior.level);
                              const label = sCode ? `${sCode} — ${sName} (${seniorLvl})` : `${sName} (${seniorLvl})`;
                              return (
                                <SelectItem key={sId} value={sId}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                      <div className="text-xs space-y-0.5">
                        <p className={form.seniorEmployeeId ? "text-purple-700 font-medium" : "text-emerald-700 font-medium"}>
                          {form.seniorEmployeeId
                            ? `यह Employee चयनित Senior (${form.seniorCode ? form.seniorCode + " — " : ""}${form.seniorName || "Selected Senior"}) के अधीन ${currentFormattedLevel} है।`
                            : "सीधे Admin के अंतर्गत रखने पर यह LEVEL-1 बन जाएगा।"}
                        </p>
                        <p className="text-muted-foreground">
                          चयनित Senior के अधीन होने पर स्तर (Level) Senior के स्तर + 1 के अनुसार स्वचालित निर्धारित होगा।
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="password">पासवर्ड (Password)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="खाली छोड़ें यदि बदलना नहीं है"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fatherName">पिता (Father's Name) *</Label>
                  <Input id="fatherName" name="fatherName" value={form.fatherName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="gotra">गोत्र (Gotra)</Label>
                  <Input id="gotra" name="gotra" value={form.gotra} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">आयु (Age)</Label>
                  <Input id="age" name="age" type="number" disabled value={form.age} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="gender">लिंग (Gender) *</Label>
                  <Select value={form.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
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
                  <Label htmlFor="village">गांव (Village)</Label>
                  <Input id="village" name="village" value={form.village} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="address">पता (Address)</Label>
                  <Input id="address" name="address" value={form.address} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tehsil">तहसील (Tehsil)</Label>
                  <Input id="tehsil" name="tehsil" value={form.tehsil} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="district">जिला (District)</Label>
                  <Input id="district" name="district" value={form.district} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="mobile">मोबाइल न. (Mobile No.)</Label>
                  <Input id="mobile" name="mobile" value={form.mobile} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhaar">आधार कार्ड नंबर (Aadhaar Card Number)</Label>
                  <Input id="aadhaar" name="aadhaar" value={form.aadhaar ?? ""} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="bankName">बैंक का नाम (Bank Name)</Label>
                  <Input id="bankName" name="bankName" value={form.bankName} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">खाता संख्या (Account Number)</Label>
                  <Input id="accountNumber" name="accountNumber" value={form.accountNumber ?? ""} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="ifsc">IFSC कोड (IFSC Code)</Label>
                  <Input id="ifsc" name="ifsc" value={form.ifsc ?? ""} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nomineeName">नामिनी का नाम (Nominee Name)</Label>
                  <Input id="nomineeName" name="nomineeName" value={form.nomineeName} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="nomineeMobile">नामिनी का मोबाइल न. (Nominee Mobile No.)</Label>
                  <Input id="nomineeMobile" name="nomineeMobile" value={form.nomineeMobile} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="nomineeRelation">नामिनी के साथ सम्बन्ध (Relation with Nominee)</Label>
                  <Input id="nomineeRelation" name="nomineeRelation" value={form.nomineeRelation} onChange={handleChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="workArea">कार्य क्षेत्र (Area of Work)</Label>
                <Input id="workArea" name="workArea" value={form.workArea} onChange={handleChange} />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  रद्द करें / Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "अपडेट हो रहा है..." : "अपडेट करें (Update)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Human Error Protection Confirmation Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>फॉर्म संख्या पुष्टि / Confirm Offline Form Number</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-gray-800 font-medium pt-2">
                ऑफलाइन फॉर्म नं. <span className="font-bold text-primary">{form.offlineFormNumber ? form.offlineFormNumber.trim() : ""}</span> सही है?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)}>
                रद्द करें / Edit
              </AlertDialogCancel>
              <AlertDialogAction onClick={executeSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "हाँ, सही है / Confirm & Save"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
