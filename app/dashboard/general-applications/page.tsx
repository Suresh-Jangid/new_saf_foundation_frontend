"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, Eye, FileText, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { get } from "@/lib/api"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, generalApplicationsAPI } from "@/lib/api"
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
import { PermissionGate } from "@/components/permission-gate"
import { getCurrentUserInfo, calculateAge, getPhotoDataUrl } from "@/lib/utils"
import { isMale, isFemale } from "@/lib/form-values"
import * as XLSX from "xlsx"
import { isAdmin } from "@/lib/permissions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface GeneralApplicationRecord {
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
  gender: string
  category: string
  mobile: string
  address: string
  pinCode: string
  tehsil: string
  district: string
  state: string
  nomineeName: string
  nomineeRelation: string
  workerName: string
  workerMobile: string
  affidavit: string
  passportPhoto?: string
  createdAt: string
  is_active: number
  added_name?: string
  added_mobile?:string
}

// Helper to calculate category based on gender and age
function calculateCategory(gender: string, age: number) {
  if (isFemale(gender)) {
    if (age >= 5 && age <= 10) return "A";
    if (age >= 11 && age <= 15) return "B";
    if (age >= 16) return "C";
  } else if (isMale(gender)) {
    if (age >= 6 && age <= 12) return "A";
    if (age >= 13 && age <= 18) return "B";
    if (age >= 19) return "C";
  }
  return "";
}

function mapApplicationRecord(item: GeneralApplicationRecord & Record<string, any>): GeneralApplicationRecord {
  const dateOfBirth = item.dateOfBirth || item.date_of_birth || "";
  const computedAge = item.age ?? (dateOfBirth ? String(calculateAge(dateOfBirth) ?? "") : "");
  const isActiveRaw: unknown = item.is_active ?? item.isActive;
  const is_active =
    isActiveRaw === 1 ||
    isActiveRaw === "1" ||
    isActiveRaw === true
      ? 1
      : 0;

  return {
    ...item,
    dateOfBirth,
    age: String(computedAge),
    is_active,
    added_name: item.added_name || item.workerName || "",
    added_mobile: item.added_mobile || item.workerMobile || "",
    passportPhoto: item.passportPhoto || item.passport_photo,
  };
}

// Resolve a stored photo path (relative or absolute) to a base64 data URL for PDFs.
const processImageData = (passportPhoto?: string): Promise<string | null> =>
  getPhotoDataUrl(passportPhoto);


export default function GeneralApplicationsPage() {
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const router = useRouter();
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { 
    records, 
    loading, 
    readApi, 
    deleteApi 
  } = useCRUD<GeneralApplicationRecord>("generalApplicationRecords", [], {
    create: API_ENDPOINTS.CREATE_APPLICATION,
    read: API_ENDPOINTS.GET_APPLICATIONS,
    update: API_ENDPOINTS.UPDATE_APPLICATION,
    delete: API_ENDPOINTS.DELETE_APPLICATION,
  }, { autoLoad: false });

  const displayRecords = useMemo(
    () => records.map((record) => mapApplicationRecord(record as GeneralApplicationRecord & Record<string, any>)),
    [records]
  );

  // Get unique addresses for filter dropdown
  const uniqueAddresses = Array.from(new Set(displayRecords.map(record => record.address).filter(Boolean))).sort();

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

  // Apply filters whenever they change (deduped for React StrictMode)
  const lastAppliedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    console.log('[GeneralApplications] Filter effect running:', { currentGenderFilter, currentAddressFilter });
    
    const activeFilters: Record<string, any> = {
      ...getFilteredParams()
    };
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentAddressFilter !== "all") {
      activeFilters.address = currentAddressFilter;
    }
    
    const key = JSON.stringify(activeFilters)
    if (lastAppliedKeyRef.current === key) {
      return
    }
    lastAppliedKeyRef.current = key

    // Call readApi directly instead of through fetchApplications
    const applyFilters = async () => {
      try {
        console.log('[GeneralApplications] Applying filters:', activeFilters);
        await readApi(activeFilters);
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast.error("Failed to fetch applications from server");
      }
    };
    
    applyFilters();
  }, [currentGenderFilter, currentAddressFilter, getFilteredParams]); // Removed readApi dependency

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  }

  // Handle address filter change
  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address);
  }

  const handleDelete =  (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    try {
      const success = await deleteApi(recordToDelete);
      if (success) {
        // Ensure UI stays in sync with server after deletion
        await readApi(getFilteredParams()); // Re-fetch records to update the table
      }
    } catch (error) {
      console.error("Error deleting application:", error)
      toast.error("रिकॉर्ड हटाने में त्रुटि")
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleToggleActive = async (record: GeneralApplicationRecord) => {
    setToggling(prev => ({ ...prev, [record.id]: true }))
    try {
      const res = await generalApplicationsAPI.toggleActiveStatus(record.id, Number(record.is_active))
      if (res.status) {
        toast.success(res.message || "Status updated")
        await readApi(getFilteredParams()) // refresh the list
      } else {
        toast.error(res.message || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setToggling(prev => ({ ...prev, [record.id]: false }))
    }
  }

  const columns = [
    { key: "formNumber", label: "सदस्यता संख्या" },
    { key: "applicationDate", label: "आवेदन तिथि" },
    { key: "applicantName", label: "आवेदक का नाम" },
    { key: "fatherName", label: "पिता का नाम" },
    { key: "motherName", label: "माता का नाम" },
    { key: "dateOfBirth", label: "जन्म तिथि" },
    { key: "aadharNumber", label: "आधार संख्या" },    
    { key: "age", label: "आयु" },
    { key: "gender", label: "लिंग" },
    { key: "category", label: "श्रेणी" },
    { key: "mobile", label: "मोबाइल" },
    { key: "address", label: "गाँव" },
    { key: "pinCode", label: "पिन कोड" },
    { key: "tehsil", label: "तहसील" },
    { key: "district", label: "जिला" },
    { key: "state", label: "राज्य" },
    {
      key: "is_active",
      label: "Active",
      render: (value: number, record: GeneralApplicationRecord) => (
        <Switch
          checked={Number(value) === 1}
          onCheckedChange={() => handleToggleActive(record)}
          disabled={!!toggling[record.id]}
        />
      ),
    },
  ]

  const searchFields: (keyof GeneralApplicationRecord)[] = [
    "applicantName", // Only search by applicant name
  ]

  // Map English fields to Hindi for the PDF template
  const mapToHindiFields = (record: GeneralApplicationRecord) => ({
    सदस्यता_क्रमांक: record.formNumber,
    आवेदन_दिनांक: record.applicationDate,
    आवेदक_का_नाम: record.applicantName,
    पिता_का_नाम: record.fatherName,
    माता_का_नाम: record.motherName,
    जन्म_तिथि: record.dateOfBirth,
    गोत्र: record.gotra,
    उम्र: record.age,
    मोबाइल: record.mobile,
    आधार_संख्या: record.aadharNumber,
    पता: record.address,
    पिन: record.pinCode,
    तहसील: record.tehsil,
    जिला: record.district,
    राज्य: record.state,
    नामिनी_का_नाम: record.nomineeName,
    नामिनी_का_सम्बन्ध: record.nomineeRelation,
    नामिनी_का_पता: record.address, // Using applicant's address as nominee address
    कार्यकर्ता_का_नाम: record.added_name,
    कार्यकर्ता_का_मोबाइल: record.added_mobile,
    शपथ_नाम: record.applicantName,
    शपथ_पिता_का_नाम: record.fatherName,
    शपथ_गोत्र: record.gotra,
    शपथ_पता: record.address,
  });



  const handleGeneratePDFForm = async (record: GeneralApplicationRecord) => {
    try {
      const mapped = mapToHindiFields(record);
      
      // Add gender information to the mapped data
      const dataWithGender = { ...mapped, gender: record.gender };
      
      // Get image data if available
      const imageData = await processImageData(record.passportPhoto);
      
      const response = await fetch('/api/fill-pdf-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'general-application',
          data: dataWithGender,
          offsetX: 0,
          offsetY: 0,
          valueOffsetX: 0,
          valueOffsetY: 0,
          imageData: imageData
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
      let filename = 'general_application_form.pdf';
      if (record.gender === 'Female') {
        filename = `balika_application_form_${record.formNumber}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `boys_application_form_${record.formNumber}.pdf`;
      } else {
        filename = `general_application_form_${record.formNumber}.pdf`;
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

  const handleGenerateBond = async (record: GeneralApplicationRecord) => {
    try {
      // Get image data if available
      const imageData = await processImageData(record.passportPhoto);

      const response = await fetch('/api/generate-bond-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          record, 
          imageData,
          duration: "अठारह महीने" // Add duration text
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate bond PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate appropriate filename based on gender
      let filename = 'BOND.pdf';
      if (record.gender === 'Female') {
        filename = `GIRL_BOND_${record.applicantName || record.formNumber || 'bond'}.pdf`;
      } else if (record.gender === 'Male') {
        filename = `BOYS_BOND_${record.applicantName || record.formNumber || 'bond'}.pdf`;
      } else {
        filename = `BOND_${record.applicantName || record.formNumber || 'bond'}.pdf`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Bond PDF generated successfully');
    } catch (error) {
      console.error('Error generating bond PDF:', error);
      toast.error('Failed to generate bond PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      if (displayRecords.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Prepare data for Excel export
      const excelData = displayRecords.map((record) => ({
        "सदस्यता संख्या": record.formNumber,
        "आवेदन तिथि": record.applicationDate,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम": record.fatherName,
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आधार संख्या": record.aadharNumber,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "लिंग": record.gender,
        "श्रेणी": record.category,
        "मोबाइल": record.mobile,
        "गाँव": record.address,
        "पिन कोड": record.pinCode,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "राज्य": record.state,
        "नामिनी का नाम": record.nomineeName,
        "नामिनी का सम्बन्ध": record.nomineeRelation,
        "कार्यकर्ता का नाम": record.added_name,
        "कार्यकर्ता का मोबाइल": record.added_mobile,
        "Active": record.is_active === 1 ? "Yes" : "No",
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "General Marriage Applications");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `general_applications_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const handleDownloadSample = () => {
    const headers = [
      "आवेदन तिथि", "आवेदक का नाम", "पिता का नाम", "माता का नाम",
      "जन्म तिथि", "आधार संख्या", "गोत्र", "आयु", "लिंग", "श्रेणी", "मोबाइल",
      "गाँव", "पिन कोड", "तहसील", "जिला", "राज्य", "नामिनी का नाम",
      "नामिनी का सम्बन्ध", "कार्यकर्ता का नाम", "कार्यकर्ता का मोबाइल", "Active"
    ];
    
    const sampleRows = [
      {
        "आवेदन तिथि": "2026-07-11",
        "आवेदक का नाम": "लक्ष्मी कुमारी",
        "पिता का नाम": "पिता का नाम",
        "माता का नाम": "माता का नाम",
        "जन्म तिथि": "2012-07-29",
        "आधार संख्या": "123456789012",
        "गोत्र": "प्रजापत",
        "आयु": 13,
        "लिंग": "Female",
        "श्रेणी": "B",
        "मोबाइल": "9876543210",
        "गाँव": "गाँव का नाम",
        "पिन कोड": "307029",
        "तहसील": "आहोर",
        "जिला": "जालोर",
        "राज्य": "राजस्थान",
        "नामिनी का नाम": "नामिनी नाम",
        "नामिनी का सम्बन्ध": "माता",
        "कार्यकर्ता का नाम": "कार्यकर्ता नाम",
        "कार्यकर्ता का मोबाइल": "9727074251",
        "Active": "Yes"
      },
      {
        "आवेदन तिथि": "2026-07-11",
        "आवेदक का नाम": "दिनेश कुमार",
        "पिता का नाम": "पिता का नाम",
        "माता का नाम": "माता का नाम",
        "जन्म तिथि": "2005-08-15",
        "आधार संख्या": "987654321012",
        "गोत्र": "प्रजापत",
        "आयु": 21,
        "लिंग": "Male",
        "श्रेणी": "C",
        "मोबाइल": "9876543211",
        "गाँव": "गाँव का नाम",
        "पिन कोड": "307029",
        "तहसील": "आहोर",
        "जिला": "जालोर",
        "राज्य": "राजस्थान",
        "नामिनी का नाम": "नामिनी नाम",
        "नामिनी का सम्बन्ध": "पिता",
        "कार्यकर्ता का नाम": "कार्यकर्ता नाम",
        "कार्यकर्ता का मोबाइल": "9461528164",
        "Active": "Yes"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "General Marriage Applications");
    XLSX.writeFile(workbook, "general_applications_sample.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        setImportError("The Excel sheet appears to be empty.");
        setImporting(false);
        return;
      }

      // Quick validate headers
      const sampleRow = rows[0] as Record<string, any>;
      const requiredHeaders = ["आवेदक का नाम", "पिता का नाम", "आधार संख्या"];
      const missing = requiredHeaders.filter(h => !(h in sampleRow));
      if (missing.length > 0) {
        setImportError(`Missing required Hindi headers: ${missing.join(", ")}`);
        setImporting(false);
        return;
      }

      // Call API
      const result = await generalApplicationsAPI.bulkImport(rows);

      if (result.success || result.status) {
        const stats = result.data || {};
        const totalSkipped =
          (stats.skippedExisting || 0) + (stats.skippedIncomplete || 0) + (stats.skippedUnresolvedAgent || 0);
        toast.success(`Import success! Imported: ${stats.imported}, Skipped: ${totalSkipped}`);
        if (stats.skippedUnresolvedAgent > 0) {
          toast.warning(
            `${stats.skippedUnresolvedAgent} row(s) skipped: worker name in "कार्यकर्ता का नाम" did not match an existing agent and had no "कार्यकर्ता का मोबाइल" to create one. Add the mobile number or fix the name, then re-import those rows.`
          );
        }
        setBulkUploadOpen(false);
        
        // Refresh grid
        readApi(getFilteredParams());
      } else {
        setImportError(result.message || "Failed to process import on the server.");
      }
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "An error occurred while reading the file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading applications...</div>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard requiredModule="applicant_registration" requiredAction="view">
      <>
        <DataTable
          data={displayRecords}
          columns={columns}
          title="सामान्य आवेदन (General Marriage Applications)"
          subtitle="सामान्य आवेदन फॉर्म संभालें"
          addNewUrl="/dashboard/general-applications/add"
          addNewLabel="Add New General Marriage Application"
          onDelete={handleDelete}
          editUrlPattern="/dashboard/general-applications/edit/[id]"
          searchFields={searchFields}
          itemsPerPage={10}
          onGenerateBond={handleGenerateBond}
          onGeneratePDFForm={handleGeneratePDFForm}
          showGenderFilter={true}
          genderField="gender"
          onGenderFilterChange={handleGenderFilterChange}
          currentGenderFilter={currentGenderFilter}
          showAddressFilter={true}
          addressField="address"
          onAddressFilterChange={handleAddressFilterChange}
          currentAddressFilter={currentAddressFilter}
          uniqueAddresses={uniqueAddresses}
          module="applicant_registration"
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
              {isAdmin() && (
                <Button
                  onClick={() => setBulkUploadOpen(true)}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md border-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bulk Upload</span>
                </Button>
              )}
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

        <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
          <DialogContent className="max-w-md sm:max-w-lg bg-background border rounded-lg shadow-2xl p-6 overflow-hidden">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Bulk Application Ingestion
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Upload general applications from an Excel sheet. Make sure the headers match the template.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 space-y-6">
              {/* Sample Download Area */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg border border-dashed border-muted">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Need a starting template?</p>
                  <p className="text-xs text-muted-foreground">Download the structured sample Excel file.</p>
                </div>
                <Button
                  onClick={handleDownloadSample}
                  variant="outline"
                  size="sm"
                  className="mt-3 sm:mt-0 flex items-center gap-2 border-primary/20 hover:border-primary/50 text-primary"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Sample</span>
                </Button>
              </div>

              {/* File Upload Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Select Excel File</label>
                <div 
                  onClick={() => !importing && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 bg-card border-2 border-dashed border-muted hover:border-primary/50 rounded-xl cursor-pointer transition-all group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                    disabled={importing}
                  />
                  <div className="p-3 bg-muted rounded-full group-hover:scale-110 transition-transform mb-3">
                    <FileSpreadsheet className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {importing ? "Processing file..." : "Click to choose file or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts .xlsx and .xls formats only
                  </p>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                  {importError}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setBulkUploadOpen(false);
                  setImportError(null);
                }}
                disabled={importing}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </RoleGuard>
  )
}
