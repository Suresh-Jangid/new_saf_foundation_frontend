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
  HeartHandshake,
  ArrowLeft,
  Calendar,
  User,
  Baby,
  MapPin,
  Shield,
  CreditCard,
  KeyRound,
  Receipt,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";

export default function JanniDeliveryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [record, setRecord] = useState<JanniDeliveryRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Installment Modal State
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("");
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
      const res = await JanniDeliveryService.getRegistrationById(id);
      if (res && res.data) {
        setRecord(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load record details");
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
      await JanniDeliveryService.addInstallment(record.id, {
        amount: amt,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setInstallmentAmount("");
      setInstallmentNote("");
      fetchRecord();
    } catch (err: any) {
      toast.error(err.message || "Failed to add installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0B4A8F]" />
        <span className="text-sm text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Record Not Found / रिकॉर्ड नहीं मिला</h2>
        <Button onClick={() => router.push("/dashboard/janni-delivery")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Listing / वापस जाएं
        </Button>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="janni_delivery" requiredAction="view">
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/janni-delivery")}
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
                  Form: {record.formNumber}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Registered on: {record.applicationDate ? formatDate(new Date(record.applicationDate)) : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsInstallmentModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              <span>+ Add Installment / किश्त जोड़ें</span>
            </Button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Applicant & Family Info */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-5 border-b bg-slate-50 dark:bg-slate-900">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-[#0B4A8F]" />
                  Applicant & Family Details / पारिवारिक विवरण
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Mother / Applicant Name:</span>
                  <span className="font-semibold text-sm">{record.applicantName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Father's Name:</span>
                  <span className="font-semibold">{record.fatherName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Husband's Name:</span>
                  <span className="font-semibold">{record.husbandName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Mother's Name:</span>
                  <span className="font-semibold">{record.motherName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date of Birth:</span>
                  <span className="font-semibold">
                    {record.dateOfBirth ? formatDate(new Date(record.dateOfBirth)) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Age:</span>
                  <span className="font-semibold">{record.age ? `${record.age} Years` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Gotra:</span>
                  <span className="font-semibold">{record.gotra}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Aadhaar Number:</span>
                  <span className="font-semibold font-mono">{record.aadharNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Mobile Number:</span>
                  <span className="font-semibold">{record.mobile}</span>
                </div>
              </CardContent>
            </Card>

            {/* Child & Delivery Details */}
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
              <CardHeader className="py-3 px-5 border-b bg-blue-50/50 dark:bg-blue-950/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900 dark:text-blue-200">
                  <Baby className="h-4 w-4 text-blue-600" />
                  Delivery & Child Details / प्रसूति एवं शिशु विवरण
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Child Name:</span>
                  <span className="font-semibold">{record.childName || "Not named yet"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Child Gender:</span>
                  <span className="font-semibold">{record.childGender || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Delivery Date:</span>
                  <span className="font-semibold">
                    {record.deliveryDate ? formatDate(new Date(record.deliveryDate)) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Hospital Name / Place:</span>
                  <span className="font-semibold">{record.hospitalName || "—"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Address & Nominee */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-5 border-b bg-slate-50 dark:bg-slate-900">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0B4A8F]" />
                  Address & Nominee / पता एवं नॉमिनी विवरण
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Full Address:</span>
                  <p className="font-medium bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                    {record.address}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>Tehsil: <span className="font-semibold">{record.tehsil}</span></div>
                  <div>District: <span className="font-semibold">{record.district}</span></div>
                  <div>PIN Code: <span className="font-semibold">{record.pinCode}</span></div>
                </div>

                {(record.nomineeName || record.nomineeRelation) && (
                  <div className="pt-3 border-t">
                    <span className="text-muted-foreground block mb-1.5 font-semibold">Nominee Details:</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>Name: <span className="font-semibold">{record.nomineeName || "—"}</span></div>
                      <div>Relation: <span className="font-semibold">{record.nomineeRelation || "—"}</span></div>
                      <div>Mobile: <span className="font-semibold">{record.nomineeMobile || "—"}</span></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Financial & Installment Summary */}
          <div className="space-y-6">
            {/* Scheme & Payment Overview */}
            <Card className="shadow-sm border-t-4 border-t-emerald-600">
              <CardHeader className="py-3 px-5 border-b bg-slate-50 dark:bg-slate-900">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Financial Status / भुगतान विवरण
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline">Category {record.category || "A"}</Badge>
                </div>

                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Total Scheme Amount:</span>
                  <span className="font-bold text-sm">
                    ₹{(Number(record.totalAmount) || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Pending Dues:</span>
                  <span className="font-bold text-base text-[#F57C00]">
                    ₹{(Number(record.pendingAmount) || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">E-PIN Voucher:</span>
                  <span className="font-mono font-semibold">
                    {record.epinCode || "None (Cash / Direct)"}
                  </span>
                </div>

                {record.addedBy && (
                  <div className="pt-2 border-t text-[11px] text-muted-foreground">
                    <span>Registered by Agent: </span>
                    <span className="font-semibold text-foreground">{record.addedBy.name}</span>
                    {record.addedBy.mobile && ` (${record.addedBy.mobile})`}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Installments History Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-5 border-b bg-slate-50 dark:bg-slate-900 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#0B4A8F]" />
                  Installment Timeline
                </CardTitle>
                <Badge variant="secondary">{record.installments?.length || 0} Paid</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {record.installments && record.installments.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {record.installments.map((inst, idx) => (
                      <div
                        key={inst.id || idx}
                        className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-emerald-600">
                            ₹{inst.amount.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Mode: {inst.paymentMode || "CASH"}
                            {inst.note && ` • ${inst.note}`}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          {inst.date ? formatDate(new Date(inst.date)) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <span>No installments recorded yet</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Installment Dialog */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddInstallment}>
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary">
                  <div className="p-2 bg-[#0B4A8F]/10 rounded-lg text-[#0B4A8F]">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">Add Installment Payment</DialogTitle>
                    <DialogDescription className="text-xs">
                      Record payment for {record.applicantName} ({record.formNumber})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="text-muted-foreground block">Pending Due:</span>
                    <span className="font-bold text-base text-[#F57C00]">
                      ₹{(Number(record.pendingAmount) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Badge variant="outline">Form: {record.formNumber}</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instAmount2">Installment Amount (राशि ₹) *</Label>
                  <Input
                    id="instAmount2"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter amount in ₹"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instDate2">Payment Date (दिनांक) *</Label>
                  <Input
                    id="instDate2"
                    type="date"
                    value={installmentDate}
                    onChange={(e) => setInstallmentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instMode2">Payment Mode (भुगतान माध्यम) *</Label>
                  <select
                    id="instMode2"
                    value={installmentPaymentMode}
                    onChange={(e) => setInstallmentPaymentMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                  >
                    <option value="CASH">Cash / नकद</option>
                    <option value="ONLINE">Online / ऑनलाइन</option>
                    <option value="RAZORPAY">Razorpay</option>
                    <option value="BANK_TRANSFER">Bank Transfer / बैंक ट्रांसफर</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instNote2">Remarks / टिप्पणी (Optional)</Label>
                  <Input
                    id="instNote2"
                    placeholder="Optional notes or receipt reference"
                    value={installmentNote}
                    onChange={(e) => setInstallmentNote(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInstallmentModalOpen(false)}
                  disabled={isSubmittingInstallment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingInstallment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  {isSubmittingInstallment ? "Saving..." : "Save Installment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
