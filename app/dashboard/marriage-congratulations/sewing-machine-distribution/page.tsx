"use client"

import { useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { BulkUploadButton } from "@/components/bulk-upload-button"
import { getCurrentUserInfo } from "@/lib/utils"
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

interface SewingMachineRecord {
  id: string
  marriageNumber: string
  // formNumber: string
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
}

export default function SewingMachineDistributionListPage() {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<SewingMachineRecord>("marriageSewingMachineRecords", [], {
    create: API_ENDPOINTS.CREATE_MARRIAGE_SEWING,
    read: API_ENDPOINTS.GET_MARRIAGE_SEWING,
    update: API_ENDPOINTS.UPDATE_MARRIAGE_SEWING,
    delete: API_ENDPOINTS.DELETE_MARRIAGE_SEWING,
  });

  const fetchSewingMachine = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching sewing machine records:", error);
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
        await fetchSewingMachine()
      }
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

 
  const handleGeneratePDFForm = async (record: SewingMachineRecord) => {
    try {
      // Prepare data for PDF generation
      const pdfData = {
        marriageNumber: record.marriageNumber,
        applicationDate: record.applicationDate,
        applicantName: record.applicantName,
        fatherName: record.fatherName,
        motherName: record.motherName,
        dateOfBirth: record.dateOfBirth,
        gotra: record.gotra,
        age: record.age,
        mobile: record.mobile,
        aadharNumber: record.aadharNumber,
        address: record.address,
        pinCode: record.pinCode,
        tehsil: record.tehsil,
        district: record.district,
        state: record.state,
      };

      // Generate PDF
      const response = await fetch('/api/generate-sewing-machine-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: pdfData,
          debug: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate PDF');
      }

      // Create blob and download
      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sewing_machine_distribution_${record.marriageNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF form');
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
        "विवाह नंबर": record.marriageNumber,
        "आवेदन तिथि": record.applicationDate,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आधार नंबर": record.aadharNumber,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "मोबाइल": record.mobile,
        "गांव": record.address,
        "पिन कोड": record.pinCode,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "राज्य": record.state,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sewing Machine Distribution");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sewing_machine_distribution_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    "विवाह नंबर",
    "आवेदन तिथि",
    "आवेदक का नाम",
    "पिता का नाम",
    "माता का नाम",
    "जन्म तिथि",
    "आधार नंबर",
    "गोत्र",
    "आयु",
    "मोबाइल",
    "गांव",
    "पिन कोड",
    "तहसील",
    "जिला",
    "राज्य"
  ];

  const importSampleRows = [
    {
      "विवाह नंबर": "MR-101",
      "आवेदन तिथि": "12-07-2026",
      "आवेदक का नाम": "कविता प्रजापति",
      "पिता का नाम": "रमेश प्रजापति",
      "माता का नाम": "गुड्डी देवी",
      "जन्म तिथि": "15-08-2010",
      "आधार नंबर": "123456789012",
      "गोत्र": "प्रजापत",
      "आयु": "16",
      "मोबाइल": "9876543210",
      "गांव": "जसोल",
      "पिन कोड": "344024",
      "तहसील": "बालोतरा",
      "जिला": "बाड़मेर",
      "राज्य": "राजस्थान"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const { addedby, addedby_id } = getCurrentUserInfo();

    const payload = {
      marriageNumber: String(row["विवाह नंबर"] || "").trim(),
      applicationDate: formatExcelDate(row["आवेदन तिथि"]),
      applicantName: String(row["आवेदक का नाम"] || "").trim(),
      fatherName: String(row["पिता का नाम"] || "").trim(),
      motherName: String(row["माता का नाम"] || "").trim(),
      dateOfBirth: formatExcelDate(row["जन्म तिथि"]),
      aadharNumber: String(row["आधार नंबर"] || "").trim().replace(/\D/g, ""),
      gotra: String(row["गोत्र"] || "Prajapat").trim(),
      age: String(row["आयु"] || "").trim(),
      mobile: String(row["मोबाइल"] || "").trim().replace(/\D/g, ""),
      address: String(row["गांव"] || "").trim(),
      pinCode: String(row["पिन कोड"] || "").trim(),
      tehsil: String(row["तहसील"] || "").trim(),
      district: String(row["जिला"] || "").trim(),
      state: String(row["राज्य"] || "").trim(),
      addedby,
      addedby_id: String(addedby_id),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  // Table columns
  const columns = [
    { key: "marriageNumber", label: "विवाह नंबर (Marriage Number)" },
    { key: "applicationDate", label: "आवेदन तिथि (Application Date)" },
    { key: "applicantName", label: "आवेदक का नाम (Applicant Name)" },
    { key: "fatherName", label: "पिता का नाम (Father Name)" },
    { key: "motherName", label: "माता का नाम (Mother Name)" },
    { key: "dateOfBirth", label: "जन्म तिथि (Date of Birth)" },
    { key: "aadharNumber", label: "आधार नंबर (Aadhar Number)" },
    { key: "gotra", label: "गोत्र (Gotra)" },
    { key: "age", label: "आयु (Age)" },
    { key: "mobile", label: "मोबाइल (Mobile)" },
    { key: "address", label: "गांव (Village)" },
    { key: "pinCode", label: "पिन कोड (Pin Code)" },
    { key: "tehsil", label: "तहसील (Tehsil)" },
    { key: "district", label: "जिला (District)" },
    { key: "state", label: "राज्य (State)" },
  ]

  const searchFields: (keyof SewingMachineRecord)[] = [
    "marriageNumber",
 
    "applicantName",
    "fatherName",
    "motherName",
    "aadharNumber",
    "gotra",
    "mobile",
    "address",
    "tehsil",
    "district",
    "state",
    "applicationDate",
    "dateOfBirth",
  ]

  return (
    <>
      <DataTable
        data={records}
        columns={columns}
        title="विवाह सिलाई मशीन वितरण आवेदन सूची (Marriage Sewing Machine Distribution Applications)"
        subtitle="विवाह सिलाई मशीन वितरण के लिए प्राप्त सभी आवेदन"
        addNewUrl="/dashboard/marriage-congratulations/sewing-machine-distribution/add"
        addNewLabel="Add New Application"
        onDelete={handleDelete}
        editUrlPattern="/dashboard/marriage-congratulations/sewing-machine-distribution/edit/[id]"
        searchFields={searchFields}
        itemsPerPage={10}      
        onGeneratePDFForm={handleGeneratePDFForm}
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
              moduleName="Marriage Sewing Machine Distribution"
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
