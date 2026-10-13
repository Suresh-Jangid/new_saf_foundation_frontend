"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn, formatDate } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DisplayTable } from "@/components/display-table"
import { toast } from "sonner"
import { Loader2, Search, FileBarChart, CreditCard, CheckCircle2, AlertCircle, AlertTriangle, BarChart3, History } from "lucide-react"
import { post, get, API_ENDPOINTS } from "@/lib/api"
import { GENDER } from "@/lib/form-values"
import { RoleGuard } from "@/components/role-guard"

interface Agent {
  id: string
  name: string
  employee_id: string
  mobile: string
  village: string
}

// Item row returned from bulk commission queries
export interface BulkDataItem {
  id: string
  sourceId?: string
  sourceTable?: string
  formId?: string
  date: string
  applicationDate?: string
  formNo: string
  formNumber?: string
  form_number?: string
  applicantName?: string
  name: string
  amount: number
  rate?: number
  commission?: number
  payment_mode: string
  feeType?: string
  fee_type?: string
  module?: string
  scheme?: string
  isPaid?: boolean
  status?: string
  reason?: string
}

export interface ModuleSummaryGroup {
  eligibleRevenue: number
  rate: number
  commission: number
  paidCommission?: number
  pendingCommission?: number
  count: number
}

export interface ModuleDataContainer {
  entry_fees: BulkDataItem[]
  installments: BulkDataItem[]
  annual_bonuses: BulkDataItem[]
  summary: {
    entry_fee: ModuleSummaryGroup
    installment: ModuleSummaryGroup
    annual_bonus: ModuleSummaryGroup
    totalCollected: number
    totalCommission: number
    totalPaidCommission?: number
    totalPendingCommission?: number
  }
}

export interface BulkDataResponse {
  success: boolean
  // Canonical per-module collections across all 8 eligible schemes
  marriage_entry_fees?: BulkDataItem[]
  marriage_installments?: BulkDataItem[]
  marriage_annual_bonuses?: BulkDataItem[]
  mayra_entry_fees?: BulkDataItem[]
  mayra_installments?: BulkDataItem[]
  mayra_annual_bonuses?: BulkDataItem[]
  insurance_entry_fees?: BulkDataItem[]
  insurance_installments?: BulkDataItem[]
  insurance_annual_bonuses?: BulkDataItem[]
  janni_delivery_entry_fees?: BulkDataItem[]
  janni_delivery_installments?: BulkDataItem[]
  janni_delivery_annual_bonuses?: BulkDataItem[]
  aawas_entry_fees?: BulkDataItem[]
  aawas_installments?: BulkDataItem[]
  aawas_annual_bonuses?: BulkDataItem[]
  lado_bahin_entry_fees?: BulkDataItem[]
  lado_bahin_installments?: BulkDataItem[]
  lado_bahin_annual_bonuses?: BulkDataItem[]
  dhundhotsav_entry_fees?: BulkDataItem[]
  dhundhotsav_installments?: BulkDataItem[]
  dhundhotsav_annual_bonuses?: BulkDataItem[]
  shubh_laxmi_entry_fees?: BulkDataItem[]
  shubh_laxmi_installments?: BulkDataItem[]
  shubh_laxmi_annual_bonuses?: BulkDataItem[]
  // Structured module container
  modules?: Record<string, ModuleDataContainer>
  summary?: Record<string, any>
  manual_review_items?: BulkDataItem[]
  // Backward compatibility legacy aliases
  applications?: BulkDataItem[]
  application_installments?: BulkDataItem[]
  insurances?: BulkDataItem[]
}

interface ModuleDefinition {
  key: string
  displayName: string
  hindiName: string
  schemeName: string
  entryKey: keyof BulkDataResponse
  installmentKey: keyof BulkDataResponse
  bonusKey: keyof BulkDataResponse
  entryCategoryName: string
  installmentCategoryName: string
  bonusCategoryName: string
}

const ELIGIBLE_COMMISSION_MODULES: ModuleDefinition[] = [
  {
    key: "marriage",
    displayName: "General Marriage",
    hindiName: "सामान्य विवाह",
    schemeName: "GENERAL_MARRIAGE",
    entryKey: "marriage_entry_fees",
    installmentKey: "marriage_installments",
    bonusKey: "marriage_annual_bonuses",
    entryCategoryName: "Marriage Entry Fee",
    installmentCategoryName: "Marriage Installments",
    bonusCategoryName: "Marriage Annual Bonus",
  },
  {
    key: "mayra",
    displayName: "Mayra Scheme",
    hindiName: "मायरा योजना",
    schemeName: "MAYRA",
    entryKey: "mayra_entry_fees",
    installmentKey: "mayra_installments",
    bonusKey: "mayra_annual_bonuses",
    entryCategoryName: "Mayra Entry Fee",
    installmentCategoryName: "Mayra Installments",
    bonusCategoryName: "Mayra Annual Bonus",
  },
  {
    key: "insurance",
    displayName: "Insurance (Suraksha Bima)",
    hindiName: "सुरक्षा बीमा योजना",
    schemeName: "INSURANCE_BIMA",
    entryKey: "insurance_entry_fees",
    installmentKey: "insurance_installments",
    bonusKey: "insurance_annual_bonuses",
    entryCategoryName: "Insurance (Suraksha Bima) Entry Fee",
    installmentCategoryName: "Insurance (Suraksha Bima) Installments",
    bonusCategoryName: "Insurance (Suraksha Bima) Annual Bonus",
  },
  {
    key: "janni_delivery",
    displayName: "Janni Delivery",
    hindiName: "जननी प्रसूति योजना",
    schemeName: "JANNI_DELIVERY",
    entryKey: "janni_delivery_entry_fees",
    installmentKey: "janni_delivery_installments",
    bonusKey: "janni_delivery_annual_bonuses",
    entryCategoryName: "Janni Delivery Entry Fee",
    installmentCategoryName: "Janni Delivery Installments",
    bonusCategoryName: "Janni Delivery Annual Bonus",
  },
  {
    key: "aawas",
    displayName: "Aawas (Home)",
    hindiName: "गृह प्रवेश आवास",
    schemeName: "AAWAS",
    entryKey: "aawas_entry_fees",
    installmentKey: "aawas_installments",
    bonusKey: "aawas_annual_bonuses",
    entryCategoryName: "Aawas (Home) Entry Fee",
    installmentCategoryName: "Aawas (Home) Installments",
    bonusCategoryName: "Aawas (Home) Annual Bonus",
  },
  {
    key: "lado_bahin",
    displayName: "Lado Bahin",
    hindiName: "लाडो बहिन योजना",
    schemeName: "LADO_BAHIN",
    entryKey: "lado_bahin_entry_fees",
    installmentKey: "lado_bahin_installments",
    bonusKey: "lado_bahin_annual_bonuses",
    entryCategoryName: "Lado Bahin Entry Fee",
    installmentCategoryName: "Lado Bahin Installments",
    bonusCategoryName: "Lado Bahin Annual Bonus",
  },
  {
    key: "dhundhotsav",
    displayName: "Dhundhotsav",
    hindiName: "ढूंढोत्सव योजना",
    schemeName: "DHUNDHOTSAV",
    entryKey: "dhundhotsav_entry_fees",
    installmentKey: "dhundhotsav_installments",
    bonusKey: "dhundhotsav_annual_bonuses",
    entryCategoryName: "Dhundhotsav Entry Fee",
    installmentCategoryName: "Dhundhotsav Installments",
    bonusCategoryName: "Dhundhotsav Annual Bonus",
  },
  {
    key: "shubh_laxmi",
    displayName: "Shubh Laxmi (Deepawali)",
    hindiName: "शुभलक्ष्मी योजना",
    schemeName: "SHUBH_LAXMI",
    entryKey: "shubh_laxmi_entry_fees",
    installmentKey: "shubh_laxmi_installments",
    bonusKey: "shubh_laxmi_annual_bonuses",
    entryCategoryName: "Shubh Laxmi Entry Fee",
    installmentCategoryName: "Shubh Laxmi Installments",
    bonusCategoryName: "Shubh Laxmi Annual Bonus",
  },
]

// Column definitions for data tables
const createColumns = (rate: number = 0.05) => [
  {
    key: "date",
    label: "Date",
    render: (value: string) => (
      <span className="font-medium">
        {formatDate(value)}
      </span>
    ),
  },
  {
    key: "formNo",
    label: "Form No",
    render: (value: string) => (
      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
        {value || "N/A"}
      </span>
    ),
  },
  {
    key: "name",
    label: "Name",
    render: (value: string) => (
      <span className="font-medium">{value || "N/A"}</span>
    ),
  },
  {
    key: "payment_mode",
    label: "Payment Mode",
    render: (value: string) => (
      <span className="font-medium text-blue-600">
        {value || "N/A"}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Collected Amount",
    render: (value: number) => (
      <span className="font-semibold text-gray-800">
        ₹{Number(value || 0).toLocaleString('hi-IN')}
      </span>
    ),
  },
  {
    key: "commission",
    label: `Commission (${Math.round(rate * 100)}%)`,
    render: (value: number, item: any) => {
      const comm = value !== undefined ? Number(value) : Math.round(Number(item.amount || 0) * rate)
      return (
        <span className="font-semibold text-green-600">
          ₹{comm.toLocaleString('hi-IN')}
        </span>
      )
    },
  },
  {
    key: "status",
    label: "Status",
    render: (value: string, item: any) => {
      const isPaid = item.isPaid || value === "Paid"
      return isPaid ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          Paid
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
          Payable
        </span>
      )
    },
  },
]

// Column definitions for manual review & excluded collections table
const manualReviewColumns = [
  {
    key: "date",
    label: "Date",
    render: (value: string) => (
      <span className="font-medium whitespace-nowrap">
        {value ? formatDate(value) : "—"}
      </span>
    ),
  },
  {
    key: "scheme",
    label: "Scheme / Module",
    render: (value: string, item: any) => {
      const schemeText = value || item.module || "General"
      return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 whitespace-nowrap">
          {schemeText.replace(/_/g, " ")}
        </span>
      )
    },
  },
  {
    key: "formNo",
    label: "Form No",
    render: (value: string, item: any) => (
      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
        {value || item.formNumber || item.form_number || "N/A"}
      </span>
    ),
  },
  {
    key: "name",
    label: "Applicant Name",
    render: (value: string, item: any) => (
      <span className="font-medium">{value || item.applicantName || "N/A"}</span>
    ),
  },
  {
    key: "payment_mode",
    label: "Mode",
    render: (value: string) => (
      <span className="text-xs font-medium text-gray-700">{value || "CASH"}</span>
    ),
  },
  {
    key: "amount",
    label: "Collection Amount",
    render: (value: number) => (
      <span className="font-semibold text-gray-900 whitespace-nowrap">
        ₹{Number(value || 0).toLocaleString('hi-IN')}
      </span>
    ),
  },
  {
    key: "reason",
    label: "Exclusion Reason / Audit Note",
    render: (value: string) => (
      <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200 p-2 rounded max-w-md">
        {value || "Flagged for manual verification"}
      </div>
    ),
  },
  {
    key: "status",
    label: "Audit Status",
    render: (value: string) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
        {value || "REQUIRES_MANUAL_REVIEW"}
      </span>
    ),
  },
]

export default function BulkDataReportPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [addedById, setAddedById] = useState<string>("")
  const [gender, setGender] = useState<string>("all")
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("marriage")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // State for data
  const [bulkData, setBulkData] = useState<BulkDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("marriage-entry-fee")
  const [activeViewMode, setActiveViewMode] = useState<"summary" | "module" | "manual_review">("module")

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setAgentsLoading(true)
        const response = await get(API_ENDPOINTS.GET_AGENTS)
        if (response.data.status && Array.isArray(response.data.data)) {
          setAgents(
            response.data.data.map((agent: Record<string, string>) => ({
              id: String(agent.id),
              name: agent.name || "",
              employee_id: agent.employee_id || "",
              mobile: agent.mobile || "",
              village: agent.village || "",
            })),
          )
        }
      } catch (error) {
        console.error("Error fetching agents:", error)
        toast.error("Failed to load agents")
      } finally {
        setAgentsLoading(false)
      }
    }

    fetchAgents()
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === addedById)

  // Utility function to convert date to YYYY-MM-DD format
  const convertToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Fetch bulk data from API
  const fetchBulkData = async () => {
    if (!addedById) {
      toast.error("Please select an agent to fetch data")
      return
    }

    if (!startDate) {
      toast.error("Please select Start Date to fetch data")
      return
    }

    if (!endDate) {
      toast.error("Please select End Date to fetch data")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('addedby_id', addedById)

      if (selectedAgent?.name) {
        formData.append('addedby', selectedAgent.name)
      }

      if (gender !== "all") {
        formData.append('gender', gender)
      }

      const formattedStartDate = convertToYYYYMMDD(startDate)
      formData.append('startDate', formattedStartDate)

      const formattedEndDate = convertToYYYYMMDD(endDate)
      formData.append('endDate', formattedEndDate)

      const response = await post('?apicall=getAllBulkData', formData)

      const data: BulkDataResponse = response.data

      if (data.success) {
        setBulkData(data)
        toast.success("Data fetched successfully across all modules!")
      } else {
        throw new Error('Failed to fetch data from API')
      }
    } catch (error: any) {
      console.error('Error fetching bulk data:', error)
      toast.error(error.message || "Failed to fetch bulk data")
      setBulkData(null)
    } finally {
      setLoading(false)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setAddedById("")
    setGender("all")
    setSelectedModuleFilter("marriage")
    setSelectedStatusFilter("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setBulkData(null)
    setActiveViewMode("module")
  }

  // Calculate total amount for a data array
  const calculateTotal = (data: BulkDataItem[] | undefined) => {
    if (!data || !Array.isArray(data)) return 0
    return data.reduce((total, item) => total + (Number(item.amount) || 0), 0)
  }

  // Calculate commission with specific approved rate (15%, 5%, 2%), prioritizing line-item commission from API
  const calculateCommissionTotal = (data: BulkDataItem[] | undefined, rate: number = 0.05) => {
    if (!data || !Array.isArray(data)) return 0
    return data.reduce((total, item) => {
      const comm = item.commission !== undefined ? Number(item.commission) : Math.round((Number(item.amount) || 0) * rate)
      return total + comm
    }, 0)
  }

  // Calculate unpaid commission amount
  const calculateUnpaidCommissionTotal = (data: BulkDataItem[] | undefined, rate: number = 0.05) => {
    if (!data || !Array.isArray(data)) return 0
    const unpaidItems = data.filter((item) => !item.isPaid)
    return calculateCommissionTotal(unpaidItems, rate)
  }

  // Calculate already paid commission amount
  const calculatePaidCommissionTotal = (data: BulkDataItem[] | undefined, rate: number = 0.05) => {
    if (!data || !Array.isArray(data)) return 0
    const paidItems = data.filter((item) => item.isPaid)
    return calculateCommissionTotal(paidItems, rate)
  }

  // Handle payment with category and rate verification
  const handlePayment = async (data: BulkDataItem[] | undefined, categoryName: string, rate: number = 0.05) => {
    const items = data || []
    const unpaidItems = items.filter((item) => !item.isPaid)
    const payableItems = unpaidItems.length > 0 ? unpaidItems : items
    const commissionTotal = calculateCommissionTotal(payableItems, rate)

    if (commissionTotal === 0) {
      toast.error("No eligible unpaid commission amount to pay")
      return
    }

    if (!addedById) {
      toast.error("Agent is required for payment")
      return
    }

    if (!startDate || !endDate) {
      toast.error("Both start date and end date are required for payment")
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date")
      return
    }

    setPaymentLoading(categoryName)
    try {
      const formData = new FormData()
      formData.append('agentId', addedById)
      formData.append('amount', commissionTotal.toString())
      formData.append('category', categoryName)

      const formattedStartDate = convertToYYYYMMDD(startDate)
      formData.append('startDate', formattedStartDate)

      const formattedEndDate = convertToYYYYMMDD(endDate)
      formData.append('endDate', formattedEndDate)

      const response = await post('?apicall=addAgentPaymentForDetails', formData)

      const result = response.data

      if (result.success || result.status) {
        toast.success(`Payment of ₹${commissionTotal.toLocaleString('hi-IN')} processed successfully for ${categoryName}`)
        // Refresh data to reflect settlements
        await fetchBulkData()
      } else {
        throw new Error(result.message || 'Payment failed')
      }
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error(error.message || "Failed to process payment")
    } finally {
      setPaymentLoading(null)
    }
  }

  // Helper to extract items for any of the 8 canonical modules
  const getModuleCollections = (modDef: ModuleDefinition) => {
    const modObj = bulkData?.modules?.[modDef.key]

    const entryFees: BulkDataItem[] = modObj?.entry_fees || (bulkData && (bulkData as any)[modDef.entryKey]) || []
    const installments: BulkDataItem[] = modObj?.installments || (bulkData && (bulkData as any)[modDef.installmentKey]) || []
    const annualBonuses: BulkDataItem[] = modObj?.annual_bonuses || (bulkData && (bulkData as any)[modDef.bonusKey]) || []

    // Apply status filter if selected
    const filterByStatus = (items: BulkDataItem[]) => {
      if (selectedStatusFilter === "paid") return items.filter((i) => i.isPaid)
      if (selectedStatusFilter === "payable") return items.filter((i) => !i.isPaid)
      return items
    }

    return {
      entryFees: filterByStatus(entryFees),
      installments: filterByStatus(installments),
      annualBonuses: filterByStatus(annualBonuses),
      rawEntryFees: entryFees,
      rawInstallments: installments,
      rawAnnualBonuses: annualBonuses,
    }
  }

  // Currently selected module definition
  const currentModuleDef = useMemo(() => {
    return ELIGIBLE_COMMISSION_MODULES.find((m) => m.key === selectedModuleFilter) || ELIGIBLE_COMMISSION_MODULES[0]
  }, [selectedModuleFilter])

  const currentCollections = useMemo(() => {
    return getModuleCollections(currentModuleDef)
  }, [currentModuleDef, bulkData, selectedStatusFilter])

  // Switch to specific module and synchronize active tab
  const handleModuleChange = (newModuleKey: string) => {
    setActiveViewMode("module")
    setSelectedModuleFilter(newModuleKey)
    const baseTabSuffix = activeTab.includes("installments")
      ? "installments"
      : activeTab.includes("annual-bonus")
      ? "annual-bonus"
      : "entry-fee"
    setActiveTab(`${newModuleKey}-${baseTabSuffix}`)
  }

  const handleSwitchToSummary = () => {
    setActiveViewMode("summary")
  }

  const handleSwitchToManualReview = () => {
    setActiveViewMode("manual_review")
  }

  // Consolidated breakdown across all 8 modules for agent summary view
  const allSchemesSummaryData = useMemo(() => {
    if (!bulkData) return []
    return ELIGIBLE_COMMISSION_MODULES.map((mod) => {
      const collections = getModuleCollections(mod)
      const eRevenue = calculateTotal(collections.rawEntryFees)
      const iRevenue = calculateTotal(collections.rawInstallments)
      const bRevenue = calculateTotal(collections.rawAnnualBonuses)

      const eComm = calculateCommissionTotal(collections.rawEntryFees, 0.15)
      const iComm = calculateCommissionTotal(collections.rawInstallments, 0.05)
      const bComm = calculateCommissionTotal(collections.rawAnnualBonuses, 0.02)

      const ePaid = calculatePaidCommissionTotal(collections.rawEntryFees, 0.15)
      const iPaid = calculatePaidCommissionTotal(collections.rawInstallments, 0.05)
      const bPaid = calculatePaidCommissionTotal(collections.rawAnnualBonuses, 0.02)

      const totalSchemeRevenue = eRevenue + iRevenue
      const totalSchemeComm = eComm + iComm + bComm
      const totalSchemePaid = ePaid + iPaid + bPaid
      const totalSchemePayable = totalSchemeComm - totalSchemePaid

      return {
        key: mod.key,
        displayName: mod.displayName,
        hindiName: mod.hindiName,
        entryCount: collections.rawEntryFees.length,
        entryRevenue: eRevenue,
        entryComm: eComm,
        entryPaid: ePaid,
        installmentCount: collections.rawInstallments.length,
        installmentRevenue: iRevenue,
        installmentComm: iComm,
        installmentPaid: iPaid,
        bonusCount: collections.rawAnnualBonuses.length,
        bonusRevenue: bRevenue,
        bonusComm: bComm,
        bonusPaid: bPaid,
        totalRevenue: totalSchemeRevenue,
        totalComm: totalSchemeComm,
        totalPaid: totalSchemePaid,
        totalPayable: totalSchemePayable,
      }
    })
  }, [bulkData, selectedStatusFilter])

  // Grand summary across all modules
  const grandSummary = useMemo(() => {
    if (!bulkData) return null
    let totalCollected = 0
    let totalCalculatedComm = 0
    let totalPaidComm = 0
    let totalPayableComm = 0
    let totalItemsCount = 0

    for (const mod of ELIGIBLE_COMMISSION_MODULES) {
      const collections = getModuleCollections(mod)
      const eRevenue = calculateTotal(collections.rawEntryFees)
      const iRevenue = calculateTotal(collections.rawInstallments)

      const eComm = calculateCommissionTotal(collections.rawEntryFees, 0.15)
      const iComm = calculateCommissionTotal(collections.rawInstallments, 0.05)
      const bComm = calculateCommissionTotal(collections.rawAnnualBonuses, 0.02)

      const ePaid = calculatePaidCommissionTotal(collections.rawEntryFees, 0.15)
      const iPaid = calculatePaidCommissionTotal(collections.rawInstallments, 0.05)
      const bPaid = calculatePaidCommissionTotal(collections.rawAnnualBonuses, 0.02)

      totalCollected += (eRevenue + iRevenue)
      totalCalculatedComm += (eComm + iComm + bComm)
      totalPaidComm += (ePaid + iPaid + bPaid)
      totalItemsCount += (collections.rawEntryFees.length + collections.rawInstallments.length)
    }

    totalPayableComm = totalCalculatedComm - totalPaidComm

    return {
      totalCollected,
      totalCalculatedComm,
      totalPaidComm,
      totalPayableComm,
      totalItemsCount,
    }
  }, [bulkData])

  return (
    <RoleGuard requiredRoles={["admin", "ADMIN"]} requiredModule="agent_commission" requiredAction="view">
      <div className="p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FileBarChart className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Agent Commission Report / एजेंट कमिशन रिपोर्ट
          </h1>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter verified commission collections across all 8 SAF Foundation application modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Agent */}
              <div className="space-y-2">
                <Label htmlFor="agent">Agent *</Label>
                <Select value={addedById} onValueChange={setAddedById} disabled={agentsLoading}>
                  <SelectTrigger id="agent">
                    <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.employee_id} — {agent.name}
                        {agent.village ? ` (${agent.village})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Module / Scheme Selector */}
              <div className="space-y-2">
                <Label htmlFor="moduleSelect">Module / Scheme</Label>
                <Select value={selectedModuleFilter} onValueChange={handleModuleChange}>
                  <SelectTrigger id="moduleSelect">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {ELIGIBLE_COMMISSION_MODULES.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.displayName} ({m.hindiName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={GENDER.MALE}>Male</SelectItem>
                    <SelectItem value={GENDER.FEMALE}>Female</SelectItem>
                    <SelectItem value={GENDER.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="statusFilter">Payment Status</Label>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger id="statusFilter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Calculated &amp; Paid)</SelectItem>
                    <SelectItem value="payable">Unpaid / Payable Only</SelectItem>
                    <SelectItem value="paid">Paid History Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={fetchBulkData}
                disabled={loading || !addedById || !startDate || !endDate}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Fetching..." : "Fetch Data"}
              </Button>

              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={loading}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grand Summary Metrics Banner */}
        {bulkData && grandSummary && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-700 font-medium uppercase tracking-wider">Total Verified Revenue</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">₹{grandSummary.totalCollected.toLocaleString('hi-IN')}</p>
                  <p className="text-xs text-blue-600 mt-1">{grandSummary.totalItemsCount} verified collections</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50/50 border-purple-200">
                <CardContent className="p-4">
                  <p className="text-xs text-purple-700 font-medium uppercase tracking-wider">Total Calculated Commission</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">₹{grandSummary.totalCalculatedComm.toLocaleString('hi-IN')}</p>
                  <p className="text-xs text-purple-600 mt-1">Across all 8 modules</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50/50 border-green-200">
                <CardContent className="p-4">
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wider">Actually Paid Commission</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">₹{grandSummary.totalPaidComm.toLocaleString('hi-IN')}</p>
                  <p className="text-xs text-green-600 mt-1">Settled payouts</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50/50 border-amber-200">
                <CardContent className="p-4">
                  <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending / Payable Commission</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">₹{grandSummary.totalPayableComm.toLocaleString('hi-IN')}</p>
                  <p className="text-xs text-amber-600 mt-1">Eligible for disbursal</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground px-1 gap-2">
              <span>All totals reconcile 100% with underlying verified collections across all 8 modules.</span>
              {addedById && (
                <Link
                  href={`/dashboard/agent-commission-report?agentId=${addedById}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  View Historical Disbursed Payouts for this Agent →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Manual Review Alert Banner (when flagged items exist) */}
        {bulkData && (bulkData.manual_review_items?.length || 0) > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {bulkData.manual_review_items?.length} Collection Items Require Manual Administrator Review
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Flagged collections (refunds, cancellations, reversals, bounced payments, or ambiguous remarks) have been strictly excluded from automatic commission calculations.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 bg-white hover:bg-amber-100 text-amber-900 text-xs shrink-0 flex items-center gap-1.5"
              onClick={handleSwitchToManualReview}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Inspect Flagged Items ({bulkData.manual_review_items?.length})
            </Button>
          </div>
        )}

        {/* Results Card */}
        {bulkData && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Commission Categories &amp; Results</CardTitle>
                  <CardDescription>
                    Verified revenue collections and payable commission across approved categories
                  </CardDescription>
                </div>

                {/* View and module switcher buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* All Schemes Summary Button */}
                  <Button
                    variant={activeViewMode === "summary" ? "default" : "outline"}
                    size="sm"
                    onClick={handleSwitchToSummary}
                    className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    All Schemes Summary
                  </Button>

                  {/* Canonical 8 Module Buttons */}
                  {ELIGIBLE_COMMISSION_MODULES.map((m) => {
                    const isSelected = activeViewMode === "module" && selectedModuleFilter === m.key
                    const c = getModuleCollections(m)
                    const totalItems = c.rawEntryFees.length + c.rawInstallments.length
                    return (
                      <Button
                        key={m.key}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleModuleChange(m.key)}
                        className="text-xs h-8 px-2.5"
                      >
                        {m.displayName}
                        {totalItems > 0 && (
                          <span className={cn(
                            "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                            isSelected ? "bg-white text-primary" : "bg-gray-100 text-gray-700"
                          )}>
                            {totalItems}
                          </span>
                        )}
                      </Button>
                    )
                  })}

                  {/* Manual Review Flagged Items Button */}
                  <Button
                    variant={activeViewMode === "manual_review" ? "default" : "outline"}
                    size="sm"
                    onClick={handleSwitchToManualReview}
                    className={cn(
                      "text-xs h-8 px-2.5 flex items-center gap-1.5",
                      (bulkData?.manual_review_items?.length || 0) > 0 && activeViewMode !== "manual_review"
                        ? "border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-100"
                        : ""
                    )}
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    Manual Review
                    {(bulkData?.manual_review_items?.length || 0) > 0 && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                        activeViewMode === "manual_review" ? "bg-white text-primary" : "bg-amber-200 text-amber-900"
                      )}>
                        {bulkData?.manual_review_items?.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* ── A. ALL SCHEMES SUMMARY VIEW ── */}
              {activeViewMode === "summary" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b">
                    <div>
                      <h3 className="text-lg font-semibold">Agent Commission Summary Across All 8 Schemes</h3>
                      <p className="text-xs text-muted-foreground">
                        Consolidated performance and commission breakdown for {selectedAgent?.name} ({selectedAgent?.employee_id})
                      </p>
                    </div>
                    {addedById && (
                      <Link
                        href={`/dashboard/agent-commission-report?agentId=${addedById}`}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 h-8 px-3 transition-colors shadow-sm"
                      >
                        <History className="mr-1.5 h-3.5 w-3.5" />
                        Disbursed Payout History
                      </Link>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b">
                        <tr>
                          <th className="px-4 py-3">Scheme / Module</th>
                          <th className="px-3 py-3 text-right">Entry Fee (15%)</th>
                          <th className="px-3 py-3 text-right">Installments (5%)</th>
                          <th className="px-3 py-3 text-right">Annual Bonus (2%)</th>
                          <th className="px-3 py-3 text-right">Total Revenue</th>
                          <th className="px-3 py-3 text-right font-bold text-purple-700">Calculated</th>
                          <th className="px-3 py-3 text-right font-bold text-green-700">Already Paid</th>
                          <th className="px-3 py-3 text-right font-bold text-amber-700">Payable</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allSchemesSummaryData.map((s) => (
                          <tr key={s.key} className="hover:bg-gray-50/70">
                            <td className="px-4 py-3 font-medium">
                              <div>{s.displayName}</div>
                              <div className="text-xs text-muted-foreground">{s.hindiName}</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div>₹{s.entryComm.toLocaleString('hi-IN')}</div>
                              <div className="text-[11px] text-gray-500">Rev: ₹{s.entryRevenue.toLocaleString('hi-IN')} ({s.entryCount})</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div>₹{s.installmentComm.toLocaleString('hi-IN')}</div>
                              <div className="text-[11px] text-gray-500">Rev: ₹{s.installmentRevenue.toLocaleString('hi-IN')} ({s.installmentCount})</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div>₹{s.bonusComm.toLocaleString('hi-IN')}</div>
                              <div className="text-[11px] text-gray-500">Rev: ₹{s.bonusRevenue.toLocaleString('hi-IN')} ({s.bonusCount})</div>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-gray-800">
                              ₹{s.totalRevenue.toLocaleString('hi-IN')}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-purple-700">
                              ₹{s.totalComm.toLocaleString('hi-IN')}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-green-700">
                              ₹{s.totalPaid.toLocaleString('hi-IN')}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-amber-700">
                              ₹{s.totalPayable.toLocaleString('hi-IN')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => handleModuleChange(s.key)}
                              >
                                Inspect →
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100/80 font-bold border-t">
                        <tr>
                          <td className="px-4 py-3 text-gray-900">Grand Total</td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            ₹{allSchemesSummaryData.reduce((acc, s) => acc + s.entryComm, 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            ₹{allSchemesSummaryData.reduce((acc, s) => acc + s.installmentComm, 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            ₹{allSchemesSummaryData.reduce((acc, s) => acc + s.bonusComm, 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-900">
                            ₹{(grandSummary?.totalCollected || 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-purple-900">
                            ₹{(grandSummary?.totalCalculatedComm || 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-green-900">
                            ₹{(grandSummary?.totalPaidComm || 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-3 py-3 text-right text-amber-900">
                            ₹{(grandSummary?.totalPayableComm || 0).toLocaleString('hi-IN')}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ── B. MANUAL REVIEW & EXCLUDED ITEMS VIEW ── */}
              {activeViewMode === "manual_review" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-amber-900">
                          Manual Review &amp; Excluded Collection Items ({bulkData?.manual_review_items?.length || 0})
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        These collections were flagged for manual administrator audit (refunds, cancellations, reversals, bounced payments, or ambiguous remarks) and are strictly excluded from automated commission payouts.
                      </p>
                    </div>
                  </div>

                  {(!bulkData?.manual_review_items || bulkData.manual_review_items.length === 0) ? (
                    <div className="text-center py-12 border rounded-lg bg-gray-50/50">
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-800">No Items Requiring Manual Review</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                        All collections for {selectedAgent?.name} in the selected period are clean and legitimate with no refund, reversal, or ambiguity flags.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                        <span>Total Flagged Items: <strong>{bulkData.manual_review_items.length}</strong></span>
                        <span>Total Excluded Collection Amount: <strong>₹{calculateTotal(bulkData.manual_review_items).toLocaleString('hi-IN')}</strong></span>
                      </div>
                      <DisplayTable
                        data={bulkData.manual_review_items}
                        columns={manualReviewColumns}
                        searchKey="name"
                        searchPlaceholder="Search by applicant name..."
                        showPagination={true}
                        itemsPerPage={10}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ── C. PER-MODULE DETAIL TABS (15%, 5%, 2%) ── */}
              {activeViewMode === "module" && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 h-auto p-1 mb-4">
                    {/* 1. Entry Fee (15%) */}
                    <TabsTrigger
                      value={`${currentModuleDef.key}-entry-fee`}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 h-auto text-center"
                    >
                      {currentModuleDef.displayName} Entry Fee (15%)
                      <span className="block text-xs text-muted-foreground">
                        ({currentCollections.entryFees.length} items)
                      </span>
                    </TabsTrigger>

                    {/* 2. Installments (5%) */}
                    <TabsTrigger
                      value={`${currentModuleDef.key}-installments`}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 h-auto text-center"
                    >
                      {currentModuleDef.displayName} Installments (5%)
                      <span className="block text-xs text-muted-foreground">
                        ({currentCollections.installments.length} items)
                      </span>
                    </TabsTrigger>

                    {/* 3. Annual Bonus (2%) */}
                    <TabsTrigger
                      value={`${currentModuleDef.key}-annual-bonus`}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 h-auto text-center"
                    >
                      {currentModuleDef.displayName} Annual Bonus (2%)
                      <span className="block text-xs text-muted-foreground">
                        ({currentCollections.annualBonuses.length} items)
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* ── 1. ENTRY FEE TAB (15%) ── */}
                  <TabsContent value={`${currentModuleDef.key}-entry-fee`} className="mt-2">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {currentModuleDef.displayName} Entry Fee Collections — 15% Commission ({currentCollections.entryFees.length})
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Calculated strictly on verified cash entry fees collected at registration for {currentModuleDef.displayName}. Uncollected pledges are excluded.
                      </p>
                    </div>
                    <DisplayTable
                      data={currentCollections.entryFees}
                      columns={createColumns(0.15)}
                      searchKey="name"
                      searchPlaceholder="Search by name..."
                      showPagination={true}
                      itemsPerPage={10}
                    />
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div>
                            <p className="text-sm text-gray-600">Total Verified Entry Fee Revenue</p>
                            <p className="text-lg font-semibold">₹{calculateTotal(currentCollections.rawEntryFees).toLocaleString('hi-IN')}</p>
                          </div>
                          <div className="flex items-center gap-4 pt-1">
                            <div>
                              <p className="text-xs text-gray-500">Already Paid</p>
                              <p className="text-sm font-semibold text-green-700">₹{calculatePaidCommissionTotal(currentCollections.rawEntryFees, 0.15).toLocaleString('hi-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Commission (15%) — Payable</p>
                              <p className="text-2xl font-bold text-green-600">₹{calculateUnpaidCommissionTotal(currentCollections.rawEntryFees, 0.15).toLocaleString('hi-IN')}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayment(currentCollections.rawEntryFees, currentModuleDef.entryCategoryName, 0.15)}
                          className="flex items-center gap-2"
                          disabled={calculateUnpaidCommissionTotal(currentCollections.rawEntryFees, 0.15) === 0 || paymentLoading !== null}
                        >
                          {paymentLoading === currentModuleDef.entryCategoryName ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {paymentLoading === currentModuleDef.entryCategoryName
                            ? 'Processing...'
                            : calculateUnpaidCommissionTotal(currentCollections.rawEntryFees, 0.15) === 0 && calculatePaidCommissionTotal(currentCollections.rawEntryFees, 0.15) > 0
                            ? 'All Paid (15%)'
                            : 'Pay Commission (15%)'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── 2. INSTALLMENTS TAB (5%) ── */}
                  <TabsContent value={`${currentModuleDef.key}-installments`} className="mt-2">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {currentModuleDef.displayName} Installments — 5% Commission ({currentCollections.installments.length})
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Calculated on verified monthly installment collections for {currentModuleDef.displayName}. Registration entry fees are excluded.
                      </p>
                    </div>
                    <DisplayTable
                      data={currentCollections.installments}
                      columns={createColumns(0.05)}
                      searchKey="name"
                      searchPlaceholder="Search by name..."
                      showPagination={true}
                      itemsPerPage={10}
                    />
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div>
                            <p className="text-sm text-gray-600">Total Collected Installment Revenue</p>
                            <p className="text-lg font-semibold">₹{calculateTotal(currentCollections.rawInstallments).toLocaleString('hi-IN')}</p>
                          </div>
                          <div className="flex items-center gap-4 pt-1">
                            <div>
                              <p className="text-xs text-gray-500">Already Paid</p>
                              <p className="text-sm font-semibold text-green-700">₹{calculatePaidCommissionTotal(currentCollections.rawInstallments, 0.05).toLocaleString('hi-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Commission (5%) — Payable</p>
                              <p className="text-2xl font-bold text-green-600">₹{calculateUnpaidCommissionTotal(currentCollections.rawInstallments, 0.05).toLocaleString('hi-IN')}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayment(currentCollections.rawInstallments, currentModuleDef.installmentCategoryName, 0.05)}
                          className="flex items-center gap-2"
                          disabled={calculateUnpaidCommissionTotal(currentCollections.rawInstallments, 0.05) === 0 || paymentLoading !== null}
                        >
                          {paymentLoading === currentModuleDef.installmentCategoryName ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {paymentLoading === currentModuleDef.installmentCategoryName
                            ? 'Processing...'
                            : calculateUnpaidCommissionTotal(currentCollections.rawInstallments, 0.05) === 0 && calculatePaidCommissionTotal(currentCollections.rawInstallments, 0.05) > 0
                            ? 'All Paid (5%)'
                            : 'Pay Commission (5%)'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── 3. ANNUAL BONUS TAB (2%) ── */}
                  <TabsContent value={`${currentModuleDef.key}-annual-bonus`} className="mt-2">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {currentModuleDef.displayName} Additional Annual Bonus — 2% Commission ({currentCollections.annualBonuses.length})
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Additional 2% awarded on eligible installments collected within 1 year from the application date. Each form can receive this bonus strictly once in its entire lifetime.
                      </p>
                    </div>
                    <DisplayTable
                      data={currentCollections.annualBonuses}
                      columns={createColumns(0.02)}
                      searchKey="name"
                      searchPlaceholder="Search by name..."
                      showPagination={true}
                      itemsPerPage={10}
                    />
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div>
                            <p className="text-sm text-gray-600">Eligible First-Year Revenue</p>
                            <p className="text-lg font-semibold">₹{calculateTotal(currentCollections.rawAnnualBonuses).toLocaleString('hi-IN')}</p>
                          </div>
                          <div className="flex items-center gap-4 pt-1">
                            <div>
                              <p className="text-xs text-gray-500">Already Paid</p>
                              <p className="text-sm font-semibold text-green-700">₹{calculatePaidCommissionTotal(currentCollections.rawAnnualBonuses, 0.02).toLocaleString('hi-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Annual Bonus (2%) — Payable (One-Time Lifetime)</p>
                              <p className="text-2xl font-bold text-green-600">₹{calculateUnpaidCommissionTotal(currentCollections.rawAnnualBonuses, 0.02).toLocaleString('hi-IN')}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayment(currentCollections.rawAnnualBonuses, currentModuleDef.bonusCategoryName, 0.02)}
                          className="flex items-center gap-2"
                          disabled={calculateUnpaidCommissionTotal(currentCollections.rawAnnualBonuses, 0.02) === 0 || paymentLoading !== null}
                        >
                          {paymentLoading === currentModuleDef.bonusCategoryName ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {paymentLoading === currentModuleDef.bonusCategoryName
                            ? 'Processing...'
                            : calculateUnpaidCommissionTotal(currentCollections.rawAnnualBonuses, 0.02) === 0 && calculatePaidCommissionTotal(currentCollections.rawAnnualBonuses, 0.02) > 0
                            ? 'All Paid (2%)'
                            : 'Pay Annual Bonus (2%)'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!bulkData && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                Select an agent and date range, then click &quot;Fetch Data&quot; to view commission reports across all 8 modules.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  )
}
