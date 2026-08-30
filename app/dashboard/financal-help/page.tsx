'use client'
import { DataTable } from "@/components/data-table"
import React, { useState, useCallback, useEffect } from "react"
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
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
import { BulkUploadButton } from "@/components/bulk-upload-button"
import { parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils"

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

interface FinancialHelpRecord {
  id: string;
  formNumber?: string;
  date: string;
  name: string;
  gender: string;
  fatherName: string;
  gotra: string;
  district: string;
  village: string;
  tehsil: string;
  phone: string;
  donatedAmount: string;
  createdAt: string;
}

const columns = [
  { key: "formNumber", label: "फॉर्म नंबर / Form Number" },
  { key: "date", label: "तिथि / Date" },
  { key: "name", label: "नाम / Name" },
  { key: "gender", label: "लिंग / Gender" },
  { key: "fatherName", label: "पिता का नाम / Father's Name" },
  { key: "gotra", label: "गोत्र / Gotra" },
  { key: "district", label: "जिला / District" },
  { key: "village", label: "गांव / Village" },
  { key: "tehsil", label: "तहसील / Tehsil" },
  { key: "phone", label: "फोन नंबर / Phone" },
  { key: "donatedAmount", label: "दान राशि / Amount" },
]

const FinancalHelpListPage = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all");
  const [currentGotraFilter, setCurrentGotraFilter] = useState<string>("all");

  const {
    records: data,
    loading,
    readApi,
    deleteApi,
    createApi,
  } = useCRUD<FinancialHelpRecord>("financialHelpRecords", [], {
    create: API_ENDPOINTS.CREATE_FINANCIAL_HELP,
    read: API_ENDPOINTS.GET_FINANCIAL_HELPS,
    update: API_ENDPOINTS.UPDATE_FINANCIAL_HELP,
    delete: API_ENDPOINTS.DELETE_FINANCIAL_HELP,
  });

  // Get unique gotras for filter dropdown
  const uniqueGotras = Array.from(new Set(data.map(record => record.gotra).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[FinancialHelp] Filter effect running:', { currentGenderFilter, currentGotraFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentGotraFilter !== "all") {
      activeFilters.gotra = currentGotraFilter;
    }
    
    // Call readApi directly
    const applyFilters = async () => {
      try {
        console.log('[FinancialHelp] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching financial helps:", error);
        toast.error("Failed to fetch financial helps from server");
      }
    };
    
    applyFilters();
  }, [currentGenderFilter, currentGotraFilter]); // Removed readApi from dependencies

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  };

  // Handle gotra filter change
  const handleGotraFilterChange = (gotra: string) => {
    setCurrentGotraFilter(gotra);
  };

  // Handle delete action
  const handleDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const success = await deleteApi(recordToDelete);
      if (success) {
        // Re-fetch data to update the table
        const activeFilters: Record<string, any> = {};
        if (currentGenderFilter !== "all") {
          activeFilters.gender = currentGenderFilter;
        }
        if (currentGotraFilter !== "all") {
          activeFilters.gotra = currentGotraFilter;
        }
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      }
    } catch (error) {
      console.error("Error deleting financial help:", error);
      toast.error("दान हटाने में त्रुटि");
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  // Map English fields to Hindi for the PDF template
  const mapToHindiFields = (record: FinancialHelpRecord) => ({
    दिनांक: record.date,
    नाम: record.name,
    लिंग: record.gender === 'Male' ? 'पुरुष' : 'महिला',
    पिता_का_नाम: record.fatherName,
    "गोत्र": record.gotra,
    जिला: record.district,
    गांव: record.village,
    तहसील: record.tehsil,
    फोन: record.phone,
    दान_राशि: record.donatedAmount,
  });

  // PDF Generation function
  const handleGeneratePDF = async (record: FinancialHelpRecord) => {
    try {
      // Basic validation for PDF generation
      if (!record.name || !record.gender || !record.fatherName) {
        toast.error("कृपया सभी आवश्यक फील्ड भरें PDF जनरेट करने के लिए");
        return;
      }

      const mapped = mapToHindiFields(record);
      
      // Add gender information to the mapped data
      const dataWithGender = { ...mapped, gender: record.gender };
      
      const response = await fetch('/api/generate-financial-help-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: dataWithGender,
          offsetX: 0,
          offsetY: 0,
          valueOffsetX: 0,
          valueOffsetY: 0,
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
      
      // Generate appropriate filename based on gender
      let filename = 'financial_help_form.pdf';
      if (record.gender === 'Female') {
        filename = `girl_financial_help_${record.id}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `boys_financial_help_${record.id}.pdf`;
      } else {
        filename = `financial_help_${record.id}.pdf`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF form generated successfully');
    } catch (error) {
      console.error('Error generating PDF form:', error);
      toast.error('Failed to generate PDF form');
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
        "फॉर्म नंबर": record.formNumber || "",
        "तिथि": record.date,
        "नाम": record.name,
        "लिंग": record.gender === 'Male' ? 'पुरुष' : record.gender === 'Female' ? 'महिला' : record.gender,
        "पिता का नाम": record.fatherName,
        "गोत्र": record.gotra,
        "जिला": record.district,
        "गांव": record.village,
        "तहसील": record.tehsil,
        "फोन नंबर": record.phone,
        "दान राशि": record.donatedAmount,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Application Payment");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial_help_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    "तिथि",
    "नाम",
    "लिंग",
    "पिता का नाम",
    "गोत्र",
    "जिला",
    "गांव",
    "तहसील",
    "फोन नंबर",
    "दान राशि",
    "फॉर्म नंबर"
  ];

  const importSampleRows = [
    {
      "तिथि": "12-07-2026",
      "नाम": "रमेश प्रजापत",
      "लिंग": "Male",
      "पिता का नाम": "हरिराम प्रजापत",
      "गोत्र": "प्रजापत",
      "जिला": "जालोर",
      "गांव": "आहोर",
      "तहसील": "आहोर",
      "फोन नंबर": "9876543210",
      "दान राशि": "5000",
      "फॉर्म नंबर": "F-1001"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const { addedby, addedby_id } = getCurrentUserInfo();
    
    let gender = "Male";
    const genderStr = String(row["लिंग"] || "").trim();
    if (genderStr === "महिला" || genderStr === "Female" || genderStr === "female") {
      gender = "Female";
    }

    const payload = {
      formNumber: String(row["फॉर्म नंबर"] || "").trim(),
      date: formatExcelDate(row["तिथि"]),
      name: String(row["नाम"] || "").trim(),
      gender: gender,
      fatherName: String(row["पिता का नाम"] || "").trim(),
      gotra: String(row["गोत्र"] || "Prajapat").trim(),
      district: String(row["जिला"] || "").trim(),
      village: String(row["गांव"] || "").trim(),
      tehsil: String(row["तहसील"] || "").trim(),
      phone: String(row["फोन नंबर"] || "").trim().replace(/\D/g, ""),
      donatedAmount: String(row["दान राशि"] || "").trim(),
      addedby: addedby,
      addedby_id: addedby_id,
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create financial help record");
    }
    return res;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading financial helps...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        title="दान सूची"
        subtitle="Donation List"
        addNewUrl="/dashboard/financal-help/add"
        addNewLabel="नया दान जोड़ें / Add Donation"
        onDelete={handleDelete}
        onGeneratePDFForm={handleGeneratePDF}
        editUrlPattern="/dashboard/financal-help/edit/[id]"
        searchFields={[
          "formNumber",
          "name",
          "fatherName",
          "fatherName",
          "gotra",
          "district",
          "village",
          "tehsil",
          "phone",
          "donatedAmount",
          "date",
          "gender",
        ]}
        itemsPerPage={10}
        showGenderFilter={true}
        genderField="gender"
        onGenderFilterChange={handleGenderFilterChange}
        currentGenderFilter={currentGenderFilter}
        showAddressFilter={true}
        addressField="gotra"
        onAddressFilterChange={handleGotraFilterChange}
        currentAddressFilter={currentGotraFilter}
        uniqueAddresses={uniqueGotras}
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
              moduleName="Financial Application Payment"
              requiredHeaders={importHeaders}
              sampleRows={importSampleRows}
              onImportRow={handleImportRow}
              onSuccess={() => readApi()}
            />
          </div>
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>दान हटाएं</AlertDialogTitle>
            <AlertDialogDescription>
              क्या आप इस दान को हटाना चाहते हैं?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>रद्द करें</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>हाँ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default FinancalHelpListPage