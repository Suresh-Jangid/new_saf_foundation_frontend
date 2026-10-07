"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { LadoBahinService, LadoBahinRegistration } from "@/lib/lado-bahin-service";
import { formatDate, getPhotoDataUrl } from "@/lib/utils";
import * as XLSX from "xlsx";
import { PdfActionButton } from "@/components/pdf-action-button";
import { agentRegistrationAPI } from "@/lib/api";
import { buildPdfFilename } from "@/lib/form-values";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, record: T) => React.ReactNode;
  className?: string;
}

interface ResolvedAgentOfflineNumbers {
  workerOfflineFormNumber: string;
  seniorOfflineFormNumber: string;
  workerMobile: string;
}

function resolveAgentOfflineNumbers(
  record: LadoBahinRegistration & Record<string, any>,
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

  let workerMobile = String(
    record.workerMobile ||
    record.worker_mobile ||
    record.agentMobile ||
    record.agent_mobile ||
    ""
  ).trim();

  const agentById = new Map<string, any>();
  const agentByCode = new Map<string, any>();
  const agentByName = new Map<string, any>();
  const agentByMobile = new Map<string, any>();

  if (agentsList && agentsList.length > 0) {
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

      const names = [
        agent.name,
        agent.fullName,
        agent.username,
        agent.user_name,
        agent.user?.name,
        agent.user?.username,
        agent.agentProfile?.name,
        agent.agentProfile?.username,
      ].filter(Boolean);

      names.forEach((n) => {
        const normalized = String(n).trim().toLowerCase();
        if (normalized && normalized !== "default agent" && normalized !== "admin") {
          agentByName.set(normalized, agent);
        }
      });

      const mobiles = [
        agent.mobile,
        agent.phone,
        agent.contactNumber,
        agent.agentProfile?.mobile,
        agent.agent_profile?.mobile,
        agent.user?.mobile,
      ].filter(Boolean);

      mobiles.forEach((m) => {
        const cleanMob = String(m).replace(/\D/g, "");
        if (cleanMob && cleanMob.length >= 10) {
          agentByMobile.set(cleanMob.slice(-10), agent);
        }
      });
    }
  }

  const targetWorkerId = String(
    record.addedById ||
    (record as any).addedby_id ||
    (record as any).selectedAgentId ||
    (record as any).agentId ||
    (record as any).agent_id ||
    (record as any).userId ||
    (record as any).user_id ||
    record.addedBy?.id ||
    (record.addedBy as any)?.userId ||
    (record.addedBy as any)?.user_id ||
    (record as any).agent?.id ||
    (record as any).agent?.userId ||
    (record as any).agent?.user_id ||
    ""
  ).trim();

  const targetWorkerCode = String(
    record.workerCode ||
    (record as any).worker_code ||
    (record as any).agentCode ||
    (record as any).agent_code ||
    (record as any).added_code ||
    record.addedBy?.employee_id ||
    (record.addedBy as any)?.employeeId ||
    (record.addedBy as any)?.agentCode ||
    (record.addedBy as any)?.code ||
    ""
  ).trim().toUpperCase();

  const targetWorkerName = String(
    (record as any).workerName ||
    (record as any).worker_name ||
    (record as any).added_name ||
    (record as any).addedby ||
    record.addedBy?.name ||
    (record as any).agent?.name ||
    ""
  ).trim().toLowerCase();

  const rawTargetMobile = String(
    record.workerMobile ||
    (record as any).worker_mobile ||
    (record as any).agentMobile ||
    (record as any).agent_mobile ||
    (record as any).added_mobile ||
    record.addedBy?.mobile ||
    ""
  ).replace(/\D/g, "");
  const targetWorkerMobile = rawTargetMobile.length >= 10 ? rawTargetMobile.slice(-10) : "";

  const workerAgent =
    (targetWorkerId && agentById.get(targetWorkerId)) ||
    (targetWorkerCode && agentByCode.get(targetWorkerCode)) ||
    (targetWorkerName && agentByName.get(targetWorkerName)) ||
    (targetWorkerMobile && agentByMobile.get(targetWorkerMobile));

  // Check if target is Default Agent / Admin
  const isDefaultAgent =
    (workerAgent && (
      String(workerAgent.employeeId || workerAgent.employee_id || "").toUpperCase() === "EMP-001" ||
      String(workerAgent.name || "").toLowerCase() === "default agent" ||
      String(workerAgent.mobile || "") === "8888888888"
    )) ||
    (!workerAgent && (
      targetWorkerCode === "ADMIN" ||
      targetWorkerName === "admin" ||
      targetWorkerName === "super admin" ||
      targetWorkerName === "default agent" ||
      targetWorkerMobile === "8888888888" ||
      targetWorkerMobile === "9999999999" ||
      (!targetWorkerId && !targetWorkerCode)
    ));

  if (isDefaultAgent) {
    if (!workerOffline) workerOffline = "ADMIN";
    if (!seniorOffline) seniorOffline = "ADMIN";
    if (!workerMobile) workerMobile = "8888888888";
  }

  if (workerAgent) {
    if (!workerOffline) {
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

    if (!workerMobile) {
      workerMobile = String(
        workerAgent.mobile ||
        workerAgent.phone ||
        workerAgent.contactNumber ||
        workerAgent.agentProfile?.mobile ||
        workerAgent.agent_profile?.mobile ||
        workerAgent.user?.mobile ||
        workerAgent.user?.phone ||
        ""
      ).trim();
    }

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
      workerAgent.uplineCode ||
      workerAgent.upline_code ||
      workerAgent.agentProfile?.seniorEmployeeId ||
      workerAgent.agent_profile?.senior_employee_id ||
      workerAgent.agentProfile?.seniorCode ||
      workerAgent.agent_profile?.senior_code ||
      workerAgent.agentProfile?.parentEmployeeId ||
      workerAgent.agent_profile?.parent_employee_id ||
      workerAgent.agentProfile?.uplineCode ||
      workerAgent.agent_profile?.upline_code ||
      ""
    ).trim().toUpperCase();

    let seniorAgent: any = null;
    if (parentSeniorId && agentById.has(parentSeniorId)) {
      seniorAgent = agentById.get(parentSeniorId);
    } else if (parentSeniorCode && parentSeniorCode !== "ADMIN" && parentSeniorCode !== "SUPER ADMIN" && agentByCode.has(parentSeniorCode)) {
      seniorAgent = agentByCode.get(parentSeniorCode);
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
    } else if (!seniorOffline && (workerAgent.seniorOfflineFormNumber || workerAgent.senior_offline_form_number)) {
      seniorOffline = String(workerAgent.seniorOfflineFormNumber || workerAgent.senior_offline_form_number).trim();
    } else if (!seniorOffline && (parentSeniorCode === "ADMIN" || !parentSeniorId)) {
      seniorOffline = "ADMIN";
    }
  }

  return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile };
}

export default function LadoBahinListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<LadoBahinRegistration[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAddressFilter, setCurrentAddressFilter] = useState("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {
        limit: 1000,
      };
      if (currentAddressFilter !== "all") {
        filters.district = currentAddressFilter;
      }

      const res = await LadoBahinService.getAllRegistrations(filters);
      if (res && res.data) {
        setRegistrations(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load Lado Bahin registrations:", err);
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
      await LadoBahinService.deleteRegistration(recordToDelete);
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

  // Load agents on component mount (matching General Marriage & Mayra reference pattern)
  useEffect(() => {
    let isMounted = true;
    const fetchAgents = async () => {
      try {
        const res = await agentRegistrationAPI.getAll();
        if (isMounted) {
          if (res && res.status && Array.isArray(res.data)) {
            setAgentsList(res.data);
          } else if (Array.isArray(res)) {
            setAgentsList(res);
          }
        }
      } catch (err) {
        console.warn("Could not pre-load agents list in Lado Bahin:", err);
      }
    };
    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGeneratePDFForm = async (record: LadoBahinRegistration) => {
    try {
      toast.loading("फॉर्म पीडीएफ जनरेट हो रहा है... / Generating PDF Form...", { id: "pdf-form" });

      // 1. Fresh fetch by ID to avoid stale or stripped list records
      let latestRecord: any = record;
      try {
        if (record?.id) {
          const freshRes = await LadoBahinService.getRegistrationById(String(record.id));
          if (freshRes && freshRes.data) {
            latestRecord = { ...record, ...freshRes.data };
          }
        }
      } catch (freshErr) {
        console.warn("Could not fetch fresh record for Lado Bahin PDF, using current record:", freshErr);
      }

      // 2. Ensure current agents list is available
      let currentAgents = agentsList;
      if (!currentAgents || currentAgents.length === 0) {
        try {
          const res = await agentRegistrationAPI.getAll();
          if (res && res.status && Array.isArray(res.data)) {
            currentAgents = res.data;
            setAgentsList(res.data);
          } else if (Array.isArray(res)) {
            currentAgents = res;
            setAgentsList(res);
          }
        } catch (e) {
          console.warn("Could not fetch agents for Lado Bahin PDF resolution:", e);
        }
      }

      // 3. Resolve agent and senior / upline codes
      const { workerOfflineFormNumber, seniorOfflineFormNumber, workerMobile } = resolveAgentOfflineNumbers(
        latestRecord,
        currentAgents
      );

      // 4. Resolve photos
      const photoSource = latestRecord.passportPhotoUrl || record.passportPhotoUrl || (record as any).passportPhoto || (record as any).photo || "";
      const nomineePhotoSource = latestRecord.nomineePhotoUrl || record.nomineePhotoUrl || (record as any).nomineePhoto || (record as any).nomineePassportPhoto || (record as any).nominee_photo || "";
      const [imageData, nomineeImageData] = await Promise.all([
        photoSource ? getPhotoDataUrl(photoSource) : null,
        nomineePhotoSource ? getPhotoDataUrl(nomineePhotoSource) : null,
      ]);

      const enrichedRecord = {
        ...record,
        ...latestRecord,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerCode: workerOfflineFormNumber,
        seniorCode: seniorOfflineFormNumber,
        uplineCode: seniorOfflineFormNumber,
        workerMobile: workerMobile || latestRecord.workerMobile || (record as any).workerMobile,
        passportPhoto: photoSource,
        passportPhotoUrl: photoSource,
        nomineePhoto: nomineePhotoSource,
        nomineePhotoUrl: nomineePhotoSource,
      };

      // 5. Send enriched payload to PDF route
      const response = await fetch("/api/generate-lado-bahin-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record: enrichedRecord,
          workerOfflineFormNumber,
          seniorOfflineFormNumber,
          workerCode: workerOfflineFormNumber,
          seniorCode: seniorOfflineFormNumber,
          uplineCode: seniorOfflineFormNumber,
          workerMobile: workerMobile || latestRecord.workerMobile || (record as any).workerMobile,
          imageData,
          nomineeImageData,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate PDF Form");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildPdfFilename(enrichedRecord, { prefix: "lado_bahin_form" });
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("फॉर्म पीडीएफ डाउनलोड हो गया / PDF Form generated", { id: "pdf-form" });
    } catch (err: any) {
      console.error("PDF Form error:", err);
      toast.error(err.message || "फॉर्म जनरेट करने में विफल", { id: "pdf-form" });
    }
  };

  const handleGenerateBond = async (record: LadoBahinRegistration) => {
    try {
      toast.loading("बॉन्ड पीडीएफ जनरेट हो रहा है... / Generating Bond PDF...", { id: "bond-pdf" });

      let currentAgents = agentsList;
      if (!currentAgents || currentAgents.length === 0) {
        try {
          const res = await agentRegistrationAPI.getAll();
          if (res && res.status && Array.isArray(res.data)) {
            currentAgents = res.data;
            setAgentsList(res.data);
          } else if (Array.isArray(res)) {
            currentAgents = res;
            setAgentsList(res);
          }
        } catch (e) {
          console.warn("Could not fetch agents for Lado Bahin Bond resolution:", e);
        }
      }

      const { workerOfflineFormNumber, seniorOfflineFormNumber, workerMobile } = resolveAgentOfflineNumbers(
        record,
        currentAgents
      );

      const photoDataUrl = record.passportPhotoUrl ? await getPhotoDataUrl(record.passportPhotoUrl) : null;
      const enrichedBondRecord = {
        ...record,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerCode: workerOfflineFormNumber,
        seniorCode: seniorOfflineFormNumber,
        uplineCode: seniorOfflineFormNumber,
        workerMobile,
        imageData: photoDataUrl || (record as any).imageData,
      };

      const response = await fetch("/api/generate-lado-bahin-bond-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record: enrichedBondRecord,
          workerOfflineFormNumber,
          seniorOfflineFormNumber,
          workerCode: workerOfflineFormNumber,
          seniorCode: seniorOfflineFormNumber,
          uplineCode: seniorOfflineFormNumber,
          workerMobile,
          imageData: photoDataUrl || (record as any).imageData,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate Bond PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildPdfFilename(enrichedBondRecord, { prefix: "lado_bahin_bond" });
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("बॉन्ड पीडीएफ डाउनलोड हो गया / Bond PDF generated", { id: "bond-pdf" });
    } catch (err: any) {
      console.error("Bond error:", err);
      toast.error(err.message || "बॉन्ड जनरेट करने में विफल", { id: "bond-pdf" });
    }
  };

  const handleExportExcel = () => {
    try {
      if (registrations.length === 0) {
        toast.error("निर्यात के लिए कोई डेटा नहीं है / No data to export");
        return;
      }

      const dataToExport = registrations.map((r, index) => ({
        "क्र.सं. (Sr No)": index + 1,
        "आवेदन क्र. (Form No)": r.formNumber || "N/A",
        "ऑफलाइन फॉर्म नं. (Offline Form No)": r.offlineFormNumber || r.offline_form_number || "N/A",
        "दिनांक (Date)": r.applicationDate ? formatDate(r.applicationDate) : "N/A",
        "आवेदक का नाम (Applicant Name)": r.applicantName || "N/A",
        "पिता का नाम (Father Name)": r.fatherName || "N/A",
        "पति का नाम (Husband Name)": r.husbandName || "N/A",
        "गोत्र (Gotra)": r.gotra || "N/A",
        "मोबाइल (Mobile)": r.mobile || "N/A",
        "आधार (Aadhaar)": r.aadharNumber || "N/A",
        "जिला (District)": r.district || "N/A",
        "तहसील (Tehsil)": r.tehsil || "N/A",
        "राज्य (State)": r.state || "Rajasthan",
        "श्रेणी (Category)": r.category || "A",
        "मुकलावा दिनांक (Muklawa Date)": (() => {
          const mDate = r.muklawaDate || r.muklawa_date;
          return mDate ? formatDate(mDate) : "N/A";
        })(),
        "कुल सहायता राशि (Total Amount)": r.totalAmount || 5100,
        "बकाया राशि (Pending Amount)": r.pendingAmount ?? 0,
        "ई-पिन (E-PIN)": r.epinCode || "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Lado Bahin Registrations");
      XLSX.writeFile(
        workbook,
        `lado_bahin_registrations_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success("एक्सेल फाइल डाउनलोड हो गई / Excel downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  const columns: Column<LadoBahinRegistration>[] = [
    {
      key: "formNumber",
      label: "आवेदन क्र.",
      className: "min-w-[120px]",
      render: (_: unknown, row: LadoBahinRegistration) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary">{row.formNumber || "—"}</span>
          {(row.offlineFormNumber || row.offline_form_number) && (
            <span className="text-xs text-muted-foreground">
              ऑफलाइन: <span className="font-medium text-foreground">{row.offlineFormNumber || row.offline_form_number}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "applicationDate",
      label: "आवेदन तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: LadoBahinRegistration) =>
        row.applicationDate ? formatDate(row.applicationDate) : "—",
    },
    {
      key: "applicantName",
      label: "आवेदक का नाम",
      className: "min-w-[140px]",
      render: (_: unknown, row: LadoBahinRegistration) => row.applicantName || "—",
    },
    {
      key: "fatherName",
      label: "पिता का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: LadoBahinRegistration) => row.fatherName || "—",
    },
    {
      key: "husbandName",
      label: "पति का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: LadoBahinRegistration) => row.husbandName || "—",
    },
    {
      key: "age",
      label: "आयु",
      className: "min-w-[70px]",
      render: (_: unknown, row: LadoBahinRegistration) =>
        row.age ? `${row.age}` : "—",
    },
    { key: "gotra", label: "गोत्र", className: "min-w-[90px]" },
    { key: "aadharNumber", label: "आधार", className: "min-w-[120px]" },
    { key: "mobile", label: "मोबाइल", className: "min-w-[110px]" },
    { key: "address", label: "पता", className: "min-w-[160px]" },
    { key: "tehsil", label: "तहसील", className: "min-w-[100px]" },
    { key: "district", label: "जिला", className: "min-w-[100px]" },
    {
      key: "muklawaDate",
      label: "मुकलावा तिथि",
      className: "min-w-[110px]",
      render: (_: unknown, row: LadoBahinRegistration) => {
        const rawDate = row.muklawaDate || row.muklawa_date;
        return rawDate ? formatDate(rawDate) : "—";
      },
    },
    {
      key: "nomineeName",
      label: "नॉमिनी का नाम",
      className: "min-w-[130px]",
      render: (_: unknown, row: LadoBahinRegistration) => row.nomineeName || "—",
    },
    {
      key: "nomineeRelation",
      label: "नॉमिनी संबंध",
      className: "min-w-[110px]",
      render: (_: unknown, row: LadoBahinRegistration) => row.nomineeRelation || "—",
    },
    {
      key: "totalAmount",
      label: "कुल सहायता",
      className: "min-w-[100px]",
      render: (_: unknown, row: LadoBahinRegistration) =>
        `₹${Number(row.totalAmount || 5100).toLocaleString("en-IN")}`,
    },
    {
      key: "pendingAmount",
      label: "बकाया राशि",
      className: "min-w-[100px]",
      render: (_: unknown, row: LadoBahinRegistration) =>
        `₹${Number(row.pendingAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "custom_actions",
      label: "कार्य",
      className: "min-w-[150px]",
      render: (_: unknown, row: LadoBahinRegistration) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {/* 1. Generate PDF Form */}
            <PdfActionButton
              type="form"
              className="h-8 w-8 p-0"
              onClick={() => handleGeneratePDFForm(row)}
            />

            {/* 2. Edit */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => router.push(`/dashboard/lado-bahin/${row.id}`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>

            {/* 3. Generate PDF Bond */}
            <PdfActionButton
              type="bond"
              className="h-8 w-8 p-0"
              onClick={() => handleGenerateBond(row)}
            />

            {/* 4. Delete */}
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
    <RoleGuard requiredModule="lado_bahin" requiredAction="view">
      <>
        <DataTable
          data={registrations}
          columns={columns}
          title="लाडो बहिन पंजीकरण (Lado Bahin Registration)"
          subtitle="लाडो बहिन (मुकलावा) सहायता योजना पंजीकरण संभालें"
          addNewUrl="/dashboard/lado-bahin/add"
          addNewLabel="Add New Lado Bahin"
          onDelete={handleDeleteClick}
          editUrlPattern="/dashboard/lado-bahin/[id]"
          showActionsColumn={false}
          searchFields={["applicantName", "fatherName", "husbandName", "mobile", "aadharNumber", "formNumber", "offlineFormNumber", "gotra"]}
          itemsPerPage={10}
          showGenderFilter={false}
          showAddressFilter={true}
          addressField="district"
          onAddressFilterChange={(addr) => setCurrentAddressFilter(addr)}
          currentAddressFilter={currentAddressFilter}
          uniqueAddresses={uniqueAddresses}
          module="lado_bahin"
          headerActions={
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
          }
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>क्या आप वाकई हटाना चाहते हैं? / Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                यह कार्रवाई पूर्ववत नहीं की जा सकती। यह पंजीकरण हमेशा के लिए हटा दिया जाएगा।
                This action cannot be undone. The registration record will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>रद्द करें / Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "हटा रहे हैं... / Deleting..." : "हटाएं / Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGuard>
  );
}
