"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, record: T) => React.ReactNode;
  className?: string;
}

export default function LadoBahinListPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<LadoBahinRegistration[]>([]);
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

  const handleGeneratePDFForm = async (record: LadoBahinRegistration) => {
    try {
      toast.loading("फॉर्म पीडीएफ जनरेट हो रहा है... / Generating PDF Form...", { id: "pdf-form" });
      const response = await fetch("/api/generate-lado-bahin-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate PDF Form");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lado_bahin_form_${record.formNumber || record.id}.pdf`;
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
      const response = await fetch("/api/generate-lado-bahin-bond-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate Bond PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lado_bahin_bond_${record.formNumber || record.id}.pdf`;
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
        "मुकलावा दिनांक (Muklawa Date)": r.muklawaDate ? formatDate(r.muklawaDate) : "N/A",
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
        <span className="font-semibold text-primary">{row.formNumber || "—"}</span>
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
      render: (_: unknown, row: LadoBahinRegistration) =>
        row.muklawaDate ? formatDate(row.muklawaDate) : "—",
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
      key: "epinCode",
      label: "ई-पिन",
      className: "min-w-[110px]",
      render: (_: unknown, row: LadoBahinRegistration) =>
        row.epinCode ? (
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
            {row.epinCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "custom_actions",
      label: "कार्य",
      className: "min-w-[150px]",
      render: (_: unknown, row: LadoBahinRegistration) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {/* 1. Generate PDF Form */}
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
          searchFields={["applicantName", "fatherName", "husbandName", "mobile", "aadharNumber", "formNumber", "gotra"]}
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
