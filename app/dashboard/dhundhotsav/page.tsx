"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pagination } from "@/components/ui/pagination";
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
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  FileText,
  KeyRound,
  Receipt,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import {
  DhundhotsavService,
  DhundhotsavRegistration,
} from "@/lib/dhundhotsav-service";
import { formatDate, getPhotoDataUrl, calculateAge } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";
import { agentRegistrationAPI } from "@/lib/api";

interface ResolvedAgentOfflineNumbers {
  workerOfflineFormNumber: string;
  seniorOfflineFormNumber: string;
  workerMobile?: string;
  workerName?: string;
  seniorName?: string;
}

function resolveAgentOfflineNumbers(
  record: DhundhotsavRegistration & Record<string, any>,
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
    const id = String(agent.id || "").trim();
    const empId = String(
      agent.employeeId ||
      agent.employee_id ||
      agent.agentProfile?.employeeId ||
      agent.agent_profile?.employee_id ||
      ""
    ).trim();

    if (id) agentById.set(id, agent);
    if (empId) agentByCode.set(empId.toUpperCase(), agent);
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
      ""
    ).trim();

    const parentSeniorCode = String(
      workerAgent.seniorEmployeeId ||
      workerAgent.senior_employee_id ||
      workerAgent.parentEmployeeId ||
      workerAgent.seniorCode ||
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
      ""
    ).trim();
  }

  const workerMobile = String(
    (workerAgent && (
      workerAgent.mobile ||
      workerAgent.phone ||
      workerAgent.contactNumber ||
      workerAgent.agentProfile?.mobile ||
      workerAgent.agent_profile?.mobile
    )) ||
    record.added_mobile ||
    record.workerMobile ||
    record.agentMobile ||
    ""
  ).trim();

  const workerName = String(
    (workerAgent && (
      workerAgent.name ||
      workerAgent.agentProfile?.name ||
      workerAgent.fullName
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
      seniorAgent.fullName
    )) ||
    record.seniorName ||
    record.seniorWorkerName ||
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

// Map English fields to Hindi for the PDF template
function mapDhundhotsavToHindiFields(record: DhundhotsavRegistration & Record<string, any>) {
  const ageText = record.age ? String(record.age) : "";
  const gotra = record.gotra || (record as any).gotraName || (record as any).gotra_name || "";
  const address = record.address || "";
  const workerName = record.workerName || record.addedBy?.name || (record as any).worker_name || (record as any).agentName || "";
  const seniorName = record.seniorName || (record as any).seniorWorkerName || (record as any).senior_name || "";

  return {
    सदस्यता_क्रमांक: record.offlineFormNumber || record.offline_form_number || "",
    ऑफलाइन_फॉर्म_नं: record.offlineFormNumber || record.offline_form_number || "",
    offlineFormNumber: record.offlineFormNumber || record.offline_form_number || "",
    आवेदन_दिनांक: record.applicationDate || "",
    applicationDate: record.applicationDate || "",
    आवेदक_का_नाम: record.applicantName || "",
    applicantName: record.applicantName || "",
    पिता_का_नाम: record.fatherName || record.husbandName || (record as any).fatherHusbandName || "",
    fatherName: record.fatherName || record.husbandName || (record as any).fatherHusbandName || "",
    माता_का_नाम: record.motherName || "",
    जन्म_तिथि: record.dateOfBirth || "",
    dateOfBirth: record.dateOfBirth || "",
    गोत्र: gotra,
    gotra: gotra,
    उम्र: ageText,
    ageText: ageText,
    लिंग: record.gender || "Male",
    gender: record.gender || "Male",
    शिक्षा: (record as any).education || (record as any).qualification || "",
    education: (record as any).education || (record as any).qualification || "",
    मोबाइल: record.mobile || "",
    mobile: record.mobile || "",
    आधार_संख्या: record.aadharNumber || (record as any).aadhar || (record as any).applicantAadhar || "",
    aadharNumber: record.aadharNumber || (record as any).aadhar || (record as any).applicantAadhar || "",
    पता: address,
    address: address,
    पिन: record.pinCode || "",
    तहसील: record.tehsil || "",
    जिला: record.district || "",
    district: record.district || "",
    राज्य: record.state || "Rajasthan",
    state: record.state || "Rajasthan",
    नामिनी_का_नाम: record.nomineeName || (record as any).nominee_name || "",
    nomineeName: record.nomineeName || (record as any).nominee_name || "",
    नामिनी_का_सम्बन्ध: record.nomineeRelation || (record as any).nominee_relation || "",
    nomineeRelation: record.nomineeRelation || (record as any).nominee_relation || "",
    नामिनी_का_पता: address,
    नामिनी_का_आधार: record.nomineeAadhar || (record as any).nomineeAadhaar || (record as any).nominee_aadhar || "",
    nomineeAadhar: record.nomineeAadhar || (record as any).nomineeAadhaar || (record as any).nominee_aadhar || "",
    नामिनी_का_मोबाइल: record.nomineeMobile || (record as any).nominee_mobile || "",
    nomineeMobile: record.nomineeMobile || (record as any).nominee_mobile || "",
    कार्यकर्ता_का_नाम: workerName,
    workerName: workerName,
    कार्यकर्ता_का_मोबाइल: (record as any).workerMobile || record.addedBy?.mobile || "",
    कार्यकर्ता_कोड:
      record.workerOfflineFormNumber ||
      record.worker_offline_form_number ||
      record.agentOfflineFormNumber ||
      record.agent_offline_form_number ||
      "",
    workerOfflineFormNumber:
      record.workerOfflineFormNumber ||
      record.worker_offline_form_number ||
      record.agentOfflineFormNumber ||
      record.agent_offline_form_number ||
      "",
    राशि: "5100",
    amount: "5100",
    भुगतान_विवरण: (record as any).paymentModeRef || (record as any).paymentMode || "CASH",
    paymentModeRef: (record as any).paymentModeRef || (record as any).paymentMode || "CASH",
    सीनियर_कोड:
      record.seniorOfflineFormNumber ||
      record.senior_offline_form_number ||
      record.seniorAgentOfflineFormNumber ||
      record.senior_agent_offline_form_number ||
      "",
    seniorOfflineFormNumber:
      record.seniorOfflineFormNumber ||
      record.senior_offline_form_number ||
      record.seniorAgentOfflineFormNumber ||
      record.senior_agent_offline_form_number ||
      "",
    सीनियर_कार्यकर्ता_नाम: seniorName,
    seniorName: seniorName,
    शपथ_नाम: record.applicantName || "",
    शपथ_पिता_का_नाम: record.fatherName || record.husbandName || (record as any).fatherHusbandName || "",
    शपथ_उम्र: ageText,
    शपथ_गोत्र: gotra,
    शपथ_पता: address,
    residenceAddress: address,
  };
}

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
  const [agentsList, setAgentsList] = useState<any[]>([]);

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

  useEffect(() => {
    let isMounted = true;
    agentRegistrationAPI
      .getAll()
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setAgentsList(res.data);
        }
      })
      .catch((err) => {
        console.warn("Could not prefetch agents in DhundhotsavPage:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // 1. Generate PDF Form Handler
  const handleGeneratePDFForm = async (record: DhundhotsavRegistration) => {
    try {
      let currentAgents = agentsList;
      if (!currentAgents || currentAgents.length === 0) {
        try {
          const res = await agentRegistrationAPI.getAll();
          if (res?.data && Array.isArray(res.data)) {
            currentAgents = res.data;
            setAgentsList(res.data);
          }
        } catch (e) {
          console.warn("Could not fetch agents for Dhundhotsav PDF resolution:", e);
        }
      }

      const {
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerMobile,
        workerName,
        seniorName,
      } = resolveAgentOfflineNumbers(
        record as any,
        currentAgents
      );

      const enrichedRecord = {
        ...record,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerMobile,
        workerName,
        seniorName,
      };

      const mapped = mapDhundhotsavToHindiFields(enrichedRecord);

      const dataForPdf = {
        ...enrichedRecord,
        ...mapped,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerName,
        seniorName,
        gender: record.gender || "Male",
      };

      const imageData = await getPhotoDataUrl(record.passportPhotoUrl || (record as any).passportPhoto);

      const response = await fetch("/api/fill-pdf-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "dhundhotsav",
          data: dataForPdf,
          offsetX: 0,
          offsetY: 0,
          valueOffsetX: 0,
          valueOffsetY: 0,
          imageData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhundhotsav_application_form_${record.offlineFormNumber || record.formNumber || "filled"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF form generated successfully");
    } catch (error) {
      console.error("Error generating Dhundhotsav PDF form:", error);
      toast.error("Failed to generate PDF form");
    }
  };

  // 3. Generate Bond PDF Handler
  const handleGenerateBond = async (record: DhundhotsavRegistration) => {
    try {
      let currentAgents = agentsList;
      if (!currentAgents || currentAgents.length === 0) {
        try {
          const res = await agentRegistrationAPI.getAll();
          if (res?.data && Array.isArray(res.data)) {
            currentAgents = res.data;
            setAgentsList(res.data);
          }
        } catch (e) {
          console.warn("Could not fetch agents for Dhundhotsav Bond PDF resolution:", e);
        }
      }

      const {
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerMobile,
        workerName,
        seniorName,
      } = resolveAgentOfflineNumbers(
        record as any,
        currentAgents
      );

      const enrichedRecord = {
        ...record,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerMobile: workerMobile || (record as any).workerMobile || "",
        agentMobile: workerMobile || (record as any).agentMobile || "",
        workerName: workerName || (record as any).workerName || "",
        seniorName: seniorName || (record as any).seniorName || "",
        nomineeName: record.nomineeName || (record as any).nominee_name || "",
        nomineeRelation: record.nomineeRelation || (record as any).nominee_relation || "",
        offlineFormNumber: record.offlineFormNumber || (record as any).offline_form_number || "",
      };

      const imageData = await getPhotoDataUrl(record.passportPhotoUrl || (record as any).passportPhoto);

      const response = await fetch("/api/generate-dhundhotsav-bond-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record: enrichedRecord,
          imageData,
          duration: "बारह महीने",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate bond PDF");
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhundhotsav_bond_${record.offlineFormNumber || record.formNumber || "bond"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Bond PDF generated successfully");
    } catch (error) {
      console.error("Error generating Dhundhotsav bond PDF:", error);
      toast.error("Failed to generate bond PDF");
    }
  };

  return (
    <RoleGuard requiredModule="dhundhotsav" requiredAction="view">
      <div className="p-4 md:p-6 relative">
        {/* Header matching General Marriage Applications */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            ढूंढोत्सव पंजीकरण (Dhundhotsav Registration Applications)
          </h1>
          <p className="text-sm text-gray-600">
            ढूंढोत्सव योजना पंजीकरण एवं किश्त प्रबंधन संभालें
          </p>
        </div>

        {/* Top Summary / Stat Bar matching SAF Dashboard design language */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm bg-muted/40 px-4 py-2.5 rounded-lg border border-border/60 text-muted-foreground mb-6">
          <span>
            कुल पंजीकरण:{" "}
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

        {/* Search, Filters and Add New Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="सभी वर्ग / Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">सभी वर्ग (All Categories)</SelectItem>
                <SelectItem value="A">Category A</SelectItem>
                <SelectItem value="B">Category B</SelectItem>
                <SelectItem value="C">Category C</SelectItem>
                <SelectItem value="D">Category D</SelectItem>
                <SelectItem value="E">Category E</SelectItem>
                <SelectItem value="F">Category F</SelectItem>
              </SelectContent>
            </Select>

            {/* District Filter */}
            <Select
              value={selectedDistrict}
              onValueChange={(value) => {
                setSelectedDistrict(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="सभी जिले / Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">सभी जिले (All Districts)</SelectItem>
                <SelectItem value="Jaipur">जयपुर (Jaipur)</SelectItem>
                <SelectItem value="Jodhpur">जोधपुर (Jodhpur)</SelectItem>
                <SelectItem value="Kota">कोटा (Kota)</SelectItem>
                <SelectItem value="Bikaner">बीकानेर (Bikaner)</SelectItem>
                <SelectItem value="Ajmer">अजमेर (Ajmer)</SelectItem>
                <SelectItem value="Udaipur">उदयपुर (Udaipur)</SelectItem>
                <SelectItem value="Sikar">सीकर (Sikar)</SelectItem>
                <SelectItem value="Nagaur">नागौर (Nagaur)</SelectItem>
                <SelectItem value="Pali">पाली (Pali)</SelectItem>
                <SelectItem value="Alwar">अलवर (Alwar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons: Refresh + Add New */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRegistrations()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link href="/dashboard/dhundhotsav/add">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add New Dhundhotsav Application
              </Button>
            </Link>
          </div>
        </div>

        {/* Registered Applications Table Container */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              All Records ({totalCount} total)
              {selectedCategory !== "ALL" && ` - Category ${selectedCategory} only`}
              {selectedDistrict !== "ALL" && ` - ${selectedDistrict} only`}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading applications...</div>
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 px-4">
                {searchTerm || selectedCategory !== "ALL" || selectedDistrict !== "ALL"
                  ? "No records found matching your filters."
                  : 'No records found. Click "Add New Dhundhotsav Application" to create your first entry.'}
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">सदस्यता / फॉर्म नं.</TableHead>
                        <TableHead className="w-[120px]">आवेदन दिनांक</TableHead>
                        <TableHead className="w-[180px]">आवेदक का नाम</TableHead>
                        <TableHead className="w-[120px]">जन्म तिथि / आयु</TableHead>
                        <TableHead className="w-[130px]">आधार संख्या</TableHead>
                        <TableHead className="w-[100px]">वर्ग</TableHead>
                        <TableHead className="w-[120px]">मोबाइल</TableHead>
                        <TableHead className="w-[160px]">स्थान / Location</TableHead>
                        <TableHead className="w-[120px]">लेजर स्थिति</TableHead>
                        <TableHead className="w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.map((reg) => {
                        const offlineNo =
                          (reg as any).offlineFormNumber ||
                          (reg as any).offline_form_number ||
                          null;

                        return (
                          <TableRow key={reg.id}>
                            {/* Form Number */}
                            <TableCell className="w-[160px]">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/dashboard/dhundhotsav/${reg.id}`}
                                    className="font-semibold text-gray-900 hover:text-primary hover:underline cursor-pointer"
                                  >
                                    {reg.formNumber || "-"}
                                  </Link>
                                  {reg.epinCode && (
                                    <span title={`E-PIN: ${reg.epinCode}`}>
                                      <KeyRound className="h-3.5 w-3.5 text-emerald-600 inline" />
                                    </span>
                                  )}
                                </div>
                                {offlineNo ? (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    ऑफलाइन: <span className="font-medium text-foreground">{offlineNo}</span>
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>

                            {/* Application Date */}
                            <TableCell className="w-[120px] text-sm">
                              <div>{formatDate(reg.applicationDate)}</div>
                              {reg.dhundhDate ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  ढूंढ: {formatDate(reg.dhundhDate)}
                                </div>
                              ) : null}
                            </TableCell>

                            {/* Applicant Name & Details */}
                            <TableCell className="w-[180px]">
                              <Link
                                href={`/dashboard/dhundhotsav/${reg.id}`}
                                className="font-medium text-gray-900 hover:text-primary hover:underline cursor-pointer block"
                              >
                                {reg.applicantName}
                              </Link>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span>पिता: {reg.fatherName || reg.husbandName || "-"}</span>
                                {reg.gotra && (
                                  <>
                                    <span>•</span>
                                    <span>गोत्र: {reg.gotra}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>

                            {/* DOB / Age */}
                            <TableCell className="w-[120px] text-sm">
                              <div>{reg.dateOfBirth ? formatDate(reg.dateOfBirth) : "-"}</div>
                              {reg.age ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {reg.age} वर्ष
                                </div>
                              ) : null}
                            </TableCell>

                            {/* Aadhaar */}
                            <TableCell className="w-[130px] font-mono text-xs text-gray-700">
                              {reg.aadharNumber || "-"}
                            </TableCell>

                            {/* Category */}
                            <TableCell className="w-[100px] text-sm">
                              {reg.category ? `Category ${reg.category}` : "-"}
                            </TableCell>

                            {/* Mobile */}
                            <TableCell className="w-[120px] font-mono text-xs text-gray-700">
                              {reg.mobile || "-"}
                            </TableCell>

                            {/* Location */}
                            <TableCell className="w-[160px] text-xs text-gray-700">
                              <div>{reg.tehsil || reg.address || "-"}, {reg.district || "-"}</div>
                              <div className="text-muted-foreground mt-0.5">{reg.state || ""} {reg.pinCode ? `- ${reg.pinCode}` : ""}</div>
                            </TableCell>

                            {/* Single ₹300 Ledger Status */}
                            <TableCell className="w-[120px] text-xs">
                              <div className="text-emerald-600 font-medium">
                                जमा: ₹{(Number(reg.paidAmount) || 0).toLocaleString("hi-IN")}
                              </div>
                              <div className="text-rose-600 font-medium mt-0.5">
                                शेष: ₹{(Number(reg.pendingAmount) || 0).toLocaleString("hi-IN")}
                              </div>
                            </TableCell>

                            {/* Actions matching General Marriage table 4-button pattern exactly */}
                            <TableCell className="w-[200px]">
                              <TooltipProvider>
                                <div className="flex flex-col sm:flex-row gap-1">
                                  {/* 1. Generate PDF Form */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGeneratePDFForm(reg)}
                                        className="w-full sm:w-auto"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="ml-1 sm:hidden">PDF Form</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Generate PDF Form</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* 2. Edit */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link href={`/dashboard/dhundhotsav/edit/${reg.id}`}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full sm:w-auto bg-transparent"
                                        >
                                          <Edit className="w-4 h-4" />
                                          <span className="ml-1 sm:hidden">Edit</span>
                                        </Button>
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit / संपादित करें</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* 3. Generate Bond PDF */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGenerateBond(reg)}
                                        className="w-full sm:w-auto"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="ml-1 sm:hidden">Bond</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Generate Bond PDF</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* 4. Delete (Admin only) */}
                                  {isAdmin() && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setRecordToDelete(reg.id);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          className="w-full sm:w-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="ml-1 sm:hidden">Delete</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete / हटाएँ</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* ₹300 Installment Modal (Single Ledger Architecture) */}
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
