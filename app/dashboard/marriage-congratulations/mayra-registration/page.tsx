"use client"

import { useState, useCallback, useEffect } from "react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { BulkUploadButton } from "@/components/bulk-upload-button"
import { parseDateFromDDMMYYYY, getCurrentUserInfo } from "@/lib/utils"
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

interface MayraRegistrationRecord {
  id: string
  createdAt: string
  date: string
  codeNumber: string
  mayraNumber: string
  applicantName: string
  fatherName: string
  wifeOf: string
  gotra: string
  address: string
  membershipJoinDate: string
  associatedUntil: string
  permanentFee: string
  installmentAmount: string
  totalGrantAmount: string
  totalMembersServing: number
  rate100: number
  rate200: number
  rate300: number
  deductionPercent: string
  deductedAmount: string
  totalPaidAmount: string
  gender: string
  payment_status: number
  mayra_id: number
  formNumber: string
  added_name: string | null
}

export default function MayraRegistrationPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const router = useRouter()

  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<MayraRegistrationRecord>("mayraRegistrationRecords", [], {
    create: API_ENDPOINTS.CREATE_MAYRA_CONGRATS,
    read: API_ENDPOINTS.GET_MAYRA_CONGRATS,
    update: API_ENDPOINTS.UPDATE_MAYRA_CONGRATS,
    delete: API_ENDPOINTS.DELETE_MAYRA_CONGRATS,
  });

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(records.map(record => record.address).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    const activeFilters: Record<string, any> = {};
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    const applyFilters = async () => {
      try {
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching Mayra registrations:", error);
        toast.error("Failed to fetch Mayra registrations from server");
      }
    };
    
    applyFilters();
  }, [currentAddressFilter, readApi]);

  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    try {
      await deleteApi(recordToDelete);
    } catch (error) {
      console.error("Error deleting Mayra registration:", error)
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleGeneratePDFForm = async (record: MayraRegistrationRecord) => {
    try {
      const response = await fetch('/api/generate-mayra-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record: record,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `mayra_registration_${record.mayraNumber || record.id}.pdf`;
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      
      toast.success('PDF form generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF form');
    }
  };

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        toast.error("No data to export");
        return;
      }

      const excelData = records.map((record) => ({
        "दिनांक": record.date,
        "कोड संख्या": record.codeNumber,
        "मायरा संख्या": record.mayraNumber,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "पत्नी": record.wifeOf,
        "गोत्र": record.gotra,
        "निवासी": record.address,
        "समान भुगतान": record.totalPaidAmount,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mayra Congratulations");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mayra_congratulations_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Excel file exported successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export Excel file");
    }
  };

  const importHeaders = [
    "दिनांक",
    "कोड संख्या",
    "मायरा संख्या",
    "आवेदक का नाम",
    "लिंग",
    "पिता का नाम / पति का नाम",
    "गोत्र",
    "निवासी",
    "सदस्यता तिथि",
    "संस्था से जुड़ी रही",
    "स्थायी शुल्क",
    "किस्त राशि",
    "कुल अनुदान",
    "कुल सदस्य",
    "100x",
    "200x",
    "300x",
    "कटौती %",
    "कटौती राशि",
    "कुल भुगतान"
  ];

  const importSampleRows = [
    {
      "दिनांक": "12-07-2026",
      "कोड संख्या": "123",
      "मायरा संख्या": "BMF-001",
      "आवेदक का नाम": "कविता प्रजापति",
      "लिंग": "Female",
      "पिता का नाम / पति का नाम": "रमेश प्रजापति",
      "गोत्र": "प्रजापत",
      "निवासी": "जसोल",
      "सदस्यता तिथि": "15-08-2010",
      "संस्था से जुड़ी रही": "संजीवन",
      "स्थायी शुल्क": "500",
      "किस्त राशि": "100",
      "कुल अनुदान": "21000",
      "कुल सदस्य": "10",
      "100x": "3",
      "200x": "5",
      "300x": "2",
      "कटौती %": "20",
      "कटौती राशि": "4200",
      "कुल भुगतान": "16800"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const { addedby, addedby_id } = getCurrentUserInfo();
    const genderVal = String(row["लिंग"] || "Female").trim();
    const isMale = genderVal.toLowerCase() === "male" || genderVal === "पुरुष";
    const parentOrSpouseVal = String(row["पिता का नाम / पति का नाम"] || "").trim();

    const payload = {
      date: formatExcelDate(row["दिनांक"]),
      codeNumber: String(row["कोड संख्या"] || "").trim(),
      mayraNumber: String(row["मायरा संख्या"] || "").trim(),
      applicantName: String(row["आवेदक का नाम"] || "").trim(),
      gender: isMale ? "Male" : "Female",
      fatherName: isMale ? parentOrSpouseVal : "",
      wifeOf: !isMale ? parentOrSpouseVal : "",
      gotra: String(row["गोत्र"] || "Prajapat").trim(),
      address: String(row["निवासी"] || "").trim(),
      membershipJoinDate: formatExcelDate(row["सदस्यता तिथि"]),
      associatedUntil: String(row["संस्था से जुड़ी रही"] || "").trim(),
      permanentFee: String(row["स्थायी शुल्क"] || "0").trim(),
      installmentAmount: String(row["किस्त राशि"] || "0").trim(),
      totalGrantAmount: String(row["कुल अनुदान"] || "0").trim(),
      totalMembersServing: String(row["कुल सदस्य"] || "0").trim(),
      rate100: String(row["100x"] || "0").trim(),
      rate200: String(row["200x"] || "0").trim(),
      rate300: String(row["300x"] || "0").trim(),
      deductionPercent: String(row["कटौती %"] || "20").trim(),
      deductedAmount: String(row["कटौती राशि"] || "0").trim(),
      totalPaidAmount: String(row["कुल भुगतान"] || "0").trim(),
      addedby,
      addedby_id,
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  const columns = [
    { key: "date", label: "दिनांक", className: "min-w-[100px]" },
    { key: "codeNumber", label: "कोड संख्या", className: "min-w-[100px]" },
    { key: "mayraNumber", label: "मायरा संख्या", className: "min-w-[100px]" },
    { key: "applicantName", label: "आवेदक का नाम", className: "min-w-[150px]" },
    { key: "fatherName", label: "पिता का नाम", className: "min-w-[150px]" },
    { key: "gotra", label: "गोत्र", className: "min-w-[100px]" },
    { key: "address", label: "निवासी", className: "min-w-[200px]" },
    { key: "totalPaidAmount", label: "कुल भुगतान", className: "min-w-[100px]" },
  ]

  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataTable
        data={records}
        columns={columns}
        title="मायरा फॉर्म आवेदन पत्र (Mayra Registration)"
        subtitle="मायरा पंजीकरण फॉर्म प्रबंधित करें"
        addNewUrl="/dashboard/marriage-congratulations/mayra-registration/add"
        addNewLabel="Add New Record"
        onDelete={handleDelete}
        onGeneratePDFForm={handleGeneratePDFForm}
        editUrlPattern="/dashboard/marriage-congratulations/mayra-registration/edit/[id]"
        searchFields={["formNumber", "applicantName"]}
        itemsPerPage={10}
        showAddressFilter={true}
        addressField="address"
        onAddressFilterChange={handleAddressFilterChange}
        currentAddressFilter={currentAddressFilter}
        uniqueAddresses={uniqueAddresses}
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
              moduleName="Mayra Registration"
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
