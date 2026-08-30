"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, FileBarChart, Users } from "lucide-react"
import { agentRegistrationAPI, agentCommissionAPI, createFormData, post } from "@/lib/api"
import { formatDate } from "@/lib/utils"

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

interface AgentsResponse {
  status: boolean
  message: string
  data: Agent[]
}

interface PaymentDetails {
  id: string
  agentId: string
  startDate: string
  endDate: string
  amount: string
  paymentDate?: string
}

interface PaymentDetailsResponse {
  success: boolean
  payments: PaymentDetails[]
}

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
    key: "startDate",
    label: "Start Date",
    render: (value: string) => (
      <span className="font-medium">
        {formatDate(value)}
      </span>
    ),
  },
  {
    key: "endDate", 
    label: "End Date",
    render: (value: string) => (
      <span className="font-medium">
        {formatDate(value)}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    render: (value: string) => (
      <span className="font-semibold text-green-600">
        ₹{parseFloat(value).toLocaleString('en-IN')}
      </span>
    ),
  },
]

export default function AgentCommissionReportPage() {
  // State for agents
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(false)
  
  // State for payment details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents()
  }, [])

  // Fetch agents from API
  const fetchAgents = async () => {
    setLoadingAgents(true)
    try {
      const response = await agentRegistrationAPI.getAll()
      
      if (response.status && response.data) {
        setAgents(response.data)
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
  const fetchPaymentDetails = async () => {
    if (!selectedAgentId) {
      toast.error("Please select an agent first")
      return
    }

    setLoadingPayments(true)
    try {
      // Note: The API returns a different structure, so we'll use direct fetch for now
      const formData = createFormData({ agentId: selectedAgentId })
      
      const response = await post('?apicall=getAgentPaymentsForDetails', formData)
      const data: PaymentDetailsResponse = response.data

      if (data.success) {
        setPaymentDetails(data.payments)
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

  // Calculate total amount
  const calculateTotal = () => {
    return paymentDetails.reduce((total, payment) => total + parseFloat(payment.amount), 0)
  }

  // Show loading state while fetching initial data
  if (loadingAgents && agents.length === 0) {
    return (
      <div className="p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading agent commission report...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
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
            Select Agent
          </CardTitle>
          <CardDescription>
            Choose an agent to view their commission payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Selection Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="agent">Agent *</Label>
              {loadingAgents ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading agents...</span>
                </div>
              ) : (
                <Select value={selectedAgentId} onValueChange={handleAgentSelection}>
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

            {/* Show Report Button */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={fetchPaymentDetails}
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
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Commission payment history for {selectedAgent?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DisplayTable
              data={paymentDetails}
              columns={paymentColumns}
              searchKey="startDate"
              searchPlaceholder="Search by period..."
              showPagination={true}
              itemsPerPage={10}
            />
            
            {/* Total Amount Summary */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-green-700">Total Commission Amount</p>
                  <p className="text-2xl font-bold text-green-800">
                    ₹{calculateTotal().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-sm text-green-700">
                  <p>Total Payments: {paymentDetails.length}</p>
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
  )
}
