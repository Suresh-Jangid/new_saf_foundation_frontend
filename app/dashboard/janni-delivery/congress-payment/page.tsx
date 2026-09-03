"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Gift,
  RefreshCw,
  Search,
  Eye,
  IndianRupee,
  FileSpreadsheet,
  Calendar,
  User,
  Baby,
  MapPin,
  CreditCard,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function JanniCongressPaymentPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<JanniDeliveryRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Installment Modal State
  const [selectedRecord, setSelectedRecord] = useState<JanniDeliveryRegistration | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState<{
    totalRecords: number;
    totalAmount: number;
    totalPending: number;
  }>({
    totalRecords: 0,
    totalAmount: 0,
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
      if (selectedDistrict !== "ALL") filters.district = selectedDistrict;

      const res = await JanniDeliveryService.getAllRegistrations(filters);
      if (res && res.data) {
        setRegistrations(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || res.data.length);
        }
        if (res.summary) {
          setSummary(res.summary);
        } else {
          const totalAmt = res.data.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
          const totalPend = res.data.reduce((acc, curr) => acc + (Number(curr.pendingAmount) || 0), 0);
          setSummary({
            totalRecords: res.data.length,
            totalAmount: totalAmt,
            totalPending: totalPend,
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to load Janni Delivery payments:", err);
      toast.error(err.message || "Failed to load records / रिकॉर्ड लोड करने में विफल");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedDistrict]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Distinct districts for filtering
  const distinctDistricts = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => {
      if (r.district) set.add(r.district.trim());
    });
    return Array.from(set).sort();
  }, [registrations]);

  // Filtered list based on status filter
  const filteredRecords = useMemo(() => {
    return registrations.filter((r) => {
      if (selectedStatus === "ALL") return true;
      const total = Number(r.totalAmount) || 0;
      const pending = Number(r.pendingAmount) || 0;
      const paid = total - pending;

      if (selectedStatus === "PAID") {
        return total > 0 && pending <= 0;
      }
      if (selectedStatus === "PARTIAL") {
        return paid > 0 && pending > 0;
      }
      if (selectedStatus === "PENDING") {
        return paid === 0;
      }
      return true;
    });
  }, [registrations, selectedStatus]);

  const handleOpenPaymentModal = (record: JanniDeliveryRegistration) => {
    setSelectedRecord(record);
    const pend = Number(record.pendingAmount) || 0;
    setPaymentAmount(pend > 0 ? String(pend) : "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("CASH");
    setReceiptNumber("");
    setPaymentNote("");
    setIsPaymentModalOpen(true);
  };

  const handleOpenDetailsModal = async (record: JanniDeliveryRegistration) => {
    setSelectedRecord(record);
    setIsDetailsModalOpen(true);
    try {
      const updated = await JanniDeliveryService.getRegistrationById(record.id);
      if (updated && updated.data) {
        setSelectedRecord(updated.data);
      }
    } catch {
      // Keep existing record state
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      toast.error("कृपया वैध राशि दर्ज करें / Enter a valid positive amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await JanniDeliveryService.addInstallment(selectedRecord.id, {
        amount: amt,
        date: paymentDate,
        paymentMode,
        note: [receiptNumber ? `रसीद क्र: ${receiptNumber}` : "", paymentNote]
          .filter(Boolean)
          .join(" | ") || undefined,
      });

      toast.success("बधाई सहायता भुगतान सफलतापूर्वक दर्ज किया गया! / Janni payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setReceiptNumber("");
      setPaymentNote("");
      fetchRegistrations();

      // If details modal is open, refresh record
      const updated = await JanniDeliveryService.getRegistrationById(selectedRecord.id);
      if (updated && updated.data) {
        setSelectedRecord(updated.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (filteredRecords.length === 0) {
        toast.error("No data to export / निर्यात के लिए कोई डेटा नहीं");
        return;
      }

      const excelData = filteredRecords.map((record) => {
        const total = Number(record.totalAmount) || 0;
        const pending = Number(record.pendingAmount) || 0;
        const paid = total - pending;
        return {
          "फॉर्म संख्या": record.formNumber,
          "आवेदन तिथि": record.applicationDate,
          "माता का नाम": record.applicantName,
          "पिता का नाम": record.fatherName,
          "पति का नाम": record.husbandName || "N/A",
          "शिशु का नाम": record.childName || "N/A",
          "शिशु का लिंग": record.childGender || "N/A",
          "प्रसूति तिथि": record.deliveryDate || "N/A",
          "अस्पताल": record.hospitalName || "N/A",
          "मोबाइल": record.mobile,
          "जिला": record.district,
          "कुल सहायता": total,
          "भुगतान राशि": paid,
          "लंबित राशि": pending,
          "भुगतान स्थिति": pending <= 0 ? "पूर्ण भुगतान" : paid > 0 ? "आंशिक भुगतान" : "लंबित",
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Janni Congress Payment");
      XLSX.writeFile(wb, `janni_congress_payment_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  };

  const totalPaidSum = (summary.totalAmount || 0) - (summary.totalPending || 0);

  return (
    <RoleGuard requiredModule="janni_delivery" requiredAction="view">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#0B4A8F] to-[#0D5EB3] text-white rounded-2xl shadow-md shadow-blue-950/20">
              <Gift className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                जननी प्रसूति बधाई पत्र भुगतान (Janni Congress Payment)
              </h1>
              <p className="text-sm text-muted-foreground">
                जननी प्रसूति योजना सहायता वितरण व किश्त भुगतान रिकॉर्ड
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRegistrations}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#0B4A8F] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                कुल आवेदन / Total
              </CardTitle>
              <FileText className="h-4 w-4 text-[#0B4A8F]" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.totalRecords || totalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">पंजीकृत लाभार्थी</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                कुल स्वीकृत सहायता / Total Aid
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                ₹{(summary.totalAmount || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">योजना सहायता राशि</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                कुल भुगतान / Disbursed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ₹{totalPaidSum.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">सफल भुगतान राशि</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                लंबित सहायता / Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                ₹{(summary.totalPending || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">वितरण हेतु शेष राशि</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="आवेदक नाम, फॉर्म संख्या या मोबाइल..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="स्थिति / Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">सभी स्थिति</SelectItem>
                      <SelectItem value="PAID">पूर्ण भुगतान</SelectItem>
                      <SelectItem value="PARTIAL">आंशिक भुगतान</SelectItem>
                      <SelectItem value="PENDING">लंबित</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className="w-[140px] text-xs">
                    <SelectValue placeholder="जिला / District" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">सभी जिले</SelectItem>
                    {distinctDistricts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchTerm || selectedDistrict !== "ALL" || selectedStatus !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDistrict("ALL");
                      setSelectedStatus("ALL");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Records Table */}
        <Card className="shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">फॉर्म क्र.</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">आवेदन तिथि</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">माता / आवेदक</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">पिता / पति का नाम</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">शिशु विवरण</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">प्रसूति तिथि</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">जिला</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-gray-700 dark:text-gray-300">कुल सहायता</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-gray-700 dark:text-gray-300">भुगतान राशि</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-gray-700 dark:text-gray-300">शेष राशि</TableHead>
                  <TableHead className="font-semibold text-xs text-center text-gray-700 dark:text-gray-300">भुगतान स्थिति</TableHead>
                  <TableHead className="font-semibold text-xs text-center text-gray-700 dark:text-gray-300">कार्य</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[#0B4A8F]" />
                        <span>Loading Janni Congress Payment records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                        <span className="font-medium">कोई रिकॉर्ड नहीं मिला / No records found</span>
                        <p className="text-xs text-muted-foreground">
                          Try changing filters or search terms
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const total = Number(record.totalAmount) || 0;
                    const pending = Number(record.pendingAmount) || 0;
                    const paid = total - pending;
                    const isFullyPaid = total > 0 && pending <= 0;
                    const isPartiallyPaid = paid > 0 && pending > 0;

                    return (
                      <TableRow key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <TableCell className="font-medium text-xs font-mono">
                          {record.formNumber || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(record.applicationDate) || record.applicationDate}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                          {record.applicantName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.husbandName || record.fatherName || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.childName ? (
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {record.childName} {record.childGender ? `(${record.childGender})` : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {record.deliveryDate ? formatDate(record.deliveryDate) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.district || record.tehsil || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right text-gray-900 dark:text-gray-100">
                          ₹{total.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right text-emerald-700 dark:text-emerald-400">
                          ₹{paid.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right text-amber-700 dark:text-amber-400">
                          ₹{pending.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-center">
                          {isFullyPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
                              पूर्ण भुगतान
                            </Badge>
                          ) : isPartiallyPaid ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]">
                              आंशिक भुगतान
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]">
                              लंबित
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center gap-1"
                              onClick={() => handleOpenPaymentModal(record)}
                              title="सहायता राशि / किश्त भुगतान दर्ज करें"
                            >
                              <IndianRupee className="h-3 w-3" />
                              <span className="hidden sm:inline">भुगतान</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenDetailsModal(record)}
                              title="विवरण व भुगतान इतिहास देखें"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({totalCount} total records)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Modal 1: Record Payment / Installment ────────────────────── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                <span>जननी सहायता भुगतान दर्ज करें</span>
              </DialogTitle>
              <DialogDescription>
                {selectedRecord && (
                  <span className="font-medium text-foreground">
                    {selectedRecord.applicantName} (फॉर्म क्र: {selectedRecord.formNumber})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">कुल सहायता:</span>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">शेष लंबित:</span>
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payAmount" className="text-xs font-semibold">
                    भुगतान राशि / Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="payAmount"
                    type="number"
                    min="1"
                    placeholder="दर्ज करें..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="payDate" className="text-xs font-semibold">
                      भुगतान तिथि / Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="payMode" className="text-xs font-semibold">
                      भुगतान माध्यम / Mode
                    </Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger id="payMode" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">नकद (Cash)</SelectItem>
                        <SelectItem value="BANK_TRANSFER">बैंक ट्रांसफर (Bank Transfer)</SelectItem>
                        <SelectItem value="ONLINE">ऑनलाइन (UPI/Online)</SelectItem>
                        <SelectItem value="CHEQUE">चेक (Cheque)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiptNo" className="text-xs font-semibold">
                    रसीद / संदर्भ संख्या (Receipt / Ref No.)
                  </Label>
                  <Input
                    id="receiptNo"
                    type="text"
                    placeholder="उदा. RCP-1029..."
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payNote" className="text-xs font-semibold">
                    टिप्पणी / विवरण (Note / Remarks)
                  </Label>
                  <Textarea
                    id="payNote"
                    rows={2}
                    placeholder="भुगतान संबंधी विवरण दर्ज करें..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    रद्द करें
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "सहेज रहे हैं..." : "भुगतान दर्ज करें"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Modal 2: Payment Details & History Ledger ──────────────── */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#0B4A8F]" />
                <span>जननी प्रसूति सहायता व किश्त विवरण</span>
              </DialogTitle>
              <DialogDescription>
                {selectedRecord && (
                  <span>
                    फॉर्म क्र: <span className="font-mono font-medium">{selectedRecord.formNumber}</span> | {selectedRecord.applicantName}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-4 py-2">
                {/* Beneficiary Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border text-xs">
                  <div>
                    <span className="text-muted-foreground">माता का नाम:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.applicantName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">पिता/पति का नाम:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.husbandName || selectedRecord.fatherName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">मोबाइल:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.mobile || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">शिशु का नाम व लिंग:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedRecord.childName || "—"} {selectedRecord.childGender ? `(${selectedRecord.childGender})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">प्रसूति तिथि:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedRecord.deliveryDate ? formatDate(selectedRecord.deliveryDate) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">अस्पताल:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.hospitalName || "—"}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground">पता:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {[selectedRecord.address, selectedRecord.tehsil, selectedRecord.district, selectedRecord.pinCode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                {/* Aid & Payment Balance */}
                <div className="grid grid-cols-3 gap-3 text-center p-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/20 dark:to-emerald-950/20 rounded-xl border">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल सहायता</span>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल भुगतान</span>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{(Number(selectedRecord.totalAmount || 0) - Number(selectedRecord.pendingAmount || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">शेष राशि</span>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Installments History Ledger */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-[#0B4A8F]" />
                      <span>किश्त / सहायता भुगतान इतिहास (Payment Ledger)</span>
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex items-center gap-1"
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleOpenPaymentModal(selectedRecord);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      <span>नया भुगतान दर्ज करें</span>
                    </Button>
                  </div>

                  {selectedRecord.installments && selectedRecord.installments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                          <TableRow>
                            <TableHead className="text-xs py-2">#</TableHead>
                            <TableHead className="text-xs py-2">तिथि</TableHead>
                            <TableHead className="text-xs py-2">माध्यम</TableHead>
                            <TableHead className="text-xs py-2">विवरण / रसीद</TableHead>
                            <TableHead className="text-xs py-2 text-right">राशि (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.installments.map((inst, index) => (
                            <TableRow key={inst.id || index}>
                              <TableCell className="text-xs font-mono py-2">{index + 1}</TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground whitespace-nowrap">
                                {formatDate(inst.date) || inst.date}
                              </TableCell>
                              <TableCell className="text-xs py-2">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {inst.paymentMode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">
                                {inst.note || inst.rashidNumber || "—"}
                              </TableCell>
                              <TableCell className="text-xs py-2 font-bold text-right text-emerald-700 dark:text-emerald-400">
                                ₹{Number(inst.amount || 0).toLocaleString("en-IN")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed">
                      अभी तक कोई किश्त भुगतान दर्ज नहीं किया गया है
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                    बंद करें
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
