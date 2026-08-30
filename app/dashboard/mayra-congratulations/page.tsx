"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, IndianRupee } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, mayraCongratsAPI } from "@/lib/api"
import { toast } from "sonner"
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

interface MayraCongratsRecord {
  id: string
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
  totalMembersServing: string
  rate200: string
  rate300: string
  deductionPercent: string
  deductedAmount: string
  totalPaidAmount: string
  gender: string
  payment_status: number
  mayra_id: string
  formNumber: string
  paymentAmount: string
  totalAmount: string
  pendingAmount: string
  added_name?: string
  createdAt: string
}

export default function MayraCongratulationsPage() {
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const router = useRouter()

  const {
    records,
    loading,
    readApi,
    deleteApi,
    createApi,
  } = useCRUD<MayraCongratsRecord>("mayraCongratsRecords", [], {
    create: API_ENDPOINTS.CREATE_MAYRA_CONGRATS,
    read: API_ENDPOINTS.GET_MAYRA_CONGRATS,
    update: API_ENDPOINTS.UPDATE_MAYRA_CONGRATS,
    delete: API_ENDPOINTS.DELETE_MAYRA_CONGRATS,
  }, { autoLoad: false })

  const lastAppliedKeyRef = useRef<string | null>(null)
  
  useEffect(() => {
    const activeFilters: Record<string, any> = {}
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }

    const key = JSON.stringify(activeFilters)
    if (lastAppliedKeyRef.current === key) return
    lastAppliedKeyRef.current = key

    const fetchData = async () => {
      try {
        await readApi(activeFilters)
      } catch (error) {
        console.error("Error fetching records:", error)
        toast.error("Failed to fetch records")
      }
    }
    
    fetchData()
  }, [currentGenderFilter, currentAddressFilter])

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(records.map(record => record.address).filter(Boolean))).sort();

  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  }

  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      const success = await deleteApi(recordToDelete)
      if (success) {
        await readApi()
      }
    } catch {
      toast.error("रिकॉर्ड हटाने में त्रुटि")
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleTogglePaymentStatus = async (record: MayraCongratsRecord) => {
    try {
      const newStatus = record.payment_status === 1 ? 0 : 1
      const res = await mayraCongratsAPI.updateStatus(record.id, newStatus)
      if (res.status) {
        toast.success("Payment status updated")
        await readApi()
      } else {
        toast.error(res.message || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleGeneratePDFForm = async (record: MayraCongratsRecord) => {
    try {
      const response = await fetch('/api/generate-mayra-congratulations-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: record,
          offsetX: 0,
          offsetY: 0,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mayra_congratulations_form_${record.mayraNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handleGenerateNGOLetter = async (record: MayraCongratsRecord) => {
    try {
      const response = await fetch('/api/generate-mayra-ngo-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: record }),
      })

      if (!response.ok) throw new Error('Failed to generate NGO letter')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mayra_ngo_letter_${record.mayraNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('NGO letter generated successfully')
    } catch (error) {
      console.error('Error generating NGO letter:', error)
      toast.error('Failed to generate NGO letter')
    }
  }

  const handleExportExcel = () => {
    if (records.length === 0) { toast.error("No data to export"); return }
    const excelData = records.map(r => ({
      "दिनांक": r.date,
      "मायरा संख्या": r.mayraNumber,
      "फॉर्म संख्या": r.formNumber || r.codeNumber || "",
      "आवेदक का नाम": r.applicantName,
      "लिंग": r.gender,
      "पिता का नाम": r.gender === "Male" || r.gender === "male" ? r.fatherName || "" : "",
      "पति का नाम": r.gender === "Female" || r.gender === "female" ? r.wifeOf || "" : "",
      "गोत्र": r.gotra,
      "पता": r.address,
      "सदस्यता तिथि": r.membershipJoinDate,
      "संस्था से जुड़ी रही": r.associatedUntil,
      "स्थायी शुल्क": r.permanentFee,
      "किस्त राशि": r.installmentAmount,
      "कुल अनुदान": r.totalGrantAmount,
      "कुल सदस्य": r.totalMembersServing,
      "200x": r.rate200,
      "300x": r.rate300,
      "कटौती %": r.deductionPercent,
      "कटौती राशि": r.deductedAmount,
      "कुल भुगतान": r.totalPaidAmount,
      "भुगतान स्थिति": r.payment_status === 1 ? "पूर्ण" : "बाकी",
    }))
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Mayra Congratulations")
    XLSX.writeFile(wb, `mayra_congratulations_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success("Excel exported successfully")
  }

  const columns = [
    { key: "date", label: "दिनांक", className: "min-w-[100px]" },
    { key: "mayraNumber", label: "मायरा संख्या", className: "min-w-[100px]" },
    { key: "formNumber", label: "फॉर्म संख्या", className: "min-w-[100px]", render: (_: unknown, row: MayraCongratsRecord) => row.formNumber || row.codeNumber || "-" },
    { key: "applicantName", label: "आवेदक का नाम", className: "min-w-[150px]" },
    { key: "gender", label: "लिंग", className: "min-w-[80px]" },
    {
      key: "fatherName",
      label: "पिता का नाम",
      className: "min-w-[120px]",
      render: (_: any, row: MayraCongratsRecord) =>
        row.gender === "Male" || row.gender === "male" ? row.fatherName : row.wifeOf || "",
    },
    { key: "gotra", label: "गोत्र", className: "min-w-[100px]" },
    { key: "address", label: "पता", className: "min-w-[200px]" },
    { key: "membershipJoinDate", label: "सदस्यता तिथि", className: "min-w-[120px]" },
    { key: "associatedUntil", label: "संस्था से जुड़ी रही", className: "min-w-[120px]" },
    { key: "permanentFee", label: "स्थायी शुल्क", className: "min-w-[100px]" },
    { key: "installmentAmount", label: "किस्त राशि", className: "min-w-[100px]" },
    { key: "totalGrantAmount", label: "कुल अनुदान", className: "min-w-[100px]" },
    { key: "totalMembersServing", label: "कुल सदस्य", className: "min-w-[100px]" },
    { key: "rate200", label: "200x", className: "min-w-[60px]" },
    { key: "rate300", label: "300x", className: "min-w-[60px]" },
    { key: "deductionPercent", label: "कटौती %", className: "min-w-[80px]" },
    { key: "deductedAmount", label: "कटौती राशि", className: "min-w-[100px]" },
    { key: "totalPaidAmount", label: "कुल भुगतान", className: "min-w-[100px]" },
  ]

  const importHeaders = [
    "\u0926\u093f\u0928\u093e\u0902\u0915",
    "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e",
    "\u0932\u093f\u0902\u0917",
    "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e / \u092a\u0924\u093f \u0915\u093e \u0928\u093e\u092e",
    "\u0917\u094b\u0924\u094d\u0930",
    "\u0928\u093f\u0935\u093e\u0938\u0940",
    "\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f",
    "\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940",
    "\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915",
    "\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f",
    "\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928",
    "\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f",
    "200x",
    "300x",
    "\u0915\u091f\u094c\u0924\u0940 %",
    "\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f",
    "\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928"
  ];

  const importSampleRows = [
    {
      "\u0926\u093f\u0928\u093e\u0902\u0915": "12-07-2026",
      "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e": "\u0915\u0935\u093f\u0924\u093e \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u0932\u093f\u0902\u0917": "Female",
      "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e / \u092a\u0924\u093f \u0915\u093e \u0928\u093e\u092e": "\u0930\u092e\u0947\u0936 \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u0917\u094b\u0924\u094d\u0930": "\u092a\u094d\u0930\u091c\u093e\u092a\u0924",
      "\u0928\u093f\u0935\u093e\u0938\u0940": "\u091c\u0938\u094b\u0932",
      "\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f": "15-08-2010",
      "\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940": "15-08-2020",
      "\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915": "500",
      "\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f": "100",
      "\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928": "21000",
      "\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f": "10",
      "200x": "5",
      "300x": "2",
      "\u0915\u091f\u094c\u0924\u0940 %": "10",
      "\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f": "2100",
      "\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928": "18900"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const genderVal = String(row["\u0932\u093f\u0902\u0917"] || "").trim();
    const isMale = genderVal.toLowerCase() === "male" || genderVal === "\u092a\u0941\u0930\u0941\u0937";
    const parentOrSpouseVal = String(row["\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e / \u092a\u0924\u093f \u0915\u093e \u0928\u093e\u092e"] || "").trim();

    const payload = {
      date: formatExcelDate(row["\u0926\u093f\u0928\u093e\u0902\u0915"]),
      applicantName: String(row["\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      gender: isMale ? "Male" : "Female",
      fatherName: isMale ? parentOrSpouseVal : "",
      wifeOf: !isMale ? parentOrSpouseVal : "",
      gotra: String(row["\u0917\u094b\u0924\u094d\u0930"] || "Prajapat").trim(),
      address: String(row["\u0928\u093f\u0935\u093e\u0938\u0940"] || "").trim(),
      membershipJoinDate: formatExcelDate(row["\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f"]),
      associatedUntil: formatExcelDate(row["\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940"]),
      permanentFee: String(row["\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915"] || "0").trim(),
      installmentAmount: String(row["\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f"] || "0").trim(),
      totalGrantAmount: String(row["\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928"] || "0").trim(),
      totalMembersServing: String(row["\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f"] || "0").trim(),
      rate200: String(row["200x"] || "0").trim(),
      rate300: String(row["300x"] || "0").trim(),
      deductionPercent: String(row["\u0915\u091f\u094c\u0924\u0940 %"] || "0").trim(),
      deductionAmount: String(row["\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f"] || "0").trim(),
      totalPaidAmount: String(row["\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928"] || "0").trim(),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="view">
      <>
        <DataTable
          data={records}
          columns={columns}
          title="मायरा बधाई पत्र (Mayra Congratulations)"
          subtitle="मायरा विवाह बधाई रिकॉर्ड संभालें"
          addNewUrl="/dashboard/mayra-congratulations/add"
          addNewLabel="Add New Record"
          onDelete={handleDelete}
          onGeneratePDFForm={handleGeneratePDFForm}
          onGenerateBond={handleGenerateNGOLetter}
          editUrlPattern="/dashboard/mayra-congratulations/edit/[id]"
          searchFields={["applicantName", "mayraNumber", "formNumber"]}
          itemsPerPage={10}
          showGenderFilter={true}
          genderField="gender"
          onGenderFilterChange={handleGenderFilterChange}
          currentGenderFilter={currentGenderFilter}
          showAddressFilter={true}
          addressField="address"
          onAddressFilterChange={handleAddressFilterChange}
          currentAddressFilter={currentAddressFilter}
          uniqueAddresses={uniqueAddresses}
          module="mayra_registration"
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
                moduleName="Mayra Congratulations"
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
              <AlertDialogDescription>क्या आप इस रिकॉर्ड को हटाना चाहते हैं?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>रद्द करें</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>हाँ</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGuard>
  )
}

