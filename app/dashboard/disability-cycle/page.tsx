"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, Eye, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, getPhotoDataUrl } from "@/lib/utils";
import * as XLSX from "xlsx";
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
} from "@/components/ui/alert-dialog";

interface DisabilityCycleRecord {
  id: string
  formNumber: string
  applicationDate: string
  applicantName: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  aadharNumber: string
  gotra: string
  age: string
  mobile: string
  address: string
  pinCode: string
  tehsil: string
  district: string
  state: string
  createdAt: string
  photo?: string
  created_at?: string
  addedby?: string
  addedby_id?: number
}

export default function DisabilityCyclePage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [addressFilter, setAddressFilter] = useState<string>("all");
  const router = useRouter()

  const {
    records,
    loading,
    readApi,
    deleteApi,
    createApi
  } = useCRUD<DisabilityCycleRecord>("disabilityCycleRecords", [], {
    create: API_ENDPOINTS.CREATE_DISABILITY_CYCLE,
    read: API_ENDPOINTS.GET_DISABILITY_CYCLES,
    update: API_ENDPOINTS.UPDATE_DISABILITY_CYCLE,
    delete: API_ENDPOINTS.DELETE_DISABILITY_CYCLE,
  });

  const displayRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        applicationDate: formatDate(record.applicationDate),
        dateOfBirth: formatDate(record.dateOfBirth),
        createdAt: formatDate(record.createdAt),
      })),
    [records]
  );

  const fetchDisabilityCycles = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching disability cycles:", error);
    }
  }, [readApi]);

  // Extract unique addresses from records
  const uniqueAddresses = useMemo(() => {
    const addresses = displayRecords
      .map(record => record.address)
      .filter(address => address && address.trim() !== '')
      .filter((address, index, self) => self.indexOf(address) === index)
      .sort();
    return addresses;
  }, [displayRecords]);

  // Handle address filter change
  const handleAddressFilterChange = useCallback((address: string) => {
    setAddressFilter(address);
    if (address === "all") {
      fetchDisabilityCycles();
    } else {
      fetchDisabilityCycles({ address });
    }
  }, [fetchDisabilityCycles]);

  const handleDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const success = await deleteApi(recordToDelete);
      if (success) {
        // Ensure UI stays in sync with server after deletion
        await fetchDisabilityCycles();
      }
    } catch (error) {
      console.error("Error deleting disability cycle:", error);
      toast.error("निःशक्त साइकिल आवेदन हटाने में त्रुटि");
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleDownloadPDF = async (record: DisabilityCycleRecord) => {
    try {
      // Fetch image data if photo URL exists (resolves relative /uploads paths)
      const imageData = await getPhotoDataUrl(record.photo);

      const response = await fetch('/api/generate-disability-cycle-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: record,
          imageData: imageData,
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
      a.download = `disability_cycle_${record.formNumber}.pdf`;
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
      if (displayRecords.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = displayRecords.map((record) => ({
        "फॉर्म संख्या": record.formNumber,
        "आवेदन दिनांक": record.applicationDate,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आधार संख्या": record.aadharNumber,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "मोबाइल": record.mobile,
        "गाँव/पता": record.address,
        "पिन कोड": record.pinCode,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "राज्य": record.state,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Disability Cycle");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `disability_cycle_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const columns = [
    { key: "formNumber", label: "फॉर्म संख्या", className: "min-w-[100px]" },
    { key: "applicationDate", label: "आवेदन दिनांक", className: "min-w-[100px]" },
    { key: "applicantName", label: "आवेदक का नाम", className: "min-w-[150px]" },
    { key: "fatherName", label: "पिता का नाम", className: "min-w-[130px]" },
    { key: "age", label: "आयु", className: "min-w-[60px]" },
    { key: "mobile", label: "मोबाइल", className: "min-w-[100px] hidden md:table-cell" },
    { key: "address", label: "गाँव/पता", className: "min-w-[120px] hidden lg:table-cell" },
  ]

  const searchFields: (keyof DisabilityCycleRecord)[] = [
    "formNumber",
    "applicantName",
    "fatherName",
    "mobile",
    "address",
    "applicationDate",
  ]

  const importHeaders = [
    "\u0906\u0935\u0947\u0926\u0928 \u0926\u093f\u0928\u093e\u0902\u0915",
    "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e",
    "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e",
    "\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e",
    "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f",
    "\u0906\u092f\u0941",
    "\u092e\u094b\u092c\u093e\u0907\u0932",
    "\u0917\u094b\u0924\u094d\u0930",
    "\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e",
    "\u0917\u093e\u0901\u0935/\u092a\u0924\u093e",
    "\u092a\u093f\u0928 \u0915\u094b\u0921",
    "\u0924\u0939\u0938\u0940\u0932",
    "\u091c\u093f\u0932\u093e",
    "\u0930\u093e\u091c\u094d\u092f"
  ];

  const importSampleRows = [
    {
      "\u0906\u0935\u0947\u0926\u0928 \u0926\u093f\u0928\u093e\u0902\u0915": "12-07-2026",
      "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e": "\u0915\u0935\u093f\u0924\u093e \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e": "\u0930\u092e\u0947\u0936 \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e": "\u0917\u0941\u0921\u094d\u0921\u0940 \u0926\u0947\u0935\u0940",
      "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f": "15-08-2010",
      "\u0906\u092f\u0941": "16",
      "\u092e\u094b\u092c\u093e\u0907\u0932": "9876543210",
      "\u0917\u094b\u0924\u094d\u0930": "\u092a\u094d\u0930\u091c\u093e\u092a\u0924",
      "\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e": "123456789012",
      "\u0917\u093e\u0901\u0935/\u092a\u0924\u093e": "\u091c\u0938\u094b\u0932",
      "\u092a\u093f\u0928 \u0915\u094b\u0921": "344024",
      "\u0924\u0939\u0938\u0940\u0932": "\u092c\u093e\u0932\u094b\u0924\u0930\u093e",
      "\u091c\u093f\u0932\u093e": "\u092c\u093e\u0921\u093c\u092e\u0947\u0930",
      "\u0930\u093e\u091c\u094d\u092f": "\u0930\u093e\u091c\u0938\u094d\u0925\u093e\u0928"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const payload = {
      applicationDate: formatExcelDate(row["\u0906\u0935\u0947\u0926\u0928 \u0926\u093f\u0928\u093e\u0902\u0915"]),
      applicantName: String(row["\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      fatherName: String(row["\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      motherName: String(row["\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      dateOfBirth: formatExcelDate(row["\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f"]),
      age: parseInt(row["\u0906\u092f\u0941"]) || 0,
      mobile: String(row["\u092e\u094b\u092c\u093e\u0907\u0932"] || "").trim().replace(/\D/g, ""),
      gotra: String(row["\u0917\u094b\u0924\u094d\u0930"] || "Prajapat").trim(),
      aadharNumber: String(row["\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e"] || "").trim().replace(/\D/g, ""),
      address: String(row["\u0917\u093e\u0901\u0935/\u092a\u0924\u093e"] || "").trim(),
      pinCode: String(row["\u092a\u093f\u0928 \u0915\u094b\u0921"] || "").trim(),
      tehsil: String(row["\u0924\u0939\u0938\u0940\u0932"] || "").trim(),
      district: String(row["\u091c\u093f\u0932\u093e"] || "").trim(),
      state: String(row["\u0930\u093e\u091c\u094d\u092f"] || "").trim(),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading disability cycle applications...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable
        data={displayRecords}
        columns={columns}
        title="निः शुल्क साइकिल वितरण (Disability Cycle Distribution)"
        subtitle="निः शुल्क व्यक्तियों के लिए मुफ्त साइकिल वितरण"
        addNewUrl="/dashboard/disability-cycle/add"
        addNewLabel="Add New Application"
        onDelete={handleDelete}
        onDownloadPDF={handleDownloadPDF}
        editUrlPattern="/dashboard/disability-cycle/edit/[id]"
        searchFields={searchFields}
        itemsPerPage={10}
        showAddressFilter={true}
        addressField="address"
        onAddressFilterChange={handleAddressFilterChange}
        currentAddressFilter={addressFilter}
        uniqueAddresses={uniqueAddresses}
        headerActions={
          <div className="flex gap-2">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={displayRecords.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <BulkUploadButton
              moduleName="Disability Cycle"
              requiredHeaders={importHeaders}
              sampleRows={importSampleRows}
              onImportRow={handleImportRow}
              onSuccess={() => fetchDisabilityCycles()}
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
