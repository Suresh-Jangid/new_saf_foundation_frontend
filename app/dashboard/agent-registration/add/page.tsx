'use client'

import { Input } from "@/components/ui/input";
import { GENDER_OPTIONS } from "@/lib/form-values"
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, isValidDate, parseDateFromDDMMYYYY, getCurrentUserInfo, formatDateForAPI } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard"

const initialState = {
  date: "",
  dateOfBirth: "",
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
  doj: "",
  designation: "",
  password: "",
  profile_image: null as File | null,
};

export default function AddAgentPage() {
  // Generate employee ID like EMP-YYMMDDHHmm
  

  const [form, setForm] = useState(() => ({ ...initialState }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { createApi } = useCRUD("agentRecords", [], {
    create: API_ENDPOINTS.CREATE_AGENT,
  });

  const [dateValue, setDateValue] = useState("");
  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  // Date of Birth picker state
  const [dobValue, setDobValue] = useState("");
  const [dobObj, setDobObj] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);
  // Date of Joining picker state
  const [dojValue, setDojValue] = useState("");
  const [dojObj, setDojObj] = useState<Date | undefined>(undefined);
  const [dojOpen, setDojOpen] = useState(false);

  // Calculate age from dateOfBirth (yyyy-mm-dd)
  function calculateAge(dob: string) {
    if (!dob || dob.trim() === "") return "";
    
    // Handle both yyyy-mm-dd and dd-mm-yyyy formats
    let birthDate: Date;
    
    if (dob.includes('-')) {
      // If it's already in yyyy-mm-dd format
      birthDate = new Date(dob);
    } else {
      // If it's in dd-mm-yyyy format, convert it
      const date = parseDateFromDDMMYYYY(dob);
      if (!date) return "";
      birthDate = date;
    }
    
    if (isNaN(birthDate.getTime())) return "";
    
    const today = new Date();
    
    // Check if birth date is in the future
    if (birthDate > today) return "";
    
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // If birthday hasn't occurred yet this year, subtract 1 year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--;
    }
    
    return String(Math.max(0, years));
  }

  // Auto-update age when dateOfBirth changes
  React.useEffect(() => {
    const newAge = calculateAge(form.dateOfBirth);
    if (newAge !== form.age) {
      setForm(prev => ({ ...prev, age: newAge }));
    }
  }, [form.dateOfBirth]);

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
    if (!form.date || !form.name || !form.fatherName || !form.gender || !form.mobile || !form.password) {
      toast.error("कृपया सभी आवश्यक फील्ड भरें");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { addedby, addedby_id } = getCurrentUserInfo();
      
      // Helper function to convert dd-mm-yyyy to YYYY-MM-DD format for API
      const parseAndFormatDate = (dateString: string) => {
        if (!dateString) return "";
        const parsedDate = parseDateFromDDMMYYYY(dateString);
        return parsedDate ? formatDateForAPI(parsedDate) : "";
      };
      
      const submissionData = {
        ...form,
        date: parseAndFormatDate(form.date),
        dateOfBirth: parseAndFormatDate(form.dateOfBirth),
        doj: parseAndFormatDate(form.doj),
        addedby,
        addedby_id,
      };
      
      const result = await createApi(submissionData);
      
      if (result) {
        router.push("/dashboard/agent-registration");
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("एजेंट जोड़ने में त्रुटि");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard requiredModule="agent_registration" requiredAction="create">
      <div className="p-6">
        {/* Top Back Button */}
        <div className="flex">
          <div className="mb-4">
            <Button type="button" variant="link" onClick={() => router.back()}>
              ← वापस जाएं / <br />Go Back
            </Button>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">एजेंट पंजीकरण</h1>
            <p className="text-sm text-gray-600">Agent Registration</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>एजेंट पंजीकरण विवरण / Agent Registration Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">दिनांक (Date) *</Label>
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
                          setForm({ ...form, date: formatDate(date) });
                        } else {
                          setDateObj(undefined)
                          setForm({ ...form, date: str });
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
                  {form.profile_image && (
                    <div className="mt-2 flex items-center gap-2">
                      <img 
                        src={URL.createObjectURL(form.profile_image)} 
                        alt="Profile Preview" 
                        className="h-32 w-auto border rounded" 
                      />
                      <X
                        className="ml-2 w-5 h-5 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => setForm(prev => ({ ...prev, profile_image: null }))}
                        aria-label="Remove"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Date of Birth */}
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
                        const str = e.target.value
                        setDobValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setDobObj(date)
                          setForm({ ...form, dateOfBirth: formatDate(date) });
                        } else {
                          setDobObj(undefined)
                          setForm({ ...form, dateOfBirth: str });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setDobOpen(true)
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
                        const str = e.target.value
                        setDojValue(str)
                        const date = parseDateFromDDMMYYYY(str)
                        if (date) {
                          setDojObj(date)
                          setForm({ ...form, doj: formatDate(date) });
                        } else {
                          setDojObj(undefined)
                          setForm({ ...form, doj: str });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setDojOpen(true)
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
                  <Label htmlFor="password">पासवर्ड (Password) *</Label>
                  <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
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
                  <Input 
                    id="age" 
                    name="age" 
                    type="number" 
                    value={form.age} 
                    onChange={handleChange} 
                    readOnly 
                    placeholder={form.dateOfBirth ? "आयु की गणना हो रही है..." : "जन्म तिथि दर्ज करें"}
                    className={form.dateOfBirth && !form.age ? "animate-pulse" : ""}
                  />
                  {form.dateOfBirth && !form.age && (
                    <p className="text-xs text-muted-foreground mt-1">
                      कृपया सही जन्म तिथि दर्ज करें
                    </p>
                  )}
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
                  <Label htmlFor="address">पता (address)</Label>
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
                  <Label htmlFor="mobile">मोबाइल न. (Mobile No.) *</Label>
                  <Input id="mobile" name="mobile" value={form.mobile} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhaar">आधार कार्ड नंबर (Aadhaar Card Number)</Label>
                  <Input id="aadhaar" name="aadhaar" value={form.aadhaar} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="bankName">बैंक का नाम (Bank Name)</Label>
                  <Input id="bankName" name="bankName" value={form.bankName} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">खाता संख्या (Account Number)</Label>
                  <Input id="accountNumber" name="accountNumber" value={form.accountNumber} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="ifsc">IFSC कोड (IFSC Code)</Label>
                  <Input id="ifsc" name="ifsc" value={form.ifsc} onChange={handleChange} />
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
                  {isSubmitting ? "सबमिट हो रहा है..." : "सबमिट करें (Submit)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
