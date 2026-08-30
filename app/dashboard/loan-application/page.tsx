"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { formatBilingual } from '@/lib/translations'
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { BulkUploadButton } from "@/components/bulk-upload-button"

// Helper to format dates to YYYY-MM-DD
function formatExcelDate(val: any): string {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str) || /^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return str;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RoleGuard } from "@/components/role-guard"

interface LoanApplicationRecord {
  id: string;
  formNumber: string;
  date: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  address: string;
  reason: string;
  createdAt: string;
}

const columns = [
  { key: "formNumber", label: "Form Number" },
  { key: "date", label: "Date" },
  { key: "applicantName", label: formatBilingual("formFields.applicantName") },
  { key: "fatherName", label: "Father Name" },
  { key: "motherName", label: "Mother Name" },
  { key: "address", label: formatBilingual("formFields.address") },
  { key: "reason", label: "Reason" },
]

export default function LoanApplicationListPage() {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")

  const { 
    records: data, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<LoanApplicationRecord>("loanApplicationRecords", [], {
    create: API_ENDPOINTS.CREATE_LOAN_APPLICATION,
    read: API_ENDPOINTS.GET_LOAN_APPLICATIONS,
    update: API_ENDPOINTS.UPDATE_LOAN_APPLICATION,
    delete: API_ENDPOINTS.DELETE_LOAN_APPLICATION,
  });

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(data.map(record => record.address).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[LoanApplication] Filter effect running:', { currentAddressFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    // Call readApi directly instead of through fetchLoanApplications
    const applyFilters = async () => {
      try {
        console.log('[LoanApplication] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching loan applications:", error);
        toast.error("ऋण आवेदन लोड करने में त्रुटि");
      }
    };
    
    applyFilters();
  }, [currentAddressFilter]); // Removed readApi dependency

  const fetchLoanApplications = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching loan applications:", error);
      toast.error("ऋण आवेदन लोड करने में त्रुटि");
    }
  }, [readApi]);

  // Handle address filter change
  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const success = await deleteApi(deleteId);
      if (success) {
        fetchLoanApplications(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting loan application:", error);
      toast.error("ऋण आवेदन हटाने में त्रुटि");
    } finally {
      setDeleteId(null);
    }
  };

  const handleGeneratePDF = async (record: LoanApplicationRecord) => {
    try {
      const response = await fetch('/api/generate-girl-loan-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            formNumber: record.formNumber,
            date: record.date,
            applicantName: record.applicantName,
            address: record.address,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `girl_loan_${record.applicantName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = data.map((record) => ({
        "Form Number": record.formNumber,
        "Date": record.date,
        "Applicant Name": record.applicantName,
        "Father Name": record.fatherName,
        "Mother Name": record.motherName,
        "Address": record.address,
        "Reason": record.reason,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Loan Applications");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loan_applications_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Excel file exported successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export Excel file");
    }
  };

  const importHeaders = [
    "Date",
    "Applicant Name",
    "Father Name",
    "Mother Name",
    "Address",
    "Reason"
  ];

  const importSampleRows = [
    {
      "Date": "12-07-2026",
      "Applicant Name": "रमेश कुमार",
      "Father Name": "सोहन लाल",
      "Mother Name": "कमला देवी",
      "Address": "जसोल",
      "Reason": "शिक्षा के लिए ऋण (Loan for Education)"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const payload = {
      date: formatExcelDate(row["Date"]),
      applicantName: String(row["Applicant Name"] || "").trim(),
      fatherName: String(row["Father Name"] || "").trim(),
      motherName: String(row["Mother Name"] || "").trim(),
      address: String(row["Address"] || "").trim(),
      reason: String(row["Reason"] || "").trim(),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  return (
    <RoleGuard requiredModule="balika_loan_application" requiredAction="view">
      <div className="w-full">
        <DataTable
          data={data}
          columns={columns}
          title="ऋण आवेदन सूची"
          subtitle="Loan Application List"
          addNewUrl="/dashboard/loan-application/add"
          addNewLabel="नया आवेदन जोड़ें"
          onDelete={handleDelete}
          onDownloadPDF={handleGeneratePDF}
          editUrlPattern="/dashboard/loan-application/edit/[id]"
          searchFields={[
            "formNumber",
            "date",
            "applicantName",
            "fatherName",
            "motherName",
            "address",
            "reason",
          ]}
          itemsPerPage={10}
          showAddressFilter={true}
          addressField="address"
          onAddressFilterChange={handleAddressFilterChange}
          currentAddressFilter={currentAddressFilter}
          uniqueAddresses={uniqueAddresses}
          module="balika_loan_application"
          headerActions={
            <div className="flex gap-2">
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={data.length === 0}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>
              <BulkUploadButton
                moduleName="Loan Application"
                requiredHeaders={importHeaders}
                sampleRows={importSampleRows}
                onImportRow={handleImportRow}
                onSuccess={() => fetchLoanApplications()}
              />
            </div>
          }
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>क्या आप निश्चित हैं?</AlertDialogTitle>
              <AlertDialogDescription>
                यह कार्य पूर्ववत नहीं किया जा सकता। यह ऋण आवेदन स्थायी रूप से हटा दिया जाएगा।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>रद्द करें</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>हटाएं</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  )
}
