"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, UserCheck, Shield, CheckCheck, XCircle, RotateCcw } from "lucide-react"
import { get, API_ENDPOINTS, getAgentPermissions, updateAgentPermissions, AgentPermissionUpdateItem } from "@/lib/api"
import { toast } from "sonner"
import { RoleGuard } from "@/components/role-guard"
import { 
  AGENT_MANAGEABLE_MODULES, 
  ACTION_DISPLAY_NAMES,
  resolveCanonicalModule,
  isAdmin,
  PermissionAction,
  VALID_ACTIONS
} from "@/lib/permissions"

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

  const isUserAdmin = isAdmin()

  // Helper to create a fresh empty permissions matrix based on canonical agent-manageable catalog
  const buildInitialPermissions = (): PermissionMatrix => {
    const initialPermissions: PermissionMatrix = {}
    AGENT_MANAGEABLE_MODULES.forEach(module => {
      initialPermissions[module.module] = {}
      module.allowedActions.forEach(action => {
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
      console.error("Error fetching agents:", error)
      toast.error("Error fetching agents")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle individual checkbox change
  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked,
      },
    }))
  }

  // Reversible Select/Deselect All for a specific module
  const isModuleAllSelected = (module: string): boolean => {
    const modDef = AGENT_MANAGEABLE_MODULES.find(m => m.module === module)
    if (!modDef) return false
    return modDef.allowedActions.every(action => Boolean(permissions[module]?.[action]))
  }

  const handleToggleSelectModule = (module: string) => {
    const modDef = AGENT_MANAGEABLE_MODULES.find(m => m.module === module)
    if (!modDef) return
    const currentlyAll = isModuleAllSelected(module)
    const targetState = !currentlyAll

    setPermissions(prev => ({
      ...prev,
      [module]: modDef.allowedActions.reduce((acc, action) => {
        acc[action] = targetState
        return acc
      }, {} as { [key: string]: boolean }),
    }))
  }

  // Reversible Select/Deselect All for a specific action across all eligible modules
  const isActionAllSelected = (action: string): boolean => {
    const eligibleModules = AGENT_MANAGEABLE_MODULES.filter(m => m.allowedActions.includes(action as PermissionAction))
    if (eligibleModules.length === 0) return false
    return eligibleModules.every(m => Boolean(permissions[m.module]?.[action]))
  }

  const handleToggleSelectAction = (action: string) => {
    const eligibleModules = AGENT_MANAGEABLE_MODULES.filter(m => m.allowedActions.includes(action as PermissionAction))
    if (eligibleModules.length === 0) return
    const currentlyAll = isActionAllSelected(action)
    const targetState = !currentlyAll

    setPermissions(prev => {
      const next = { ...prev }
      eligibleModules.forEach(m => {
        next[m.module] = {
          ...next[m.module],
          [action]: targetState,
        }
      })
      return next
    })
  }

  // Clear all permissions
  const handleClearAll = () => {
    setPermissions(buildInitialPermissions())
    toast.info("Cleared all permission selections (Save to synchronize)")
  }

  // Select all permissions across entire matrix
  const handleSelectAllMatrix = () => {
    const allPermissions: PermissionMatrix = {}
    AGENT_MANAGEABLE_MODULES.forEach(module => {
      allPermissions[module.module] = {}
      module.allowedActions.forEach(action => {
        allPermissions[module.module][action] = true
      })
    })
    setPermissions(allPermissions)
    toast.info("Selected all available permissions (Save to synchronize)")
  }

  // Fetch and load permissions for selected agent using Modern REST API
  useEffect(() => {
    const load = async () => {
      if (!selectedAgent) return
      setPermissions(buildInitialPermissions())

      try {
        setIsPermissionsLoading(true)
        // Modern REST endpoint: GET /api/v1/agents/:id/permissions
        const response = await getAgentPermissions(selectedAgent)

        if (response.success && Array.isArray(response.data)) {
          const nextPermissions = buildInitialPermissions()
          const rows = response.data

          // Create lookup of allowed actions for fast matching
          const allowedLookup = new Map<string, Set<string>>()
          AGENT_MANAGEABLE_MODULES.forEach(m => {
            allowedLookup.set(m.module, new Set(m.allowedActions))
          })

          rows.forEach((row: any) => {
            const canonicalMod = resolveCanonicalModule(row.module)
            const allowedSet = allowedLookup.get(canonicalMod)
            if (!allowedSet) return

            // Support either row.actions array or boolean flags
            if (Array.isArray(row.actions)) {
              row.actions.forEach((act: string) => {
                if (allowedSet.has(act)) {
                  nextPermissions[canonicalMod][act] = true
                }
              })
            } else {
              if (row.canView && allowedSet.has("view")) nextPermissions[canonicalMod]["view"] = true
              if (row.canCreate && allowedSet.has("create")) nextPermissions[canonicalMod]["create"] = true
              if (row.canUpdate && allowedSet.has("update")) nextPermissions[canonicalMod]["update"] = true
              if (row.canDelete && allowedSet.has("delete")) nextPermissions[canonicalMod]["delete"] = true
            }
          })

          setPermissions(nextPermissions)
        } else {
          toast.error(response.message || "Failed to load agent permissions")
        }
      } catch (error: any) {
        console.error("Error loading agent permissions:", error)
        toast.error(error?.response?.data?.message || "Error loading agent permissions")
      } finally {
        setIsPermissionsLoading(false)
      }
    }

    load()
  }, [selectedAgent])

  // Save permissions using Modern REST API: PUT /api/v1/agents/:id/permissions
  const handleSavePermissions = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent first")
      return
    }

    if (!isUserAdmin) {
      toast.error("Access Denied: Only administrators can update agent permissions.")
      return
    }

    try {
      setIsSaving(true)

      // Build safe full-synchronization payload covering all canonical manageable modules
      const permissionsData: AgentPermissionUpdateItem[] = AGENT_MANAGEABLE_MODULES.map(({ module, allowedActions }) => {
        const canView = allowedActions.includes("view") ? Boolean(permissions[module]?.["view"]) : false
        const canCreate = allowedActions.includes("create") ? Boolean(permissions[module]?.["create"]) : false
        const canUpdate = allowedActions.includes("update") ? Boolean(permissions[module]?.["update"]) : false
        const canDelete = allowedActions.includes("delete") ? Boolean(permissions[module]?.["delete"]) : false
        const activeActions = allowedActions.filter(a => permissions[module]?.[a])

        return {
          module,
          canView,
          canCreate,
          canUpdate,
          canDelete,
          actions: activeActions,
        }
      })

      // Modern REST endpoint: PUT /api/v1/agents/:id/permissions
      const response = await updateAgentPermissions(selectedAgent, permissionsData)

      if (response.success) {
        toast.success("Agent permissions synchronized successfully!")
      } else {
        toast.error(response.message || "Failed to synchronize permissions")
      }
    } catch (error: any) {
      console.error("Error saving agent permissions:", error)
      toast.error(error?.response?.data?.message || "Error saving permissions. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const getSelectedAgent = () => {
    return agents.find(agent => agent.id.toString() === selectedAgent)
  }

  // Dynamic statistics: granted / total
  const { total, granted } = useMemo(() => {
    let totalCount = 0
    let grantedCount = 0

    AGENT_MANAGEABLE_MODULES.forEach(mod => {
      mod.allowedActions.forEach(action => {
        totalCount++
        if (permissions[mod.module]?.[action]) {
          grantedCount++
        }
      })
    })

    return { total: totalCount, granted: grantedCount }
  }, [permissions])

  return (
    <RoleGuard requiredRoles={["admin"]}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Permission Management</h1>
            <p className="text-gray-600 mt-2">
              Canonical Role-Based Access Control matrix for SAF Foundation agents ({AGENT_MANAGEABLE_MODULES.length} modules)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
              {granted} / {total} permissions granted
            </Badge>
          </div>
        </div>

        {/* Agent Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Select Agent
            </CardTitle>
            <CardDescription>
              Choose a registered foundation agent to view and configure operational permissions
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
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{agent.name}</span>
                          <span className="text-xs text-gray-500">
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
                    <span>{getSelectedAgent()?.village || "No village specified"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAgents}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <Loader2 className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh Agents
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        {selectedAgent && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Canonical Permission Matrix
                </CardTitle>
                <CardDescription>
                  Configure granular permissions for {getSelectedAgent()?.name} ({getSelectedAgent()?.employee_id})
                </CardDescription>
              </div>
              {isPermissionsLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronizing permissions...
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Global Quick Action Controls */}
                <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-700">Action Controls (Reversible):</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSelectAllMatrix}
                        className="text-xs"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-600" />
                        Select All Matrix
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {VALID_ACTIONS.map(action => {
                      const allSelected = isActionAllSelected(action)
                      return (
                        <Button
                          key={action}
                          variant={allSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleSelectAction(action)}
                          className={`text-xs ${allSelected ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                        >
                          {allSelected ? `Deselect All ${ACTION_DISPLAY_NAMES[action]}` : `Select All ${ACTION_DISPLAY_NAMES[action]}`}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Permissions Table */}
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-100 grid grid-cols-12 gap-2 p-3 font-semibold text-gray-900 border-b text-sm">
                    <div className="col-span-5 flex items-center">Module / योजना</div>
                    <div className="col-span-1 text-center">View</div>
                    <div className="col-span-1 text-center">Create</div>
                    <div className="col-span-1 text-center">Update</div>
                    <div className="col-span-1 text-center">Delete</div>
                    <div className="col-span-4 text-center">Module Controls</div>
                  </div>
                  
                  {AGENT_MANAGEABLE_MODULES.map((module, index) => {
                    const allSelected = isModuleAllSelected(module.module)
                    return (
                      <div 
                        key={module.module} 
                        className={`grid grid-cols-12 gap-2 p-3 items-center border-b last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}`}
                      >
                        {/* Module Name */}
                        <div className="col-span-5">
                          <div className="font-medium text-gray-900 text-sm">
                            {module.displayName.en}
                          </div>
                          <div className="text-xs text-gray-500">
                            {module.displayName.hi}
                            <span className="ml-2 font-mono text-[10px] text-gray-400">({module.module})</span>
                          </div>
                        </div>
                        
                        {/* Checkboxes */}
                        {VALID_ACTIONS.map(action => (
                          <div key={action} className="col-span-1 flex items-center justify-center">
                            {module.allowedActions.includes(action) ? (
                              <Checkbox
                                id={`${module.module}-${action}`}
                                checked={permissions[module.module]?.[action] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module.module, action, Boolean(checked))
                                }
                                className="data-[state=checked]:bg-blue-600"
                              />
                            ) : (
                              <span className="text-gray-300 select-none">-</span>
                            )}
                          </div>
                        ))}
                        
                        {/* Module Row Action */}
                        <div className="col-span-4 flex items-center justify-center gap-2">
                          <Button
                            variant={allSelected ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleToggleSelectModule(module.module)}
                            className="text-xs h-7 px-2"
                          >
                            {allSelected ? "Clear Module" : "Select All"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Changes are atomically synchronized to PostgreSQL with application audit tracking.
                  </div>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={isSaving || !isUserAdmin}
                    className="bg-blue-600 hover:bg-blue-700 min-w-44"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Changes...
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

        {/* Empty State / Instruction */}
        {!selectedAgent && (
          <Card className="bg-blue-50/60 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">Getting Started</h3>
                  <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                    Select an agent from the dropdown menu above to inspect and configure permissions. 
                    The canonical permission matrix allows assigning granular <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">view</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">create</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">update</code>, and <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">delete</code> rights across all 22 agent-manageable modules.
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
