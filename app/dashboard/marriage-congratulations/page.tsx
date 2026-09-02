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

interface MarriageCongratulationRecord {
  id: string
  date: string
  codeNumber: string
  marriageNumber: string
  applicantName: string
  gender: string
  fatherName?: string
  wifeOf?: string
  gotra: string
  address: string
  membershipJoinDate: string
  associatedUntil: string
  permanentFee: string
  installmentAmount: string
  totalGrantAmount: string
  totalMembersServing: string
  rate100: string
  rate200: string
  rate300: string
  deductionPercent: string
  deductedAmount: string
  totalPaidAmount: string
  createdAt: string
}

export default function MarriageCongratulationsPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const router = useRouter()

  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<MarriageCongratulationRecord>("marriageCongratulationsRecords", [], {
    create: API_ENDPOINTS.CREATE_MARRIAGE_CONGRATS,
    read: API_ENDPOINTS.GET_MARRIAGE_CONGRATS,
    update: API_ENDPOINTS.UPDATE_MARRIAGE_CONGRATS,
    delete: API_ENDPOINTS.DELETE_MARRIAGE_CONGRATS,
  });

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(records.map(record => record.address).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[MarriageCongratulations] Filter effect running:', { currentGenderFilter, currentAddressFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    // Call readApi directly instead of through fetchMarriageCongratulations
    const applyFilters = async () => {
      try {
        console.log('[MarriageCongratulations] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching marriage congratulations:", error);
        toast.error("Failed to fetch marriage congratulations from server");
      }
    };
    
    applyFilters();
  }, [currentGenderFilter, currentAddressFilter]); // Removed readApi dependency

  const fetchMarriageCongratulations = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching marriage congratulations:", error)
      toast.error("Failed to fetch marriage congratulations from server")
    }
  }, [readApi]);

  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    try {
      await deleteApi(recordToDelete);
    } catch (error) {
      console.error("Error deleting marriage congratulations:", error)
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleViewPDF = (record: MarriageCongratulationRecord) => {
    router.push(`/pdf/marriage-congratulations/${record.id}`)
  }

  const handleGeneratePDFForm = async (record: MarriageCongratulationRecord) => {
    try {
      // Map the data to Hindi field names for PDF generation
      const mapToHindiFields = (record: MarriageCongratulationRecord) => ({
        दिनांक: record.date,
        कोड_नंबर: record.codeNumber,
        विवाह_संख्या: record.marriageNumber,
        आवेदक_का_नाम: record.applicantName,
        लिंग: record.gender === 'Male' ? 'पुरुष' : 'महिला',
        // Send both fields, PDF will choose which one to display based on gender
        पिता_का_नाम: record.fatherName || '',
        पति_का_नाम: record.wifeOf || '',
        // Also send in English format for easier access
        fatherName: record.fatherName || '',
        wifeOf: record.wifeOf || '',
        गोत्र: record.gotra,
        निवासी: record.address,
        सदस्यता_तिथि: record.membershipJoinDate,
        संस्था_से_जुड़ी_रही: record.associatedUntil,
        स्थायी_शुल्क: record.permanentFee,
        किस्त_राशि: record.installmentAmount,
        कुल_अनुदान: record.totalGrantAmount,
        कुल_सदस्य: record.totalMembersServing,
        rate_100: record.rate100,
        rate_200: record.rate200,
        rate_300: record.rate300,
        rate_1000: (record as any).rate1000 || '0',
        कटौती_प्रतिशत: record.deductionPercent,
        कटौती_राशि: record.deductedAmount,
        कुल_भुगतान: record.totalPaidAmount,
        रनिंग_क्रम_संख्या: (record as any).runningNumber || record.marriageNumber || '',
        बंद_खाते: (record as any).closedAccounts || '0',
        चालू_खाते: (record as any).activeAccounts || record.totalMembersServing || '',
      });

      const mapped = mapToHindiFields(record);
      
      // Add full record fields and gender information to payload
      const dataWithGender = { ...record, ...mapped, gender: record.gender };
      
      const response = await fetch('/api/generate-marriage-congratulations-pdf', {
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

      // Create blob and open in new window for printing
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Generate appropriate filename based on gender
      let filename = 'marriage_congratulations_form.pdf';
      if (record.gender === 'Female') {
        filename = `girl_marriage_congratulations_${record.marriageNumber}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `boys_marriage_congratulations_${record.marriageNumber}.pdf`;
      } else {
        filename = `marriage_congratulations_${record.marriageNumber}.pdf`;
      }
      
      // Open PDF in new window for printing
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        // Wait for PDF to load then trigger print dialog
        const checkPrintReady = setInterval(() => {
          try {
            // Check if the window is still open and content is loaded
            if (printWindow && !printWindow.closed) {
              printWindow.focus();
              // Trigger print dialog after PDF loads
              setTimeout(() => {
                printWindow.print();
                clearInterval(checkPrintReady);
              }, 1000);
            } else {
              clearInterval(checkPrintReady);
            }
          } catch (e) {
            // Cross-origin or other error, just clear interval
            clearInterval(checkPrintReady);
          }
        }, 500);
        
        // Also trigger download
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, 500);
      } else {
        // Fallback: if popup blocked, just download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.warning('Popup blocked. PDF downloaded. Please open and print manually.');
      }
      
      // Clean up URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);
      
      toast.success('PDF form generated and ready to print');
    } catch (error) {
      console.error('Error generating PDF form:', error);
      toast.error('Failed to generate PDF form');
    }
  };

  const handleGenerateNGOLetter = async (record: MarriageCongratulationRecord) => {
    try {
      // Map the data to Hindi field names for PDF generation
      const mapToHindiFields = (record: MarriageCongratulationRecord) => ({
        दिनांक: record.date,
        कोड_नंबर: record.codeNumber,
        विवाह_संख्या: record.marriageNumber,
        आवेदक_का_नाम: record.applicantName,
        लिंग: record.gender === 'Male' ? 'पुरुष' : 'महिला',
        // Send both fields, PDF will choose which one to display based on gender
        पिता_का_नाम: record.fatherName || '',
        पति_का_नाम: record.wifeOf || '',
        // Also send in English format for easier access
        fatherName: record.fatherName || '',
        wifeOf: record.wifeOf || '',
        गोत्र: record.gotra,
        निवासी: record.address,
        सदस्यता_तिथि: record.membershipJoinDate,
        संस्था_से_जुड़ी_रही: record.associatedUntil,
        स्थायी_शुल्क: record.permanentFee,
        किस्त_राशि: record.installmentAmount,
        कुल_अनुदान: record.totalGrantAmount,
        कुल_सदस्य: record.totalMembersServing,
        rate_100: record.rate100,
        rate_200: record.rate200,
        rate_300: record.rate300,
        कटौती_प्रतिशत: record.deductionPercent,
        कटौती_राशि: record.deductedAmount,
        कुल_भुगतान: record.totalPaidAmount,
      });

      const mapped = mapToHindiFields(record);
      
      // Add gender information to the mapped data
      const dataWithGender = { ...mapped, gender: record.gender };
      
      const response = await fetch('/api/generate-marriage-ngo-letter', {
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
        throw new Error('Failed to generate NGO letter');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate appropriate filename based on gender
      let filename = 'marriage_ngo_letter.pdf';
      if (record.gender === 'Female') {
        filename = `girl_marriage_ngo_letter_${record.marriageNumber}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `boys_marriage_ngo_letter_${record.marriageNumber}.pdf`;
      } else {
        filename = `marriage_ngo_letter_${record.marriageNumber}.pdf`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('NGO letter generated successfully');
    } catch (error) {
      console.error('Error generating NGO letter:', error);
      toast.error('Failed to generate NGO letter');
    }
  };

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = records.map((record) => ({
        "दिनांक": record.date,
        "विवाह संख्या": record.marriageNumber,
        "आवेदक का नाम": record.applicantName,
        "लिंग": record.gender,
        "पिता का नाम / पति का नाम": record.gender === "Male" || record.gender === "male" ? record.fatherName || "" : record.wifeOf || "",
        "गोत्र": record.gotra,
        "निवासी": record.address,
        "सदस्यता तिथि": record.membershipJoinDate,
        "संस्था से जुड़ी रही": record.associatedUntil,
        "स्थायी शुल्क": record.permanentFee,
        "किस्त राशि": record.installmentAmount,
        "कुल अनुदान": record.totalGrantAmount,
        "कुल सदस्य": record.totalMembersServing,
        "100x": record.rate100,
        "200x": record.rate200,
        "300x": record.rate300,
        "कटौती %": record.deductionPercent,
        "कटौती राशि": record.deductedAmount,
        "कुल भुगतान": record.totalPaidAmount,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "General Marriage Congratulations Payment");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marriage_congratulations_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    { key: "date", label: "दिनांक", className: "min-w-[100px]" },
    // { key: "codeNumber", label: "कोड नंबर", className: "min-w-[100px]" },
    { key: "marriageNumber", label: "विवाह संख्या", className: "min-w-[100px]" },
    { key: "applicantName", label: "आवेदक का नाम", className: "min-w-[150px]" },
    { key: "gender", label: "लिंग", className: "min-w-[80px]" },
    {
      key: "fatherName",
      label: "पिता का नाम",
      className: "min-w-[120px]",
      render: (_: any, row: MarriageCongratulationRecord) =>
        row.gender === "Male" || row.gender === "male" ? row.fatherName : row.wifeOf || "",
    },
    { key: "gotra", label: "गोत्र", className: "min-w-[100px]" },
    { key: "address", label: "निवासी", className: "min-w-[200px]" },
    { key: "membershipJoinDate", label: "सदस्यता तिथि", className: "min-w-[120px]" },
    { key: "associatedUntil", label: "संस्था से जुड़ी रही", className: "min-w-[120px]" },
    { key: "permanentFee", label: "स्थायी शुल्क", className: "min-w-[100px]" },
    { key: "installmentAmount", label: "किस्त राशि", className: "min-w-[100px]" },
    { key: "totalGrantAmount", label: "कुल अनुदान", className: "min-w-[100px]" },
    { key: "totalMembersServing", label: "कुल सदस्य", className: "min-w-[100px]" },
    { key: "rate100", label: "100x", className: "min-w-[60px]" },
    { key: "rate200", label: "200x", className: "min-w-[60px]" },
    { key: "rate300", label: "300x", className: "min-w-[60px]" },
    { key: "deductionPercent", label: "कटौती %", className: "min-w-[80px]" },
    { key: "deductedAmount", label: "कटौती राशि", className: "min-w-[100px]" },
    { key: "totalPaidAmount", label: "कुल भुगतान", className: "min-w-[100px]" },
  ]

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  }

  // Handle address filter change
  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

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
    "100x",
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
      "100x": "5",
      "200x": "3",
      "300x": "2",
      "\u0915\u091f\u094c\u0924\u0940 %": "5",
      "\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f": "1050",
      "\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928": "19950"
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
      rate100: String(row["100x"] || "0").trim(),
      rate200: String(row["200x"] || "0").trim(),
      rate300: String(row["300x"] || "0").trim(),
      deductionPercent: String(row["\u0915\u091f\u094c\u0924\u0940 %"] || "0").trim(),
      deductedAmount: String(row["\u0915\u091f\u094c\u0924\u0940 \u0930\u093e\u0936\u093f"] || "0").trim(),
      totalPaidAmount: String(row["\u0915\u0941\u0932 \u092d\u0941\u0917\u0924\u093e\u0928"] || "0").trim(),
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

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
        title="बालिका विवाह फॉर्म आवेदन पत्र (General Marriage Congratulations Payment)"
        subtitle="विवाह बधाई पत्र और दान प्रबंधित करें"
        addNewUrl="/dashboard/marriage-congratulations/add"
        addNewLabel="Add New Record"
        onDelete={handleDelete}
        onGeneratePDFForm={handleGeneratePDFForm}
        onGenerateBond={handleGenerateNGOLetter}
        editUrlPattern="/dashboard/marriage-congratulations/edit/[id]"
        searchFields={["marriageNumber"]}
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
              disabled={records.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <BulkUploadButton
              moduleName="General Marriage Congratulations Payment"
              requiredHeaders={importHeaders}
              sampleRows={importSampleRows}
              onImportRow={handleImportRow}
              onSuccess={() => fetchMarriageCongratulations()}
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
