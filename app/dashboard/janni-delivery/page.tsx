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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  Receipt,
  User,
  Baby,
  Calendar,
  MapPin,
  IndianRupee,
  ShieldCheck,
  KeyRound,
  FileText,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { JanniDeliveryService, JanniDeliveryRegistration } from "@/lib/janni-delivery-service";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";
import { agentRegistrationAPI } from "@/lib/api";

interface ResolvedAgentOfflineNumbers {
  workerOfflineFormNumber: string;
  seniorOfflineFormNumber: string;
  workerMobile?: string;
  workerName?: string;
  seniorName?: string;
}

function resolveAgentOfflineNumbers(
  record: JanniDeliveryRegistration & Record<string, any>,
  agentsList: any[] = []
): ResolvedAgentOfflineNumbers {
  let workerOffline = String(
    record.workerOfflineFormNumber ||
    record.worker_offline_form_number ||
    record.agentOfflineFormNumber ||
    record.agent_offline_form_number ||
    ""
  ).trim();

  let seniorOffline = String(
    record.seniorOfflineFormNumber ||
    record.senior_offline_form_number ||
    record.seniorAgentOfflineFormNumber ||
    record.senior_agent_offline_form_number ||
    ""
  ).trim();

  if (workerOffline && seniorOffline) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline };
  }

  if (!agentsList || agentsList.length === 0) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline };
  }

  const agentById = new Map<string, any>();
  const agentByCode = new Map<string, any>();

  for (const agent of agentsList) {
    const ids = [
      agent.id,
      agent.userId,
      agent.user_id,
      agent.agentProfile?.id,
      agent.agentProfile?.userId,
      agent.agentProfile?.user_id,
      agent.agent_profile?.id,
      agent.agent_profile?.user_id,
    ].filter(Boolean);

    ids.forEach((id) => {
      const normalized = String(id).trim();
      if (normalized) agentById.set(normalized, agent);
    });

    const empIds = [
      agent.employeeId,
      agent.employee_id,
      agent.agentProfile?.employeeId,
      agent.agent_profile?.employee_id,
      agent.agentCode,
      agent.agent_code,
      agent.code,
    ].filter(Boolean);

    empIds.forEach((emp) => {
      const normalized = String(emp).trim().toUpperCase();
      if (normalized) agentByCode.set(normalized, agent);
    });
  }

  const targetWorkerId = String(
    record.addedById ||
    record.addedby_id ||
    record.selectedAgentId ||
    record.agentId ||
    record.addedBy?.id ||
    record.agent?.id ||
    ""
  ).trim();

  const targetWorkerCode = String(
    record.workerCode ||
    record.worker_code ||
    record.agentCode ||
    record.agent_code ||
    record.added_code ||
    record.addedBy?.employee_id ||
    (record.addedBy as any)?.agentCode ||
    (record.addedBy as any)?.code ||
    ""
  ).trim().toUpperCase();

  const workerAgent = (targetWorkerId && agentById.get(targetWorkerId)) || (targetWorkerCode && agentByCode.get(targetWorkerCode));

  if (workerAgent && !workerOffline) {
    workerOffline = String(
      workerAgent.offlineFormNumber ||
      workerAgent.offline_form_number ||
      workerAgent.agentProfile?.offlineFormNumber ||
      workerAgent.agent_profile?.offline_form_number ||
      workerAgent.agentProfile?.offline_form_no ||
      workerAgent.offlineFormNo ||
      workerAgent.user?.offlineFormNumber ||
      workerAgent.user?.offline_form_number ||
      ""
    ).trim();
  }

  let seniorAgent: any = null;

  if (workerAgent) {
    const parentSeniorId = String(
      workerAgent.parentAgentId ||
      workerAgent.parent_agent_id ||
      workerAgent.seniorId ||
      workerAgent.senior_id ||
      workerAgent.agentProfile?.parentAgentId ||
      workerAgent.agent_profile?.parent_agent_id ||
      workerAgent.agentProfile?.seniorId ||
      workerAgent.agent_profile?.senior_id ||
      ""
    ).trim();

    const parentSeniorCode = String(
      workerAgent.seniorEmployeeId ||
      workerAgent.senior_employee_id ||
      workerAgent.parentEmployeeId ||
      workerAgent.parent_employee_id ||
      workerAgent.seniorCode ||
      workerAgent.senior_code ||
      workerAgent.agentProfile?.seniorEmployeeId ||
      workerAgent.agent_profile?.senior_employee_id ||
      workerAgent.agentProfile?.seniorCode ||
      workerAgent.agent_profile?.senior_code ||
      ""
    ).trim().toUpperCase();

    if (parentSeniorId && agentById.has(parentSeniorId)) {
      seniorAgent = agentById.get(parentSeniorId);
    } else if (parentSeniorCode && parentSeniorCode !== "ADMIN" && parentSeniorCode !== "SUPER ADMIN" && agentByCode.has(parentSeniorCode)) {
      seniorAgent = agentByCode.get(parentSeniorCode);
    }
  }

  if (!seniorAgent) {
    const targetSeniorCode = String(
      record.seniorCode ||
      record.senior_code ||
      record.seniorWorker ||
      record.senior_worker ||
      ""
    ).trim().toUpperCase();

    if (targetSeniorCode && targetSeniorCode !== "ADMIN" && targetSeniorCode !== "SUPER ADMIN" && agentByCode.has(targetSeniorCode)) {
      seniorAgent = agentByCode.get(targetSeniorCode);
    }
  }

  if (seniorAgent && !seniorOffline) {
    seniorOffline = String(
      seniorAgent.offlineFormNumber ||
      seniorAgent.offline_form_number ||
      seniorAgent.agentProfile?.offlineFormNumber ||
      seniorAgent.agent_profile?.offline_form_number ||
      seniorAgent.agentProfile?.offline_form_no ||
      seniorAgent.offlineFormNo ||
      seniorAgent.user?.offlineFormNumber ||
      seniorAgent.user?.offline_form_number ||
      ""
    ).trim();
  }

  const workerMobile = String(
    (workerAgent && (
      workerAgent.mobile ||
      workerAgent.phone ||
      workerAgent.contactNumber ||
      workerAgent.agentProfile?.mobile ||
      workerAgent.agent_profile?.mobile ||
      workerAgent.user?.mobile ||
      workerAgent.user?.phone
    )) ||
    record.addedBy?.mobile ||
    record.added_mobile ||
    record.workerMobile ||
    record.agentMobile ||
    ""
  ).trim();

  const workerName = String(
    (workerAgent && (
      workerAgent.name ||
      workerAgent.agentProfile?.name ||
      workerAgent.agent_profile?.name ||
      workerAgent.fullName ||
      workerAgent.user?.name
    )) ||
    record.addedBy?.name ||
    record.workerName ||
    record.agentName ||
    ""
  ).trim();

  const seniorName = String(
    (seniorAgent && (
      seniorAgent.name ||
      seniorAgent.agentProfile?.name ||
      seniorAgent.agent_profile?.name ||
      seniorAgent.fullName ||
      seniorAgent.user?.name
    )) ||
    record.seniorName ||
    record.senior_name ||
    ""
  ).trim();

  return {
    workerOfflineFormNumber: workerOffline,
    seniorOfflineFormNumber: seniorOffline,
    workerMobile,
    workerName,
    seniorName,
  };
}

export default function JanniDeliveryListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<JanniDeliveryRegistration[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAddressFilter, setCurrentAddressFilter] = useState("all");
  const [currentGenderFilter, setCurrentGenderFilter] = useState("all");

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

  // Fetch agents list once on mount for hierarchy resolution
  useEffect(() => {
    let mounted = true;
    agentRegistrationAPI
      .getAll()
      .then((res: any) => {
        if (mounted && res && res.data && Array.isArray(res.data)) {
          setAgentsList(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not load agents list for Janni Delivery:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
      console.error("Failed to load Janni Delivery registrations:", err);
      toast.error(err.message || "Failed to load registrations / पंजीकरण लोड करने में विफल");
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

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
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

  const handleOpenViewModal = (record: JanniDeliveryRegistration) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
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

  const handleGeneratePDFForm = async (record: JanniDeliveryRegistration) => {
    try {
      toast.loading("Generating PDF Form...", { id: "pdf-form" });
      const response = await fetch("/api/generate-janni-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Janni_Application_${record.formNumber || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF Form generated successfully", { id: "pdf-form" });
    } catch (error: any) {
      toast.error(error.message || "Failed to generate PDF", { id: "pdf-form" });
    }
  };

  const handleGenerateBond = async (record: JanniDeliveryRegistration) => {
    try {
      toast.loading("Generating Bond PDF...", { id: "bond-pdf" });
      const resolvedAgentDetails = resolveAgentOfflineNumbers(record, agentsList);
      const enrichedRecord = {
        ...record,
        ...resolvedAgentDetails,
        workerOfflineFormNumber:
          resolvedAgentDetails.workerOfflineFormNumber ||
          (record as any).workerOfflineFormNumber ||
          (record as any).worker_offline_form_number ||
          (record as any).agentOfflineFormNumber ||
          "",
        seniorOfflineFormNumber:
          resolvedAgentDetails.seniorOfflineFormNumber ||
          (record as any).seniorOfflineFormNumber ||
          (record as any).senior_offline_form_number ||
          (record as any).seniorAgentOfflineFormNumber ||
          "",
        workerMobile:
          resolvedAgentDetails.workerMobile ||
          record.addedBy?.mobile ||
          (record as any).workerMobile ||
          (record as any).agentMobile ||
          "",
      };

      const response = await fetch("/api/generate-janni-bond-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: enrichedRecord }),
      });
      if (!response.ok) throw new Error("Failed to generate Bond PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Janni_Bond_${record.formNumber || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Bond PDF generated successfully", { id: "bond-pdf" });
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Bond PDF", { id: "bond-pdf" });
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
        "पति का नाम": record.husbandName || "",
        "आयु": record.age || "",
        "गोत्र": record.gotra,
        "आधार": record.aadharNumber,
        "मोबाइल": record.mobile,
        "पता": record.address,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "पिन कोड": record.pinCode,
        "शिशु का नाम": record.childName || "",
        "शिशु का लिंग": record.childGender || "",
        "प्रसूति तिथि": record.deliveryDate || "",
        "अस्पताल": record.hospitalName || "",
        "नॉमिनी का नाम": record.nomineeName || "",
        "नॉमिनी संबंध": record.nomineeRelation || "",
        "कुल सहायता": record.totalAmount,
        "लंबित राशि": record.pendingAmount,
        "ई-पिन": record.epinCode || "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Janni Registrations");
      XLSX.writeFile(wb, `janni_registrations_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      label: "नाम",
      className: "min-w-[150px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => (
        <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
          {row.applicantName}
        </span>
      ),
    },
    {
      key: "fatherName",
      label: "पिता का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.fatherName || "—",
    },
    {
      key: "husbandName",
      label: "पति का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.husbandName || "—",
    },
    {
      key: "dateOfBirth",
      label: "जन्म तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        row.dateOfBirth ? formatDate(row.dateOfBirth) : "—",
    },
    {
      key: "age",
      label: "आयु",
      className: "min-w-[70px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        row.age ? `${row.age}` : "—",
    },
    { key: "gotra", label: "गोत्र", className: "min-w-[90px]" },
    { key: "aadharNumber", label: "आधार", className: "min-w-[120px]" },
    { key: "mobile", label: "मोबाइल", className: "min-w-[110px]" },
    { key: "address", label: "पता", className: "min-w-[160px]" },
    { key: "tehsil", label: "तहसील", className: "min-w-[100px]" },
    { key: "district", label: "जिला", className: "min-w-[100px]" },
    {
      key: "childName",
      label: "शिशु का नाम",
      className: "min-w-[120px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.childName || "—",
    },
    {
      key: "childGender",
      label: "शिशु लिंग",
      className: "min-w-[90px]",
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
    {
      key: "nomineeName",
      label: "नॉमिनी का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.nomineeName || "—",
    },
    {
      key: "nomineeRelation",
      label: "नॉमिनी संबंध",
      className: "min-w-[110px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => row.nomineeRelation || "—",
    },
    {
      key: "totalAmount",
      label: "कुल सहायता",
      className: "min-w-[100px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        `₹${Number(row.totalAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "pendingAmount",
      label: "बकाया राशि",
      className: "min-w-[100px]",
      render: (_: unknown, row: JanniDeliveryRegistration) =>
        `₹${Number(row.pendingAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "custom_actions",
      label: "कार्य",
      className: "min-w-[150px]",
      render: (_: unknown, row: JanniDeliveryRegistration) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleGeneratePDFForm(row)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate PDF Form</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => router.push(`/dashboard/janni-delivery/${row.id}`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleGenerateBond(row)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate Bond PDF</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDeleteClick(row.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
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
          title="जननी प्रसूति पंजीकरण (Janni Delivery Registration)"
          subtitle="जननी प्रसूति फॉर्म पंजीकरण संभालें"
          addNewUrl="/dashboard/janni-delivery/add"
          addNewLabel="Add New Janni"
          onDelete={handleDeleteClick}
          editUrlPattern="/dashboard/janni-delivery/edit/[id]"
          showActionsColumn={false}
          searchFields={["applicantName", "mobile", "aadharNumber", "formNumber"]}
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

        {/* ── Modal 1: View Details Modal ────────────────────────────── */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#0B4A8F]" />
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
                {/* Mother Details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <User className="h-3.5 w-3.5 text-[#0B4A8F]" />
                    <span>माता / आवेदक का विवरण</span>
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
                      <span className="text-muted-foreground">जन्म तिथि / आयु:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedRecord.dateOfBirth ? formatDate(selectedRecord.dateOfBirth) : "—"} {selectedRecord.age ? `(${selectedRecord.age} वर्ष)` : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">गोत्र:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.gotra}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">आधार / मोबाइल:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.aadharNumber} / {selectedRecord.mobile}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-muted-foreground">पता:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {[selectedRecord.address, selectedRecord.tehsil, selectedRecord.district, selectedRecord.state, selectedRecord.pinCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery & Child Details */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Baby className="h-3.5 w-3.5 text-blue-600" />
                    <span>प्रसूति एवं शिशु विवरण</span>
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
                      <span className="text-muted-foreground">अस्पताल:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.hospitalName || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Nominee Details */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>नॉमिनी विवरण</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-muted-foreground">नाम:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">संबंध:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeRelation || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">मोबाइल:</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRecord.nomineeMobile || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">कुल सहायता</span>
                    <p className="text-base font-bold text-[#0B4A8F]">
                      ₹{Number(selectedRecord.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">भुगतान राशि</span>
                    <p className="text-base font-bold text-emerald-600">
                      ₹{(Number(selectedRecord.totalAmount || 0) - Number(selectedRecord.pendingAmount || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">शेष बकाया</span>
                    <p className="text-base font-bold text-amber-600">
                      ₹{Number(selectedRecord.pendingAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Installments Table */}
                {selectedRecord.installments && selectedRecord.installments.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                      किश्त भुगतान इतिहास
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                          <TableRow>
                            <TableHead className="text-[11px] py-1.5">#</TableHead>
                            <TableHead className="text-[11px] py-1.5">तिथि</TableHead>
                            <TableHead className="text-[11px] py-1.5">माध्यम</TableHead>
                            <TableHead className="text-[11px] py-1.5">रसीद / विवरण</TableHead>
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
              <AlertDialogTitle>पंजीकरण हटाएं</AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप वाकई इस जननी प्रसूति पंजीकरण रिकॉर्ड को हटाना चाहते हैं?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>रद्द करें</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? "हटा रहे हैं..." : "हाँ, हटाएं"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGuard>
  );
}
