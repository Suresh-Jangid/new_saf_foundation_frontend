"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Shield,
  CreditCard,
  KeyRound,
  Receipt,
  RefreshCw,
  Clock,
  CheckCircle2,
  Users,
  Building,
  FileText,
  DollarSign,
  Heart,
  Plus,
  Info,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  LadoBahinService,
  LadoBahinRegistration,
  LadoBahinInstallment,
  LadoBahinAccountType,
} from "@/lib/lado-bahin-service";
import { formatDate } from "@/lib/utils";

export default function LadoBahinDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [record, setRecord] = useState<LadoBahinRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Installment Modal State
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedAccountType, setSelectedAccountType] =
    useState<LadoBahinAccountType>("LADO_BAHIN_300");
  const [installmentAmount, setInstallmentAmount] = useState<number>(300);
  const [installmentDate, setInstallmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [installmentRashidNumber, setInstallmentRashidNumber] = useState("");
  const [installmentNote, setInstallmentNote] = useState("");
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState("CASH");
  const [isSubmittingInstallment, setIsSubmittingInstallment] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await LadoBahinService.getRegistrationById(id);
      if (res && res.data) {
        setRecord(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "विवरण लोड करने में विफल / Failed to load details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Handle Account Type Change in Installment Modal
  const handleAccountTypeChange = (accType: LadoBahinAccountType) => {
    setSelectedAccountType(accType);
    if (accType === "LADO_BAHIN_300") {
      setInstallmentAmount(300);
    } else {
      setInstallmentAmount(1000);
    }
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    const expectedAmount = selectedAccountType === "LADO_BAHIN_300" ? 300 : 1000;
    if (Number(installmentAmount) !== expectedAmount) {
      toast.error(
        `Account ${selectedAccountType} requires exact amount ₹${expectedAmount} / इस खाते के लिए ₹${expectedAmount} निर्धारित है`
      );
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await LadoBahinService.addInstallment(record.id, {
        accountType: selectedAccountType,
        amount: expectedAmount,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        rashidNumber: installmentRashidNumber || undefined,
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setInstallmentRashidNumber("");
      setInstallmentNote("");
      fetchRecord();
    } catch (err: any) {
      toast.error(err.message || "किश्त दर्ज करने में त्रुटि / Failed to record installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="h-8 w-8 animate-spin text-pink-600" />
        <span className="text-sm text-muted-foreground">
          लाडो बहिन विवरण लोड हो रहा है... / Loading details...
        </span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          आवेदन नहीं मिला / Record Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          अनुरोधित लाडो बहिन रिकॉर्ड उपलब्ध नहीं है या हटा दिया गया है।
        </p>
        <Button onClick={() => router.push("/dashboard/lado-bahin")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> वापस सूची पर जाएं / Back to List
        </Button>
      </div>
    );
  }

  // Filter installments into separate account histories
  const installments300: LadoBahinInstallment[] = (record.installments || []).filter(
    (inst) => inst.accountType === "LADO_BAHIN_300" || inst.amount === 300
  );
  const installments1000: LadoBahinInstallment[] = (record.installments || []).filter(
    (inst) => inst.accountType === "LADO_BAHIN_1000" || inst.amount === 1000
  );

  // Compute or read ledger balances
  const acc300Paid =
    record.account300Paid !== undefined
      ? record.account300Paid
      : installments300.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const acc300Pending =
    record.account300Pending !== undefined
      ? record.account300Pending
      : Math.max(0, (record.account300Total || 0) - acc300Paid);

  const acc1000Paid =
    record.account1000Paid !== undefined
      ? record.account1000Paid
      : installments1000.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const acc1000Pending =
    record.account1000Pending !== undefined
      ? record.account1000Pending
      : Math.max(0, (record.account1000Total || 0) - acc1000Paid);

  return (
    <RoleGuard requiredModule="lado_bahin" requiredAction="view">
      <div className="space-y-6 p-4 md:p-6 pb-16 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/lado-bahin")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-pink-600">
                  {record.formNumber}
                </span>
                <Badge variant="outline" className="bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-300">
                  LADO_BAHIN
                </Badge>
                {record.epinCode && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> E-PIN: {record.epinCode}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                {record.applicantName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecord()}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              <span>रिफ्रेश / Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>किश्त दर्ज करें / Add Installment</span>
            </Button>
          </div>
        </div>

        {/* Financial Highlights: Fixed Membership Fee + Dual Separate Ledgers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Fixed Membership Grant Fee */}
          <Card className="border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                सदस्यता अनुदान शुल्क / Membership Fee
              </CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹5,100
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                स्थिर अनुदान राशि (Fixed Non-Age-Based)
              </p>
            </CardContent>
          </Card>

          {/* Card 2: ₹300 Account Ledger */}
          <Card className="border-border/60 shadow-sm bg-card border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ₹300 खाता लेजर / Account 300
              </CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">जमा (Paid)</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{acc300Paid.toLocaleString("hi-IN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">शेष (Pending)</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    ₹{acc300Pending.toLocaleString("hi-IN")}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                कुल किश्तें: {installments300.length} • LADO_BAHIN_300
              </p>
            </CardContent>
          </Card>

          {/* Card 3: ₹1,000 Account Ledger */}
          <Card className="border-border/60 shadow-sm bg-card border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ₹1,000 खाता लेजर / Account 1000
              </CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">जमा (Paid)</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{acc1000Paid.toLocaleString("hi-IN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">शेष (Pending)</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    ₹{acc1000Pending.toLocaleString("hi-IN")}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                कुल किश्तें: {installments1000.length} • LADO_BAHIN_1000
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal & Application Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Applicant Personal Information */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-pink-600" />
                <span>व्यक्तिगत विवरण / Applicant Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4 pb-4 border-b border-border/60">
                {record.passportPhotoUrl ? (
                  <img
                    src={record.passportPhotoUrl}
                    alt={record.applicantName}
                    className="h-20 w-20 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-muted border flex items-center justify-center text-muted-foreground text-xs text-center p-1">
                    No Photo
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-base font-bold text-foreground">
                    {record.applicantName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    पिता: {record.fatherName}
                  </div>
                  {record.husbandName && (
                    <div className="text-xs text-muted-foreground">
                      पति: {record.husbandName}
                    </div>
                  )}
                  {record.motherName && (
                    <div className="text-xs text-muted-foreground">
                      माता: {record.motherName}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-muted-foreground">मोबाइल नंबर:</span>
                  <div className="font-semibold text-foreground mt-0.5">{record.mobile}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">आधार कार्ड नंबर:</span>
                  <div className="font-mono font-semibold text-foreground mt-0.5">
                    {record.aadharNumber ? `XXXX-XXXX-${record.aadharNumber.slice(-4)}` : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">गोत्र (Gotra):</span>
                  <div className="font-semibold text-foreground mt-0.5">{record.gotra}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">वर्ग (Category):</span>
                  <div className="font-semibold text-foreground mt-0.5">Category {record.category}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">लिंग (Gender):</span>
                  <div className="font-semibold text-foreground mt-0.5">{record.gender}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">आयु (Age):</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {record.age ? `${record.age} वर्ष` : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">मुकलावा दिनांक:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {record.muklawaDate ? formatDate(record.muklawaDate) : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">आवेदन दिनांक:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {formatDate(record.applicationDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Location & Nominee Details */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-pink-600" />
                <span>निवास एवं नॉमिनी विवरण / Address & Nominee</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Address Section */}
              <div>
                <span className="text-xs text-muted-foreground">स्थाई निवास पता:</span>
                <div className="text-xs font-semibold text-foreground mt-0.5">
                  {record.address}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  तहसील: <strong className="text-foreground">{record.tehsil}</strong> • जिला:{" "}
                  <strong className="text-foreground">{record.district}</strong> • पिन:{" "}
                  <strong className="text-foreground">{record.pinCode}</strong> ({record.state})
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-1.5 mb-2">
                  <Users className="h-3.5 w-3.5" /> नॉमिनी (वारिसदार) विवरण:
                </span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">नॉमिनी का नाम:</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {record.nomineeName || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">संबंध (Relation):</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {record.nomineeRelation || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">नॉमिनी मोबाइल:</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {record.nomineeMobile || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">नॉमिनी आधार:</span>
                    <div className="font-mono font-semibold text-foreground mt-0.5">
                      {record.nomineeAadhar ? `XXXX-XXXX-${record.nomineeAadhar.slice(-4)}` : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Added By / Audit Info */}
              {record.addedBy && (
                <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>
                    पंजीकृत द्वारा: <strong className="text-foreground">{record.addedBy.name}</strong> ({record.addedBy.mobile})
                  </span>
                  <span>दिनांक: {formatDate(record.createdAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Separate Installment Histories Tabs */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  किश्त भुगतान इतिहास / Installment Payment History
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  ₹300 एवं ₹1,000 खातों का पृथक विवरण / Independent ledger payment logs
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInstallmentModalOpen(true)}
                className="gap-1 text-xs border-pink-300 text-pink-700 hover:bg-pink-50"
              >
                <Plus className="h-3.5 w-3.5" /> किश्त दर्ज करें / Add Installment
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs defaultValue="account300" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="account300" className="text-xs font-semibold gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <span>₹300 खाता किश्तें ({installments300.length})</span>
                </TabsTrigger>
                <TabsTrigger value="account1000" className="text-xs font-semibold gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span>₹1,000 खाता किश्तें ({installments1000.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: ₹300 Installments */}
              <TabsContent value="account300">
                {installments300.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                    <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <div>₹300 खाते में अभी तक कोई किश्त दर्ज नहीं की गई है।</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-2.5">क्र.सं. / S.No</th>
                          <th className="px-4 py-2.5">भुगतान दिनांक / Date</th>
                          <th className="px-4 py-2.5">किश्त राशि / Amount</th>
                          <th className="px-4 py-2.5">रसीद संख्या / Rashid No</th>
                          <th className="px-4 py-2.5">माध्यम / Mode</th>
                          <th className="px-4 py-2.5">टिप्पणी / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {installments300.map((inst, idx) => (
                          <tr key={inst.id || idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-xs font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 text-xs">{formatDate(inst.date)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-blue-600 dark:text-blue-400">
                              ₹{inst.amount.toLocaleString("hi-IN")}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {inst.rashidNumber || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <Badge variant="outline" className="text-[11px]">
                                {inst.paymentMode}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {inst.note || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: ₹1,000 Installments */}
              <TabsContent value="account1000">
                {installments1000.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                    <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <div>₹1,000 खाते में अभी तक कोई किश्त दर्ज नहीं की गई है।</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-2.5">क्र.सं. / S.No</th>
                          <th className="px-4 py-2.5">भुगतान दिनांक / Date</th>
                          <th className="px-4 py-2.5">किश्त राशि / Amount</th>
                          <th className="px-4 py-2.5">रसीद संख्या / Rashid No</th>
                          <th className="px-4 py-2.5">माध्यम / Mode</th>
                          <th className="px-4 py-2.5">टिप्पणी / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {installments1000.map((inst, idx) => (
                          <tr key={inst.id || idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-xs font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 text-xs">{formatDate(inst.date)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-purple-600 dark:text-purple-400">
                              ₹{inst.amount.toLocaleString("hi-IN")}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {inst.rashidNumber || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <Badge variant="outline" className="text-[11px]">
                                {inst.paymentMode}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {inst.note || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Add Installment Modal */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-pink-600" />
                <span>लाडो बहिन किश्त भुगतान दर्ज करें</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                आवेदिका: <strong className="text-foreground">{record.applicantName}</strong> (फॉर्म नं: {record.formNumber})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddInstallment} className="space-y-4 pt-2">
              {/* Account Type Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  खाता चुनें / Select Account <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange("LADO_BAHIN_300")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedAccountType === "LADO_BAHIN_300"
                        ? "border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 ring-2 ring-blue-500/20"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">₹300 खाता</div>
                    <div className="text-sm font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">₹300 / किश्त</div>
                    <div className="text-[10px] text-muted-foreground mt-1">LADO_BAHIN_300</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange("LADO_BAHIN_1000")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedAccountType === "LADO_BAHIN_1000"
                        ? "border-purple-500 bg-purple-50/50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 ring-2 ring-purple-500/20"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">₹1,000 खाता</div>
                    <div className="text-sm font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">₹1,000 / किश्त</div>
                    <div className="text-[10px] text-muted-foreground mt-1">LADO_BAHIN_1000</div>
                  </button>
                </div>
              </div>

              {/* Installment Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="detailInstAmount" className="text-xs font-semibold">
                  किश्त राशि / Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="detailInstAmount"
                    type="number"
                    value={installmentAmount}
                    readOnly
                    className="bg-muted font-bold text-foreground"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    नियत राशि (Fixed)
                  </span>
                </div>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label htmlFor="detailInstDate" className="text-xs font-semibold">
                  भुगतान दिनांक / Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="detailInstDate"
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="detailInstMode" className="text-xs font-semibold">
                  भुगतान माध्यम / Payment Mode <span className="text-destructive">*</span>
                </Label>
                <select
                  id="detailInstMode"
                  value={installmentPaymentMode}
                  onChange={(e) => setInstallmentPaymentMode(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CASH">नकद (Cash)</option>
                  <option value="ONLINE">ऑनलाइन (Online / UPI)</option>
                  <option value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</option>
                  <option value="CHEQUE">चेक (Cheque)</option>
                </select>
              </div>

              {/* Rashid Number */}
              <div className="space-y-1.5">
                <Label htmlFor="detailRashidNo" className="text-xs font-semibold">
                  रसीद संख्या / Receipt / Rashid Number (Optional)
                </Label>
                <Input
                  id="detailRashidNo"
                  placeholder="e.g. R-2026-XXXX"
                  value={installmentRashidNumber}
                  onChange={(e) => setInstallmentRashidNumber(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="detailInstNote" className="text-xs font-semibold">
                  टिप्पणी / Remarks (Optional)
                </Label>
                <Input
                  id="detailInstNote"
                  placeholder="टिप्पणी दर्ज करें..."
                  value={installmentNote}
                  onChange={(e) => setInstallmentNote(e.target.value)}
                  className="text-sm"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInstallmentModalOpen(false)}
                  disabled={isSubmittingInstallment}
                >
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingInstallment}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {isSubmittingInstallment ? "सहेज रहे हैं..." : "किश्त दर्ज करें / Submit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
