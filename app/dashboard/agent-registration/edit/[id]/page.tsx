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
import { API_ENDPOINTS, postUrlEncoded } from "@/lib/api";
import { toast } from "sonner"
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, mapAgentFormRecord, unwrapApiRecordById, getProxiedPhotoSrc } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard"

interface AgentRecord {
  id: string;
  date: string;
  employee_id: string;
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
  createdAt: string;
}

const initialState = {
  date: "",
  employee_id: "",
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
  password: "",
  profile_image: null as File | null,
};

export default function EditAgentRegistrationForm() {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [existingProfileImage, setExistingProfileImage] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

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
        const response = await postUrlEncoded(API_ENDPOINTS.GET_AGENTS, { id });
        const raw = unwrapApiRecordById<Record<string, unknown>>(response.data?.data, id);
        const mapped = mapAgentFormRecord(raw);
        
        if (mapped && (response.data?.status || response.data?.success)) {
          setForm({
            ...initialState,
            ...mapped,
            password: "",
            profile_image: null,
          });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.date || !form.employee_id || !form.name || !form.fatherName || !form.gender) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Helper function to convert dd-mm-yyyy to YYYY-MM-DD format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return "";
        const parsedDate = parseDateFromDDMMYYYY(dateString);
        return parsedDate ? formatDateForAPI(parsedDate) : "";
      };
      
      const submissionData: Record<string, unknown> = {
        ...form,
        date: parseAndFormatDate(form.date),
        dateOfBirth: parseAndFormatDate(form.dateOfBirth),
        doj: parseAndFormatDate(form.doj),
      };

      if (!form.password) {
        delete submissionData.password;
      }
  
      const success = await updateApi(id, submissionData);
      
      if (success) {
        router.push("/dashboard/agent-registration");
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("एजेंट अपडेट करने में त्रुटि");
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
              <div className="grid grid-cols-3 gap-4">
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
                        src={form.profile_image ? URL.createObjectURL(form.profile_image) : existingProfileImage!} 
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

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <Label htmlFor="designation">पद (Designation)</Label>
                  <Input id="designation" name="designation" value={form.designation} onChange={handleChange} />
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
      </div>
    </RoleGuard>
  );
}
