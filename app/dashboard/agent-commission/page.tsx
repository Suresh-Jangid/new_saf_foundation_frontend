"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Search, FileBarChart, CreditCard } from "lucide-react"
import { post, get, API_ENDPOINTS } from "@/lib/api"
import { GENDER } from "@/lib/form-values"

interface Agent {
  id: string
  name: string
  employee_id: string
  mobile: string
  village: string
}

// Types for API response
interface BulkDataItem {
  id: string
  date: string
  formNo: string
  name: string
  amount: number
  payment_mode: string
}

interface BulkDataResponse {
  success: boolean
  applications: BulkDataItem[]
  application_installments: BulkDataItem[]
  insurances: BulkDataItem[]
  insurance_installments: BulkDataItem[]
}

// Column definitions for data tables
const createColumns = (type: string) => [
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
        {value}
      </span>
    ),
  },
  {
    key: "name",
    label: "Name",
    render: (value: string) => (
      <span className="font-medium">{value}</span>
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
    label: "Amount",
    render: (value: number) => (
      <span className="font-semibold text-green-600">
        ₹{value?.toLocaleString('hi-IN')}
      </span>
    ),
  },
]

export default function BulkDataReportPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [addedById, setAddedById] = useState<string>("")
  const [gender, setGender] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  
  // State for data
  const [bulkData, setBulkData] = useState<BulkDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("general-applications")

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
      
      // Start and end dates are now required, so they will always be present
      const formattedStartDate = convertToYYYYMMDD(startDate)
      formData.append('startDate', formattedStartDate)
      
      const formattedEndDate = convertToYYYYMMDD(endDate)
      formData.append('endDate', formattedEndDate)

      const response = await post('?apicall=getAllBulkData', formData)

      const data: BulkDataResponse = response.data

      if (data.success) {
        setBulkData(data)
        toast.success("Data fetched successfully!")
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
    setStartDate(undefined)
    setEndDate(undefined)
    setBulkData(null)
  }

  // Calculate total amount for a data array
  const calculateTotal = (data: BulkDataItem[]) => {
    return data.reduce((total, item) => total + item.amount, 0)
  }

  // Calculate 10% commission of the total amount
  const calculateCommissionTotal = (data: BulkDataItem[]) => {
    const totalAmount = calculateTotal(data)
    return Math.round(totalAmount * 0.10)
  }

  // Handle payment
  const handlePayment = async (data: BulkDataItem[], type: string) => {
    const commissionTotal = calculateCommissionTotal(data)
    if (commissionTotal === 0) {
      toast.error("No amount to pay")
      return
    }

    if (!addedById) {
      toast.error("Agent is required for payment")
      return
    }

    setPaymentLoading(type)
    try {
      const formData = new FormData()
      formData.append('agentId', addedById)
      formData.append('amount', commissionTotal.toString())
      
      // Add date range if available
      if (startDate) {
        const formattedStartDate = convertToYYYYMMDD(startDate)
        formData.append('startDate', formattedStartDate)
      }
      
      if (endDate) {
        const formattedEndDate = convertToYYYYMMDD(endDate)
        formData.append('endDate', formattedEndDate)
      }

      const response = await post('?apicall=addAgentPaymentForDetails', formData)

      const result = response.data

      if (result.success) {
        toast.success(`Payment of ₹${commissionTotal.toLocaleString('hi-IN')} processed successfully for ${type}`)
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

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-6">
        <FileBarChart className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
           Agent Commision Report / एजेंट कमिशन रिपोर्ट 
        </h1>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter bulk data by agent, gender, and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
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

      {/* Data Tabs */}
      {bulkData && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Data Results</CardTitle>
            <CardDescription>
              View data across different categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
                <TabsTrigger 
                  value="general-applications"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto whitespace-normal text-center"
                >
                  General Marriage Applications
                  <span className="block text-xs text-muted-foreground">
                    ({bulkData.applications.length})
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="general-installments"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto whitespace-normal text-center"
                >
                  General Installments
                  <span className="block text-xs text-muted-foreground">
                    ({bulkData.application_installments.length})
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="insurance-applications"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto whitespace-normal text-center"
                >
                  Insurance Bima Applications
                  <span className="block text-xs text-muted-foreground">
                    ({bulkData.insurances.length})
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="insurance-installments"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto whitespace-normal text-center"
                >
                  Insurance Installments
                  <span className="block text-xs text-muted-foreground">
                    ({bulkData.insurance_installments.length})
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* General Marriage Applications Tab */}
              <TabsContent value="general-applications" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    General Marriage Applications ({bulkData.applications.length})
                  </h3>
                </div>
                <DisplayTable
                  data={bulkData.applications}
                  columns={createColumns("applications")}
                  searchKey="name"
                  searchPlaceholder="Search by name..."
                  showPagination={true}
                  itemsPerPage={10}
                />
                {/* Total and Pay Button */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-semibold">₹{calculateTotal(bulkData.applications).toLocaleString('hi-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Commission (10%) - Payable</p>
                        <p className="text-2xl font-bold text-green-600">₹{calculateCommissionTotal(bulkData.applications).toLocaleString('hi-IN')}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment(bulkData.applications, 'General Marriage Applications')}
                      className="flex items-center gap-2"
                      disabled={calculateCommissionTotal(bulkData.applications) === 0 || paymentLoading !== null}
                    >
                      {paymentLoading === 'General Marriage Applications' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {paymentLoading === 'General Marriage Applications' ? 'Processing...' : 'Pay Commission'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* General Marriage Application Installments Tab */}
              <TabsContent value="general-installments" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    General Marriage Application Installments ({bulkData.application_installments.length})
                  </h3>
                </div>
                <DisplayTable
                  data={bulkData.application_installments}
                  columns={createColumns("installments")}
                  searchKey="name"
                  searchPlaceholder="Search by name..."
                  showPagination={true}
                  itemsPerPage={10}
                />
                {/* Total and Pay Button */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-semibold">₹{calculateTotal(bulkData.application_installments).toLocaleString('hi-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Commission (10%) - Payable</p>
                        <p className="text-2xl font-bold text-green-600">₹{calculateCommissionTotal(bulkData.application_installments).toLocaleString('hi-IN')}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment(bulkData.application_installments, 'General Installments')}
                      className="flex items-center gap-2"
                      disabled={calculateCommissionTotal(bulkData.application_installments) === 0 || paymentLoading !== null}
                    >
                      {paymentLoading === 'General Installments' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {paymentLoading === 'General Installments' ? 'Processing...' : 'Pay Commission'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Insurance Bima Applications Tab */}
              <TabsContent value="insurance-applications" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    Insurance Bima Applications ({bulkData.insurances.length})
                  </h3>
                </div>
                <DisplayTable
                  data={bulkData.insurances}
                  columns={createColumns("insurances")}
                  searchKey="name"
                  searchPlaceholder="Search by name..."
                  showPagination={true}
                  itemsPerPage={10}
                />
                {/* Total and Pay Button */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-semibold">₹{calculateTotal(bulkData.insurances).toLocaleString('hi-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Commission (10%) - Payable</p>
                        <p className="text-2xl font-bold text-green-600">₹{calculateCommissionTotal(bulkData.insurances).toLocaleString('hi-IN')}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment(bulkData.insurances, 'Insurance Bima Applications')}
                      className="flex items-center gap-2"
                      disabled={calculateCommissionTotal(bulkData.insurances) === 0 || paymentLoading !== null}
                    >
                      {paymentLoading === 'Insurance Bima Applications' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {paymentLoading === 'Insurance Bima Applications' ? 'Processing...' : 'Pay Commission'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Insurance Bima Application Installments Tab */}
              <TabsContent value="insurance-installments" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    Insurance Bima Application Installments ({bulkData.insurance_installments.length})
                  </h3>
                </div>
                <DisplayTable
                  data={bulkData.insurance_installments}
                  columns={createColumns("installments")}
                  searchKey="name"
                  searchPlaceholder="Search by name..."
                  showPagination={true}
                  itemsPerPage={10}
                />
                {/* Total and Pay Button */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-semibold">₹{calculateTotal(bulkData.insurance_installments).toLocaleString('hi-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Commission (10%) - Payable</p>
                        <p className="text-2xl font-bold text-green-600">₹{calculateCommissionTotal(bulkData.insurance_installments).toLocaleString('hi-IN')}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePayment(bulkData.insurance_installments, 'Insurance Installments')}
                      className="flex items-center gap-2"
                      disabled={calculateCommissionTotal(bulkData.insurance_installments) === 0 || paymentLoading !== null}
                    >
                      {paymentLoading === 'Insurance Installments' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {paymentLoading === 'Insurance Installments' ? 'Processing...' : 'Pay Commission'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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
              Select an agent and date range, then click &quot;Fetch Data&quot; to view commission reports
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
