import { useState, useEffect } from 'react'
import {
  getUserRole,
  getUserPermissions,
  hasModulePermission,
  hasModuleAccess,
  canCreate,
  canUpdate,
  canDelete,
  getAccessibleModules,
  getModulePermissions,
  hasAnyPermission,
  isAdmin,
  isAgent,
  getAgentData,
  ModulePermission
} from '@/lib/permissions'

export function usePermissions() {
  const [userRole, setUserRole] = useState<string>('admin')
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [accessibleModules, setAccessibleModules] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [agentInfo, setAgentInfo] = useState<any>(null)

  useEffect(() => {
    const role = getUserRole()
    const userPermissions = getUserPermissions()
    const modules = getAccessibleModules()
    const agentData = getAgentData()

    setUserRole(role)
    setPermissions(userPermissions)
    setAccessibleModules(modules)
    setAgentInfo(agentData)
    setIsLoading(false)
  }, [])

  // Enhanced permission checking that considers agent permissions from API
  const hasModulePermissionEnhanced = (module: string, action: string): boolean => {
    if (isAdmin()) return true
    
    if (isAgent() && agentInfo?.permissions) {
      const modulePermissions = agentInfo.permissions[module]
      return modulePermissions?.includes(action) || false
    }
    
    return hasModulePermission(module, action)
  }

  const hasModuleAccessEnhanced = (module: string): boolean => {
    return hasModulePermissionEnhanced(module, "view")
  }

  const canCreateEnhanced = (module: string): boolean => {
    return hasModulePermissionEnhanced(module, "create")
  }

  const canUpdateEnhanced = (module: string): boolean => {
    return hasModulePermissionEnhanced(module, "update")
  }

  const canDeleteEnhanced = (module: string): boolean => {
    return hasModulePermissionEnhanced(module, "delete")
  }

  const getModulePermissionsEnhanced = (module: string): string[] => {
    if (isAdmin()) {
      // Admin has all permissions for all modules
      return ["view", "create", "update", "delete"]
    }
    
    if (isAgent() && agentInfo?.permissions) {
      return agentInfo.permissions[module] || []
    }
    
    return getModulePermissions(module)
  }

  return {
    // User role and info
    userRole,
    isAdmin: isAdmin(),
    isAgent: isAgent(),
    agentInfo,
    
    // Permissions
    permissions,
    accessibleModules,
    isLoading,
    
    // Enhanced permission checking functions
    hasModulePermission: hasModulePermissionEnhanced,
    hasModuleAccess: hasModuleAccessEnhanced,
    canCreate: canCreateEnhanced,
    canUpdate: canUpdateEnhanced,
    canDelete: canDeleteEnhanced,
    getModulePermissions: getModulePermissionsEnhanced,
    hasAnyPermission: (module: string) => hasAnyPermission(module),
    
    // Utility functions
    getUserPermissions,
    getAccessibleModules,
  }
}

// Hook for checking specific module permissions
export function useModulePermissions(module: string) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  const [canCreateModule, setCanCreateModule] = useState(false)
  const [canUpdateModule, setCanUpdateModule] = useState(false)
  const [canDeleteModule, setCanDeleteModule] = useState(false)
  const [agentInfo, setAgentInfo] = useState<any>(null)

  useEffect(() => {
    const agentData = getAgentData()
    setAgentInfo(agentData)

    if (isAdmin()) {
      // Admin has all permissions
      setPermissions(["view", "create", "update", "delete"])
      setHasAccess(true)
      setCanCreateModule(true)
      setCanUpdateModule(true)
      setCanDeleteModule(true)
    } else if (isAgent() && agentData?.permissions) {
      // Check agent permissions from API response
      const modulePermissions = agentData.permissions[module] || []
      setPermissions(modulePermissions)
      setHasAccess(modulePermissions.includes("view"))
      setCanCreateModule(modulePermissions.includes("create"))
      setCanUpdateModule(modulePermissions.includes("update"))
      setCanDeleteModule(modulePermissions.includes("delete"))
    } else {
      // Fallback to general permission check
      const modulePermissions = getModulePermissions(module)
      setPermissions(modulePermissions)
      setHasAccess(hasModuleAccess(module))
      setCanCreateModule(canCreate(module))
      setCanUpdateModule(canUpdate(module))
      setCanDeleteModule(canDelete(module))
    }
  }, [module])

  return {
    permissions,
    hasAccess,
    canCreate: canCreateModule,
    canUpdate: canUpdateModule,
    canDelete: canDeleteModule,
    hasPermission: (action: string) => permissions.includes(action),
    agentInfo,
  }
}

// Hook for checking if user can perform specific actions
export function useActionPermissions() {
  const { userRole, isAdmin: adminUser, isAgent: agentUser, agentInfo } = usePermissions()

  const hasModulePermissionEnhanced = (module: string, action: string): boolean => {
    if (adminUser) return true
    
    if (agentUser && agentInfo?.permissions) {
      const modulePermissions = agentInfo.permissions[module]
      return modulePermissions?.includes(action) || false
    }
    
    return hasModulePermission(module, action)
  }

  return {
    userRole,
    isAdmin: adminUser,
    isAgent: agentUser,
    agentInfo,
    
    // Quick permission checks
    canView: (module: string) => hasModulePermissionEnhanced(module, "view"),
    canCreate: (module: string) => hasModulePermissionEnhanced(module, "create"),
    canUpdate: (module: string) => hasModulePermissionEnhanced(module, "update"),
    canDelete: (module: string) => hasModulePermissionEnhanced(module, "delete"),
    
    // Combined checks
    canManage: (module: string) => 
      hasModulePermissionEnhanced(module, "create") || 
      hasModulePermissionEnhanced(module, "update") || 
      hasModulePermissionEnhanced(module, "delete"),
    canFullAccess: (module: string) => 
      hasModulePermissionEnhanced(module, "create") && 
      hasModulePermissionEnhanced(module, "update") && 
      hasModulePermissionEnhanced(module, "delete"),
  }
}
