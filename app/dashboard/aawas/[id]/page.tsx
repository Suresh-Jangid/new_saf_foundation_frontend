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
import { toast } from "sonner";
import {
  Home,
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
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { AawasService, AawasRegistration } from "@/lib/aawas-service";
import { formatDate } from "@/lib/utils";

export default function AawasDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [record, setRecord] = useState<AawasRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Installment Modal State
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("1000");
  const [installmentDate, setInstallmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [installmentNote, setInstallmentNote] = useState("");
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState("CASH");
  const [isSubmittingInstallment, setIsSubmittingInstallment] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await AawasService.getRegistrationById(id);
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

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    const amt = Number(installmentAmount);
    if (!amt || amt <= 0) {
      toast.error("कृपया वैध राशि दर्ज करें / Enter a valid positive amount");
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await AawasService.addInstallment(record.id, {
        amount: amt,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setInstallmentAmount("1000");
      setInstallmentNote("");
      fetchRecord();
    } catch (err: any) {
      toast.error(err.message || "किश्त दर्ज करने में त्रुटि / Failed to add installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0B4A8F]" />
        <span className="text-sm text-muted-foreground">आवास विवरण लोड हो रहा है... / Loading details...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          रिकॉर्ड नहीं मिला / Record Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          यह आवास आवेदन उपलब्ध नहीं है या हटा दिया गया है।
        </p>
        <Button onClick={() => router.push("/dashboard/aawas")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          वापस सूची पर जाएं / Back to Listing
        </Button>
      </div>
    );
  }

  const totalBenefit = Number(record.totalAmount) || 15000;
  const pendingAmount = Number(record.pendingAmount) || 0;
  const paidAmount = Math.max(0, totalBenefit - pendingAmount);

  return (
    <RoleGuard requiredModule="aawas" requiredAction="view">
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/aawas")}
              className="h-9 w-9 p-0 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  {record.applicantName}
                </h1>
                <Badge className="bg-[#0B4A8F] text-white">
                  फॉर्म: {record.formNumber}
                </Badge>
                {record.epinCode && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                    E-PIN: {record.epinCode}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                आवेदन तिथि: {record.applicationDate ? formatDate(new Date(record.applicationDate)) : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecord}
              className="gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              रीफ़्रेश
            </Button>
            <Button
              size="sm"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-semibold"
            >
              <Receipt className="h-4 w-4" />
              किश्त जमा करें / Add Installment
            </Button>
          </div>
        </div>

        {/* Financial Scheme Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                कुल योजना अनुदान (Total Scheme Benefit)
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-[#0B4A8F] dark:text-blue-400">
                ₹{totalBenefit.toLocaleString("en-IN")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">गृह प्रवेश आवास योजना</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                जमा राशि (Total Received)
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                ₹{paidAmount.toLocaleString("en-IN")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {record.installments?.length || 0} किश्तें दर्ज
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                बकाया राशि (Pending Amount)
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600">
                ₹{pendingAmount.toLocaleString("en-IN")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">मानक किश्त: ₹1,000</p>
            </CardContent>
          </Card>
        </div>

        {/* Applicant & Housing Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Applicant Personal Information */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <User className="h-4 w-4 text-[#0B4A8F]" />
                आवेदक विवरण (Applicant Details)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground block">आवेदक का नाम:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{record.applicantName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">पिता का नाम:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{record.fatherName}</span>
                </div>
                {record.husbandName && (
                  <div>
                    <span className="text-xs text-muted-foreground block">पति का नाम:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{record.husbandName}</span>
                  </div>
                )}
                {record.motherName && (
                  <div>
                    <span className="text-xs text-muted-foreground block">माता का नाम:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{record.motherName}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground block">लिंग व श्रेणी:</span>
                  <span>{record.gender || "—"} • वर्ग {record.category || "A"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">गोत्र:</span>
                  <span>{record.gotra || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">आधार नंबर:</span>
                  <span className="font-mono">
                    XXXX-XXXX-{record.aadharNumber ? record.aadharNumber.slice(-4) : "XXXX"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">मोबाइल नंबर:</span>
                  <span className="font-mono">{record.mobile}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">आयु:</span>
                  <span>{record.age ? `${record.age} वर्ष` : "—"} (कोई आयु सीमा नहीं)</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">जन्म तिथि:</span>
                  <span>{record.dateOfBirth ? formatDate(new Date(record.dateOfBirth)) : "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Housing Details */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <MapPin className="h-4 w-4 text-[#0B4A8F]" />
                आवासीय व स्थान विवरण (Housing & Location)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground block">स्थाई पता:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{record.address}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-xs text-muted-foreground block">जिला:</span>
                    <span className="font-semibold">{record.district}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">तहसील:</span>
                    <span>{record.tehsil}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">पिन कोड:</span>
                    <span className="font-mono">{record.pinCode}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">राज्य:</span>
                    <span>{record.state || "राजस्थान"}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground block">मकान का प्रकार / वर्तमान स्थिति:</span>
                  <Badge variant="outline" className="mt-1 bg-slate-100 dark:bg-slate-800 font-normal">
                    {record.houseType || "कच्चा मकान (Kaccha House)"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nominee & Supporting Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Users className="h-4 w-4 text-[#0B4A8F]" />
                नामांकित व्यक्ति विवरण (Nominee Information)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground block">नॉमिनी नाम:</span>
                  <span className="font-semibold">{record.nomineeName || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">संबंध:</span>
                  <span>{record.nomineeRelation || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">नॉमिनी मोबाइल:</span>
                  <span className="font-mono">{record.nomineeMobile || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">नॉमिनी आधार:</span>
                  <span className="font-mono">
                    {record.nomineeAadhar ? `XXXX-XXXX-${record.nomineeAadhar.slice(-4)}` : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Shield className="h-4 w-4 text-[#0B4A8F]" />
                पंजीकरण व एजेंट ऑडिट (Audit & Agent Info)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground block">पंजीकृत द्वारा (Added By):</span>
                  <span>{record.addedBy?.name || "अधिकृत एजेंट / एडमिन"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">सिस्टम ID:</span>
                  <span className="font-mono text-xs">{record.id}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">निर्मित तिथि:</span>
                  <span className="text-xs">{record.createdAt ? formatDate(new Date(record.createdAt)) : "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">अद्यतन तिथि:</span>
                  <span className="text-xs">{record.updatedAt ? formatDate(new Date(record.updatedAt)) : "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installments History Table */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Receipt className="h-4 w-4 text-emerald-600" />
              किश्त भुगतान इतिहास (Installments Payment History)
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="text-xs"
            >
              + नई किश्त जोड़ें
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-slate-100 dark:bg-slate-800 border-b">
                  <tr>
                    <th className="px-4 py-2.5">क्र.सं. (S.No.)</th>
                    <th className="px-4 py-2.5">भुगतान तिथि (Date)</th>
                    <th className="px-4 py-2.5">माध्यम (Mode)</th>
                    <th className="px-4 py-2.5">रसीद / विवरण (Note)</th>
                    <th className="px-4 py-2.5 text-right">राशि (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(!record.installments || record.installments.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                        अभी तक कोई किश्त भुगतान दर्ज नहीं हुआ है।
                      </td>
                    </tr>
                  ) : (
                    record.installments.map((inst, index) => (
                      <tr key={inst.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold">{index + 1}</td>
                        <td className="px-4 py-3 text-xs">
                          {inst.date ? formatDate(new Date(inst.date)) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[11px]">
                            {inst.paymentMode || "CASH"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {inst.note || inst.rashidNumber || "किश्त भुगतान"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          ₹{Number(inst.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Installment Record Modal */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-emerald-600" />
                किश्त भुगतान दर्ज करें (Record Installment)
              </DialogTitle>
              <DialogDescription>
                आवेदक: <span className="font-semibold text-gray-900">{record.applicantName}</span> (फॉर्म: {record.formNumber})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddInstallment} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="instAmt">किश्त राशि (Amount) *</Label>
                <Input
                  id="instAmt"
                  type="number"
                  required
                  min="1"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="1000"
                />
                <p className="text-[11px] text-muted-foreground">योजना मानक किश्त: ₹1,000</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instDate">भुगतान तिथि (Date) *</Label>
                <Input
                  id="instDate"
                  type="date"
                  required
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instMode">भुगतान माध्यम (Payment Mode) *</Label>
                <select
                  id="instMode"
                  value={installmentPaymentMode}
                  onChange={(e) => setInstallmentPaymentMode(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CASH">नकद (Cash)</option>
                  <option value="ONLINE">ऑनलाइन (Online)</option>
                  <option value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instNote">टिप्पणी / विवरण (Remarks / Note)</Label>
                <Input
                  id="instNote"
                  value={installmentNote}
                  onChange={(e) => setInstallmentNote(e.target.value)}
                  placeholder="रसीद नंबर या विवरण..."
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInstallmentModalOpen(false)}
                  disabled={isSubmittingInstallment}
                >
                  रद्द करें / Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingInstallment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmittingInstallment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      दर्ज हो रहा है...
                    </>
                  ) : (
                    "किश्त जमा करें / Save Installment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
