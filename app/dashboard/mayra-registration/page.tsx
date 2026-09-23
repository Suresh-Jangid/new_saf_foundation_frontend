"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileSpreadsheet } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { useRouter } from "next/navigation"
import { useCRUD } from "@/hooks/use-crud"
import { API_ENDPOINTS, mayraApplicationAPI, agentRegistrationAPI } from "@/lib/api"
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

interface ResolvedAgentOfflineNumbers {
  workerOfflineFormNumber: string
  seniorOfflineFormNumber: string
  workerMobile: string
}

function resolveAgentOfflineNumbers(
  record: MayraRegistrationRecord & Record<string, any>,
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
    const ids = [
      agent.id,
      agent.userId,
      agent.user_id,
      agent.agentProfile?.id,
      agent.agentProfile?.userId,
      agent.agentProfile?.user_id,
      agent.agent_profile?.id,
      agent.agent_profile?.user_id,
    ].filter(Boolean);

    ids.forEach((id) => {
      const normalized = String(id).trim();
      if (normalized) agentById.set(normalized, agent);
    });

    const empIds = [
      agent.employeeId,
      agent.employee_id,
      agent.agentProfile?.employeeId,
      agent.agent_profile?.employee_id,
      agent.agentCode,
      agent.agent_code,
      agent.code,
    ].filter(Boolean);

    empIds.forEach((emp) => {
      const normalized = String(emp).trim().toUpperCase();
      if (normalized) agentByCode.set(normalized, agent);
    });

    const name = String(agent.name || "").trim().toLowerCase();
    if (name && name !== "default agent" && name !== "admin") agentByName.set(name, agent);
  }

  const targetWorkerId = String(
    record.addedById ||
    record.addedby_id ||
    record.selectedAgentId ||
    record.agentId ||
    record.agent_id ||
    record.userId ||
    record.user_id ||
    record.addedBy?.id ||
    record.addedBy?.userId ||
    record.addedBy?.user_id ||
    record.agent?.id ||
    record.agent?.userId ||
    record.agent?.user_id ||
    ""
  ).trim();

  const targetWorkerCode = String(
    record.workerCode ||
    record.worker_code ||
    record.agentCode ||
    record.agent_code ||
    record.added_code ||
    record.addedBy?.employee_id ||
    record.addedBy?.employeeId ||
    (record.addedBy as any)?.agentCode ||
    (record.addedBy as any)?.code ||
    ""
  ).trim().toUpperCase();

  const targetWorkerName = String(
    record.workerName ||
    record.worker_name ||
    record.added_name ||
    record.addedby ||
    record.addedBy?.name ||
    record.agent?.name ||
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
        workerAgent.agentProfile?.offline_form_no ||
        workerAgent.offlineFormNo ||
        workerAgent.employeeId ||
        workerAgent.employee_id ||
        workerAgent.agentProfile?.employeeId ||
        workerAgent.agent_profile?.employee_id ||
        workerAgent.agentCode ||
        workerAgent.agent_code ||
        workerAgent.code ||
        workerAgent.user?.offlineFormNumber ||
        workerAgent.user?.offline_form_number ||
        ""
      ).trim();
    }
    if (!workerMobile) {
      workerMobile = String(
        workerAgent.mobile ||
        workerAgent.phone ||
        workerAgent.agentProfile?.mobile ||
        workerAgent.agent_profile?.mobile ||
        ""
      ).trim();
    }

    const parentSeniorId = String(
      workerAgent.parentAgentId ||
      workerAgent.parent_agent_id ||
      workerAgent.seniorId ||
      workerAgent.senior_id ||
      workerAgent.agentProfile?.parentAgentId ||
      workerAgent.agent_profile?.parent_agent_id ||
      workerAgent.agentProfile?.seniorId ||
      workerAgent.agent_profile?.senior_id ||
      ""
    ).trim();

    const parentSeniorCode = String(
      workerAgent.seniorEmployeeId ||
      workerAgent.senior_employee_id ||
      workerAgent.parentEmployeeId ||
      workerAgent.parent_employee_id ||
      workerAgent.seniorCode ||
      workerAgent.senior_code ||
      workerAgent.uplineCode ||
      workerAgent.upline_code ||
      workerAgent.agentProfile?.seniorEmployeeId ||
      workerAgent.agent_profile?.senior_employee_id ||
      workerAgent.agentProfile?.seniorCode ||
      workerAgent.agent_profile?.senior_code ||
      workerAgent.agentProfile?.parentEmployeeId ||
      workerAgent.agent_profile?.parent_employee_id ||
      workerAgent.agentProfile?.uplineCode ||
      workerAgent.agent_profile?.upline_code ||
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
        seniorAgent.agentProfile?.offline_form_no ||
        seniorAgent.offlineFormNo ||
        seniorAgent.employeeId ||
        seniorAgent.employee_id ||
        seniorAgent.agentProfile?.employeeId ||
        seniorAgent.agent_profile?.employee_id ||
        seniorAgent.agentCode ||
        seniorAgent.agent_code ||
        seniorAgent.code ||
        seniorAgent.user?.offlineFormNumber ||
        seniorAgent.user?.offline_form_number ||
        ""
      ).trim();
    }
  }

  if (!seniorOffline) {
    const targetSeniorId = String(
      record.seniorId ||
      record.senior_id ||
      record.parentAgentId ||
      record.parent_agent_id ||
      ""
    ).trim();

    const targetSeniorCode = String(
      record.seniorCode ||
      record.senior_code ||
      record.uplineCode ||
      record.upline_code ||
      record.seniorWorker ||
      record.senior_worker ||
      ""
    ).trim().toUpperCase();

    let fallbackSenior: any = null;
    if (targetSeniorId && agentById.has(targetSeniorId)) {
      fallbackSenior = agentById.get(targetSeniorId);
    } else if (targetSeniorCode && targetSeniorCode !== "ADMIN" && targetSeniorCode !== "SUPER ADMIN" && agentByCode.has(targetSeniorCode)) {
      fallbackSenior = agentByCode.get(targetSeniorCode);
    }

    if (fallbackSenior) {
      seniorOffline = String(
        fallbackSenior.offlineFormNumber ||
        fallbackSenior.offline_form_number ||
        fallbackSenior.agentProfile?.offlineFormNumber ||
        fallbackSenior.agent_profile?.offline_form_number ||
        fallbackSenior.agentProfile?.offline_form_no ||
        fallbackSenior.offlineFormNo ||
        fallbackSenior.employeeId ||
        fallbackSenior.employee_id ||
        fallbackSenior.agentProfile?.employeeId ||
        fallbackSenior.agent_profile?.employee_id ||
        fallbackSenior.agentCode ||
        fallbackSenior.agent_code ||
        fallbackSenior.code ||
        fallbackSenior.user?.offlineFormNumber ||
        fallbackSenior.user?.offline_form_number ||
        ""
      ).trim();
    } else if (targetSeniorCode && targetSeniorCode !== "ADMIN" && targetSeniorCode !== "SUPER ADMIN") {
      seniorOffline = targetSeniorCode;
    }
  }

  return { workerOfflineFormNumber: workerOffline, seniorOfflineFormNumber: seniorOffline, workerMobile };
}

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
  offlineFormNumber?: string | null
  offline_form_number?: string | null
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
  nomineeFatherName?: string
  nominee_father_name?: string
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
  nomineeAadhar?: string
  nomineeAadhaar?: string
  nominee_aadhar?: string
  nominee_aadhaar?: string
  installmentAmount?: string | number
  installment_amount?: string | number
  kistAmount?: string | number
  schemeAmount?: string | number
  totalAmount?: string | number
  paymentAmount?: string | number
}

export default function MayraRegistrationPage() {
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all")
  const [currentAddressFilter, setCurrentAddressFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [agentsList, setAgentsList] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
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
      .catch((err) => {
        console.warn("Failed to load agents list for Mayra page:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleGenerateBond = async (rawRecord: MayraRegistrationRecord) => {
    try {
      const [imageData, nomineeImageData] = await Promise.all([
        fetchPhotoAsDataUrl(rawRecord.passportPhoto),
        fetchPhotoAsDataUrl(rawRecord.nomineePassportPhoto || rawRecord.nomineePhoto),
      ])

      let currentAgents = agentsList;
      if (!currentAgents || currentAgents.length === 0) {
        try {
          const res = await agentRegistrationAPI.getAll();
          if (res && res.status && Array.isArray(res.data)) {
            currentAgents = res.data;
            setAgentsList(res.data);
          } else if (Array.isArray(res)) {
            currentAgents = res;
            setAgentsList(res);
          }
        } catch (e) {
          console.warn("Could not fetch agents for Mayra PDF resolution:", e);
        }
      }

      const { workerOfflineFormNumber, seniorOfflineFormNumber, workerMobile } = resolveAgentOfflineNumbers(
        rawRecord,
        currentAgents
      );

      const record = {
        ...rawRecord,
        workerOfflineFormNumber,
        seniorOfflineFormNumber,
        workerCode: workerOfflineFormNumber || (rawRecord as any).workerCode || (rawRecord as any).agentCode || "",
        seniorCode: seniorOfflineFormNumber || (rawRecord as any).seniorCode || (rawRecord as any).uplineCode || "",
        agentCode: workerOfflineFormNumber || (rawRecord as any).agentCode || (rawRecord as any).workerCode || "",
        uplineCode: seniorOfflineFormNumber || (rawRecord as any).uplineCode || (rawRecord as any).seniorCode || "",
        workerMobile: workerMobile || rawRecord.workerMobile || "",
        agentMobile: workerMobile || rawRecord.workerMobile || "",
        offlineFormNumber: rawRecord.offlineFormNumber || rawRecord.offline_form_number || rawRecord.formNumber || "",
      };

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
      a.download = `MAYRA_BOND_${rawRecord.applicantName || 'Mayra'}.pdf`
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
        "ऑफलाइन फॉर्म नं.": record.offlineFormNumber || record.offline_form_number || "-",
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
        "नॉमिनी के पिता का नाम": record.nomineeFatherName || record.nomineeFathername || record.nominee_father_name || "",
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
      offlineFormNumber: String(row["ऑफलाइन फॉर्म नं."] || row["offlineFormNumber"] || "").trim() || undefined,
    };

    const res = await createApi(payload);
    if (!res) {
      throw new Error("Failed to create record via useCRUD createApi");
    }
    return res;
  };

  const columns = [
    {
      key: "formNumber",
      label: "फॉर्म संख्या",
      render: (value: string, record: MayraRegistrationRecord) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{record.formNumber || value || "-"}</span>
          {(record.offlineFormNumber || record.offline_form_number) ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ऑफलाइन: <span className="font-medium text-foreground">{record.offlineFormNumber || record.offline_form_number}</span>
            </span>
          ) : null}
        </div>
      ),
    },
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
    {
      key: "nomineeFathername",
      label: "नॉमिनी के पिता का नाम",
      render: (value: string, record: MayraRegistrationRecord) =>
        record.nomineeFatherName || record.nomineeFathername || record.nominee_father_name || value || "-"
    },
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
          searchFields={["applicantName", "mobile", "aadharNumber", "formNumber", "offlineFormNumber"] as any}
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

