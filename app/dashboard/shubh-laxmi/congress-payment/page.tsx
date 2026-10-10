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
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Eye,
  IndianRupee,
  Plus,
  Receipt,
  FileText,
  Sparkles,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  ShubhLaxmiService,
  ShubhLaxmiRegistration,
} from "@/lib/shubh-laxmi-service";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function ShubhLaxmiCongressPaymentPage() {
  const [registrations, setRegistrations] = useState<ShubhLaxmiRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAddressFilter, setCurrentAddressFilter] = useState("all");

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<ShubhLaxmiRegistration | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [paymentAmount] = useState("300"); // Fixed ₹300 per installment
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

      const res = await ShubhLaxmiService.getAllRegistrations(filters);
      if (res && res.data) {
        setRegistrations(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load ShubhLaxmi Congress payments:", err);
      toast.error(err.message || "रिकॉर्ड लोड करने में विफल / Failed to load records");
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

  const handleOpenPaymentModal = (record: ShubhLaxmiRegistration) => {
    setSelectedRecord(record);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("CASH");
    setReceiptNumber("");
    setPaymentNote("");
    setIsPaymentModalOpen(true);
  };

  const handleOpenDetailsModal = async (record: ShubhLaxmiRegistration) => {
    setSelectedRecord(record);
    setIsDetailsModalOpen(true);
    try {
      const updated = await ShubhLaxmiService.getRegistrationById(record.id);
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
      await ShubhLaxmiService.addInstallment(selectedRecord.id, {
        amount: amt,
        date: paymentDate,
        paymentMode,
        rashidNumber: receiptNumber || undefined,
        note: [receiptNumber ? `रसीद क्र: ${receiptNumber}` : "", paymentNote]
          .filter(Boolean)
          .join(" | ") || undefined,
      });

      toast.success("शुभलक्ष्मी किश्त भुगतान दर्ज किया गया / Payment recorded successfully");
      setIsPaymentModalOpen(false);
      setReceiptNumber("");
      setPaymentNote("");
      fetchRegistrations();

      // Refresh detail modal if open
      const updated = await ShubhLaxmiService.getRegistrationById(selectedRecord.id);
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
        toast.error("निर्यात के लिए कोई डेटा नहीं / No data to export");
        return;
      }

      const excelData = registrations.map((record) => {
        const fee = Number(record.membershipFee || 3100);
        const totalPaid = (record.installments || []).reduce(
          (acc, i) => acc + Number(i.amount || 0),
          0
        );
        return {
          "फॉर्म संख्या": record.formNumber,
          "आवेदन तिथि": record.applicationDate,
          "आवेदक का नाम": record.applicantName,
          "पिता का नाम": record.fatherName,
          "पति का नाम": record.husbandName || "",
          "मोबाइल": record.mobile,
          "जिला": record.district,
          "सदस्यता शुल्क": fee,
          "कुल जमा किश्त राशि": totalPaid,
          "कुल किश्तें (₹300)": (record.installments || []).length,
          "स्थिति": (record.installments || []).length > 0 ? "किश्त जारी" : "प्रारंभिक",
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ShubhLaxmi Congress Payment");
      XLSX.writeFile(wb, `shubh_laxmi_congress_payment_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  };

  const columns = [
    {
      key: "formNumber",
      label: "फॉर्म संख्या",
      className: "min-w-[120px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => (
        <span className="font-mono text-xs font-semibold text-[#0B4A8F]">
          {row.formNumber || "—"}
        </span>
      ),
    },
    {
      key: "applicationDate",
      label: "आवेदन तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) =>
        row.applicationDate ? formatDate(row.applicationDate) : "—",
    },
    {
      key: "applicantName",
      label: "आवेदक का नाम",
      className: "min-w-[150px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => (
        <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
          {row.applicantName}
        </span>
      ),
    },
    {
      key: "fatherName",
      label: "पिता / पति का नाम",
      className: "min-w-[140px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) =>
        row.fatherName || row.husbandName || "—",
    },
    { key: "mobile", label: "मोबाइल", className: "min-w-[110px]" },
    { key: "district", label: "जिला", className: "min-w-[100px]" },
    {
      key: "membershipFee",
      label: "सदस्यता शुल्क",
      className: "min-w-[100px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) =>
        `₹${Number(row.membershipFee || 3100).toLocaleString("en-IN")}`,
    },
    {
      key: "totalPaid",
      label: "जमा किश्त राशि",
      className: "min-w-[110px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => {
        const total = (row.installments || []).reduce(
          (acc, i) => acc + Number(i.amount || 0),
          0
        );
        return (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            ₹{total.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      key: "installmentsCount",
      label: "किश्तें",
      className: "min-w-[80px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => (
        <Badge variant="outline" className="text-[10px] font-mono">
          {(row.installments || []).length} किश्त
        </Badge>
      ),
    },
    {
      key: "payment_status",
      label: "स्थिति",
      className: "min-w-[100px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => {
        const count = (row.installments || []).length;
        if (count > 0) {
          return (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
              किश्त जारी ({count})
            </Badge>
          );
        }
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
            प्रारंभिक
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "कार्य",
      className: "min-w-[120px]",
      render: (_: unknown, row: ShubhLaxmiRegistration) => (
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
                <p>₹300 किश्त दर्ज करें</p>
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
                <p>किश्त विवरण व इतिहास देखें</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <RoleGuard requiredModule="shubh_laxmi" requiredAction="view">
      <>
        <DataTable
          data={registrations}
          columns={columns}
          title="शुभलक्ष्मी बधाई पत्र (ShubhLaxmi Congress Payment)"
          subtitle="शुभलक्ष्मी योजना बधाई पत्र सूची व सहायता किश्त रिकॉर्ड"
          addNewUrl="/dashboard/shubh-laxmi/add"
          addNewLabel="Add New ShubhLaxmi"
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
          module="shubh_laxmi"
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

        {/* ── Modal 1: Record Installment ────────────────────── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                <span>शुभलक्ष्मी किश्त भुगतान दर्ज करें</span>
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
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount" className="text-xs font-semibold">
                    किश्त राशि / Fixed Installment (₹)
                  </Label>
                  <Input
                    id="payAmount"
                    type="number"
                    value={paymentAmount}
                    readOnly
                    className="bg-muted/50 font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    शुभलक्ष्मी योजना अनुसार निर्धारित किश्त राशि: ₹300
                  </p>
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
                    placeholder="किश्त संबंधी टिप्पणी दर्ज करें..."
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
                    {isSubmitting ? "सहेज रहे हैं..." : "किश्त दर्ज करें (₹300)"}
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
                <span>शुभलक्ष्मी किश्त विवरण व इतिहास लेज़र</span>
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
                    <span className="text-muted-foreground">आवेदक का नाम:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.applicantName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">पिता/पति:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.fatherName || selectedRecord.husbandName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">मोबाइल:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.mobile || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">सदस्यता शुल्क:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ₹{Number(selectedRecord.membershipFee || 3100).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">पता:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedRecord.address || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">जिला:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.district || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल जमा किश्त राशि</span>
                    <p className="text-base font-bold text-emerald-600">
                      ₹{(selectedRecord.installments || []).reduce((acc, i) => acc + Number(i.amount || 0), 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">दर्ज किश्तों की संख्या (₹300)</span>
                    <p className="text-base font-bold text-[#0B4A8F]">
                      {(selectedRecord.installments || []).length} किश्तें
                    </p>
                  </div>
                </div>

                {/* Installments History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-[#0B4A8F]" />
                      <span>किश्त भुगतान इतिहास (Fixed ₹300)</span>
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
                      <span>नई किश्त दर्ज करें</span>
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
                      अभी तक कोई किश्त दर्ज नहीं की गई है
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
