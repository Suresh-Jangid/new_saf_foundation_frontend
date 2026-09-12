"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Receipt,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  DhundhotsavService,
  DhundhotsavRegistration,
} from "@/lib/dhundhotsav-service";
import { formatDate } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";

export default function DhundhotsavListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<DhundhotsavRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<DhundhotsavRegistration | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Summary counts (Single Ledger Architecture)
  const [summary, setSummary] = useState<{
    totalRecords: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
  }>({
    totalRecords: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
  });

  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {
        page,
        limit: 20,
      };
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (selectedCategory !== "ALL") filters.category = selectedCategory;
      if (selectedDistrict !== "ALL") filters.district = selectedDistrict;

      const res = await DhundhotsavService.getAllRegistrations(filters);
      if (res && res.data) {
        setRegistrations(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || res.data.length);
        }
        if (res.summary) {
          setSummary({
            totalRecords: res.summary.totalRecords || res.data.length,
            totalAmount: res.summary.totalAmount || res.data.length * 5100,
            totalPaid: res.summary.totalPaid || 0,
            totalPending: res.summary.totalPending || 0,
          });
        } else {
          // Calculate client-side fallback
          let totPaid = 0;
          let totPending = 0;

          res.data.forEach((r) => {
            totPaid += Number(r.paidAmount) || 0;
            totPending += Number(r.pendingAmount) || 0;
          });

          setSummary({
            totalRecords: res.pagination?.total || res.data.length,
            totalAmount: (res.pagination?.total || res.data.length) * 5100,
            totalPaid: totPaid,
            totalPending: totPending,
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching Dhundhotsav registrations:", err);
      toast.error(err.message || "ढूंढोत्सव रिकॉर्ड्स लोड करने में विफल / Failed to load records");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedCategory, selectedDistrict]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const openInstallmentModal = (record: DhundhotsavRegistration) => {
    setSelectedRecord(record);
    setInstallmentAmount(300); // Strict single-ledger ₹300 fixed
    setInstallmentDate(new Date().toISOString().split("T")[0]);
    setInstallmentRashidNumber("");
    setInstallmentNote("");
    setInstallmentPaymentMode("CASH");
    setIsInstallmentModalOpen(true);
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    // Strict enforcement of ₹300 for single Dhundhotsav ledger
    if (Number(installmentAmount) !== 300) {
      toast.error("ढूंढोत्सव योजना के लिए किश्त राशि ₹300 निर्धारित है / Installment amount must be exactly ₹300");
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await DhundhotsavService.addInstallment(selectedRecord.id, {
        amount: 300,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        rashidNumber: installmentRashidNumber || undefined,
        note: installmentNote || undefined,
      });

      toast.success("₹300 किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setSelectedRecord(null);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "किश्त दर्ज करने में त्रुटि / Failed to record installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await DhundhotsavService.deleteRegistration(recordToDelete);
      toast.success("रिकॉर्ड सफलतापूर्वक हटा दिया गया / Registration deleted successfully");
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "हटाने में विफल / Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RoleGuard requiredModule="dhundhotsav" requiredAction="view">
      <div className="p-4 md:p-6 relative">
        {/* Header matching General Marriage Applications */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">ढूंढोत्सव योजना पंजीकरण</h1>
            <p className="text-sm text-gray-600">Dhundhotsav Registration Application</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRegistrations()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">रिफ्रेश / Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => router.push("/dashboard/dhundhotsav/add")}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ नया आवेदन / New Registration</span>
            </Button>
          </div>
        </div>

        {/* Compact Financial Summary Strip (replaces large bulky cards) */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm bg-muted/40 px-4 py-2.5 rounded-lg border border-border/60 text-muted-foreground mb-6">
          <span>
            कुल पंजीकरण / Total:{" "}
            <strong className="text-foreground font-semibold">
              {summary.totalRecords.toLocaleString("hi-IN")}
            </strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            अनुदान राशि / Grant Fee:{" "}
            <strong className="text-foreground font-semibold">₹5,100</strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            कुल जमा / Paid:{" "}
            <strong className="text-emerald-600 font-semibold">
              ₹{summary.totalPaid.toLocaleString("hi-IN")}
            </strong>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            कुल शेष / Pending:{" "}
            <strong className="text-rose-600 font-semibold">
              ₹{summary.totalPending.toLocaleString("hi-IN")}
            </strong>
          </span>
        </div>

        {/* Search / Filter Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="नाम / पिता / मोबाइल / आधार / फॉर्म नं..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">सभी वर्ग / All Categories (A-F)</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                <option value="D">Category D</option>
                <option value="E">Category E</option>
                <option value="F">Category F</option>
              </select>
            </div>

            {/* District Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">सभी जिले / All Districts</option>
                <option value="Jaipur">जयपुर (Jaipur)</option>
                <option value="Jodhpur">जोधपुर (Jodhpur)</option>
                <option value="Kota">कोटा (Kota)</option>
                <option value="Bikaner">बीकानेर (Bikaner)</option>
                <option value="Ajmer">अजमेर (Ajmer)</option>
                <option value="Udaipur">उदयपुर (Udaipur)</option>
                <option value="Sikar">सीकर (Sikar)</option>
                <option value="Nagaur">नागौर (Nagaur)</option>
                <option value="Pali">पाली (Pali)</option>
                <option value="Alwar">अलवर (Alwar)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registered Applications Section Table Container */}
        <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold text-gray-900">
                  ढूंढोत्सव पंजीकरण सूची / Registered Applications
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  कुल {totalCount} आवेदन मिले / Showing {registrations.length} of {totalCount} records
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-muted/50 text-foreground border-border">
                  Pool: MALE_POOL
                </Badge>
                <Badge variant="outline" className="text-xs bg-muted/50 text-foreground border-border">
                  Scheme: DHUNDHOTSAV
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="min-h-[260px] flex flex-col items-center justify-center gap-2 p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  डेटा लोड हो रहा है... / Loading registrations...
                </span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-gray-900">
                    कोई आवेदन नहीं मिला / No Records Found
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    वर्तमान चयन या फ़िल्टर से कोई रिकॉर्ड उपलब्ध नहीं है।
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/dhundhotsav/add")}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> + नया पंजीकरण करें / Add Registration
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3">सदस्यता / फॉर्म नं.</th>
                      <th className="px-4 py-3">आवेदन दिनांक</th>
                      <th className="px-4 py-3">आवेदक का नाम</th>
                      <th className="px-4 py-3">जन्म तिथि / आयु</th>
                      <th className="px-4 py-3">आधार संख्या</th>
                      <th className="px-4 py-3">वर्ग</th>
                      <th className="px-4 py-3">मोबाइल</th>
                      <th className="px-4 py-3">स्थान / Location</th>
                      <th className="px-4 py-3">लेजर स्थिति</th>
                      <th className="px-4 py-3 text-right">कार्य / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registrations.map((reg) => {
                      const offlineNo =
                        (reg as any).offlineFormNumber ||
                        (reg as any).offline_form_number ||
                        null;

                      return (
                        <tr
                          key={reg.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Form Number */}
                          <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-primary">{reg.formNumber}</span>
                                {reg.epinCode && (
                                  <span title={`E-PIN: ${reg.epinCode}`}>
                                    <KeyRound className="h-3.5 w-3.5 text-emerald-600 inline" />
                                  </span>
                                )}
                              </div>
                              {offlineNo && (
                                <span className="text-[11px] text-muted-foreground font-sans">
                                  ऑफलाइन: {offlineNo}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Application Date */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            <div>{formatDate(reg.applicationDate)}</div>
                            {reg.dhundhDate && (
                              <div className="text-[11px] opacity-75 mt-0.5">
                                ढूंढ: {formatDate(reg.dhundhDate)}
                              </div>
                            )}
                          </td>

                          {/* Applicant Name & Details */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-medium text-foreground">
                              {reg.applicantName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>पिता: {reg.fatherName || reg.husbandName || "-"}</span>
                              {reg.gotra && (
                                <>
                                  <span>•</span>
                                  <span>गोत्र: {reg.gotra}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* DOB / Age */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            <div>{reg.dateOfBirth ? formatDate(reg.dateOfBirth) : "-"}</div>
                            {reg.age ? (
                              <div className="text-[11px] text-foreground font-medium mt-0.5">
                                {reg.age} वर्ष
                              </div>
                            ) : null}
                          </td>

                          {/* Aadhaar */}
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {reg.aadharNumber || "-"}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs">
                              Category {reg.category || "-"}
                            </Badge>
                          </td>

                          {/* Mobile */}
                          <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {reg.mobile}
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            <div>{reg.tehsil || reg.address || "-"}, {reg.district}</div>
                            <div className="text-[11px] opacity-75">{reg.state} {reg.pinCode ? `- ${reg.pinCode}` : ""}</div>
                          </td>

                          {/* Single ₹300 Ledger Status */}
                          <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                            <div className="text-emerald-600 font-medium">
                              जमा: ₹{(Number(reg.paidAmount) || 0).toLocaleString("hi-IN")}
                            </div>
                            <div className="text-rose-600 text-[11px]">
                              शेष: ₹{(Number(reg.pendingAmount) || 0).toLocaleString("hi-IN")}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/dhundhotsav/${reg.id}`)}
                                title="विवरण देखें / View Details"
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openInstallmentModal(reg)}
                                title="किश्त दर्ज करें / Add ₹300 Installment"
                                className="h-8 px-2.5 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                <span>₹300 किश्त</span>
                              </Button>

                              {isAdmin() && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRecordToDelete(reg.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  title="हटाएं / Delete"
                                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border/60 bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  पेज {page} of {totalPages} (कुल {totalCount} रिकॉर्ड्स)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> पिछला / Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                    className="h-8 px-2.5 text-xs"
                  >
                    अगला / Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add ₹300 Installment Modal (Single Ledger Architecture) */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <span>ढूंढोत्सव किश्त भुगतान दर्ज करें (₹300)</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                आवेदक: <strong className="text-foreground">{selectedRecord?.applicantName}</strong> (फॉर्म नं: {selectedRecord?.formNumber})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddInstallment} className="space-y-4 pt-2">
              {/* Installment Amount (Locked to ₹300) */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhInstAmount" className="text-xs font-semibold">
                  किश्त राशि / Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="dhundhInstAmount"
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
                <Label htmlFor="dhundhInstDate" className="text-xs font-semibold">
                  भुगतान दिनांक / Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dhundhInstDate"
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhInstMode" className="text-xs font-semibold">
                  भुगतान माध्यम / Payment Mode <span className="text-destructive">*</span>
                </Label>
                <select
                  id="dhundhInstMode"
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

              {/* Rashid / Receipt Number */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhRashidNo" className="text-xs font-semibold">
                  रसीद संख्या / Receipt / Rashid Number (Optional)
                </Label>
                <Input
                  id="dhundhRashidNo"
                  placeholder="e.g. R-2026-XXXX"
                  value={installmentRashidNumber}
                  onChange={(e) => setInstallmentRashidNumber(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="dhundhInstNote" className="text-xs font-semibold">
                  टिप्पणी / Remarks (Optional)
                </Label>
                <Input
                  id="dhundhInstNote"
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
                >
                  {isSubmittingInstallment ? "सहेज रहे हैं..." : "₹300 किश्त दर्ज करें / Submit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                <span>आवेदन हटाने की पुष्टि / Confirm Soft Delete</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप वाकई इस ढूंढोत्सव पंजीकरण को हटाना चाहते हैं? यह रिकॉर्ड सुरक्षित रूप से सॉफ्ट-डिलीट किया जाएगा।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>रद्द करें / Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "हटा रहे हैं..." : "हाँ, हटाएं / Yes, Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
