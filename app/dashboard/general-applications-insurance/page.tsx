"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import APIService from "@/lib/services"
import { agentRegistrationAPI } from "@/lib/api"
import { toast } from "sonner"
import { getCurrentUserInfo, calculateAge, getPhotoDataUrl } from "@/lib/utils"
import { isMale, isFemale } from "@/lib/form-values"
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

interface GeneralInsuranceApplicationRecord {
  id: string
  formNumber: string
  offlineFormNumber?: string | null
  offline_form_number?: string | null
  applicationDate: string
  applicantName: string
  fatherName: string
  wifeName?: string
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
  paymentAmount?: string
  paymentMode?: string
  paymentDate?: string
  transactionId?: string
  createdAt: string
  is_active?: number
  added_name?: string
  added_mobile?: string
}

interface ResolvedAgentOfflineNumbers {
  workerOfflineFormNumber: string
  seniorOfflineFormNumber: string
  workerMobile: string
}

function resolveAgentOfflineNumbers(
  record: GeneralInsuranceApplicationRecord & Record<string, any>,
  agentsList: any[] = []
): ResolvedAgentOfflineNumbers {
  let workerOffline = String(
    record.workerOfflineFormNumber ||
    record.worker_offline_form_number ||
    record.agentOfflineFormNumber ||
    record.agent_offline_form_number ||
    ""
  ).trim();

  let seniorOffline = String(
    record.seniorOfflineFormNumber ||
    record.senior_offline_form_number ||
    record.seniorAgentOfflineFormNumber ||
    record.senior_agent_offline_form_number ||
    ""
  ).trim();

  let workerMobile = String(
    record.workerMobile ||
    record.worker_mobile ||
    record.agentMobile ||
    record.agent_mobile ||
    ""
  ).trim();

  if (!agentsList || agentsList.length === 0) {
    return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile };
  }

  const agentById = new Map<string, any>();
  const agentByCode = new Map<string, any>();
  const agentByName = new Map<string, any>();

  for (const agent of agentsList) {
    const id = String(agent.id || "").trim();
    const empId = String(
      agent.employeeId ||
      agent.employee_id ||
      agent.agentProfile?.employeeId ||
      agent.agent_profile?.employee_id ||
      ""
    ).trim();
    const name = String(agent.name || "").trim().toLowerCase();

    if (id) agentById.set(id, agent);
    if (empId) agentByCode.set(empId.toUpperCase(), agent);
    if (name && name !== "default agent" && name !== "admin") agentByName.set(name, agent);
  }

  const targetWorkerId = String(
    record.addedById ||
    record.addedby_id ||
    record.selectedAgentId ||
    record.agentId ||
    record.addedBy?.id ||
    record.agent?.id ||
    ""
  ).trim();

  const targetWorkerCode = String(
    record.workerCode ||
    record.worker_code ||
    record.agentCode ||
    record.agent_code ||
    record.added_code ||
    record.addedBy?.agentCode ||
    record.addedBy?.code ||
    ""
  ).trim().toUpperCase();

  const targetWorkerName = String(
    record.workerName ||
    record.worker_name ||
    record.added_name ||
    ""
  ).trim().toLowerCase();

  const workerAgent =
    (targetWorkerId && agentById.get(targetWorkerId)) ||
    (targetWorkerCode && agentByCode.get(targetWorkerCode)) ||
    (targetWorkerName && agentByName.get(targetWorkerName));

  if (workerAgent) {
    if (!workerOffline) {
      workerOffline = String(
        workerAgent.offlineFormNumber ||
        workerAgent.offline_form_number ||
        workerAgent.agentProfile?.offlineFormNumber ||
        workerAgent.agent_profile?.offline_form_number ||
        workerAgent.employeeId ||
        workerAgent.employee_id ||
        ""
      ).trim();
    }
    if (!workerMobile) {
      workerMobile = String(workerAgent.mobile || workerAgent.phone || "").trim();
    }

    const parentSeniorId = String(
      workerAgent.parentAgentId ||
      workerAgent.parent_agent_id ||
      workerAgent.seniorId ||
      workerAgent.senior_id ||
      ""
    ).trim();

    const parentSeniorCode = String(
      workerAgent.seniorEmployeeId ||
      workerAgent.senior_employee_id ||
      workerAgent.parentEmployeeId ||
      workerAgent.seniorCode ||
      ""
    ).trim().toUpperCase();

    let seniorAgent: any = null;
    if (parentSeniorId && agentById.has(parentSeniorId)) {
      seniorAgent = agentById.get(parentSeniorId);
    } else if (parentSeniorCode && parentSeniorCode !== "ADMIN" && parentSeniorCode !== "SUPER ADMIN" && agentByCode.has(parentSeniorCode)) {
      seniorAgent = agentByCode.get(parentSeniorCode);
    }

    if (seniorAgent && !seniorOffline) {
      seniorOffline = String(
        seniorAgent.offlineFormNumber ||
        seniorAgent.offline_form_number ||
        seniorAgent.agentProfile?.offlineFormNumber ||
        seniorAgent.agent_profile?.offline_form_number ||
        seniorAgent.employeeId ||
        seniorAgent.employee_id ||
        ""
      ).trim();
    }
  }

  return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile };
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

// Resolve a stored photo path (relative or absolute) to a base64 data URL for PDFs.
const processImageData = (passportPhoto?: string): Promise<string | null> =>
  getPhotoDataUrl(passportPhoto);

export default function GeneralInsuranceApplicationsPage() {
  const [records, setRecords] = useState<GeneralInsuranceApplicationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentTehsilFilter, setCurrentTehsilFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [agentsList, setAgentsList] = useState<any[]>([])
  const router = useRouter();
  const uniqueTehsils = Array.from(new Set(records.map(r => r.tehsil).filter(Boolean))).sort()
  const uniqueAddresses = Array.from(new Set(records.map(r => r.address).filter(Boolean))).sort()


  // Fetch data from API with gender filter
  const fetchInsuranceApplications = async (gender?: string, tehsil?: string, address?: string) => {
    try {
      setLoading(true)
      const { addedby, addedby_id } = getCurrentUserInfo();
      const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
      const filters: any = {}
      if (userRole === "agent") {
        filters.addedby = addedby
        filters.addedby_id = addedby_id
      }
      if (gender && gender !== "all") filters.gender = gender
      if (tehsil && tehsil !== "all") filters.tehsil = tehsil
      if (address && address !== "all") filters.address = address

      const response = await APIService.getInsuranceApplications(filters)

      if (response.status && response.data) {
        const transformedData = response.data.map((item: any) => {
          const dateOfBirth = item.date_of_birth || item.dateOfBirth
          const computedAge = item.age ?? (dateOfBirth ? calculateAge(dateOfBirth) : null)
          const offlineFormNumber = item.offline_form_number || item.offlineFormNumber || ""

          return {
          id: item.id || item.insurance_id,
          formNumber: item.form_number || item.formNumber,
          offlineFormNumber,
          offline_form_number: offlineFormNumber,
          applicationDate: item.application_date || item.applicationDate,
          applicantName: item.applicant_name || item.applicantName,
          fatherName: item.father_name || item.fatherName,
          wifeName: item.wife_name || item.wifeName,
          motherName: item.mother_name || item.motherName,
          dateOfBirth,
          aadharNumber: item.aadhar_number || item.aadharNumber,
          gotra: item.gotra,
          age: computedAge != null ? String(computedAge) : "",
          gender: item.gender,
          category: item.category,
          mobile: item.mobile,
          address: item.address,
          pinCode: item.pin_code || item.pinCode,
          tehsil: item.tehsil,
          district: item.district,
          state: item.state,
          nomineeName: item.nominee_name || item.nomineeName,
          nomineeRelation: item.nominee_relation || item.nomineeRelation,
          workerName: item.added_name || item.workerName || item.addedBy?.name,
          workerMobile: item.added_mobile || item.workerMobile || item.addedBy?.mobile,
          affidavit: item.affidavit || item.affidavitUrl,
          passportPhoto: item.passport_photo || item.passportPhoto || item.passportPhotoUrl,
          paymentAmount: item.payment_amount || item.paymentAmount,
          paymentMode: item.payment_mode || item.paymentMode,
          paymentDate: item.payment_date || item.paymentDate,
          transactionId: item.transaction_id || item.transactionId,
          createdAt: item.created_at || item.createdAt,
          is_active:
            item.is_active ??
            (item.isActive === true || item.isActive === 1 ? 1 : 0),
        }})
        setRecords(transformedData)
      } else {
        toast.error(response.message || "Failed to fetch insurance applications")
        setRecords([])
      }
    } catch (error) {
      console.error("Error fetching insurance applications:", error)
      toast.error("Failed to fetch insurance applications from server")
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const [agents, setAgents] = useState<Array<{ id: string; name: string; mobile: string }>>([])

  useEffect(() => {
    fetchInsuranceApplications()
    let isMounted = true;
    agentRegistrationAPI
      .getAll()
      .then((res: any) => {
        if (!isMounted) return;
        if (res && res.status && Array.isArray(res.data)) {
          setAgentsList(res.data);
        } else if (Array.isArray(res)) {
          setAgentsList(res);
        }
      })
      .catch((err) => console.error("Error fetching agents for offline resolution:", err));

    const fetchAgents = async () => {
      try {
        const response = await APIService.getAgents()
        if (response.status && response.data) {
          setAgents(response.data.map((agent: any) => ({
            id: String(agent.id),
            name: String(agent.name || "").trim(),
            mobile: String(agent.mobile || "").trim()
          })))
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
      }
    }
    fetchAgents()

    return () => {
      isMounted = false;
    };
  }, [])

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender)
    fetchInsuranceApplications(gender, currentTehsilFilter, currentAddressFilter)
  }

  const handleTehsilFilterChange = (tehsil: string) => {
    setCurrentTehsilFilter(tehsil)
    fetchInsuranceApplications(currentGenderFilter, tehsil, currentAddressFilter)
  }

  // Handle address filter change
  const handleAddressFilterChange = (address: string) => {
    setCurrentAddressFilter(address)
    fetchInsuranceApplications(currentGenderFilter, currentTehsilFilter, address)
  }

  const handleDelete = (id: string) => {
    setRecordToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    
    try {
      // Call the delete API using APIService
      const response = await APIService.deleteInsuranceApplication(recordToDelete)
      
      if (response.status) {
        // Remove from local state
        const updatedRecords = records.filter((record) => record.id !== recordToDelete)
        setRecords(updatedRecords)
        toast.success("रिकॉर्ड सफलतापूर्वक हटा दिया गया")
      } else {
        toast.error(response.message || "रिकॉर्ड हटाने में त्रुटि")
      }
    } catch (error) {
      console.error("Error deleting insurance application:", error)
      toast.error("रिकॉर्ड हटाने में त्रुटि")
    } finally {
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleToggleActive = async (record: GeneralInsuranceApplicationRecord) => {
    setToggling(prev => ({ ...prev, [record.id]: true }))
    try {
      const current = Number(record.is_active || 0)
      const res: any = await APIService.toggleInsuranceApplicationActiveStatus(record.id, current)
              if (res?.status) {
          toast.success(res.message || "Status updated")
          await fetchInsuranceApplications(currentGenderFilter, currentTehsilFilter, currentAddressFilter)
        } else {
          toast.error(res?.message || "Failed to update status")
        }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setToggling(prev => ({ ...prev, [record.id]: false }))
    }
  }


  const columns = [
    {
      key: "formNumber",
      label: "सदस्यता संख्या",
      render: (_value: string, record: GeneralInsuranceApplicationRecord) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{record.formNumber}</span>
          {(record.offlineFormNumber || record.offline_form_number) ? (
            <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
              ऑफलाइन: <span className="font-medium text-foreground">{record.offlineFormNumber || record.offline_form_number}</span>
            </div>
          ) : null}
        </div>
      ),
    },
    { key: "applicationDate", label: "आवेदन तिथि" },
    { key: "applicantName", label: "आवेदक का नाम" },
    { key: "fatherName", label: "पिता का नाम / पति का नाम", render: (_value: string, record: GeneralInsuranceApplicationRecord) => (record.fatherName || record.wifeName || "") },
    { key: "motherName", label: "माता का नाम" },
    { key: "dateOfBirth", label: "जन्म तिथि" },
    { key: "aadharNumber", label: "आधार संख्या" },    
    { key: "age", label: "आयु" },
    { key: "gender", label: "लिंग" }, // Added gender column
    { key: "category", label: "श्रेणी" }, // Added category column
    { key: "mobile", label: "मोबाइल" },
    { key: "address", label: "गांव" },
    { key: "pinCode", label: "पिन कोड" },
    { key: "tehsil", label: "तहसील" },
    { key: "district", label: "जिला" },
    { key: "state", label: "राज्य" },
    {
      key: "is_active",
      label: "Active",
      render: (value: number, record: GeneralInsuranceApplicationRecord) => (
        <Switch
          checked={Number(value) === 1}
          onCheckedChange={() => handleToggleActive(record)}
          disabled={!!toggling[record.id]}
        />
      ),
    },
  ]

  const searchFields: (keyof GeneralInsuranceApplicationRecord)[] = [
    "formNumber",
    "offlineFormNumber",
    "applicantName",
    "fatherName",
    "mobile",
    "gotra",
    "applicationDate",
  ]

  // Map English fields to Hindi for the PDF template
  const mapToHindiFields = (record: GeneralInsuranceApplicationRecord) => ({
    सदस्यता_क्रमांक: record.formNumber,
    आवेदन_दिनांक: record.applicationDate,
    आवेदक_का_नाम: record.applicantName,
    पिता_का_नाम: record.fatherName || record.wifeName,
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
    नामिनी_का_पता: "", // If you have this field
    कार्यकर्ता_का_नाम: record.added_name,
    कार्यकर्ता_का_मोबाइल: record.added_mobile,
    शपथ_नाम: record.applicantName,
    शपथ_पिता_का_नाम: record.fatherName || record.wifeName,
    शपथ_गोत्र: record.gotra,
    शपथ_पता: record.address,
  });

 


  const handleGenerateBond = async (rawRecord: GeneralInsuranceApplicationRecord) => {
    try {
      // Get image data if available
      const imageData = await processImageData(rawRecord.passportPhoto);

      const { workerOfflineFormNumber, seniorOfflineFormNumber, workerMobile } = resolveAgentOfflineNumbers(
        rawRecord,
        agentsList
      );

      const record = {
        ...rawRecord,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerCode: workerOfflineFormNumber || (rawRecord as any).workerCode || "",
        seniorCode: seniorOfflineFormNumber || (rawRecord as any).seniorCode || "",
        agentMobileNumber: workerMobile || "",
        agentMobile: workerMobile || "",
        workerMobile: workerMobile || "",
        offlineFormNumber: rawRecord.offlineFormNumber || rawRecord.offline_form_number || rawRecord.formNumber || "",
      };

      const response = await fetch('/api/generate-insurance-bond-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record, imageData, daysText: "90 दिन" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate insurance bond PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INSURANCE_BOND_${rawRecord.applicantName || rawRecord.formNumber || 'bond'}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Insurance Bond PDF generated successfully');
    } catch (error: any) {
      console.error('Error generating insurance bond PDF:', error);
      toast.error(error?.message || 'Failed to generate insurance bond PDF');
    }
  };

  const handleGenerateInsurancePDF = async (record: GeneralInsuranceApplicationRecord) => {
    try {
      // Get image data if available
      const imageData = await processImageData(record.passportPhoto);

      // Prepare data for PDF generation
      const pdfData: any = {
        ...record,
        formNumber: record.formNumber,
        offlineFormNumber: (record as any).offlineFormNumber || (record as any).offline_form_number || "",
        applicationDate: record.applicationDate,
        applicantName: record.applicantName,
        fatherName: record.fatherName || record.wifeName || "",
        wifeName: record.wifeName || "",
        motherName: record.motherName,
        dateOfBirth: record.dateOfBirth,
        aadharNumber: record.aadharNumber,
        gotra: record.gotra,
        mobile: record.mobile,
        address: record.address,
        pinCode: record.pinCode,
        tehsil: record.tehsil,
        district: record.district,
        state: record.state,
        nomineeName: record.nomineeName,
        nomineeRelation: record.nomineeRelation,
        workerName: record.workerName,
        workerMobile: record.workerMobile,
        affidavit: record.affidavit,
        gender: record.gender,
        category: record.category,
        age: record.age,
      };

      // Generate PDF using the service
      const pdfBlob = await APIService.generateInsurancePDF(pdfData, imageData || undefined);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance_application_${record.formNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Insurance Bima Application PDF generated successfully');
    } catch (error) {
      console.error('Error generating insurance application PDF:', error);
      toast.error('Failed to generate insurance application PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        toast.error("No data to export");
        return;
      }

      console.log("hello in the general add application",records);
      
      // Prepare data for Excel export
      const excelData = records.map((record) => ({
        "सदस्यता संख्या": record.formNumber,
        "ऑफलाइन फॉर्म नं.": record.offlineFormNumber || record.offline_form_number || "-",
        "आवेदन तिथि": record.applicationDate,
        "आवेदक का नाम": record.applicantName,
        "पिता का नाम / पति का नाम": record.fatherName || record.wifeName || "",
        "माता का नाम": record.motherName,
        "जन्म तिथि": record.dateOfBirth,
        "आधार संख्या": record.aadharNumber,
        "गोत्र": record.gotra,
        "आयु": record.age,
        "लिंग": record.gender,
        "श्रेणी": record.category,
        "मोबाइल": record.mobile,
        "गांव": record.address,
        "पिन कोड": record.pinCode,
        "तहसील": record.tehsil,
        "जिला": record.district,
        "राज्य": record.state,
        
        "नामिनी का नाम": record.nomineeName,
        "नामिनी का सम्बन्ध": record.nomineeRelation,
        "कार्यकर्ता का नाम": record.workerName,
        "कार्यकर्ता का मोबाइल": record.workerMobile,
        "Active": record.is_active === 1 ? "Yes" : "No",
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Insurance Bima Applications");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insurance_applications_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    "आवेदन तिथि", "ऑफलाइन फॉर्म नं.", "आवेदक का नाम", "पिता का नाम / पति का नाम", "पत्नी का नाम", "माता का नाम",
    "जन्म तिथि", "आधार संख्या", "गोत्र", "आयु", "लिंग", "श्रेणी", "मोबाइल",
    "गांव", "पिन कोड", "तहसील", "जिला", "राज्य", "नामिनी का नाम",
    "नामिनी का सम्बन्ध", "कार्यकर्ता का नाम", "कार्यकर्ता का मोबाइल", "कुल राशि",
    "भुगतान राशि", "भुगतान का प्रकार", "भुगतान तिथि"
  ];

  const importSampleRows = [
    {
      "आवेदन तिथि": "12-07-2026",
      "ऑफलाइन फॉर्म नं.": "1259",
      "आवेदक का नाम": "रमेश प्रजापति",
      "पिता का नाम / पति का नाम": "सज्जन प्रजापति",
      "पत्नी का नाम": "कविता प्रजापति",
      "माता का नाम": "गुड्डी देवी",
      "जन्म तिथि": "15-08-1990",
      "आधार संख्या": "123456789012",
      "गोत्र": "प्रजापत",
      "आयु": "36",
      "लिंग": "Male",
      "श्रेणी": "A",
      "मोबाइल": "9876543210",
      "गांव": "जसोल",
      "पिन कोड": "344024",
      "तहसील": "बालोतरा",
      "जिला": "बाड़मेर",
      "राज्य": "राजस्थान",
      "नामिनी का नाम": "कविता प्रजापति",
      "नामिनी का सम्बन्ध": "पत्नी",
      "कार्यकर्ता का नाम": "कार्यकर्ता का नाम",
      "कार्यकर्ता का मोबाइल": "9461528164",
      "कुल राशि": "6000",
      "भुगतान राशि": "6000",
      "भुगतान का प्रकार": "CASH",
      "भुगतान तिथि": "12-07-2026"
    },
    {
      "आवेदन तिथि": "12-07-2026",
      "ऑफलाइन फॉर्म नं.": "1260",
      "आवेदक का नाम": "कविता प्रजापति",
      "पिता का नाम / पति का नाम": "रमेश प्रजापति",
      "पत्नी का नाम": "",
      "माता का नाम": "गुड्डी देवी",
      "जन्म तिथि": "15-08-2010",
      "आधार संख्या": "123456789012",
      "गोत्र": "प्रजापत",
      "आयु": "15",
      "लिंग": "Female",
      "श्रेणी": "B",
      "मोबाइल": "9876543210",
      "गांव": "जसोल",
      "पिन कोड": "344024",
      "तहसील": "बालोतरा",
      "जिला": "बाड़मेर",
      "राज्य": "राजस्थान",
      "नामिनी का नाम": "रमेश प्रजापति",
      "नामिनी का सम्बन्ध": "पिता",
      "कार्यकर्ता का नाम": "कार्यकर्ता का नाम",
      "कार्यकर्ता का मोबाइल": "9461528164",
      "कुल राशि": "6000",
      "भुगतान राशि": "6000",
      "भुगतान का प्रकार": "CASH",
      "भुगतान तिथि": "12-07-2026"
    }
  ];

  const handleImportRow = async (row: Record<string, any>) => {
    const agentMobile = String(row["कार्यकर्ता का मोबाइल"] || "").trim().replace(/\D/g, "");
    const agentName = String(row["कार्यकर्ता का नाम"] || "").trim();
    const matchedAgent = agents.find(a => a.mobile === agentMobile || a.name === agentName);
    const selectedAgentId = matchedAgent ? matchedAgent.id : (agents[0]?.id || "");

    const rawGender = String(row["लिंग"] || "").trim().toLowerCase();
    const isMale = rawGender === "पुरुष" || rawGender === "male" || rawGender === "m";
    const gender = isMale ? "Male" : "Female";

    const rawFatherOrHusband = String(row["पिता का नाम / पति का नाम"] || "").trim();
    const rawWife = String(row["पत्नी का नाम"] || "").trim();

    const fatherName = isMale ? rawFatherOrHusband : "";
    const wifeName = isMale ? rawWife : rawFatherOrHusband;
    const offlineFormNumber = String(row["ऑफलाइन फॉर्म नं."] || row["offlineFormNumber"] || "").trim() || undefined;

    const payload = {
      applicationDate: formatExcelDate(row["आवेदन तिथि"]),
      offlineFormNumber,
      applicantName: String(row["आवेदक का नाम"] || "").trim(),
      fatherName,
      wifeName,
      motherName: String(row["माता का नाम"] || "").trim(),
      dateOfBirth: formatExcelDate(row["जन्म तिथि"]),
      aadharNumber: String(row["आधार संख्या"] || "").trim().replace(/\D/g, ""),
      gotra: String(row["गोत्र"] || "Prajapat").trim(),
      mobile: String(row["मोबाइल"] || "").trim().replace(/\D/g, ""),
      address: String(row["गांव"] || "").trim(),
      pinCode: String(row["पिन कोड"] || "").trim(),
      tehsil: String(row["तहसील"] || "").trim(),
      district: String(row["जिला"] || "").trim(),
      state: String(row["राज्य"] || "").trim(),
      nomineeName: String(row["नामिनी का नाम"] || "").trim(),
      nomineeRelation: String(row["नामिनी का सम्बन्ध"] || "").trim(),
      gender,
      category: String(row["श्रेणी"] || "A").trim(),
      totalAmount: String(row["कुल राशि"] || "5000").trim(),
      paymentAmount: String(row["भुगतान राशि"] || "0").trim(),
      paymentMode: String(row["भुगतान का प्रकार"] || "CASH").trim(),
      paymentDate: formatExcelDate(row["भुगतान तिथि"] || row["आवेदन तिथि"]),
      affidavit: "",
      selectedAgentId,
      addedby: "agent",
      addedby_id: matchedAgent ? Number(matchedAgent.id) : (agents[0] ? Number(agents[0].id) : 0),
    };

    const res = await APIService.createInsuranceApplication(payload);
    if (!res.status) {
      throw new Error(res.message || "Failed to create record");
    }
    return res;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading insurance applications...</div>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard requiredModule="security_application" requiredAction="view">
      <>
        <DataTable
          data={records}
          columns={columns}
          title="सुरक्षा बीमा हेतु सामान्य आवेदन"
          subtitle="Insurance Bima Application"
          addNewUrl="/dashboard/general-applications-insurance/add"
          addNewLabel="Add New Insurance Bima Application"
          onDelete={handleDelete}
          onGenerateBond={handleGenerateBond}
          onGeneratePDFForm={handleGenerateInsurancePDF}
          editUrlPattern="/dashboard/general-applications-insurance/edit/[id]"
          searchFields={[
            "formNumber",
            "offlineFormNumber",
            "applicantName",
            "fatherName",
            "motherName",
            "mobile",
            "address",
            "tehsil",
            "district"
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
          module="security_application"
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
                moduleName="Insurance Bima Applications"
                requiredHeaders={importHeaders}
                sampleRows={importSampleRows}
                onImportRow={handleImportRow}
                onSuccess={() => fetchInsuranceApplications(currentGenderFilter, currentTehsilFilter, currentAddressFilter)}
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
    </RoleGuard>
  )
}


