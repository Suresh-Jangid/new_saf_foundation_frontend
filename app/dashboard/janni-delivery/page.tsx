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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  HeartHandshake,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Receipt,
  User,
  Baby,
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
  FileSpreadsheet,
  IndianRupee,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function JanniDeliveryListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<JanniDeliveryRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<JanniDeliveryRegistration | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Installment Modal State
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentDate, setInstallmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [installmentNote, setInstallmentNote] = useState("");
  const [installmentReceiptNo, setInstallmentReceiptNo] = useState("");
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState("CASH");
  const [isSubmittingInstallment, setIsSubmittingInstallment] = useState(false);

  // Summary counts
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
      if (selectedCategory !== "ALL") filters.category = selectedCategory;
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
      console.error("Failed to load Janni Delivery registrations:", err);
      toast.error(err.message || "Failed to load registrations / पंजीकरण लोड करने में विफल");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedCategory, selectedDistrict]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await JanniDeliveryService.deleteRegistration(recordToDelete);
      toast.success("पंजीकरण सफलतापूर्वक हटाया गया / Registration deleted successfully");
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete registration");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenInstallmentModal = (record: JanniDeliveryRegistration) => {
    setSelectedRecord(record);
    const pend = Number(record.pendingAmount) || 0;
    setInstallmentAmount(pend > 0 ? String(pend) : "");
    setInstallmentDate(new Date().toISOString().split("T")[0]);
    setInstallmentReceiptNo("");
    setInstallmentNote("");
    setInstallmentPaymentMode("CASH");
    setIsInstallmentModalOpen(true);
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    const amt = Number(installmentAmount);
    if (!amt || amt <= 0) {
      toast.error("कृपया वैध राशि दर्ज करें / Enter a valid positive amount");
      return;
    }

    setIsSubmittingInstallment(true);
    try {
      await JanniDeliveryService.addInstallment(selectedRecord.id, {
        amount: amt,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        note: [installmentReceiptNo ? `रसीद क्र: ${installmentReceiptNo}` : "", installmentNote]
          .filter(Boolean)
          .join(" | ") || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setInstallmentAmount("");
      setInstallmentReceiptNo("");
      setInstallmentNote("");
      fetchRegistrations();

      // Refresh detail view if open
      const updated = await JanniDeliveryService.getRegistrationById(selectedRecord.id);
      if (updated && updated.data) {
        setSelectedRecord(updated.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (registrations.length === 0) {
        toast.error("No data to export / निर्यात के लिए कोई डेटा नहीं");
        return;
      }

      const excelData = registrations.map((record) => ({
        "फॉर्म संख्या": record.formNumber,
        "आवेदन तिथि": record.applicationDate,
        "माता का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "पति का नाम": record.husbandName || "N/A",
        "आयु": record.age || "N/A",
        "गोत्र": record.gotra,
        "आधार": record.aadharNumber,
        "मोबाइल": record.mobile,
        "पता": record.address,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "पिन कोड": record.pinCode,
        "शिशु का नाम": record.childName || "N/A",
        "शिशु का लिंग": record.childGender || "N/A",
        "प्रसूति तिथि": record.deliveryDate || "N/A",
        "अस्पताल": record.hospitalName || "N/A",
        "नॉमिनी का नाम": record.nomineeName || "N/A",
        "नॉमिनी संबंध": record.nomineeRelation || "N/A",
        "कुल सहायता": record.totalAmount,
        "लंबित राशि": record.pendingAmount,
        "ई-पिन": record.epinCode || "N/A",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Janni Registrations");
      XLSX.writeFile(wb, `janni_delivery_registrations_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  };

  // Distinct districts for filtering
  const distinctDistricts = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => {
      if (r.district) set.add(r.district.trim());
    });
    return Array.from(set).sort();
  }, [registrations]);

  return (
    <RoleGuard requiredModule="janni_delivery" requiredAction="view">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page Header matching Mayra / Marriage UI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#0B4A8F] to-[#0D5EB3] text-white rounded-2xl shadow-md shadow-blue-950/20">
              <HeartHandshake className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                जननी प्रसूति पंजीकरण (Janni Delivery Registration)
              </h1>
              <p className="text-sm text-muted-foreground">
                जननी प्रसूति योजना पंजीकरण व सहायता प्रबंधन पोर्टल
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={registrations.length === 0}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
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

            <Button
              onClick={() => router.push("/dashboard/janni-delivery/add")}
              className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white flex items-center gap-2 shadow-md shadow-blue-950/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Janni</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#0B4A8F] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                कुल पंजीकरण / Total Registrations
              </CardTitle>
              <FileText className="h-4 w-4 text-[#0B4A8F]" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.totalRecords || totalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">सक्रिय जननी प्रसूति लाभार्थी</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                कुल योजना राशि / Total Scheme Amount
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ₹{(summary.totalAmount || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">स्वीकृत सहायता मूल्य</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#F57C00] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                बकाया / Pending Amount
              </CardTitle>
              <Receipt className="h-4 w-4 text-[#F57C00]" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-[#F57C00]">
                ₹{(summary.totalPending || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">लंबित किश्त राशि</p>
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
                  placeholder="आवेदक नाम, मोबाइल, आधार या फॉर्म क्र..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue placeholder="श्रेणी / Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">सभी श्रेणियां</SelectItem>
                      <SelectItem value="A">Category A</SelectItem>
                      <SelectItem value="B">Category B</SelectItem>
                      <SelectItem value="C">Category C</SelectItem>
                      <SelectItem value="D">Category D</SelectItem>
                      <SelectItem value="E">Category E</SelectItem>
                      <SelectItem value="F">Category F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className="w-[140px] text-xs">
                    <SelectValue placeholder="जिला / District" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">सभी ज़िले</SelectItem>
                    {distinctDistricts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchTerm || selectedCategory !== "ALL" || selectedDistrict !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("ALL");
                      setSelectedDistrict("ALL");
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

        {/* Applications Data Table */}
        <Card className="shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">फॉर्म क्र.</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">आवेदन तिथि</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">माता / आवेदक का नाम</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">पिता / पति</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">शिशु विवरण</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">संपर्क व आधार</TableHead>
                  <TableHead className="font-semibold text-xs text-gray-700 dark:text-gray-300">स्थान / जिला</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-gray-700 dark:text-gray-300">ई-पिन / बकाया</TableHead>
                  <TableHead className="font-semibold text-xs text-center text-gray-700 dark:text-gray-300">कार्य</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[#0B4A8F]" />
                        <span>Loading Janni Delivery records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HeartHandshake className="h-10 w-10 text-muted-foreground/50" />
                        <span className="font-semibold text-base">कोई पंजीकरण नहीं मिला / No records found</span>
                        <span className="text-xs">
                          नया पंजीकरण दर्ज करने के लिए ऊपर "Add New Janni" बटन पर क्लिक करें।
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <TableCell className="font-semibold text-xs text-[#0B4A8F] whitespace-nowrap font-mono">
                        <Badge variant="outline" className="border-[#0B4A8F]/30 bg-[#0B4A8F]/5 text-[#0B4A8F]">
                          {item.formNumber || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {item.applicationDate ? formatDate(item.applicationDate) : "—"}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-gray-900 dark:text-gray-100">
                        <div className="font-semibold">{item.applicantName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          गोत्र: <span className="font-medium">{item.gotra || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                        <div>{item.husbandName || item.fatherName || "—"}</div>
                        {item.husbandName && item.fatherName && (
                          <div className="text-[10px] text-muted-foreground">पिता: {item.fatherName}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                        {item.childGender ? (
                          <div className="flex items-center gap-1">
                            <Baby className="h-3.5 w-3.5 text-blue-600" />
                            <span>{item.childGender} {item.childName ? `(${item.childName})` : ""}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                        {item.deliveryDate && (
                          <div className="text-[11px] text-muted-foreground">
                            प्रसूति: {formatDate(item.deliveryDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.mobile}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          आधार: {item.aadharNumber ? `••••${item.aadharNumber.slice(-4)}` : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                        <div>{item.tehsil ? `${item.tehsil}, ` : ""}{item.district || "—"}</div>
                        <div className="text-[11px] text-muted-foreground">पिन: {item.pinCode || "—"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-right">
                        {item.epinCode ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px]">
                            <KeyRound className="h-2.5 w-2.5 mr-1" />
                            E-PIN Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Cash / Direct
                          </Badge>
                        )}
                        <div className="mt-1 font-semibold text-xs text-[#F57C00]">
                          बकाया: ₹{(Number(item.pendingAmount) || 0).toLocaleString("en-IN")}
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center gap-1"
                            onClick={() => handleOpenInstallmentModal(item)}
                            title="किश्त / सहायता भुगतान दर्ज करें"
                          >
                            <IndianRupee className="h-3 w-3" />
                            <span className="hidden sm:inline">किश्त</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedRecord(item);
                              setIsViewModalOpen(true);
                            }}
                            title="विवरण देखें"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setRecordToDelete(item.id);
                              setIsDeleteModalOpen(true);
                            }}
                            title="हटाएं / Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

        {/* ── Modal 1: View Details Modal ────────────────────────────── */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <HeartHandshake className="h-5 w-5 text-[#0B4A8F]" />
                <span>जननी प्रसूति पंजीकरण विवरण</span>
              </DialogTitle>
              <DialogDescription>
                {selectedRecord && (
                  <span>
                    फॉर्म संख्या: <span className="font-mono font-medium">{selectedRecord.formNumber}</span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-4 py-2 text-xs">
                {/* Section 1: Mother Details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <User className="h-3.5 w-3.5 text-[#0B4A8F]" />
                    <span>माता / आवेदक का विवरण (Mother Details)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-muted-foreground">नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.applicantName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">पिता का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.fatherName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">पति का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.husbandName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">माता का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.motherName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">जन्म तिथि / आयु:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedRecord.dateOfBirth ? formatDate(selectedRecord.dateOfBirth) : "—"} {selectedRecord.age ? `(${selectedRecord.age} वर्ष)` : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">गोत्र / श्रेणी:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedRecord.gotra} {selectedRecord.category ? `(Cat ${selectedRecord.category})` : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">आधार नंबर:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{selectedRecord.aadharNumber || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">मोबाइल:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.mobile}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-muted-foreground">पूरा पता:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {[selectedRecord.address, selectedRecord.tehsil, selectedRecord.district, selectedRecord.state, selectedRecord.pinCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Delivery & Child Details */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Baby className="h-3.5 w-3.5 text-blue-600" />
                    <span>प्रसूति एवं शिशु विवरण (Delivery & Child Details)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-muted-foreground">शिशु का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.childName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">शिशु का लिंग:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.childGender || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">प्रसूति तिथि:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedRecord.deliveryDate ? formatDate(selectedRecord.deliveryDate) : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-muted-foreground">अस्पताल का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.hospitalName || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Nominee Details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>नॉमिनी विवरण (Nominee Details)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-muted-foreground">नॉमिनी का नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">संबंध:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeRelation || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">नॉमिनी मोबाइल:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeMobile || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Aid & Payment Summary */}
                <div className="grid grid-cols-3 gap-3 text-center p-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/20 dark:to-emerald-950/20 rounded-xl border">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल सहायता</span>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-400">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">भुगतान राशि</span>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{(Number(selectedRecord.totalAmount || 0) - Number(selectedRecord.pendingAmount || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">शेष बकाया</span>
                    <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Installments History Table */}
                {selectedRecord.installments && selectedRecord.installments.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                      किश्त भुगतान इतिहास (Installments History)
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                          <TableRow>
                            <TableHead className="text-[11px] py-1.5">#</TableHead>
                            <TableHead className="text-[11px] py-1.5">तिथि</TableHead>
                            <TableHead className="text-[11px] py-1.5">माध्यम</TableHead>
                            <TableHead className="text-[11px] py-1.5">विवरण / रसीद</TableHead>
                            <TableHead className="text-[11px] py-1.5 text-right">राशि (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.installments.map((inst, index) => (
                            <TableRow key={inst.id || index}>
                              <TableCell className="text-xs font-mono py-1.5">{index + 1}</TableCell>
                              <TableCell className="text-xs py-1.5 text-muted-foreground whitespace-nowrap">
                                {formatDate(inst.date) || inst.date}
                              </TableCell>
                              <TableCell className="text-xs py-1.5">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {inst.paymentMode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs py-1.5 text-muted-foreground">
                                {inst.note || inst.rashidNumber || "—"}
                              </TableCell>
                              <TableCell className="text-xs py-1.5 font-bold text-right text-emerald-700 dark:text-emerald-400">
                                ₹{Number(inst.amount || 0).toLocaleString("en-IN")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                    बंद करें
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Modal 2: Record Installment Modal ──────────────────────── */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                <span>किश्त भुगतान दर्ज करें</span>
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
              <form onSubmit={handleAddInstallment} className="space-y-4 py-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">कुल सहायता:</span>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">शेष बकाया:</span>
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instAmount" className="text-xs font-semibold">
                    किश्त राशि / Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="instAmount"
                    type="number"
                    min="1"
                    placeholder="दर्ज करें..."
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="instDate" className="text-xs font-semibold">
                      भुगतान तिथि / Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="instDate"
                      type="date"
                      value={installmentDate}
                      onChange={(e) => setInstallmentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="instMode" className="text-xs font-semibold">
                      भुगतान माध्यम / Mode
                    </Label>
                    <Select value={installmentPaymentMode} onValueChange={setInstallmentPaymentMode}>
                      <SelectTrigger id="instMode" className="text-xs">
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
                  <Label htmlFor="instReceipt" className="text-xs font-semibold">
                    रसीद संख्या (Receipt Number)
                  </Label>
                  <Input
                    id="instReceipt"
                    type="text"
                    placeholder="उदा. RCP-1002..."
                    value={installmentReceiptNo}
                    onChange={(e) => setInstallmentReceiptNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instNote" className="text-xs font-semibold">
                    टिप्पणी / विवरण (Note / Remarks)
                  </Label>
                  <Textarea
                    id="instNote"
                    rows={2}
                    placeholder="भुगतान संबंधी विवरण दर्ज करें..."
                    value={installmentNote}
                    onChange={(e) => setInstallmentNote(e.target.value)}
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInstallmentModalOpen(false)}
                    disabled={isSubmittingInstallment}
                  >
                    रद्द करें
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white"
                    disabled={isSubmittingInstallment}
                  >
                    {isSubmittingInstallment ? "सहेज रहे हैं..." : "किश्त दर्ज करें"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Modal 3: Delete Alert Dialog ─────────────────────────── */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>पंजीकरण हटाएं (Delete Registration)</AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप वाकई इस जननी प्रसूति पंजीकरण रिकॉर्ड को हटाना चाहते हैं?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>रद्द करें</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? "हटा रहे हैं..." : "हाँ, हटाएं"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
