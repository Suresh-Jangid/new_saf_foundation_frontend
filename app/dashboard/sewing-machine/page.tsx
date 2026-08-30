"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, CalendarDays, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/data-table"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY, isValidDate } from "@/lib/utils"
import * as XLSX from "xlsx"
import { toast as sonnerToast } from "sonner"
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

interface SewingMachineRecord {
  id: string
  campNumber: string
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
}


export default function SewingMachinePage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const { 
    records, 
    loading, 
    readApi, 
    deleteApi,
    createApi
  } = useCRUD<SewingMachineRecord>("sewingMachineRecords", [], {
    create: API_ENDPOINTS.CREATE_SEWING_CAMP,
    read: API_ENDPOINTS.GET_SEWING_CAMPS,
    update: API_ENDPOINTS.UPDATE_SEWING_CAMP,
    delete: API_ENDPOINTS.DELETE_SEWING_CAMP,
  });

  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)
  const [dateFromObj, setDateFromObj] = useState<Date | undefined>(undefined)
  const [dateToObj, setDateToObj] = useState<Date | undefined>(undefined)

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(records.map(record => record.address).filter(Boolean))).sort()

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[SewingMachine] Filter effect running:', { currentAddressFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    // Call readApi directly
    const applyFilters = async () => {
      try {
        console.log('[SewingMachine] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching sewing machine camps:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sewing machine camps from server",
          variant: "destructive",
        });
      }
    };
    
    applyFilters();
  }, [currentAddressFilter, readApi]);

  const fetchSewingCamps = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters)
    } catch (error) {
      console.error("Error fetching sewing machine camps:", error)
    }
  }, [readApi])

  const applyDateFilter = () => {
    const filters: any = {}
    if (dateFrom) filters.fromDate = dateFrom
    if (dateTo) filters.toDate = dateTo
    fetchSewingCamps(Object.keys(filters).length ? filters : undefined)
  }

  const resetDateFilter = () => {
    setDateFrom("")
    setDateTo("")
    setCurrentAddressFilter("all")
    fetchSewingCamps()
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
        await fetchSewingCamps()
      }
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleGeneratePDF = async (record: SewingMachineRecord) => {
    try {
      const response = await fetch('/api/generate-sewing-machine-camp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: record,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sewing_machine_camp_${record.formNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "PDF Generated",
        description: "Sewing machine camp PDF has been generated and downloaded successfully.",
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateCertificate = async (record: SewingMachineRecord) => {
    try {
      const response = await fetch('/api/generate-certificate-of-appreciation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: record,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate certificate')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificate_of_appreciation_${record.applicantName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Certificate Generated",
        description: "Certificate of appreciation has been generated and downloaded successfully.",
      })
    } catch (error) {
      console.error('Error generating certificate:', error)
      toast({
        title: "Error",
        description: "Failed to generate certificate. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address)
  }

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        sonnerToast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = records.map((record) => ({
        "कैंप नंबर": record.campNumber,
        "फॉर्म नंबर": record.formNumber,
        "आवेदन तिथि": record.applicationDate,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आधार संख्या": record.aadharNumber,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "मोबाइल": record.mobile,
        "पता/गाँव": record.address,
        "पिन कोड": record.pinCode,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "राज्य": record.state,
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sewing Machine Camp");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sewing_machine_camp_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      sonnerToast.success("Excel file exported successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      sonnerToast.error("Failed to export Excel file");
    }
  };

  const columns = [
    { key: "campNumber", label: "कैंप नंबर" },
    { key: "formNumber", label: "फॉर्म नंबर" },
    { key: "applicationDate", label: "आवेदन तिथि" },
    { key: "applicantName", label: "आवेदक का नाम" },
    { key: "fatherName", label: "पिता का नाम" },
    { key: "age", label: "उम्र" },
    { key: "mobile", label: "मोबाइल" },
    { key: "gotra", label: "गोत्र" },
    { key: "address", label: "पता/गाँव" },
  ]

  const searchFields: (keyof SewingMachineRecord)[] = [
    "campNumber",
    "formNumber",
    "applicationDate",
    "applicantName",
    "fatherName",
    "mobile",
    "gotra",
    "address",
  ]

  const importHeaders = [
    "\u0915\u0948\u0902\u092a \u0928\u0902\u092c\u0930",
    "\u0906\u0935\u0947\u0926\u0928 \u0924\u093f\u0925\u093f",
    "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e",
    "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e",
    "\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e",
    "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f",
    "\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e",
    "\u0917\u094b\u0924\u094d\u0930",
    "\u0906\u092f\u0941",
    "\u092e\u094b\u092c\u093e\u0907\u0932",
    "\u092a\u0924\u093e/\u0917\u093e\u0901\u0935",
    "\u092a\u093f\u0928 \u0915\u094b\u0921",
    "\u0924\u0939\u0938\u0940\u0932",
    "\u091c\u093f\u0932\u093e",
    "\u0930\u093e\u091c\u094d\u092f"
  ];

  const importSampleRows = [
    {
      "\u0915\u0948\u0902\u092a \u0928\u0902\u092c\u0930": "CAMP-001",
      "\u0906\u0935\u0947\u0926\u0928 \u0924\u093f\u0925\u093f": "12-07-2026",
      "\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e": "\u0915\u0935\u093f\u0924\u093e \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e": "\u0930\u092e\u0947\u0936 \u092a\u094d\u0930\u091c\u093e\u092a\u0924\u093f",
      "\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e": "\u0917\u0941\u0921\u094d\u0921\u0940 \u0926\u0947\u0935\u0940",
      "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f": "15-08-2010",
      "\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e": "123456789012",
      "\u0917\u094b\u0924\u094d\u0930": "\u092a\u094d\u0930\u091c\u093e\u092a\u0924",
      "\u0906\u092f\u0941": "16",
      "\u092e\u094b\u092c\u093e\u0907\u0932": "9876543210",
      "\u092a\u0924\u093e/\u0917\u093e\u0901\u0935": "\u091c\u0938\u094b\u0932",
      "\u092a\u093f\u0928 \u0915\u094b\u0921": "344024",
      "\u0924\u0939\u0938\u0940\u0932": "\u092c\u093e\u0932\u094b\u0924\u0930\u093e",
      "\u091c\u093f\u0932\u093e": "\u092c\u093e\u0921\u093c\u092e\u0947\u0930",
      "\u0930\u093e\u091c\u094d\u092f": "\u0930\u093e\u091c\u0938\u094d\u0925\u093e\u0928"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const payload = {
      campNumber: String(row["\u0915\u0948\u0902\u092a \u0928\u0902\u092c\u0930"] || "").trim(),
      applicationDate: formatExcelDate(row["\u0906\u0935\u0947\u0926\u0928 \u0924\u093f\u0925\u093f"]),
      applicantName: String(row["\u0906\u0935\u0947\u0926\u0915 \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      fatherName: String(row["\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      motherName: String(row["\u092e\u093e\u0924\u093e \u0915\u093e \u0928\u093e\u092e"] || "").trim(),
      dateOfBirth: formatExcelDate(row["\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f"]),
      aadharNumber: String(row["\u0906\u0927\u093e\u0930 \u0938\u0902\u0916\u094d\u092f\u093e"] || "").trim().replace(/\D/g, ""),
      gotra: String(row["\u0917\u094b\u0924\u094d\u0930"] || "Prajapat").trim(),
      age: parseInt(row["\u0906\u092f\u0941"]) || 0,
      mobile: String(row["\u092e\u094b\u092c\u093e\u0907\u0932"] || "").trim().replace(/\D/g, ""),
      address: String(row["\u092a\u0924\u093e/\u0917\u093e\u0901\u0935"] || "").trim(),
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

  return (
    <>
      <DataTable
        data={records}
        columns={columns}
        title="निशुल्क सिलाई मशीन शिविर कैम्प (Sewing Machine Camp)"
        subtitle="मुफ्त सिलाई मशीन वितरण कार्यक्रम"
        addNewUrl="/dashboard/sewing-machine/add"
        addNewLabel="Add New Application"
        onDelete={handleDelete}
        onGeneratePDFForm={handleGeneratePDF}
        onGenerateCertificate={handleGenerateCertificate}
        editUrlPattern="/dashboard/sewing-machine/edit/[id]"
        searchFields={searchFields}
        itemsPerPage={10}
        showAddressFilter={true}
        addressField="address"
        onAddressFilterChange={handleAddressFilterChange}
        currentAddressFilter={currentAddressFilter}
        uniqueAddresses={uniqueAddresses}
        headerActions={
          <div className="flex gap-2 w-full sm:w-auto items-end">
            <div className="flex flex-col">
              {/* <Label htmlFor="dateFrom" className="pb-2">From Date</Label> */}
              <div className="relative flex gap-2">
                <Input
                  type="text"
                  id="dateFrom"
                  name="dateFrom"
                  value={dateFrom}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const value = e.target.value
                    setDateFrom(value)
                    const parsed = parseDateFromDDMMYYYY(value) || undefined
                    if (parsed) setDateFromObj(parsed)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setDateFromOpen(true)
                    }
                  }}
                />
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-from-picker"
                      variant="ghost"
                      className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                      tabIndex={-1}
                      type="button"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={dateFromObj}
                      captionLayout="dropdown"
                      month={dateFromObj}
                      onMonthChange={setDateFromObj}
                      onSelect={(date: any) => {
                        setDateFromObj(date)
                        setDateFrom(formatDate(date))
                        setDateFromOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-col">
              {/* <Label htmlFor="dateTo" className="pb-2">To Date</Label> */}
              <div className="relative flex gap-2">
                <Input
                  type="text"
                  id="dateTo"
                  name="dateTo"
                  value={dateTo}
                  placeholder="dd-mm-yyyy"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const value = e.target.value
                    setDateTo(value)
                    const parsed = parseDateFromDDMMYYYY(value) || undefined
                    if (parsed) setDateToObj(parsed)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setDateToOpen(true)
                    }
                  }}
                />
                <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-to-picker"
                      variant="ghost"
                      className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
                      tabIndex={-1}
                      type="button"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={dateToObj}
                      captionLayout="dropdown"
                      month={dateToObj}
                      onMonthChange={setDateToObj}
                      onSelect={(date: any) => {
                        setDateToObj(date)
                        setDateTo(formatDate(date))
                        setDateToOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                const filters: any = {}
                const from = dateFromObj || parseDateFromDDMMYYYY(dateFrom) || undefined
                const to = dateToObj || parseDateFromDDMMYYYY(dateTo) || undefined
                if (from) filters.fromDate = formatDateForAPI(from)
                if (to) filters.toDate = formatDateForAPI(to)
                fetchSewingCamps(Object.keys(filters).length ? filters : undefined)
              }} variant="secondary" size="sm">Apply Filter</Button>
              <Button onClick={resetDateFilter} variant="outline" size="sm">Clear</Button>
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
                moduleName="Sewing Machine Camp"
                requiredHeaders={importHeaders}
                sampleRows={importSampleRows}
                onImportRow={handleImportRow}
                onSuccess={() => fetchSewingCamps()}
              />
            </div>
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
