"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, UserCheck, Shield, Eye, Plus, Edit, Trash2 } from "lucide-react"
import { get, post, API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { RoleGuard } from "@/components/role-guard"
import { 
  AVAILABLE_MODULES, 
  MODULE_DISPLAY_NAMES, 
  ACTION_DISPLAY_NAMES,
  ModulePermission 
} from "@/lib/permissions"

// Modules manageable from this screen (aligned with agent runtime permissions)
const AGENT_RELEVANT_MODULES = AVAILABLE_MODULES.filter(module => 
  [
    "dashboard",
    "applicant_registration", 
    "security_application",
    "payment_management",
    "general_application_payment",
    "insurance_application_payment", 
    "marriage_congratulations_payment",
    "suraksha_bima_yojana_payment",
    "bulk_marriage_emi",
    "bulk_suraksha_bima_emi",
    "mayra_registration",
    "bulk_mayra_emi",
  ].includes(module.module)
).map((module) => ({
  ...module,
  actions: module.actions.filter(Boolean),
}))

interface Agent {
  id: string
  name: string
  employee_id: string
  mobile: string
  village: string
}

interface PermissionMatrix {
  [module: string]: {
    [action: string]: boolean
  }
}

export default function AgentPermissionPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [permissions, setPermissions] = useState<PermissionMatrix>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false)

  // Helper to create a fresh permissions matrix
  const buildInitialPermissions = (): PermissionMatrix => {
    const initialPermissions: PermissionMatrix = {}
    AGENT_RELEVANT_MODULES.forEach(module => {
      initialPermissions[module.module] = {}
      module.actions.forEach(action => {
        initialPermissions[module.module][action] = false
      })
    })
    return initialPermissions
  }

  // Initialize permissions matrix
  useEffect(() => {
    setPermissions(buildInitialPermissions())
  }, [])

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
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
      } else {
        toast.error("Failed to fetch agents")
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error("Error fetching agents")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked
      }
    }))
  }

  const handleSelectAllModule = (module: string, checked: boolean) => {
    const moduleActions = AGENT_RELEVANT_MODULES.find(m => m.module === module)?.actions || []
    setPermissions(prev => ({
      ...prev,
      [module]: moduleActions.reduce((acc, action) => {
        acc[action] = checked
        return acc
      }, {} as { [key: string]: boolean })
    }))
  }

  const handleSelectAllActions = (action: string, checked: boolean) => {
    setPermissions(prev => {
      const newPermissions = { ...prev }
      Object.keys(newPermissions).forEach(module => {
        if (newPermissions[module][action] !== undefined) {
          newPermissions[module][action] = checked
        }
      })
      return newPermissions
    })
  }

  const resetAllPermissions = () => {
    setPermissions(buildInitialPermissions())
  }

  // Fetch and load permissions for selected agent
  useEffect(() => {
    const load = async () => {
      if (!selectedAgent) return
      // Reset to avoid showing previous agent's permissions
      setPermissions(buildInitialPermissions())
      try {
        setIsPermissionsLoading(true)
        const formData = new FormData()
        formData.append('agent_id', selectedAgent)
        const response = await post(
          API_ENDPOINTS.GET_AGENT_PERMISSIONS,
          formData,
        )
        if (response.data?.status) {
          const serverPermissions = response.data.permissions as Array<{ module: string; actions?: string[] }>

          // Build a new permissions map starting from a clean slate
          const nextPermissions = buildInitialPermissions()

          // Create a fast lookup for relevant modules and their allowed actions
          const relevantModuleToActions: Record<string, Set<string>> = {}
          AGENT_RELEVANT_MODULES.forEach(m => {
            relevantModuleToActions[m.module] = new Set(m.actions)
          })

          serverPermissions?.forEach(item => {
            const moduleKey = item.module
            if (!relevantModuleToActions[moduleKey]) return
            const actionsArray = Array.isArray(item.actions) ? item.actions.filter(Boolean) : []

            actionsArray.forEach(action => {
              if (relevantModuleToActions[moduleKey].has(action)) {
                nextPermissions[moduleKey][action] = true
              }
            })
          })

          setPermissions(nextPermissions)
        } else {
          toast.error(response.data?.message || 'Failed to load permissions')
        }
      } catch (error) {
        console.error('Error loading permissions:', error)
        toast.error('Error loading permissions')
      } finally {
        setIsPermissionsLoading(false)
      }
    }

    load()
  }, [selectedAgent])

  const handleSavePermissions = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent first")
      return
    }

    try {
      setIsSaving(true)
      
      // Send every relevant module so unchecked permissions are cleared in DB
      const permissionsData: ModulePermission[] = AGENT_RELEVANT_MODULES.map(({ module, actions }) => ({
        module,
        actions: actions.filter((action) => permissions[module]?.[action]),
      }))

      const response = await post(
        API_ENDPOINTS.SET_AGENT_PERMISSIONS,
        {
          agent_id: selectedAgent,
          permissions: permissionsData,
        },
      )

      if (response.data.status) {
        toast.success("Permissions saved successfully!")
      } else {
        toast.error(response.data.message || "Failed to save permissions")
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error("Error saving permissions. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const getSelectedAgent = () => {
    return agents.find(agent => agent.id.toString() === selectedAgent)
  }

  const getTotalPermissions = () => {
    let total = 0
    let granted = 0
    
    Object.values(permissions).forEach(moduleActions => {
      Object.values(moduleActions).forEach(enabled => {
        total++
        if (enabled) granted++
      })
    })
    
    return { total, granted }
  }

  const { total, granted } = getTotalPermissions()

  return (
    <RoleGuard requiredModule="agent_permission" requiredAction="view">
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Permission Management</h1>
          <p className="text-gray-600 mt-2">Assign and manage permissions for foundation agents</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {granted} / {total} permissions granted
          </Badge>
        </div>
      </div>

      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Select Agent
          </CardTitle>
          <CardDescription>
            Choose an agent to assign permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    No agents found
                  </div>
                ) : (
                  agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-sm text-gray-500">
                          {agent.employee_id} • {agent.mobile}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {selectedAgent && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>•</span>
                  <span>{getSelectedAgent()?.village}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAgents}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <Loader2 className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Matrix
            </CardTitle>
            <CardDescription>
              Configure permissions for {getSelectedAgent()?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Global Action Controls */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                <div className="flex items-center gap-2">
                  {["view", "create", "update", "delete"].map(action => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAllActions(action, true)}
                      className="text-xs"
                    >
                      Select All {ACTION_DISPLAY_NAMES[action]}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAllPermissions}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Permissions Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 grid grid-cols-6 gap-4 p-4 border-b">
                  <div className="font-medium text-gray-900">Module</div>
                  <div className="font-medium text-gray-900 text-center">View</div>
                  <div className="font-medium text-gray-900 text-center">Create</div>
                  <div className="font-medium text-gray-900 text-center">Update</div>
                  <div className="font-medium text-gray-900 text-center">Delete</div>
                  <div className="font-medium text-gray-900 text-center">Actions</div>
                </div>
                
                {AGENT_RELEVANT_MODULES.map((module, index) => (
                  <div key={module.module} className={`grid grid-cols-6 gap-4 p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {MODULE_DISPLAY_NAMES[module.module]}
                      </span>
                    </div>
                    
                    {["view", "create", "update", "delete"].map(action => (
                      <div key={action} className="flex items-center justify-center">
                        {module.actions.includes(action) ? (
                          <Checkbox
                            checked={permissions[module.module]?.[action] || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(module.module, action, checked as boolean)
                            }
                            className="data-[state=checked]:bg-blue-600"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllModule(module.module, true)}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Permissions
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedAgent && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="font-medium text-blue-900">Getting Started</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Select an agent from the dropdown above to begin assigning permissions. 
                  You can grant access to view, create, update, and delete records for different modules 
                  based on the agent's role and responsibilities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RoleGuard>
  )
}
