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
  Gift,
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
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  DhundhotsavService,
  DhundhotsavRegistration,
  DhundhotsavInstallment,
} from "@/lib/dhundhotsav-service";
import { formatDate } from "@/lib/utils";

export default function DhundhotsavDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [record, setRecord] = useState<DhundhotsavRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Installment Modal State (Single Ledger: ₹300 Fixed)
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
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
      const res = await DhundhotsavService.getRegistrationById(id);
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

    if (Number(installmentAmount) !== 300) {
      toast.error("ढूंढोत्सव योजना के लिए किश्त राशि ₹300 निर्धारित है / Installment amount must be exactly ₹300");
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await DhundhotsavService.addInstallment(record.id, {
        amount: 300,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        rashidNumber: installmentRashidNumber || undefined,
        note: installmentNote || undefined,
      });

      toast.success("₹300 किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
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
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
        <span className="text-sm text-muted-foreground">
          ढूंढोत्सव विवरण लोड हो रहा है... / Loading details...
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
          अनुरोधित ढूंढोत्सव रिकॉर्ड उपलब्ध नहीं है या हटा दिया गया है।
        </p>
        <Button onClick={() => router.push("/dashboard/dhundhotsav")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> वापस सूची पर जाएं / Back to List
        </Button>
      </div>
    );
  }

  const installments: DhundhotsavInstallment[] = record.installments || [];
  const totPaid =
    record.paidAmount !== undefined
      ? record.paidAmount
      : installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totPending =
    record.pendingAmount !== undefined
      ? record.pendingAmount
      : Math.max(0, (record.totalAmount || 5100) - totPaid);

  return (
    <RoleGuard requiredModule="dhundhotsav" requiredAction="view">
      <div className="space-y-6 p-4 md:p-6 pb-16 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/dhundhotsav")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-amber-600">
                  {record.formNumber}
                </span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                  DHUNDHOTSAV
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                  MALE_POOL
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
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>₹300 किश्त दर्ज करें / Add Installment</span>
            </Button>
          </div>
        </div>

        {/* Single Ledger Financial Highlights */}
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

          {/* Card 2: Total Paid (Single Ledger) */}
          <Card className="border-border/60 shadow-sm bg-card border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                कुल जमा राशि / Total Paid
              </CardTitle>
              <Receipt className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totPaid.toLocaleString("hi-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                कुल किश्तें: {installments.length} (₹300 किश्त लेजर)
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Total Pending (Single Ledger) */}
          <Card className="border-border/60 shadow-sm bg-card border-l-4 border-l-rose-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                कुल शेष राशि / Total Pending
              </CardTitle>
              <CreditCard className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                ₹{totPending.toLocaleString("hi-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ढूंढोत्सव एकल लेजर शेष राशि
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal & Location Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Applicant Personal Information */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600" />
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
                      पति/अभिभावक: {record.husbandName}
                    </div>
                  )}
                  {record.motherName && (
                    <div className="text-xs text-muted-foreground">
                      माता: {record.motherName}
                    </div>
                  )}
                  {record.childName && (
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      बालक/बच्चा: {record.childName}
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
                  <span className="text-muted-foreground">ढूंढ दिनांक:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {record.dhundhDate ? formatDate(record.dhundhDate) : "-"}
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
                <MapPin className="h-4 w-4 text-amber-600" />
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
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-2">
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

        {/* Single Installment History Table (No Dual Tabs) */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  <span>किश्त भुगतान इतिहास (₹300 एकल लेजर) / Installment Payment History</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  ढूंढोत्सव ₹300 निर्धारित किश्त भुगतान रिकॉर्ड / Payment logs
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInstallmentModalOpen(true)}
                className="gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Plus className="h-3.5 w-3.5" /> ₹300 किश्त दर्ज करें / Add Installment
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {installments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div>ढूंढोत्सव खाते में अभी तक कोई किश्त दर्ज नहीं की गई है।</div>
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
                    {installments.map((inst, idx) => (
                      <tr key={inst.id || idx} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 text-xs">{formatDate(inst.date)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-amber-600 dark:text-amber-400">
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
          </CardContent>
        </Card>

        {/* Add ₹300 Installment Modal */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-amber-600" />
                <span>ढूंढोत्सव किश्त भुगतान दर्ज करें (₹300)</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                आवेदक: <strong className="text-foreground">{record.applicantName}</strong> (फॉर्म नं: {record.formNumber})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddInstallment} className="space-y-4 pt-2">
              {/* Installment Amount (Locked to ₹300) */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhDetailInstAmount" className="text-xs font-semibold">
                  किश्त राशि / Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="dhundhDetailInstAmount"
                    type="number"
                    value={300}
                    readOnly
                    className="bg-muted font-bold text-foreground"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    नियत राशि (Fixed ₹300)
                  </span>
                </div>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhDetailInstDate" className="text-xs font-semibold">
                  भुगतान दिनांक / Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dhundhDetailInstDate"
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhDetailInstMode" className="text-xs font-semibold">
                  भुगतान माध्यम / Payment Mode <span className="text-destructive">*</span>
                </Label>
                <select
                  id="dhundhDetailInstMode"
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
                <Label htmlFor="dhundhDetailRashidNo" className="text-xs font-semibold">
                  रसीद संख्या / Receipt / Rashid Number (Optional)
                </Label>
                <Input
                  id="dhundhDetailRashidNo"
                  placeholder="e.g. R-2026-XXXX"
                  value={installmentRashidNumber}
                  onChange={(e) => setInstallmentRashidNumber(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhDetailInstNote" className="text-xs font-semibold">
                  टिप्पणी / Remarks (Optional)
                </Label>
                <Input
                  id="dhundhDetailInstNote"
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
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSubmittingInstallment ? "सहेज रहे हैं..." : "₹300 किश्त दर्ज करें / Submit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
