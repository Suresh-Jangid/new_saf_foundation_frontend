"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";

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
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      setInstallmentAmount("");
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B4A8F]/10 rounded-2xl text-[#0B4A8F] shadow-sm">
              <HeartHandshake className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                जननी प्रसूति पंजीकरण / Janni Delivery Registration
              </h1>
              <p className="text-sm text-muted-foreground">
                Centralized mother & child delivery assistance portal & installment tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRegistrations}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh / रीफ़्रेश</span>
            </Button>

            <Button
              onClick={() => router.push("/dashboard/janni-delivery/add")}
              className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white flex items-center gap-2 shadow-md shadow-blue-950/20"
            >
              <Plus className="h-4 w-4" />
              <span>नया आवेदन / Add Registration</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#0B4A8F] shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Total Registrations / कुल पंजीकरण
              </CardTitle>
              <FileText className="h-4 w-4 text-[#0B4A8F]" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary.totalRecords || totalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Active delivery scheme records</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Total Scheme Amount / कुल राशि
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-emerald-600">
                ₹{(summary.totalAmount || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Combined scheme registration value</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#F57C00] shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Pending Balance / बकाया राशि
              </CardTitle>
              <Receipt className="h-4 w-4 text-[#F57C00]" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-[#F57C00]">
                ₹{(summary.totalPending || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Outstanding installment dues</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Mother Name, Father, Aadhaar, Mobile, or Form No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                >
                  <option value="ALL">All Categories / सभी श्रेणियां</option>
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                  <option value="C">Category C</option>
                  <option value="D">Category D</option>
                  <option value="E">Category E</option>
                  <option value="F">Category F</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4A8F]"
                >
                  <option value="ALL">All Districts / सभी ज़िले</option>
                  {distinctDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Data Table */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 border-b">Form No</th>
                  <th className="px-4 py-3 border-b">Date</th>
                  <th className="px-4 py-3 border-b">Mother / Applicant Name</th>
                  <th className="px-4 py-3 border-b">Father / Husband</th>
                  <th className="px-4 py-3 border-b">Child Details</th>
                  <th className="px-4 py-3 border-b">Contact & Aadhaar</th>
                  <th className="px-4 py-3 border-b">Location</th>
                  <th className="px-4 py-3 border-b">E-PIN / Balance</th>
                  <th className="px-4 py-3 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[#0B4A8F]" />
                        <span className="text-muted-foreground text-sm">
                          Loading Janni Delivery records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HeartHandshake className="h-10 w-10 text-muted-foreground/50" />
                        <span className="font-semibold text-base">No registrations found</span>
                        <span className="text-xs">
                          Click "Add Registration" above to create your first Janni Delivery application.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  registrations.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0B4A8F] whitespace-nowrap">
                        <Badge variant="outline" className="border-[#0B4A8F]/30 bg-[#0B4A8F]/5 text-[#0B4A8F]">
                          {item.formNumber}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {item.applicationDate ? formatDate(new Date(item.applicationDate)) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        <div>{item.applicantName}</div>
                        <div className="text-xs text-muted-foreground">
                          Gotra: <span className="font-semibold">{item.gotra || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        <div>Father: {item.fatherName}</div>
                        {item.husbandName && (
                          <div className="text-muted-foreground">Husband: {item.husbandName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {item.childGender ? (
                          <div className="flex items-center gap-1">
                            <Baby className="h-3.5 w-3.5 text-blue-600" />
                            <span>{item.childGender} {item.childName ? `(${item.childName})` : ""}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Not specified</span>
                        )}
                        {item.deliveryDate && (
                          <div className="text-[11px] text-muted-foreground">
                            Delivered: {formatDate(new Date(item.deliveryDate))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.mobile}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Aadhaar: {item.aadharNumber ? `••••${item.aadharNumber.slice(-4)}` : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        <div>{item.tehsil}, {item.district}</div>
                        <div className="text-[11px] text-muted-foreground">PIN: {item.pinCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {item.epinCode ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                            <KeyRound className="h-3 w-3 mr-1" />
                            E-PIN Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Cash / Direct
                          </Badge>
                        )}
                        <div className="mt-1 font-semibold text-xs text-[#F57C00]">
                          Due: ₹{(Number(item.pendingAmount) || 0).toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(item);
                              setIsViewModalOpen(true);
                            }}
                            title="View Details"
                            className="h-8 w-8 p-0 text-[#0B4A8F] hover:bg-[#0B4A8F]/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(item);
                              setIsInstallmentModalOpen(true);
                            }}
                            title="Add Installment Payment"
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>

                          {isAdmin() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRecordToDelete(item.id);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete Record"
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({totalCount} records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-8 flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* View Details Dialog */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedRecord && (
              <>
                <DialogHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#0B4A8F]/10 rounded-xl text-[#0B4A8F]">
                        <HeartHandshake className="h-5 w-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-bold">
                          {selectedRecord.applicantName} ({selectedRecord.formNumber})
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Janni Delivery Application Details
                        </DialogDescription>
                      </div>
                    </div>
                    <Badge className="bg-[#0B4A8F] text-white">
                      Category {selectedRecord.category || "A"}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-3 text-sm">
                  {/* Basic & Family Details */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase">
                      Applicant & Family Information / व्यक्तिगत व पारिवारिक विवरण
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Mother / Applicant:</span>
                        <span className="font-semibold">{selectedRecord.applicantName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Father's Name:</span>
                        <span className="font-semibold">{selectedRecord.fatherName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Husband's Name:</span>
                        <span className="font-semibold">{selectedRecord.husbandName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Mother's Name:</span>
                        <span className="font-semibold">{selectedRecord.motherName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Date of Birth / Age:</span>
                        <span className="font-semibold">
                          {selectedRecord.dateOfBirth ? formatDate(new Date(selectedRecord.dateOfBirth)) : "—"}{" "}
                          {selectedRecord.age ? `(${selectedRecord.age} Yrs)` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Gotra:</span>
                        <span className="font-semibold">{selectedRecord.gotra || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Aadhaar Number:</span>
                        <span className="font-semibold font-mono">{selectedRecord.aadharNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Mobile Number:</span>
                        <span className="font-semibold">{selectedRecord.mobile || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Gender:</span>
                        <span className="font-semibold">{selectedRecord.gender || "Female"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Child & Delivery Details */}
                  <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900 space-y-2">
                    <h4 className="font-semibold text-xs text-blue-900 dark:text-blue-200 uppercase flex items-center gap-1.5">
                      <Baby className="h-3.5 w-3.5 text-blue-600" />
                      Delivery & Child Details / प्रसूति एवं शिशु विवरण
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Child Name:</span>
                        <span className="font-semibold">{selectedRecord.childName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Child Gender:</span>
                        <span className="font-semibold">{selectedRecord.childGender || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Delivery Date:</span>
                        <span className="font-semibold">
                          {selectedRecord.deliveryDate ? formatDate(new Date(selectedRecord.deliveryDate)) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Hospital Name:</span>
                        <span className="font-semibold">{selectedRecord.hospitalName || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#0B4A8F]" />
                      Location & Address / पता विवरण
                    </h4>
                    <p className="text-xs font-medium">{selectedRecord.address}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
                      <div>Tehsil: <span className="font-semibold text-foreground">{selectedRecord.tehsil}</span></div>
                      <div>District: <span className="font-semibold text-foreground">{selectedRecord.district}</span></div>
                      <div>PIN: <span className="font-semibold text-foreground">{selectedRecord.pinCode}</span></div>
                    </div>
                  </div>

                  {/* Nominee Details */}
                  {(selectedRecord.nomineeName || selectedRecord.nomineeRelation) && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border space-y-2">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase">
                        Nominee Details / नॉमिनी विवरण
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Name:</span>
                          <span className="font-semibold">{selectedRecord.nomineeName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Relation:</span>
                          <span className="font-semibold">{selectedRecord.nomineeRelation || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Mobile:</span>
                          <span className="font-semibold">{selectedRecord.nomineeMobile || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial & Installment History */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                        Financial Status & Payments / भुगतान स्थिति
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          setIsInstallmentModalOpen(true);
                        }}
                        className="h-7 text-xs bg-white text-emerald-700 hover:bg-emerald-50"
                      >
                        + Add Installment
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-muted-foreground block">Total Scheme Value:</span>
                        <span className="font-bold text-sm text-foreground">
                          ₹{(Number(selectedRecord.totalAmount) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pending Dues:</span>
                        <span className="font-bold text-sm text-[#F57C00]">
                          ₹{(Number(selectedRecord.pendingAmount) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">E-PIN Voucher:</span>
                        <span className="font-semibold text-xs font-mono">
                          {selectedRecord.epinCode || "None (Cash / Direct)"}
                        </span>
                      </div>
                    </div>

                    {selectedRecord.installments && selectedRecord.installments.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                          Installment Payment History:
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {selectedRecord.installments.map((inst, idx) => (
                            <div
                              key={inst.id || idx}
                              className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded-lg border"
                            >
                              <div>
                                <span className="font-bold text-emerald-600">
                                  ₹{inst.amount.toLocaleString("en-IN")}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  ({inst.paymentMode || "CASH"})
                                </span>
                                {inst.note && (
                                  <span className="text-muted-foreground text-[11px] block">
                                    Note: {inst.note}
                                  </span>
                                )}
                              </div>
                              <span className="text-muted-foreground text-[11px]">
                                {inst.date ? formatDate(new Date(inst.date)) : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="border-t pt-3">
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                    Close / बंद करें
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

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
                      Record an installment payment for {selectedRecord?.applicantName} ({selectedRecord?.formNumber})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="text-muted-foreground block">Current Pending Due:</span>
                    <span className="font-bold text-base text-[#F57C00]">
                      ₹{(Number(selectedRecord?.pendingAmount) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Badge variant="outline">Form: {selectedRecord?.formNumber}</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instAmount">Installment Amount (राशि ₹) *</Label>
                  <Input
                    id="instAmount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter installment amount in ₹"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instDate">Payment Date (दिनांक) *</Label>
                  <Input
                    id="instDate"
                    type="date"
                    value={installmentDate}
                    onChange={(e) => setInstallmentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="instMode">Payment Mode (भुगतान माध्यम) *</Label>
                  <select
                    id="instMode"
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
                  <Label htmlFor="instNote">Remarks / टिप्पणी (Optional)</Label>
                  <Input
                    id="instNote"
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
                  Cancel / रद्द करें
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingInstallment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  {isSubmittingInstallment ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      Save Installment / किश्त दर्ज करें
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will safely soft-delete the Janni Delivery registration record. You can restore it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel / रद्द करें</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete Record / हटाएं"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
