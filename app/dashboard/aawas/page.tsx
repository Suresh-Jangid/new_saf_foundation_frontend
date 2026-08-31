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
  Home,
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
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { AawasService, AawasRegistration } from "@/lib/aawas-service";
import { formatDate } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";

export default function AawasListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<AawasRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<AawasRegistration | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Installment Modal State
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("1000");
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

      const res = await AawasService.getAllRegistrations(filters);
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
      console.error("Failed to load Aawas registrations:", err);
      toast.error(err.message || "आवास पंजीकरण सूची लोड करने में विफल / Failed to load records");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedCategory, selectedDistrict]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const handleOpenViewModal = (record: AawasRegistration) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleOpenInstallmentModal = (record: AawasRegistration) => {
    setSelectedRecord(record);
    setInstallmentAmount("1000"); // Scheme standard installment = ₹1,000
    setInstallmentDate(new Date().toISOString().split("T")[0]);
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
      await AawasService.addInstallment(selectedRecord.id, {
        amount: amt,
        date: installmentDate,
        paymentMode: installmentPaymentMode,
        note: installmentNote || undefined,
      });

      toast.success("किश्त भुगतान सफलतापूर्वक दर्ज किया गया / Installment recorded successfully");
      setIsInstallmentModalOpen(false);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "किश्त दर्ज करने में त्रुटि / Failed to record installment");
    } finally {
      setIsSubmittingInstallment(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await AawasService.deleteRegistration(recordToDelete);
      toast.success("आवास पंजीकरण सफलतापूर्वक हटा दिया गया / Record deleted successfully");
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message || "रिकॉर्ड हटाने में त्रुटि / Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RoleGuard requiredModule="aawas" requiredAction="view">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-[#0B4A8F]">
                <Home className="h-6 w-6 text-[#0B4A8F]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  गृह प्रवेश आवास योजना (Aawas Registration)
                </h1>
                <p className="text-sm text-muted-foreground">
                  आवास योजना पंजीकरण प्रबंधन एवं किश्त विवरण (Total Benefit: ₹15,000 | Installment: ₹1,000)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRegistrations}
              disabled={isLoading}
              className="gap-1 text-xs sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              रीफ़्रेश / Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/aawas/add")}
              className="bg-[#0B4A8F] hover:bg-[#0D5EB3] text-white gap-1 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              नया आवास आवेदन / New Application
            </Button>
          </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#0B4A8F] shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                कुल आवास आवेदन / Total Applications
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-between">
                <span>{summary.totalRecords}</span>
                <FileText className="h-5 w-5 text-blue-600/70" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">कुल पंजीकृत लाभार्थी</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                योजना अनुदान राशि / Total Benefit Value
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
                <span>₹{(summary.totalAmount || summary.totalRecords * 15000).toLocaleString("en-IN")}</span>
                <DollarSign className="h-5 w-5 text-emerald-600/70" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">₹15,000 प्रति लाभार्थी अनुदान</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                मानक किश्त राशि / Standard Installment
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600 flex items-center justify-between">
                <span>₹1,000</span>
                <Receipt className="h-5 w-5 text-amber-500/70" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">प्रति किश्त भुगतान राशि</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                आयु सीमा / Age Restriction
              </CardDescription>
              <CardTitle className="text-xl font-bold text-purple-700 dark:text-purple-400 flex items-center justify-between">
                <span>कोई सीमा नहीं (None)</span>
                <ShieldCheck className="h-5 w-5 text-purple-600/70" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">सभी आयु वर्ग हेतु मान्य</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="नाम, मोबाइल, आधार, फॉर्म नंबर या गोत्र द्वारा खोजें... / Search by name, mobile, aadhar, form..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">सभी वर्ग (All Categories)</option>
                  <option value="A">वर्ग A (Category A)</option>
                  <option value="B">वर्ग B (Category B)</option>
                  <option value="C">वर्ग C (Category C)</option>
                  <option value="D">वर्ग D (Category D)</option>
                  <option value="E">वर्ग E (Category E)</option>
                  <option value="F">वर्ग F (Category F)</option>
                </select>

                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">सभी जिले (All Districts)</option>
                  <option value="Jodhpur">जोधपुर (Jodhpur)</option>
                  <option value="Jaipur">जयपुर (Jaipur)</option>
                  <option value="Nagaur">नागौर (Nagaur)</option>
                  <option value="Pali">पाली (Pali)</option>
                  <option value="Bikaner">बीकानेर (Bikaner)</option>
                  <option value="Barmer">बाड़मेर (Barmer)</option>
                  <option value="Ajmer">अजमेर (Ajmer)</option>
                </select>

                <Button type="submit" size="sm" className="bg-[#0B4A8F] hover:bg-[#0D5EB3] text-white">
                  <Filter className="h-4 w-4 mr-1" />
                  फ़िल्टर लागू करें
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Listing Table */}
        <Card className="shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-100 dark:bg-slate-800 border-b">
                <tr>
                  <th className="px-4 py-3">फॉर्म नंबर (Form No)</th>
                  <th className="px-4 py-3">आवेदन तिथि (Date)</th>
                  <th className="px-4 py-3">आवेदक विवरण (Applicant)</th>
                  <th className="px-4 py-3">पिता / पति (Father / Husband)</th>
                  <th className="px-4 py-3">संपर्क व आधार (Contact)</th>
                  <th className="px-4 py-3">स्थान (District / Tehsil)</th>
                  <th className="px-4 py-3 text-right">कुल अनुदान (Benefit)</th>
                  <th className="px-4 py-3 text-right">बकाया (Pending)</th>
                  <th className="px-4 py-3 text-center">क्रियाएं (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0B4A8F]" />
                      आवास पंजीकरण डेटा लोड हो रहा है... / Loading registrations...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      कोई आवास पंजीकरण रिकॉर्ड नहीं मिला / No Aawas registration records found.
                    </td>
                  </tr>
                ) : (
                  registrations.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0B4A8F] whitespace-nowrap">
                        {rec.formNumber}
                        {rec.epinCode && (
                          <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                            E-PIN
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {rec.applicationDate ? formatDate(new Date(rec.applicationDate)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{rec.applicantName}</div>
                        <div className="text-xs text-muted-foreground">
                          {rec.gender || "—"} • गोत्र: {rec.gotra || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{rec.fatherName}</div>
                        {rec.husbandName && (
                          <div className="text-muted-foreground">पति: {rec.husbandName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{rec.mobile}</div>
                        <div className="text-muted-foreground">
                          XXXX-XXXX-{rec.aadharNumber ? rec.aadharNumber.slice(-4) : "XXXX"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{rec.district}</div>
                        <div className="text-muted-foreground">{rec.tehsil}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        ₹{(Number(rec.totalAmount) || 15000).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">
                        ₹{(Number(rec.pendingAmount) || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="विवरण देखें / View Details"
                            onClick={() => router.push(`/dashboard/aawas/${rec.id}`)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="किश्त दर्ज करें / Record Installment"
                            onClick={() => handleOpenInstallmentModal(rec)}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>

                          {isAdmin() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="हटाएं / Delete"
                              onClick={() => {
                                setRecordToDelete(rec.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
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
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-t">
              <div className="text-xs text-muted-foreground">
                कुल रिकॉर्ड: <span className="font-semibold">{totalCount}</span> • पृष्ठ{" "}
                <span className="font-semibold">{page}</span> / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  पिछला / Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-8 text-xs"
                >
                  अगला / Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Installment Payment Modal */}
        <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-emerald-600" />
                किश्त भुगतान दर्ज करें (Record Installment)
              </DialogTitle>
              <DialogDescription>
                आवेदक: <span className="font-semibold text-gray-900">{selectedRecord?.applicantName}</span> (फॉर्म: {selectedRecord?.formNumber})
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddInstallment} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="installmentAmount">किश्त राशि (Installment Amount) *</Label>
                <Input
                  id="installmentAmount"
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
                <Label htmlFor="installmentDate">भुगतान तिथि (Payment Date) *</Label>
                <Input
                  id="installmentDate"
                  type="date"
                  required
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="installmentPaymentMode">भुगतान प्रकार (Payment Mode) *</Label>
                <select
                  id="installmentPaymentMode"
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
                <Label htmlFor="installmentNote">टिप्पणी / विवरण (Note / Remarks)</Label>
                <Input
                  id="installmentNote"
                  value={installmentNote}
                  onChange={(e) => setInstallmentNote(e.target.value)}
                  placeholder="रसीद नंबर या अतिरिक्त विवरण..."
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

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                क्या आप वाकई यह आवास रिकॉर्ड हटाना चाहते हैं?
              </AlertDialogTitle>
              <AlertDialogDescription>
                यह क्रिया इस आवास आवेदन को सुरक्षित रूप से हटा देगी (Soft-delete)। यह रिकॉर्ड केवल अधिकृत एडमिन द्वारा पुनर्प्राप्त किया जा सकेगा।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>रद्द करें / Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? "हटाया जा रहा है..." : "हाँ, हटाएं / Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
