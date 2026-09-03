"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileSpreadsheet } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, mayraApplicationAPI } from "@/lib/api"
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
import { Switch } from "@/components/ui/switch"
import { RoleGuard } from "@/components/role-guard"
import { getCurrentUserInfo, MAYRA_ASSOCIATION_DURATION_HI, parseDateFromDDMMYYYY } from "@/lib/utils"
import { getPhotoDataUrl } from "@/lib/utils"
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

interface MayraRegistrationRecord {
  id: string
  createdAt: string
  formNumber: string
  applicationDate: string
  applicantName: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  age: string | number
  gotra: string
  address: string
  aadharNumber: string
  mobile: string
  nomineeName: string
  nomineeFathername?: string
  nomineeHusbandName?: string
  nomineeGotra?: string
  nomineeAddress?: string
  tehsil?: string
  district?: string
  pinCode?: string
  nomineeRelation: string
  workerName: string
  workerMobile?: string
  added_name?: string
  is_active: number
  sr_no: string
  gender: string
  passportPhoto?: string
  nomineePassportPhoto?: string
  nomineePhoto?: string
}

export default function MayraRegistrationPage() {
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const router = useRouter()

  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<MayraRegistrationRecord>("mayraRegistrationRecords", [], {
    create: API_ENDPOINTS.CREATE_MAYRA_APPLICATION,
    read: API_ENDPOINTS.GET_MAYRA_APPLICATIONS,
    update: API_ENDPOINTS.UPDATE_MAYRA_APPLICATION,
    delete: API_ENDPOINTS.DELETE_MAYRA_APPLICATION,
  }, { autoLoad: false })

  // Get parameters based on user role to restrict queries for agents but allow admin to see all
  const getFilteredParams = useCallback(() => {
    const { addedby, addedby_id } = getCurrentUserInfo();
    const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
    const params: Record<string, any> = {};
    if (userRole === "agent") {
      params.addedby = addedby;
      params.addedby_id = addedby_id;
    }
    return params;
  }, []);

  const lastAppliedKeyRef = useRef<string | null>(null)
  
  useEffect(() => {
    const activeFilters: Record<string, any> = {
      ...getFilteredParams()
    }
    
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
  }, [currentGenderFilter, currentAddressFilter, getFilteredParams])

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
        await readApi(getFilteredParams())
      }
    } catch (error) {
      console.error("Error deleting record:", error)
      toast.error("रिकॉर्ड हटाने में त्रुटि")
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleToggleActive = async (record: MayraRegistrationRecord) => {
    setToggling(prev => ({ ...prev, [record.id]: true }))
    try {
      const res = await mayraApplicationAPI.toggleActiveStatus(record.id, Number(record.is_active))
      if (res.status) {
        toast.success(res.message || "Status updated")
        await readApi(getFilteredParams())
      } else {
        toast.error(res.message || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setToggling(prev => ({ ...prev, [record.id]: false }))
    }
  }

  const fetchPhotoAsDataUrl = (photoPath?: string) => getPhotoDataUrl(photoPath)

  const handleGeneratePDF = async (record: MayraRegistrationRecord) => {
    try {
      const [imageData, nomineeImageData] = await Promise.all([
        fetchPhotoAsDataUrl(record.passportPhoto),
        fetchPhotoAsDataUrl(record.nomineePassportPhoto || record.nomineePhoto),
      ])

      const response = await fetch('/api/generate-mayra-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, imageData, nomineeImageData }),
      })

      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (record.applicantName || record.formNumber || record.id || 'form').replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_')
      a.download = `MAYRA_FORM_${safeName}.pdf`
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

  const handleGenerateBond = async (record: MayraRegistrationRecord) => {
    try {
      const [imageData, nomineeImageData] = await Promise.all([
        fetchPhotoAsDataUrl(record.passportPhoto),
        fetchPhotoAsDataUrl(record.nomineePassportPhoto || record.nomineePhoto),
      ])

      const response = await fetch('/api/generate-mayra-bond-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record,
          imageData,
          nomineeImageData,
          duration: MAYRA_ASSOCIATION_DURATION_HI,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate bond PDF');
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MAYRA_BOND_${record.applicantName}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Bond generated successfully')
    } catch (error: any) {
      console.error('Error generating bond:', error)
      toast.error(error.message || 'Failed to generate bond')
    }
  }

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        toast.error("No data to export")
        return
      }

      const excelData = records.map((record) => ({
        "आवेदन तिथि": record.applicationDate,
        "फॉर्म संख्या": record.formNumber,
        "नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आयु": record.age,
        "गोत्र": record.gotra,
        "आधार": record.aadharNumber,
        "मोबाइल": record.mobile,
        "पता": record.address,
        "नॉमिनी": record.nomineeName,
        "नॉमिनी के पिता का नाम": record.nomineeFathername || "",
        "नॉमिनी के पति का नाम": record.nomineeHusbandName || "",
        "कार्यकर्ता": record.workerName || record.added_name,
        "Active": record.is_active === 1 ? "Yes" : "No",
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mayra Registrations")
      XLSX.writeFile(workbook, `mayra_registrations_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success("Excel file exported successfully")
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("Failed to export Excel file")
    }
  }

  const importHeaders = [
    "आवेदन तिथि",
    "नाम",
    "लिंग",
    "पिता का नाम",
    "माता का नाम",
    "जन्म तिथि",
    "गोत्र",
    "आधार",
    "पता",
    "नॉमिनी का नाम",
    "नॉमिनी पिता का नाम",
    "नॉमिनी पति का नाम",
    "नॉमिनी गोत्र",
    "नॉमिनी का पता",
    "नॉमिनी मोबाईल",
    "तहसील",
    "जिला",
    "पिनकोड",
    "नॉमिनी सम्बन्ध",
    "शपथ पत्र",
    "भुगतान की राशि",
    "भुगतान का माध्यम",
    "भुगतान की तिथि",
    "कार्यकर्ता",
    "कार्यकर्ता मोबाइल"
  ];

  const importSampleRows = [
    {
      "आवेदन तिथि": "12-07-2026",
      "नाम": "कविता कुमारी",
      "लिंग": "Female",
      "पिता का नाम": "रमेश कुमार",
      "माता का नाम": "कमला देवी",
      "जन्म तिथि": "15-08-2015",
      "गोत्र": "प्रजापत",
      "आधार": "123456789012",
      "पता": "जसोल",
      "नॉमिनी का नाम": "रमेश कुमार",
      "नॉमिनी पिता का नाम": "सज्जन राज",
      "नॉमिनी पति का नाम": "",
      "नॉमिनी गोत्र": "प्रजापत",
      "नॉमिनी का पता": "जसोल",
      "नॉमिनी मोबाईल": "9876543210",
      "तहसील": "बालोतरा",
      "जिला": "बाड़मेर",
      "पिनकोड": "344024",
      "नॉमिनी सम्बन्ध": "भांजी",
      "शपथ पत्र": "शपथ पत्र विवरण",
      "भुगतान की राशि": "6000",
      "भुगतान का माध्यम": "Cash",
      "भुगतान की तिथि": "12-07-2026",
      "कार्यकर्ता": "कार्यकर्ता नाम",
      "कार्यकर्ता मोबाइल": "9876543210"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const { addedby, addedby_id } = getCurrentUserInfo();
    
    // Calculate age and category
    const dobStr = formatExcelDate(row["जन्म तिथि"]);
    const parsedDob = parseDateFromDDMMYYYY(dobStr);
    let calculatedAge = "";
    let category = "";
    let fee = 0;
    
    if (parsedDob) {
      const today = new Date();
      let age = today.getFullYear() - parsedDob.getFullYear();
      const m = today.getMonth() - parsedDob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedDob.getDate())) {
        age--;
      }
      calculatedAge = age.toString();
      const ageNum = age;
      if (ageNum >= 0 && ageNum <= 9) {
        category = "A";
        fee = 3000;
      } else if (ageNum >= 10 && ageNum <= 15) {
        category = "B";
        fee = 6000;
      } else if (ageNum >= 16 && ageNum <= 18) {
        category = "C";
        fee = 9000;
      } else if (ageNum >= 19) {
        category = "D";
        fee = 11000;
      }
    }

    const payAmount = parseFloat(row["भुगतान की राशि"]) || 0;
    const totalAmt = fee || parseFloat(row["शुल्क"]) || 0;
    const pendingAmt = totalAmt - payAmount;

    const payload = {
      applicationDate: formatExcelDate(row["आवेदन तिथि"]),
      applicantName: String(row["नाम"] || "").trim(),
      fatherName: String(row["पिता का नाम"] || "").trim(),
      motherName: String(row["माता का नाम"] || "").trim(),
      dateOfBirth: dobStr,
      age: calculatedAge,
      gotra: String(row["गोत्र"] || "Prajapat").trim(),
      address: String(row["पता"] || "").trim(),
      aadharNumber: String(row["आधार"] || "").trim().replace(/\D/g, ""),
      mobile: String(row["नॉमिनी मोबाईल"] || "").trim().replace(/\D/g, ""), // Map nomineeMobile to mobile
      pinCode: String(row["पिनकोड"] || "").trim(),
      tehsil: String(row["तहसील"] || "").trim(),
      district: String(row["जिला"] || "").trim(),
      state: String(row["राज्य"] || "Rajasthan").trim(),
      nomineeName: String(row["नॉमिनी का नाम"] || "").trim(),
      nomineeFathername: String(row["नॉमिनी पिता का नाम"] || "").trim(),
      nomineeHusbandName: String(row["नॉमिनी पति का नाम"] || "").trim(),
      nomineeGotra: String(row["नॉमिनी गोत्र"] || "").trim(),
      nomineeAddress: String(row["नॉमिनी का पता"] || "").trim(),
      nomineeRelation: String(row["नॉमिनी सम्बन्ध"] || "").trim(),
      affidavit: String(row["शपथ पत्र"] || "").trim(),
      category: category,
      totalAmount: totalAmt,
      paymentAmount: payAmount,
      pendingAmount: pendingAmt,
      gender: String(row["लिंग"] || "Female").trim(),
      addedby: addedby,
      addedby_id: addedby_id,
      workerName: String(row["कार्यकर्ता"] || addedby).trim(),
      workerMobile: String(row["कार्यकर्ता मोबाइल"] || "").trim(),
      paymentMode: String(row["भुगतान का माध्यम"] || "Cash").trim(),
      paymentDate: formatExcelDate(row["भुगतान की तिथि"]),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  const columns = [
    { key: "formNumber", label: "फॉर्म संख्या" },
    { key: "applicationDate", label: "आवेदन तिथि" },
    { key: "applicantName", label: "नाम" },
    { key: "fatherName", label: "पिता का नाम" },
    { key: "motherName", label: "माता का नाम" },
    { key: "dateOfBirth", label: "जन्म तिथि" },
    { key: "age", label: "आयु" },
    { key: "gotra", label: "गोत्र" },
    { key: "aadharNumber", label: "आधार" },
    { key: "mobile", label: "मोबाइल" },
    { key: "address", label: "पता" },
    { key: "nomineeName", label: "नॉमिनी का नाम" },
    { key: "nomineeFathername", label: "नॉमिनी के पिता का नाम" },
    { key: "nomineeHusbandName", label: "नॉमिनी के पति का नाम" },
    { 
      key: "workerName", 
      label: "कार्यकर्ता",
      render: (value: string, record: MayraRegistrationRecord) => record.workerName || record.added_name
    },
    {
      key: "is_active",
      label: "Active",
      render: (value: number, record: MayraRegistrationRecord) => (
        <Switch
          checked={Number(value) === 1}
          onCheckedChange={() => handleToggleActive(record)}
          disabled={!!toggling[record.id]}
        />
      ),
    },
  ]

  return (
    <RoleGuard requiredModule="mayra_registration" requiredAction="view">
      <>
        <DataTable
          data={records}
          columns={columns}
          title="मायरा पंजीकरण (Mayra Registration)"
          subtitle="मायरा फॉर्म पंजीकरण संभालें"
          addNewUrl="/dashboard/mayra-registration/add"
          addNewLabel="Add New Mayra"
          onDelete={handleDelete}
          editUrlPattern="/dashboard/mayra-registration/edit/[id]"
          onGenerateBond={handleGenerateBond}
          onGeneratePDFForm={handleGeneratePDF}
          searchFields={["applicantName", "mobile", "aadharNumber"]}
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
                moduleName="Mayra Registration"
                requiredHeaders={importHeaders}
                sampleRows={importSampleRows}
                onImportRow={handleImportRow}
                onSuccess={() => readApi(getFilteredParams())}
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

