"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Eye,
  IndianRupee,
  Plus,
  Receipt,
  User,
  Baby,
  FileText,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function JanniCongressPaymentPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<JanniDeliveryRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAddressFilter, setCurrentAddressFilter] = useState("all");

  // Modals state
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

  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {
        limit: 1000,
      };
      if (currentAddressFilter !== "all") {
        filters.district = currentAddressFilter;
      }

      const res = await JanniDeliveryService.getAllRegistrations(filters);
      if (res && res.data) {
        setRegistrations(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load Janni Delivery payments:", err);
      toast.error(err.message || "Failed to load records / रिकॉर्ड लोड करने में विफल");
    } finally {
      setIsLoading(false);
    }
  }, [currentAddressFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Distinct addresses/districts for filter dropdown
  const uniqueAddresses = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => {
      if (r.district && r.district.trim()) set.add(r.district.trim());
      else if (r.address && r.address.trim()) set.add(r.address.trim());
    });
    return Array.from(set).sort();
  }, [registrations]);

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
      // Keep existing record
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

      toast.success("बधाई सहायता भुगतान दर्ज किया गया / Payment recorded successfully");
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setReceiptNumber("");
      setPaymentNote("");
      fetchRegistrations();

      // Refresh detail modal if open
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
      if (registrations.length === 0) {
        toast.error("No data to export / निर्यात के लिए कोई डेटा नहीं");
        return;
      }

      const excelData = registrations.map((record) => {
        const total = Number(record.totalAmount) || 0;
        const pending = Number(record.pendingAmount) || 0;
        const paid = total - pending;
        return {
          "फॉर्म संख्या": record.formNumber,
          "आवेदन तिथि": record.applicationDate,
          "माता का नाम": record.applicantName,
          "पिता का नाम": record.fatherName,
          "पति का नाम": record.husbandName || "",
          "शिशु का नाम": record.childName || "",
          "शिशु का लिंग": record.childGender || "",
          "प्रसूति तिथि": record.deliveryDate || "",
          "अस्पताल": record.hospitalName || "",
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

  const columns = [
    {
      key: "formNumber",
      label: "फॉर्म संख्या",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => (
        <span className="font-mono text-xs font-semibold text-[#0B4A8F]">
          {row.formNumber || "—"}
        </span>
      ),
    },
    {
      key: "applicationDate",
      label: "आवेदन तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        row.applicationDate ? formatDate(row.applicationDate) : "—",
    },
    {
      key: "applicantName",
      label: "आवेदक / माता का नाम",
      className: "min-w-[150px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => (
        <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
          {row.applicantName}
        </span>
      ),
    },
    {
      key: "husbandName",
      label: "पति / पिता का नाम",
      className: "min-w-[140px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        row.husbandName || row.fatherName || "—",
    },
    {
      key: "childName",
      label: "शिशु का नाम",
      className: "min-w-[120px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.childName || "—",
    },
    {
      key: "childGender",
      label: "शिशु लिंग",
      className: "min-w-[80px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.childGender || "—",
    },
    {
      key: "deliveryDate",
      label: "प्रसूति तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        row.deliveryDate ? formatDate(row.deliveryDate) : "—",
    },
    {
      key: "hospitalName",
      label: "अस्पताल",
      className: "min-w-[140px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.hospitalName || "—",
    },
    { key: "mobile", label: "मोबाइल", className: "min-w-[110px]" },
    { key: "district", label: "जिला", className: "min-w-[100px]" },
    {
      key: "totalAmount",
      label: "कुल सहायता",
      className: "min-w-[100px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        `₹${Number(row.totalAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "paidAmount",
      label: "भुगतान राशि",
      className: "min-w-[100px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => {
        const total = Number(row.totalAmount) || 0;
        const pending = Number(row.pendingAmount) || 0;
        return `₹${(total - pending).toLocaleString("en-IN")}`;
      },
    },
    {
      key: "pendingAmount",
      label: "शेष राशि",
      className: "min-w-[100px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        `₹${Number(row.pendingAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "payment_status",
      label: "भुगतान स्थिति",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => {
        const total = Number(row.totalAmount) || 0;
        const pending = Number(row.pendingAmount) || 0;
        const paid = total - pending;
        if (total > 0 && pending <= 0) {
          return (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
              पूर्ण भुगतान
            </Badge>
          );
        }
        if (paid > 0 && pending > 0) {
          return (
            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
              आंशिक भुगतान
            </Badge>
          );
        }
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
            लंबित
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "कार्य",
      className: "min-w-[120px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleOpenPaymentModal(row)}
                >
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>भुगतान दर्ज करें</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleOpenDetailsModal(row)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>विवरण व इतिहास देखें</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <RoleGuard requiredModule="janni_delivery" requiredAction="view">
      <>
        <DataTable
          data={registrations}
          columns={columns}
          title="जननी प्रसूति बधाई पत्र (Janni Congress Payment)"
          subtitle="जननी प्रसूति बधाई पत्र सूची व भुगतान रिकॉर्ड"
          addNewUrl="/dashboard/janni-delivery/add"
          addNewLabel="Add New Janni"
          showAddButton={false}
          onDelete={() => {}}
          editUrlPattern=""
          showActionsColumn={false}
          searchFields={["applicantName", "mobile", "formNumber", "district"]}
          itemsPerPage={10}
          showGenderFilter={false}
          showAddressFilter={true}
          addressField="district"
          onAddressFilterChange={(addr) => setCurrentAddressFilter(addr)}
          currentAddressFilter={currentAddressFilter}
          uniqueAddresses={uniqueAddresses}
          module="janni_delivery"
          headerActions={
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={registrations.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
          }
        />

        {/* ── Modal 1: Record Payment / Installment ────────────────────── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
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
                    रसीद / संदर्भ संख्या
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
                    टिप्पणी / विवरण
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
                    className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border text-xs">
                  <div>
                    <span className="text-muted-foreground">माता का नाम:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.applicantName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">पिता/पति:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.husbandName || selectedRecord.fatherName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">मोबाइल:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.mobile || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">शिशु विवरण:</span>
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
                </div>

                <div className="grid grid-cols-3 gap-3 text-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल सहायता</span>
                    <p className="text-base font-bold text-[#0B4A8F]">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल भुगतान</span>
                    <p className="text-base font-bold text-emerald-600">
                      ₹{(Number(selectedRecord.totalAmount || 0) - Number(selectedRecord.pendingAmount || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">शेष राशि</span>
                    <p className="text-base font-bold text-amber-600">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Installments History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-[#0B4A8F]" />
                      <span>किश्त / सहायता भुगतान इतिहास</span>
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
      </>
    </RoleGuard>
  );
}
