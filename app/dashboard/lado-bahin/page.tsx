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
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Receipt,
  User,
  Calendar,
  MapPin,
  CreditCard,
  KeyRound,
  FileText,
  DollarSign,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  LadoBahinService,
  LadoBahinRegistration,
  LadoBahinAccountType,
} from "@/lib/lado-bahin-service";
import { formatDate } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";

export default function LadoBahinListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<LadoBahinRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<LadoBahinRegistration | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Summary counts
  const [summary, setSummary] = useState<{
    totalRecords: number;
    totalAmount: number;
    totalPending: number;
    account300Paid: number;
    account300Pending: number;
    account1000Paid: number;
    account1000Pending: number;
  }>({
    totalRecords: 0,
    totalAmount: 0,
    totalPending: 0,
    account300Paid: 0,
    account300Pending: 0,
    account1000Paid: 0,
    account1000Pending: 0,
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
      if (selectedAccountFilter !== "ALL") filters.accountType = selectedAccountFilter;

      const res = await LadoBahinService.getAllRegistrations(filters);
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
            totalPending: res.summary.totalPending || 0,
            account300Paid: res.summary.account300Paid || 0,
            account300Pending: res.summary.account300Pending || 0,
            account1000Paid: res.summary.account1000Paid || 0,
            account1000Pending: res.summary.account1000Pending || 0,
          });
        } else {
          // Calculate client-side fallback
          let acc300Paid = 0;
          let acc1000Paid = 0;
          let acc300Pending = 0;
          let acc1000Pending = 0;
          let totPending = 0;

          res.data.forEach((r) => {
            acc300Paid += Number(r.account300Paid) || 0;
            acc300Pending += Number(r.account300Pending) || 0;
            acc1000Paid += Number(r.account1000Paid) || 0;
            acc1000Pending += Number(r.account1000Pending) || 0;
            totPending += Number(r.pendingAmount) || 0;
          });

          setSummary({
            totalRecords: res.pagination?.total || res.data.length,
            totalAmount: (res.pagination?.total || res.data.length) * 5100,
            totalPending: totPending,
            account300Paid: acc300Paid,
            account300Pending: acc300Pending,
            account1000Paid: acc1000Paid,
            account1000Pending: acc1000Pending,
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching Lado Bahin registrations:", err);
      toast.error(err.message || "लाडो बहिन रिकॉर्ड्स लोड करने में विफल / Failed to load records");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedCategory, selectedDistrict, selectedAccountFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Handle Account Type Change in Installment Modal
  const handleAccountTypeChange = (accType: LadoBahinAccountType) => {
    setSelectedAccountType(accType);
    if (accType === "LADO_BAHIN_300") {
      setInstallmentAmount(300);
    } else {
      setInstallmentAmount(1000);
    }
  };

  const openInstallmentModal = (record: LadoBahinRegistration) => {
    setSelectedRecord(record);
    setSelectedAccountType("LADO_BAHIN_300");
    setInstallmentAmount(300);
    setInstallmentDate(new Date().toISOString().split("T")[0]);
    setInstallmentRashidNumber("");
    setInstallmentNote("");
    setInstallmentPaymentMode("CASH");
    setIsInstallmentModalOpen(true);
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    // Strict amount enforcement per backend contract
    const expectedAmount = selectedAccountType === "LADO_BAHIN_300" ? 300 : 1000;
    if (Number(installmentAmount) !== expectedAmount) {
      toast.error(
        `Account ${selectedAccountType} requires exact amount ₹${expectedAmount} / इस खाते के लिए ₹${expectedAmount} निर्धारित है`
      );
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await LadoBahinService.addInstallment(selectedRecord.id, {
        accountType: selectedAccountType,
        amount: expectedAmount,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        rashidNumber: installmentRashidNumber || undefined,
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
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
      await LadoBahinService.deleteRegistration(recordToDelete);
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
    <RoleGuard requiredModule="lado_bahin" requiredAction="view">
      <div className="space-y-6 p-4 md:p-6 pb-12 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  लाडो बहिन (मुकलावा) योजना पंजीकरण
                </h1>
                <p className="text-sm text-muted-foreground">
                  Lado Bahin (Muklawa) Registration Application — Fixed Grant ₹5,100 & Dual Ledgers
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRegistrations()}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>रिफ्रेश / Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => router.push("/dashboard/lado-bahin/add")}
              className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>नया आवेदन / New Registration</span>
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Registrations */}
          <Card className="border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                कुल पंजीकरण / Total Applications
              </CardTitle>
              <FileText className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {summary.totalRecords.toLocaleString("hi-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                सक्रिय लाडो बहिन आवेदन / Active records
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Fixed Membership Fee */}
          <Card className="border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                सदस्यता शुल्क / Grant Fee
              </CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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

          {/* Card 3: ₹300 Account Ledger */}
          <Card className="border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ₹300 खाता / Account 300
              </CardTitle>
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">जमा (Paid)</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{summary.account300Paid.toLocaleString("hi-IN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">शेष (Pending)</div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    ₹{summary.account300Pending.toLocaleString("hi-IN")}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                LADO_BAHIN_300 स्वतंत्र लेजर
              </p>
            </CardContent>
          </Card>

          {/* Card 4: ₹1,000 Account Ledger */}
          <Card className="border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ₹1,000 खाता / Account 1000
              </CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">जमा (Paid)</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{summary.account1000Paid.toLocaleString("hi-IN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">शेष (Pending)</div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    ₹{summary.account1000Pending.toLocaleString("hi-IN")}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                LADO_BAHIN_1000 स्वतंत्र लेजर
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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

              {/* Caste/Category Filter */}
              <div>
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
              <div>
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

              {/* Account Filter */}
              <div>
                <select
                  value={selectedAccountFilter}
                  onChange={(e) => {
                    setSelectedAccountFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">सभी खाते / All Accounts</option>
                  <option value="LADO_BAHIN_300">₹300 खाता (Account 300)</option>
                  <option value="LADO_BAHIN_1000">₹1,000 खाता (Account 1000)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations List Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  लाडो बहिन पंजीकरण सूची / Registered Applications
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  कुल {totalCount} आवेदन मिले / Showing {registrations.length} of {totalCount} records
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200">
                Scheme: LADO_BAHIN
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center gap-2 p-8">
                <RefreshCw className="h-7 w-7 animate-spin text-pink-600" />
                <span className="text-sm text-muted-foreground">
                  डेटा लोड हो रहा है... / Loading registrations...
                </span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">कोई आवेदन नहीं मिला / No Records Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    वर्तमान खोज या फ़िल्टर के साथ कोई लाडो बहिन रिकॉर्ड उपलब्ध नहीं है।
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/lado-bahin/add")}
                  className="mt-2 bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> नया पंजीकरण करें / Add Registration
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3">फॉर्म नं / Form No</th>
                      <th className="px-4 py-3">आवेदिका / Applicant</th>
                      <th className="px-4 py-3">मुकलावा / आवेदन दिनांक</th>
                      <th className="px-4 py-3">स्थान / Location</th>
                      <th className="px-4 py-3">सदस्यता शुल्क</th>
                      <th className="px-4 py-3">₹300 लेजर</th>
                      <th className="px-4 py-3">₹1,000 लेजर</th>
                      <th className="px-4 py-3 text-right">कार्य / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registrations.map((reg) => (
                      <tr
                        key={reg.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Form Number */}
                        <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-pink-600 font-semibold">{reg.formNumber}</span>
                            {reg.epinCode && (
                              <span title={`E-PIN: ${reg.epinCode}`}>
                                <KeyRound className="h-3.5 w-3.5 text-emerald-600 inline" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Applicant Name & Details */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            {reg.applicantName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>पिता/पति: {reg.fatherName || reg.husbandName || "-"}</span>
                            <span>•</span>
                            <span>{reg.mobile}</span>
                            {reg.gotra && (
                              <>
                                <span>•</span>
                                <span>गोत्र: {reg.gotra}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          <div>
                            मुकलावा: {reg.muklawaDate ? formatDate(reg.muklawaDate) : "-"}
                          </div>
                          <div className="text-[11px] opacity-75 mt-0.5">
                            आवेदन: {formatDate(reg.applicationDate)}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          <div>{reg.tehsil}, {reg.district}</div>
                          <div className="text-[11px] opacity-75">{reg.state} - {reg.pinCode}</div>
                        </td>

                        {/* Fixed Fee */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant="outline" className="font-semibold text-amber-600 border-amber-300 bg-amber-50/30">
                            ₹5,100
                          </Badge>
                        </td>

                        {/* ₹300 Ledger */}
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          <div className="text-emerald-600 font-medium">
                            जमा: ₹{(Number(reg.account300Paid) || 0).toLocaleString("hi-IN")}
                          </div>
                          <div className="text-rose-600 text-[11px]">
                            शेष: ₹{(Number(reg.account300Pending) || 0).toLocaleString("hi-IN")}
                          </div>
                        </td>

                        {/* ₹1,000 Ledger */}
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          <div className="text-emerald-600 font-medium">
                            जमा: ₹{(Number(reg.account1000Paid) || 0).toLocaleString("hi-IN")}
                          </div>
                          <div className="text-rose-600 text-[11px]">
                            शेष: ₹{(Number(reg.account1000Pending) || 0).toLocaleString("hi-IN")}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/lado-bahin/${reg.id}`)}
                              title="विवरण देखें / View Details"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openInstallmentModal(reg)}
                              title="किश्त दर्ज करें / Add Installment"
                              className="h-8 px-2.5 text-xs gap-1 border-pink-300 text-pink-700 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-300"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>किश्त</span>
                            </Button>

                            {isAdmin() && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRecordToDelete(reg.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                title="हटाएं / Delete"
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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

        {/* Add Installment Modal */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-pink-600" />
                <span>लाडो बहिन किश्त भुगतान दर्ज करें</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                आवेदिका: <strong className="text-foreground">{selectedRecord?.applicantName}</strong> (फॉर्म नं: {selectedRecord?.formNumber})
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

              {/* Installment Amount (Read-only / Fixed based on account) */}
              <div className="space-y-1.5">
                <Label htmlFor="instAmount" className="text-xs font-semibold">
                  किश्त राशि / Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="instAmount"
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
                <Label htmlFor="instDate" className="text-xs font-semibold">
                  भुगतान दिनांक / Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="instDate"
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="instMode" className="text-xs font-semibold">
                  भुगतान माध्यम / Payment Mode <span className="text-destructive">*</span>
                </Label>
                <select
                  id="instMode"
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
                <Label htmlFor="rashidNo" className="text-xs font-semibold">
                  रसीद संख्या / Receipt / Rashid Number (Optional)
                </Label>
                <Input
                  id="rashidNo"
                  placeholder="e.g. R-2026-XXXX"
                  value={installmentRashidNumber}
                  onChange={(e) => setInstallmentRashidNumber(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="instNote" className="text-xs font-semibold">
                  टिप्पणी / Remarks (Optional)
                </Label>
                <Input
                  id="instNote"
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

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                <span>आवेदन हटाने की पुष्टि / Confirm Soft Delete</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप वाकई इस लाडो बहिन पंजीकरण को हटाना चाहते हैं? यह रिकॉर्ड सुरक्षित रूप से सॉफ्ट-डिलीट किया जाएगा।
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
