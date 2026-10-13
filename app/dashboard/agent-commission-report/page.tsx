"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, FileBarChart, Users } from "lucide-react"
import { agentRegistrationAPI, createFormData, post } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { RoleGuard } from "@/components/role-guard"
import { isAgent, getAgentData } from "@/lib/permissions"

// Dynamically import DisplayTable to reduce initial bundle size
const DisplayTable = dynamic(
  () => import("@/components/display-table").then((mod) => ({ default: mod.DisplayTable })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
)

// Types for API responses
interface Agent {
  id: string
  date: string
  agentNumber: string
  name: string
  fatherName: string
  gotra: string
  age: number
  village: string
  address: string
  tehsil: string
  district: string
  mobile: string
  aadhaar: string
  bankName: string
  accountNumber: string
  ifsc: string
  nomineeName: string
  nomineeMobile: string
  nomineeRelation: string
  workArea: string
  gender: string
  password: string
  doj: string
  designation: string
  employee_id: string
  profile_image: string
}

interface PaymentDetails {
  id: string
  agentId: string
  startDate: string
  endDate: string
  amount: string
  paymentDate?: string
  category?: string
  scheme?: string
  commissionType?: string
  rate?: number
  eligibleRevenue?: number
  status?: string
}

interface PaymentDetailsResponse {
  success: boolean
  payments: PaymentDetails[]
}

const SCHEME_FILTERS = [
  { value: "all", label: "All Schemes / सभी योजनाएं" },
  { value: "GENERAL_MARRIAGE", label: "General Marriage / सामान्य विवाह" },
  { value: "MAYRA", label: "Mayra Scheme / मायरा योजना" },
  { value: "INSURANCE_BIMA", label: "Insurance (Suraksha Bima) / सुरक्षा बीमा" },
  { value: "JANNI_DELIVERY", label: "Janni Delivery / जननी प्रसूति" },
  { value: "AAWAS", label: "Aawas (Home) / आवास योजना" },
  { value: "LADO_BAHIN", label: "Lado Bahin / लाडो बहिन" },
  { value: "DHUNDHOTSAV", label: "Dhundhotsav / ढूंढोत्सव" },
  { value: "SHUBH_LAXMI", label: "Shubh Laxmi / शुभलक्ष्मी" },
]

const COMMISSION_TYPE_FILTERS = [
  { value: "all", label: "All Types / सभी प्रकार" },
  { value: "ENTRY_FEE", label: "Entry Fee (15%) / प्रवेश शुल्क" },
  { value: "INSTALLMENT", label: "Installment (5%) / किस्त कमिशन" },
  { value: "ANNUAL_BONUS", label: "Annual Bonus (2%) / वार्षिक बोनस" },
]

// Column definitions for payment details table
const paymentColumns = [
  {
    key: "paymentDate",
    label: "Payment Date",
    render: (value: string) => (
      <span className="font-medium">
        {value ? formatDate(value) : "—"}
      </span>
    ),
  },
  {
    key: "category",
    label: "Category / Scheme",
    render: (value: string, item: any) => {
      const schemeLabel = item.scheme ? `[${item.scheme.replace(/_/g, " ")}] ` : ""
      return (
        <span className="font-medium text-blue-600">
          {value || `${schemeLabel}${item.commissionType || "Commission"}` || "General Commission"}
        </span>
      )
    },
  },
  {
    key: "startDate",
    label: "Period",
    render: (value: string, item: any) => (
      <span className="text-xs text-gray-700">
        {formatDate(value)} to {item.endDate ? formatDate(item.endDate) : "—"}
      </span>
    ),
  },
  {
    key: "rate",
    label: "Rate",
    render: (value: number) => (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
        {value !== undefined ? `${Math.round(Number(value) * 100)}%` : "—"}
      </span>
    ),
  },
  {
    key: "eligibleRevenue",
    label: "Eligible Revenue",
    render: (value: number) => {
      const num = Number(value)
      return (
        <span className="text-sm text-gray-700">
          {Number.isFinite(num) && num > 0 ? `₹${num.toLocaleString('en-IN')}` : "—"}
        </span>
      )
    },
  },
  {
    key: "amount",
    label: "Paid Commission",
    render: (value: string) => {
      const num = Number(value)
      return (
        <span className="font-semibold text-green-600">
          ₹{Number.isFinite(num) ? num.toLocaleString('en-IN') : "0"}
        </span>
      )
    },
  },
  {
    key: "status",
    label: "Status",
    render: (value: string) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        {value || "Paid"}
      </span>
    ),
  },
]

function AgentCommissionReportContent() {
  const searchParams = useSearchParams()
  const urlAgentId = searchParams?.get("agentId")

  // State for agents
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [isAgentUser, setIsAgentUser] = useState(false)

  // Filtering states
  const [schemeFilter, setSchemeFilter] = useState<string>("all")
  const [commissionTypeFilter, setCommissionTypeFilter] = useState<string>("all")

  // State for payment details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  // Fetch agents on component mount
  useEffect(() => {
    const agentMode = isAgent()
    setIsAgentUser(agentMode)

    if (agentMode) {
      const currentAgent = getAgentData()
      if (currentAgent?.id) {
        setSelectedAgentId(String(currentAgent.id))
        setSelectedAgent({
          id: String(currentAgent.id),
          name: currentAgent.name || "Logged-in Agent",
          employee_id: currentAgent.employee_id || currentAgent.agentNumber || "",
          mobile: currentAgent.mobile || "",
          village: currentAgent.village || "",
          fatherName: currentAgent.fatherName || "",
          gotra: currentAgent.gotra || "",
          age: currentAgent.age || 0,
          address: currentAgent.address || "",
          tehsil: currentAgent.tehsil || "",
          district: currentAgent.district || "",
          aadhaar: currentAgent.aadhaar || "",
          bankName: currentAgent.bankName || "",
          accountNumber: currentAgent.accountNumber || "",
          ifsc: currentAgent.ifsc || "",
          nomineeName: currentAgent.nomineeName || "",
          nomineeMobile: currentAgent.nomineeMobile || "",
          nomineeRelation: currentAgent.nomineeRelation || "",
          workArea: currentAgent.workArea || "",
          gender: currentAgent.gender || "",
          password: "",
          doj: currentAgent.doj || "",
          designation: currentAgent.designation || "",
          profile_image: currentAgent.profile_image || "",
          date: currentAgent.date || "",
          agentNumber: currentAgent.agentNumber || "",
        })
      }
    }

    fetchAgents(agentMode)
  }, [])

  // Fetch agents from API
  const fetchAgents = async (agentMode = false) => {
    setLoadingAgents(true)
    try {
      const response = await agentRegistrationAPI.getAll()

      if (response.status && response.data) {
        let loadedAgents: Agent[] = response.data
        if (agentMode) {
          const currentAgent = getAgentData()
          const currentAgentId = currentAgent?.id ? String(currentAgent.id) : ""
          const filtered = response.data.filter((a) => String(a.id) === currentAgentId)
          if (filtered.length > 0) {
            loadedAgents = filtered
            setAgents(filtered)
            setSelectedAgent(filtered[0])
            setSelectedAgentId(String(filtered[0].id))
            fetchPaymentDetails(String(filtered[0].id))
            return
          }
        }

        setAgents(loadedAgents)

        // If URL has agentId parameter, auto-select and fetch
        if (urlAgentId) {
          const target = loadedAgents.find((a) => String(a.id) === urlAgentId)
          if (target) {
            setSelectedAgent(target)
            setSelectedAgentId(String(target.id))
            fetchPaymentDetails(String(target.id))
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch agents')
      }
    } catch (error: any) {
      console.error('Error fetching agents:', error)
      toast.error(error.message || "Failed to fetch agents")
      setAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }

  // Handle agent selection
  const handleAgentSelection = (agentId: string) => {
    setSelectedAgentId(agentId)
    const agent = agents.find((a) => a.id === agentId)
    setSelectedAgent(agent || null)
    // Clear previous payment details
    setPaymentDetails([])
  }

  // Fetch payment details for selected agent
  const fetchPaymentDetails = async (agentIdOverride?: string) => {
    const targetAgentId = agentIdOverride || selectedAgentId
    if (!targetAgentId) {
      toast.error("Please select an agent first")
      return
    }

    setLoadingPayments(true)
    try {
      const formData = createFormData({ agentId: targetAgentId })

      const response = await post('?apicall=getAgentPaymentsForDetails', formData)
      const data: PaymentDetailsResponse = response.data

      if (data.success) {
        setPaymentDetails(data.payments || [])
        toast.success("Payment details fetched successfully!")
      } else {
        throw new Error('Failed to fetch payment details')
      }
    } catch (error: any) {
      console.error('Error fetching payment details:', error)
      toast.error(error.message || "Failed to fetch payment details")
      setPaymentDetails([])
    } finally {
      setLoadingPayments(false)
    }
  }

  // Filter payment details based on UI filters
  const filteredPayments = useMemo(() => {
    return paymentDetails.filter((p) => {
      if (schemeFilter !== "all") {
        const cat = (p.category || "").toLowerCase()
        const sc = (p.scheme || "").toLowerCase()
        const sf = schemeFilter.toLowerCase()
        const matches = sc.includes(sf) || cat.includes(sf.replace(/_/g, " ")) || (sf === "general_marriage" && cat.includes("marriage"))
        if (!matches) return false
      }

      if (commissionTypeFilter !== "all") {
        const cat = (p.category || "").toLowerCase()
        const ct = (p.commissionType || "").toLowerCase()
        const ctf = commissionTypeFilter.toLowerCase()
        if (ctf === "entry_fee") {
          if (!ct.includes("entry") && !cat.includes("entry")) return false
        } else if (ctf === "annual_bonus") {
          if (!ct.includes("bonus") && !cat.includes("bonus")) return false
        } else if (ctf === "installment") {
          if (ct.includes("entry") || cat.includes("entry") || ct.includes("bonus") || cat.includes("bonus")) return false
        }
      }

      return true
    })
  }, [paymentDetails, schemeFilter, commissionTypeFilter])

  // Calculate total amount
  const calculateTotal = () => {
    return filteredPayments.reduce((total, payment) => {
      const val = Number(payment.amount)
      return total + (Number.isFinite(val) ? val : 0)
    }, 0)
  }

  // Show loading state while fetching initial data
  if (loadingAgents && agents.length === 0) {
    return (
      <RoleGuard requiredModule="agent_commission_report" requiredAction="view">
        <div className="p-2 sm:p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading agent commission report...</p>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard requiredModule="agent_commission_report" requiredAction="view">
      <div className="p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-6">
          <FileBarChart className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Agent Commission Report / एजेंट कमिशन रिपोर्ट
          </h1>
        </div>

        {/* Agent Selection Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Agent &amp; Filters
            </CardTitle>
            <CardDescription>
              {isAgentUser
                ? "Your agent profile is selected below"
                : "Choose an agent and optional filters to view their verified commission disbursement history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Agent Selection Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="agent">Agent *</Label>
                {loadingAgents ? (
                  <div className="flex items-center gap-2 p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading agents...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedAgentId}
                    onValueChange={handleAgentSelection}
                    disabled={isAgentUser}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.employee_id}) - {agent.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Module Filter */}
              <div className="space-y-2">
                <Label htmlFor="schemeFilter">Scheme / Module</Label>
                <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                  <SelectTrigger id="schemeFilter">
                    <SelectValue placeholder="All Schemes" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_FILTERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Commission Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="commTypeFilter">Commission Type</Label>
                <Select value={commissionTypeFilter} onValueChange={setCommissionTypeFilter}>
                  <SelectTrigger id="commTypeFilter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_TYPE_FILTERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Report Button */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  onClick={() => fetchPaymentDetails()}
                  disabled={!selectedAgentId || loadingPayments}
                  className="w-full flex items-center gap-2"
                >
                  {loadingPayments ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileBarChart className="h-4 w-4" />
                  )}
                  {loadingPayments ? "Loading Report..." : "Show Report"}
                </Button>
              </div>
            </div>

            {/* Selected Agent Details */}
            {selectedAgent && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Selected Agent Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedAgent.name}
                  </div>
                  <div>
                    <span className="font-medium">Employee ID:</span> {selectedAgent.employee_id}
                  </div>
                  <div>
                    <span className="font-medium">Mobile:</span> {selectedAgent.mobile}
                  </div>
                  <div>
                    <span className="font-medium">Village:</span> {selectedAgent.village}
                  </div>
                  <div>
                    <span className="font-medium">Work Area:</span> {selectedAgent.workArea}
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span> {selectedAgent.gender}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Table */}
        {paymentDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Disbursed Commission Records</CardTitle>
              <CardDescription>
                Verified historical commission payouts for {selectedAgent?.name} across all modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisplayTable
                data={filteredPayments}
                columns={paymentColumns}
                searchKey="startDate"
                searchPlaceholder="Search by period..."
                showPagination={true}
                itemsPerPage={10}
              />

              {/* Total Amount Summary */}
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-green-700">Total Disbursed Commission Amount</p>
                    <p className="text-2xl font-bold text-green-800">
                      ₹{calculateTotal().toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>Matching Payment Records: {filteredPayments.length} of {paymentDetails.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!paymentDetails.length && !loadingPayments && selectedAgentId && (
          <Card>
            <CardContent className="text-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Details Found</h3>
              <p className="text-muted-foreground mb-4">
                No commission payment records found for the selected agent.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!selectedAgentId && !loadingAgents && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select an Agent</h3>
              <p className="text-muted-foreground mb-4">
                Choose an agent from the dropdown above to view their commission payment details.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  )
}

export default function AgentCommissionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AgentCommissionReportContent />
    </Suspense>
  )
}
