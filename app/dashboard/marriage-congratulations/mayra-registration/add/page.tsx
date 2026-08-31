"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GENDER_OPTIONS } from "@/lib/form-values"
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
import { CalendarDays, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
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
import { cn, formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo, MAYRA_ASSOCIATION_DURATION_HI } from "@/lib/utils";
import { API_ENDPOINTS, post, postUrlEncoded } from "@/lib/api";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { useSchemeTypes } from "@/hooks/use-app-config";
import ConfigService from "@/lib/config-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const normalizeGender = (gender?: string): "Male" | "Female" => {
  const g = (gender || "").toLowerCase().trim();
  if (g === "male" || g === "पुरुष" || g === "m") return "Male";
  return "Female";
};

const isMale = (gender: string) => normalizeGender(gender) === "Male";
const isFemale = (gender: string) => normalizeGender(gender) === "Female";

interface MayraApplication {
  id: number;
  formNumber: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gotra: string;
  address: string;
  aadharNumber: string;
  gender: string;
  applicationDate: string;
  totalAmount: number;
  nomineeName?: string;
  nomineeFathername?: string;
  nomineeHusbandName?: string;
  nomineeRelation?: string;
}

export default function AddMayraCongratsPage() {
  const router = useRouter();
  const { schemeTypes } = useSchemeTypes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [applications, setApplications] = useState<MayraApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [appSelectOpen, setAppSelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: formatDateForAPI(new Date()),
    application_id: "",
    codeNumber: "",
    mayraNumber: "",
    applicantName: "",
    fatherName: "",
    wifeOf: "",
    gotra: "",
    address: "",
    gender: "Female",
    membershipJoinDate: "",
    associatedUntil: "",
    permanentFee: "0",
    installmentAmount: "0",
    totalGrantAmount: "0",
    totalMembersServing: "0",
    rate100: "0",
    rate200: "0",
    rate300: "0",
    deductionPercent: String(ConfigService.getDeductionPercentForScheme("mayra") || 20),
    deductedAmount: "0",
    totalPaidAmount: "0"
  });

  const [dateObj, setDateObj] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoadingApps(true);
      const response = await post(API_ENDPOINTS.GET_MAYRA_APPLICATIONS, { is_active: 1 });
      if (response.data.status && response.data.data) {
        setApplications(Array.isArray(response.data.data) ? response.data.data : [response.data.data]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const fetchCongratsDetails = async (mayraId: string) => {
    if (!mayraId || !formData.date) return;
    try {
      setIsLoadingDetails(true);
      const response = await postUrlEncoded(API_ENDPOINTS.GET_MAYRA_CONGRATULATIONS_DETAILS, {
        mayra_id: mayraId,
        date: formData.date
      });

      if (response.data.status && response.data.data) {
        const detail = response.data.data;
        const app = applications.find(a => a.id.toString() === mayraId);

        // Use counts from response if available, or defaults
        const counts = response.data.counts || [];
        let r100 = 0, r200 = 0, r300 = 0;
        counts.forEach((c: any) => {
          if (c.category === 'A') r100 = c.total;
          if (c.category === 'B') r200 = c.total;
          if (c.category === 'C') r300 = c.total;
        });

        const totalEMI = response.data.totalEMI || 0;
        const totalMembers = r100 + r200 + r300;
        const grantBeforeDeduction = (r100 * 100) + (r200 * 200) + (r300 * 300);
        const deductionP = 20;
        const deductionA = Math.round((grantBeforeDeduction * deductionP) / 100);
        const finalAmount = grantBeforeDeduction - deductionA;

        const gender = normalizeGender(detail.gender || app?.gender);

        setFormData(prev => ({
          ...prev,
          mayra_id: mayraId,
          gender,
          applicantName: detail.applicantName || app?.applicantName || "",
          fatherName: isMale(gender) ? (detail.fatherName || app?.fatherName || "") : "",
          wifeOf: isFemale(gender) ? (detail.nomineeName || detail.wifeOf || "") : "",
          gotra: detail.gotra || app?.gotra || "",
          address: detail.address || app?.address || "",
          membershipJoinDate: detail.applicationDate || app?.applicationDate || "",
          permanentFee: app?.totalAmount?.toString() || "0",
          installmentAmount: totalEMI.toString(),
          totalGrantAmount: (Number(app?.totalAmount || 0) + Number(totalEMI)).toString(),
          totalMembersServing: totalMembers.toString(),
          rate100: r100.toString(),
          rate200: r200.toString(),
          rate300: r300.toString(),
          deductedAmount: deductionA.toString(),
          totalPaidAmount: finalAmount.toString(),
          associatedUntil: MAYRA_ASSOCIATION_DURATION_HI,
        }));
      }
    } catch (error) {
      console.error("Error fetching congrats details:", error);
      toast.error("Failed to load calculation details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAppSelect = (id: string) => {
    setSelectedAppId(id);
    const app = applications.find(a => a.id.toString() === id);
    if (app?.gender) {
      const gender = normalizeGender(app.gender);
      setFormData(prev => ({
        ...prev,
        gender,
        fatherName: isMale(gender) ? (app.fatherName || "") : "",
        wifeOf: isFemale(gender) ? "" : "",
      }));
    }
    fetchCongratsDetails(id);
  };

  const calculateTotals = useCallback(() => {
    const r100 = parseInt(formData.rate100) || 0;
    const r200 = parseInt(formData.rate200) || 0;
    const r300 = parseInt(formData.rate300) || 0;
    const dp =
      parseInt(formData.deductionPercent) ||
      ConfigService.getDeductionPercentForScheme("mayra") ||
      20;

    const activeSchemes = ConfigService.getSchemeTypesSync();
    const rate1 = activeSchemes[0]?.amount ?? 100;
    const rate2 = activeSchemes[1]?.amount ?? 200;
    const rate3 = activeSchemes[2]?.amount ?? 300;

    const totalMembers = r100 + r200 + r300;
    const grant = r100 * rate1 + r200 * rate2 + r300 * rate3;
    const da = Math.round((grant * dp) / 100);
    const final = grant - da;

    setFormData((prev) => ({
      ...prev,
      totalMembersServing: totalMembers.toString(),
      deductedAmount: da.toString(),
      totalPaidAmount: final.toString(),
    }));
  }, [formData.rate100, formData.rate200, formData.rate300, formData.deductionPercent]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      toast.error("Please select a Mayra application first");
      return;
    }
    setIsSubmitting(true);
    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const apiData = {
        ...formData,
        addedby,
        addedby_id
      };
      const response = await post(API_ENDPOINTS.CREATE_MAYRA_CONGRATS, apiData);
      if (response.data.status) {
        toast.success("Mayra Congratulations record added successfully");
        router.push("/dashboard/marriage-congratulations/mayra-registration");
      } else {
        toast.error(response.data.message || "Failed to add record");
      }
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="create">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.back()}>← Back</Button>
          <div>
            <h1 className="text-2xl font-bold">मायरा बधाई पत्र (Mayra Congratulations)</h1>
            <p className="text-gray-500">नया बधाई रिकॉर्ड जोड़ें</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: Selection */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>1. आवेदन चुनें (Select Application)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>दिनांक (Date)</Label>
                <div className="relative mt-1">
                  <Input value={formatDate(dateObj as any)} readOnly />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="absolute right-0 top-0 h-full px-3"><CalendarDays className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateObj}
                        onSelect={(d) => {
                          setDateObj(d);
                          setFormData(p => ({ ...p, date: formatDateForAPI(d as any) }));
                          setDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>मायरा आवेदन (Mayra Application)</Label>
                <ComboboxPopover open={appSelectOpen} onOpenChange={setAppSelectOpen}>
                  <ComboboxPopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between mt-1 h-auto py-2 text-left bg-gray-50"
                      disabled={isLoadingApps}
                    >
                      {selectedAppId ? (
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-medium truncate">
                            {applications.find(a => a.id.toString() === selectedAppId)?.applicantName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {applications.find(a => a.id.toString() === selectedAppId)?.formNumber}
                          </span>
                        </div>
                      ) : "आवेदक खोजें / Search Applicant"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </ComboboxPopoverTrigger>
                  <ComboboxPopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="नाम या फॉर्म नंबर से खोजें..." />
                      <CommandList>
                        <CommandEmpty>कोई आवेदन नहीं मिला</CommandEmpty>
                        <CommandGroup>
                          {applications.map((app) => (
                            <CommandItem
                              key={app.id}
                              value={`${app.applicantName} ${app.formNumber}`}
                              onSelect={() => {
                                handleAppSelect(app.id.toString());
                                setAppSelectOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedAppId === app.id.toString() ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{app.applicantName}</span>
                                <span className="text-xs text-gray-400">{app.formNumber} | {app.fatherName}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </ComboboxPopoverContent>
                </ComboboxPopover>
              </div>
              {isLoadingDetails && <div className="flex items-center gap-2 text-sm text-orange-600"><Loader2 className="h-4 w-4 animate-spin" /> ब्यौरा लोड हो रहा है...</div>}
            </CardContent>
          </Card>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">विवरण (Basic Details)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>कोड नंबर</Label>
                  <Input value={formData.codeNumber} onChange={e=>setFormData(p=>({...p, codeNumber: e.target.value}))} placeholder="Code Number" />
                </div>
                <div className="space-y-1">
                  <Label>मायरा नंबर (Mayra Number)</Label>
                  <Input value={formData.mayraNumber} onChange={e=>setFormData(p=>({...p, mayraNumber: e.target.value}))} placeholder="e.g. BMF-001" />
                </div>
                <div className="space-y-1">
                  <Label>लिंग / Gender</Label>
                  <Select
                    value={normalizeGender(formData.gender)}
                    onValueChange={(value) =>
                      setFormData(p => ({
                        ...p,
                        gender: value,
                        fatherName: value === "Male" ? p.fatherName : "",
                        wifeOf: value === "Female" ? p.wifeOf : "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="लिंग चुनें / Select Gender" />
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
                <div className="space-y-1">
                  <Label>आवेदक का नाम</Label>
                  <Input value={formData.applicantName} onChange={e=>setFormData(p=>({...p, applicantName: e.target.value}))} />
                </div>
                {isMale(formData.gender) && (
                  <div className="space-y-1">
                    <Label>पिता का नाम</Label>
                    <Input value={formData.fatherName} onChange={e=>setFormData(p=>({...p, fatherName: e.target.value}))} />
                  </div>
                )}
                {isFemale(formData.gender) && (
                  <div className="space-y-1">
                    <Label>पति का नाम / Husband Name</Label>
                    <Input value={formData.wifeOf} onChange={e=>setFormData(p=>({...p, wifeOf: e.target.value}))} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>गोत्र</Label>
                  <Input value={formData.gotra} onChange={e=>setFormData(p=>({...p, gotra: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>निवासी</Label>
                  <Input value={formData.address} onChange={e=>setFormData(p=>({...p, address: e.target.value}))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">सदस्यता एवं वित्तीय विवरण (Financials)</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>सदस्यता तिथि</Label>
                    <Input value={formData.membershipJoinDate} readOnly className="bg-gray-50" />
                  </div>
                  <div className="space-y-1">
                    <Label>संस्था से जुड़ाव</Label>
                    <Input value={formData.associatedUntil} readOnly className="bg-gray-50" />
                  </div>
                  <div className="space-y-1">
                    <Label>स्थायी शुल्क (Permanent Fee)</Label>
                    <Input value={formData.permanentFee} readOnly className="bg-gray-50" />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-700">किस्त राशि (Installment Amount)</Label>
                    <Input value={formData.installmentAmount} readOnly className="bg-white border-blue-200" />
                  </div>
                  <div>
                    <Label className="text-blue-700">कुल अनुदान (Total Grant)</Label>
                    <Input value={formData.totalGrantAmount} readOnly className="bg-white border-blue-200 font-bold" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">गणना (Calculation)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {schemeTypes && schemeTypes.length > 0 ? (
                      schemeTypes.slice(0, 3).map((scheme, idx) => {
                        const fieldKey = idx === 0 ? "rate100" : idx === 1 ? "rate200" : "rate300";
                        const letter = idx === 0 ? "A" : idx === 1 ? "B" : "C";
                        return (
                          <div className="space-y-1" key={scheme.id || idx}>
                            <Label>₹{scheme.amount}x Count ({letter})</Label>
                            <Input
                              type="number"
                              value={(formData as any)[fieldKey]}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, [fieldKey]: e.target.value }))
                              }
                            />
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label>100x Count (A)</Label>
                          <Input
                            type="number"
                            value={formData.rate100}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, rate100: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>200x Count (B)</Label>
                          <Input
                            type="number"
                            value={formData.rate200}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, rate200: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>300x Count (C)</Label>
                          <Input
                            type="number"
                            value={formData.rate300}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, rate300: e.target.value }))
                            }
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-1">
                      <Label>Total Serving</Label>
                      <Input value={formData.totalMembersServing} readOnly className="bg-gray-50" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <Label>कटौती % (Deduction)</Label>
                    <Input type="number" value={formData.deductionPercent} onChange={e=>setFormData(p=>({...p, deductionPercent: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>कटौती राशि</Label>
                    <Input value={formData.deductedAmount} readOnly className="bg-gray-50" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-orange-600 font-bold">कुल भुगतान (Final Paid)</Label>
                    <Input value={formData.totalPaidAmount} readOnly className="bg-orange-50 border-orange-200 font-bold text-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 h-12 text-lg" disabled={isSubmitting || !selectedAppId}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "सहेजें (Save Record)"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </RoleGuard>
  );
}
