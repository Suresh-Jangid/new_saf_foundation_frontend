"use client"

import { useState, useCallback, useEffect } from "react"
import { DataTable } from "@/components/data-table"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { getPhotoDataUrl } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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

interface PensionYojanaRecord {
  id: string
  date: string
  formNumber: string
  name: string
  fatherName: string
  gotra: string
  age: string
  village: string
  tehsil: string
  district: string
  mobile: string
  photo: string
  bankName: string
  accountNumber: string
  ifscCode: string
  monthlyPension: string
  createdAt: string
}

export default function PensionYojanaPage() {
  const [currentVillageFilter, setCurrentVillageFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<PensionYojanaRecord>("pensionYojanaRecords", [], {
    create: API_ENDPOINTS.CREATE_PENSION_YOJANA,
    read: API_ENDPOINTS.GET_PENSION_YOJANAS,
    update: API_ENDPOINTS.UPDATE_PENSION_YOJANA,
    delete: API_ENDPOINTS.DELETE_PENSION_YOJANA,
  });

  // Get unique villages for filter dropdown
  const uniqueVillages = Array.from(new Set(records.map(record => record.village).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[PensionYojana] Filter effect running:', { currentVillageFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentVillageFilter !== "all") {
      activeFilters.village = currentVillageFilter;
    }
    
    // Call readApi directly instead of through fetchPensionYojana
    const applyFilters = async () => {
      try {
        console.log('[PensionYojana] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching pension yojana records:", error);
        toast.error("Failed to fetch pension yojana records from server");
      }
    };
    
    applyFilters();
  }, [currentVillageFilter]); // Removed readApi dependency

  // Handle village filter change
  const handleVillageFilterChange = (village: string) => {
    setCurrentVillageFilter(village);
  }

  const fetchPensionYojana = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching pension yojana records:", error);
    }
  }, [readApi]);

  // Delete handler with confirmation
  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      const success = await deleteApi(recordToDelete)
      if (success) {
        await fetchPensionYojana()
      }
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleDownloadPDF = async (record: PensionYojanaRecord) => {
    try {
      // Resolve the stored photo (relative /uploads path) to a base64 data URL
      // so the PDF route can embed it.
      const imageData = await getPhotoDataUrl(record.photo);

      const response = await fetch('/api/generate-pension-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: record,
          imageData, // base64 data URL (or null)
          debug: false, // Set to true for debugging coordinates
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
      a.download = `pension_yojana_${record.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF सफलतापूर्वक डाउनलोड किया गया');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF जनरेट करने में त्रुटि');
    }
  }

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = records.map((record) => ({
        "तिथि": record.date,
        "फॉर्म नंबर": record.formNumber,
        "नाम": record.name,
        "पिता का नाम": record.fatherName,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "गाँव": record.village,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "मोबाइल": record.mobile,
        "बैंक का नाम": record.bankName,
        "खाता संख्या": record.accountNumber,
        "IFSC कोड": record.ifscCode,
        "मासिक पेंशन": record.monthlyPension,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pension Yojana Application Payment");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pension_yojana_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  // Table columns
  const columns = [
    { key: "date", label: "तिथि (Date)" },
    { key: "formNumber", label: "फॉर्म नंबर (Form Number)" },
    { key: "name", label: "नाम (Name)" },
    { key: "fatherName", label: "पिता (Father's Name)" },
    { key: "gotra", label: "गोत्र (Gotra)" },
    { key: "age", label: "आयु (Age)" },
    { key: "village", label: "गाँव (Village)" },
    { key: "tehsil", label: "तहसील (Tehsil)" },
    { key: "district", label: "जिला (District)" },
    { key: "mobile", label: "मोबाइल (Mobile)" },
    { key: "bankName", label: "बैंक का नाम (Bank Name)" },
    { key: "accountNumber", label: "खाता संख्या (Account Number)" },
    { key: "ifscCode", label: "IFSC कोड (IFSC Code)" },
    { key: "monthlyPension", label: "मासिक पेंशन (Monthly Pension)" },
  ]

  const searchFields: (keyof PensionYojanaRecord)[] = [
    "name",
    "fatherName",
    "gotra",
    "village",
    "tehsil",
    "district",
    "mobile",
    "bankName",
    "accountNumber",
    "ifscCode",
    "monthlyPension",
    "date",
    "formNumber",
  ]

  const importHeaders = [
    "\u0924\u093f\u0925\u093f",
    "\u0928\u093e\u092e",
    "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e",
    "\u0917\u094b\u0924\u094d\u0930",
    "\u0906\u092f\u0941",
    "\u0917\u093e\u0901\u0935",
    "\u0924\u0939\u0938\u0940\u0932",
    "\u091c\u093f\u0932\u093e",
    "\u092e\u094b\u092c\u093e\u0907\u0932",
    "\u092c\u0948\u0902\u0915 \u0915\u093e \u0928\u093e\u092e",
    "\u0916\u093e\u0924\u093e \u0938\u0902\u0916\u094d\u092f\u093e",
    "IFSC \u0915\u094b\u0921",
    "\u092e\u093e\u0938\u093f\u0915 \u092a\u0947\u0902\u0936\u0928"
  ];

  const importSampleRows = [
    {
      "\u0924\u093f\u0925\u093f": "12-07-2026",
      "\u0928\u093e\u092e": "\u0915\u0935\u093f\u0924\u093e \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e": "\u0930\u092e\u0947\u0936 \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u0917\u094b\u0924\u094d\u0930": "\u092a\u094d\u0930\u091c\u093e\u092a\u0924",
      "\u0906\u092f\u0941": "65",
      "\u0917\u093e\u0901\u0935": "\u091c\u0938\u094b\u0932",
      "\u0924\u0939\u0938\u0940\u0932": "\u092c\u093e\u0932\u094b\u0924\u0930\u093e",
      "\u091c\u093f\u0932\u093e": "\u092c\u093e\u0921\u093c\u092e\u0947\u0930",
      "\u092e\u094b\u092c\u093e\u0907\u0932": "9876543210",
      "\u092c\u0948\u0902\u0915 \u0915\u093e \u0928\u093e\u092e": "SBI",
      "\u0916\u093e\u0924\u093e \u0938\u0902\u0916\u094d\u092f\u093e": "12345678901",
      "IFSC \u0915\u094b\u0921": "SBIN0001234",
      "\u092e\u093e\u0938\u093f\u0915 \u092a\u0947\u0902\u0936\u0928": "1500"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const payload = {
      date: formatExcelDate(row["\u0924\u093f\u0925\u093f"]),
      name: String(row["\u0928\u093e\u092e"] || "").trim(),
      fatherName: String(row["\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      gotra: String(row["\u0917\u094b\u0924\u094d\u0930"] || "Prajapat").trim(),
      age: parseInt(row["\u0906\u092f\u0941"]) || 0,
      village: String(row["\u0917\u093e\u0901\u0935"] || "").trim(),
      tehsil: String(row["\u0924\u0939\u0938\u0940\u0932"] || "").trim(),
      district: String(row["\u091c\u093f\u0932\u093e"] || "").trim(),
      mobile: String(row["\u092e\u094b\u092c\u093e\u0907\u0932"] || "").trim().replace(/\D/g, ""),
      bankName: String(row["\u092c\u0948\u0902\u0915 \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      accountNumber: String(row["\u0916\u093e\u0924\u093e \u0938\u0902\u0916\u094d\u092f\u093e"] || "").trim(),
      ifscCode: String(row["IFSC \u0915\u094b\u0921"] || "").trim(),
      monthlyPension: String(row["\u092e\u093e\u0938\u093f\u0915 \u092a\u0947\u0902\u0936\u0928"] || "0").trim(),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  return (
    <>
      <DataTable
        data={records}
        columns={columns}
        title="पेंशन योजना आवेदन सूची (Pension Yojana Application Payment)"
        subtitle="पेंशन योजना के लिए प्राप्त सभी आवेदन"
        addNewUrl="/dashboard/pension-yojana/add"
        addNewLabel="Add New Application"
        onDelete={handleDelete}
        onDownloadPDF={handleDownloadPDF}
        editUrlPattern="/dashboard/pension-yojana/edit/[id]"
        searchFields={searchFields}
        itemsPerPage={10}
        showAddressFilter={true}
        addressField="village"
        onAddressFilterChange={handleVillageFilterChange}
        currentAddressFilter={currentVillageFilter}
        uniqueAddresses={uniqueVillages}
        headerActions={
          <div className="flex gap-2">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={records.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <BulkUploadButton
              moduleName="Pension Yojana Application Payment"
              requiredHeaders={importHeaders}
              sampleRows={importSampleRows}
              onImportRow={handleImportRow}
              onSuccess={() => fetchPensionYojana()}
            />
          </div>
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>रिकॉर्ड हटाएं</AlertDialogTitle>
            <AlertDialogDescription>
              क्या आप इस डेटा को हटाना चाहते हैं?
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
