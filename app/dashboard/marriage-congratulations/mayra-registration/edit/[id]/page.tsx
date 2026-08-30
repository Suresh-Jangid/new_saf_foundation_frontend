"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GENDER_OPTIONS } from "@/lib/form-values"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, Loader2 } from "lucide-react";
import { cn, formatDate, formatDateForAPI, parseDateFromDDMMYYYY, getCurrentUserInfo, MAYRA_ASSOCIATION_DURATION_HI } from "@/lib/utils";
import { API_ENDPOINTS, post, postUrlEncoded } from "@/lib/api";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
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

export default function EditMayraCongratsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    date: "",
    codeNumber: "",
    mayraNumber: "",
    applicantName: "",
    fatherName: "",
    wifeOf: "",
    gotra: "",
    address: "",
    membershipJoinDate: "",
    associatedUntil: MAYRA_ASSOCIATION_DURATION_HI,
    permanentFee: "0",
    installmentAmount: "0",
    totalGrantAmount: "0",
    totalMembersServing: "0",
    rate100: "0",
    rate200: "0",
    rate300: "0",
    deductionPercent: "20",
    deductedAmount: "0",
    totalPaidAmount: "0",
    gender: "Female",
    mayra_id: "",
  });

  const [dateObj, setDateObj] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsFetching(true);
      const response = await postUrlEncoded(API_ENDPOINTS.GET_MAYRA_CONGRATS, { id });
      if (response.data.status && response.data.data) {
        const record = Array.isArray(response.data.data) 
          ? response.data.data.find((r: any) => r.id.toString() === id.toString()) 
          : response.data.data;
        
        if (record) {
          setFormData({
            date: record.date || "",
            codeNumber: record.codeNumber || "",
            mayraNumber: record.mayraNumber || "",
            applicantName: record.applicantName || "",
            fatherName: record.fatherName || "",
            wifeOf: record.wifeOf || "",
            gotra: record.gotra || "",
            address: record.address || "",
            membershipJoinDate: record.membershipJoinDate || "",
            associatedUntil: record.associatedUntil || MAYRA_ASSOCIATION_DURATION_HI,
            permanentFee: record.permanentFee || "0",
            installmentAmount: record.installmentAmount || "0",
            totalGrantAmount: record.totalGrantAmount || "0",
            totalMembersServing: record.totalMembersServing?.toString() || "0",
            rate100: record.rate100?.toString() || "0",
            rate200: record.rate200?.toString() || "0",
            rate300: record.rate300?.toString() || "0",
            deductionPercent: record.deductionPercent || "20",
            deductedAmount: record.deductedAmount || "0",
            totalPaidAmount: record.totalPaidAmount || "0",
            gender: normalizeGender(record.gender),
            mayra_id: record.mayra_id?.toString() || "",
          });
          if (record.date) {
            const d = new Date(record.date);
            setDateObj(d);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching record:", error);
      toast.error("Failed to load record");
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateTotals = useCallback(() => {
    const r100 = parseInt(formData.rate100) || 0;
    const r200 = parseInt(formData.rate200) || 0;
    const r300 = parseInt(formData.rate300) || 0;
    const dp = parseInt(formData.deductionPercent) || 20;

    const totalMembers = r100 + r200 + r300;
    const grant = (r100 * 100) + (r200 * 200) + (r300 * 300);
    const da = Math.round((grant * dp) / 100);
    const final = grant - da;

    setFormData(prev => ({
      ...prev,
      totalMembersServing: totalMembers.toString(),
      deducedAmount: da.toString(),
      totalPaidAmount: final.toString()
    }));
  }, [formData.rate100, formData.rate200, formData.rate300, formData.deductionPercent]);

  useEffect(() => {
    if (!isFetching) calculateTotals();
  }, [calculateTotals, isFetching]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { addedby, addedby_id } = getCurrentUserInfo();
      const apiData = {
        ...formData,
        id, // Include ID for update
        addedby,
        addedby_id
      };
      const response = await post(API_ENDPOINTS.UPDATE_MAYRA_CONGRATS, apiData);
      if (response.data.status) {
        toast.success("Mayra Congratulations record updated successfully");
        router.push("/dashboard/marriage-congratulations/mayra-registration");
      } else {
        toast.error(response.data.message || "Failed to update record");
      }
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="update">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.back()}>← Back</Button>
          <div>
            <h1 className="text-2xl font-bold">मायरा बधाई पत्र संपादित करें (Edit Mayra Congratulations)</h1>
            <p className="text-gray-500">Record ID: {id}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>जानकारी (Selection)</CardTitle></CardHeader>
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
                  <Label>मायरा आईडी (Mayra ID)</Label>
                  <Input value={formData.mayraNumber} readOnly className="mt-1 bg-gray-50" />
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">विवरण (Basic Details)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>कोड नंबर</Label>
                    <Input value={formData.codeNumber} onChange={e=>setFormData(p=>({...p, codeNumber: e.target.value}))} />
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
                <CardHeader><CardTitle className="text-lg">गणना (Financials)</CardTitle></CardHeader>
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
                      <Label>स्थायी शुल्क</Label>
                      <Input value={formData.permanentFee} readOnly className="bg-gray-50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
                    <div className="space-y-1">
                      <Label>100x (A)</Label>
                      <Input type="number" value={formData.rate100} onChange={e=>setFormData(p=>({...p, rate100: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label>200x (B)</Label>
                      <Input type="number" value={formData.rate200} onChange={e=>setFormData(p=>({...p, rate200: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label>300x (C)</Label>
                      <Input type="number" value={formData.rate300} onChange={e=>setFormData(p=>({...p, rate300: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Total Serving</Label>
                      <Input value={formData.totalMembersServing} readOnly className="bg-gray-50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    <div className="space-y-1">
                      <Label>कटौती %</Label>
                      <Input type="number" value={formData.deductionPercent} onChange={e=>setFormData(p=>({...p, deductionPercent: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label>कुल भुगतान</Label>
                      <Input value={formData.totalPaidAmount} readOnly className="bg-orange-50 font-bold border-orange-200" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 h-12" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "अपडेट करें (Update Record)"}
                </Button>
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => router.back()}>Cancel</Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
