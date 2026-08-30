"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { mapSurakshaBimaListingRecord } from "@/lib/utils"
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

type SurakshaBimaYojanaRecord = {
  id: string
  date: string
  codeNumber: string
  bimaNumber: string
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
  deducted10Percent: string
  deducted25Percent: string
  totalPaidAmount: string
  gender: string
  deductionPercent: string
  deductionAmount: string
  createdAt: string
}

export default function SurakshaBimaYojanaListPage() {
  const router = useRouter()

  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")

  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<SurakshaBimaYojanaRecord>("surakshaBimaYojanaRecords", [], {
    create: API_ENDPOINTS.CREATE_SURAKSHA_BIMA,
    read: API_ENDPOINTS.GET_SURAKSHA_BIMA,
    update: API_ENDPOINTS.UPDATE_SURAKSHA_BIMA,
    delete: API_ENDPOINTS.DELETE_SURAKSHA_BIMA,
  });

  const displayRecords = useMemo(
    () =>
      records.map((record) =>
        mapSurakshaBimaListingRecord(record as unknown as Record<string, unknown>)
      ) as SurakshaBimaYojanaRecord[],
    [records]
  );

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(displayRecords.map(record => record.address).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[SurakshaBimaYojana] Filter effect running:', { currentGenderFilter, currentAddressFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    // Call readApi directly to apply filters
    const applyFilters = async () => {
      try {
        console.log('[SurakshaBimaYojana] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching suraksha bima records:", error);
        toast.error("Failed to fetch suraksha bima records from server");
      }
    };
    
    applyFilters();
  }, [currentGenderFilter, currentAddressFilter]); // Removed readApi from dependencies

  const fetchSurakshaBima = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching suraksha bima records:", error);
    }
  }, []); // Removed readApi dependency since it's stable from useCRUD

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  }

  // Handle address filter change
  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)

  // Delete handler opens confirmation
  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      const success = await deleteApi(recordToDelete)
      if (success) {
        await fetchSurakshaBima()
      }
    } catch (error) {
      console.error("Error deleting suraksha bima record:", error)
      toast.error("रिकॉर्ड हटाने में त्रुटि")
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleGeneratePDF = async (record: SurakshaBimaYojanaRecord) => {
    try {
      // Map the data to Hindi field names for PDF generation
      const mapToHindiFields = (record: SurakshaBimaYojanaRecord) => ({
        दिनांक: record.date,
        कोड_नंबर: record.codeNumber,
        बीमा_नंबर: record.bimaNumber,
        आवेदक_का_नाम: record.applicantName,
        लिंग: record.gender === 'Male' ? 'पुरुष' : 'महिला',
        पिता_का_नाम: record.gender === 'Male' || record.gender =="male" ? record.fatherName : '',
        पति_का_नाम: record.gender === 'Female' || record.gender =="female"  ? record.wifeOf : '',
        गोत्र: record.gotra,
        निवासी: record.address,
        सदस्यता_तिथि: record.membershipJoinDate,
        संस्था_से_जुड़ी_रही: record.associatedUntil,
        स्थायी_शुल्क: record.permanentFee,
        किस्त_राशि: record.installmentAmount,
        कुल_अनुदान: record.totalGrantAmount,
        कुल_सदस्य: record.totalMembersServing,
        rate_200: record.rate200,
        कटौती_प्रतिशत: parseInt(record.deductionPercent),
        कटौती_राशि: record.deductionAmount,
        कुल_भुगतान: record.totalPaidAmount,
      });

      const mapped = mapToHindiFields(record);
      
      // Add gender information to the mapped data
      const dataWithGender = { ...mapped, gender: record.gender };
      
      const response = await fetch('/api/generate-suraksha-bima-pdf', {
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
      let filename = 'suraksha_bima_form.pdf';
      if (record.gender === 'Female') {
        filename = `female_suraksha_bima_${record.bimaNumber}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `male_suraksha_bima_${record.bimaNumber}.pdf`;
      } else {
        filename = `suraksha_bima_${record.bimaNumber}.pdf`;
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
      if (displayRecords.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = displayRecords.map((record) => {
        const gender = (record.gender || '').toLowerCase();
        const fatherName = (record as any).fatherName ?? (record as any).father_name ?? (record as any).father;
        const wifeOf = (record as any).wifeOf ?? (record as any).wife_name ?? (record as any).husbandName ?? (record as any).husband;
        
        return {
          "दिनांक": record.date,
          "कोड नंबर": record.codeNumber,
          "बीमा नंबर": record.bimaNumber,
          "आवेदक का नाम": record.applicantName,
          "लिंग": gender === 'male' ? 'पुरुष' : gender === 'female' ? 'महिला' : record.gender,
          "पिता/पति": gender === 'male' ? (fatherName || '') : gender === 'female' ? (wifeOf || '') : (fatherName || wifeOf || ''),
          "गोत्र": record.gotra,
          "गांव": record.address,
          "सदस्यता तिथि": record.membershipJoinDate,
          "संस्था से जुड़ी रही": record.associatedUntil,
          "स्थायी शुल्क": record.permanentFee,
          "किस्त राशि": record.installmentAmount,
          "कुल अनुदान": record.totalGrantAmount,
          "कुल सदस्य": record.totalMembersServing,
          "200x": record.rate200,
          "कटौती %": record.deductionPercent,
          "कटौती राशि": record.deductionAmount,
          "कुल भुगतान": record.totalPaidAmount,
        };
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Insurance Bima Payment");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suraksha_bima_yojana_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    { key: "date", label: "दिनांक" },
    { key: "codeNumber", label: "कोड नंबर" },
    { key: "bimaNumber", label: "बीमा नंबर" },
    { key: "applicantName", label: "आवेदक का नाम" },
    {
      key: "gender",
      label: "लिंग",
      render: (value: string) => {
        const v = (value || '').toLowerCase()
        return v === 'male' ? 'पुरुष' : v === 'female' ? 'महिला' : (value || '')
      }
    },
    {
      key: "fatherName",
      label: "पिता/पति",
      render: (_: any, record: SurakshaBimaYojanaRecord) => {
        const gender = (record.gender || '').toLowerCase()
        const father = (record as any).fatherName ?? (record as any).father_name ?? (record as any).father
        const husband = (record as any).wifeOf ?? (record as any).wife_name ?? (record as any).husbandName ?? (record as any).husband
        return gender === 'male' ? (father || '') : gender === 'female' ? (husband || '') : (father || husband || '')
      }
    },
    { key: "gotra", label: "गोत्र" },
    { key: "address", label: "गांव" },
    { key: "membershipJoinDate", label: "सदस्यता तिथि" },
    { key: "permanentFee", label: "स्थायी शुल्क" },
    { key: "installmentAmount", label: "किस्त राशि" },
    { key: "totalGrantAmount", label: "कुल अनुदान" },
    { key: "totalMembersServing", label: "कुल सदस्य" },
    { key: "rate200", label: "200x" },
    { key: "deductionPercent", label: "कटौती %" },
    { key: "deductionAmount", label: "कटौती राशि" },
    { key: "totalPaidAmount", label: "कुल भुगतान" },
  ]

  const importHeaders = [
    "\u0926\u093f\u0928\u093e\u0902\u0915",
    "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e",
    "\u0932\u093f\u0902\u0917",
    "\u092a\u093f\u0924\u093e/\u092a\u0924\u093f",
    "\u0917\u094b\u0924\u094d\u0930",
    "\u0917\u093e\u0902\u0935",
    "\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f",
    "\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940",
    "\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915",
    "\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f",
    "\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928",
    "\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f",
    "200x",
    "\u0915\u091f\u094c\u0924\u0940 %",
    "\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f",
    "\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928"
  ];

  const importSampleRows = [
    {
      "\u0926\u093f\u0928\u093e\u0902\u0915": "12-07-2026",
      "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e": "\u0915\u0935\u093f\u0924\u093e \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u0932\u093f\u0902\u0917": "Female",
      "\u092a\u093f\u0924\u093e/\u092a\u0924\u093f": "\u0930\u092e\u0947\u0936 \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u0917\u094b\u0924\u094d\u0930": "\u092a\u094d\u0930\u091c\u093e\u092a\u0924",
      "\u0917\u093e\u0902\u0935": "\u091c\u0938\u094b\u0932",
      "\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f": "15-08-2010",
      "\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940": "15-08-2020",
      "\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915": "500",
      "\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f": "100",
      "\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928": "21000",
      "\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f": "10",
      "200x": "3",
      "\u0915\u091f\u094c\u0924\u0940 %": "10",
      "\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f": "2100",
      "\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928": "18900"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const genderVal = String(row["\u0932\u093f\u0902\u0917"] || "").trim();
    const isMale = genderVal.toLowerCase() === "male" || genderVal === "\u092a\u0941\u0930\u0941\u0937";
    const parentOrSpouseVal = String(row["\u092a\u093f\u0924\u093e/\u092a\u0924\u093f"] || "").trim();

    const payload = {
      date: formatExcelDate(row["\u0926\u093f\u0928\u093e\u0902\u0915"]),
      applicantName: String(row["\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      gender: isMale ? "Male" : "Female",
      fatherName: isMale ? parentOrSpouseVal : "",
      wifeOf: !isMale ? parentOrSpouseVal : "",
      gotra: String(row["\u0917\u094b\u0924\u094d\u0930"] || "Prajapat").trim(),
      address: String(row["\u0917\u093e\u0902\u0935"] || "").trim(),
      membershipJoinDate: formatExcelDate(row["\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0924\u093f\u0925\u093f"]),
      associatedUntil: formatExcelDate(row["\u0938\u0902\u0938\u094d\u092f\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u0940 \u0930\u0939\u0940"]),
      permanentFee: parseFloat(row["\u0938\u094d\u0925\u093e\u092f\u0940 \u0936\u0941\u0932\u094d\u0915"]) || 0,
      installmentAmount: parseFloat(row["\u0915\u093f\u0938\u094d\u0924 \u0930\u093e\u0936\u093f"]) || 0,
      totalGrantAmount: parseFloat(row["\u0915\u0941\u0932 \u0905\u0928\u0941\u0926\u093e\u0928"]) || 0,
      totalMembersServing: parseInt(row["\u0915\u0941\u0932 \u0938\u0926\u0938\u094d\u092f"]) || 0,
      rate200: parseFloat(row["200x"]) || 0,
      deducted10Percent: 0,
      deducted25Percent: 0,
      deductionPercent: String(row["\u0915\u091f\u094c\u0924\u0940 %"] || "0").trim(),
      deductionAmount: String(row["\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f"] || "0").trim(),
      totalPaidAmount: parseFloat(row["\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928"]) || 0,
      remark: "",
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
        data={displayRecords}
        columns={columns}
        title="सुरक्षा बीमा योजना रिकॉर्ड"
        subtitle="Insurance Bima Payment Records List"
        addNewUrl="/dashboard/suraksha-bima-yojana/add"
        addNewLabel="नया रिकॉर्ड जोड़ें"
        onDelete={handleDelete}
        onGeneratePDFForm={handleGeneratePDF}
        editUrlPattern="/dashboard/suraksha-bima-yojana/edit/[id]"
        searchFields={[
          "date",
          "codeNumber",
          "bimaNumber",
          "applicantName",
          "fatherName",
          "wifeOf",
          "gotra",
          "address",
          "membershipJoinDate",
          "permanentFee",
          "installmentAmount",
          "totalGrantAmount",
          "totalMembersServing",
          "rate200",
          "deductionPercent",
          "deductionAmount",
          "totalPaidAmount",
        ]}
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
              moduleName="Insurance Bima Payment"
              requiredHeaders={importHeaders}
              sampleRows={importSampleRows}
              onImportRow={handleImportRow}
              onSuccess={() => fetchSurakshaBima()}
            />
          </div>
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>रिकॉर्ड हटाएं</AlertDialogTitle>
            <AlertDialogDescription>
              क्या आप इस रिकॉर्ड को हटाना चाहते हैं?
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
