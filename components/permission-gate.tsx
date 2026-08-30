"use client"

import { ReactNode } from "react"
import { 
  hasModulePermission, 
  hasModuleAccess, 
  canCreate, 
  canUpdate, 
  canDelete,
  isAdmin,
  isAgent,
  getAgentData
} from "@/lib/permissions"

interface PermissionGateProps {
  children: ReactNode
  module?: string
  action?: string
  fallback?: ReactNode
  requireView?: boolean
  requireCreate?: boolean
  requireUpdate?: boolean
  requireDelete?: boolean
}

export function PermissionGate({
  children,
  module,
  action,
  fallback = null,
  requireView = false,
  requireCreate = false,
  requireUpdate = false,
  requireDelete = false,
}: PermissionGateProps) {
  // Check if user has permission
  let hasPermission = true

  if (module) {
    if (action) {
      // Check specific action permission
      if (isAdmin()) {
        hasPermission = true // Admin has access to everything
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = hasModulePermission(module, action)
      } else {
        hasPermission = hasModulePermission(module, action)
      }
    } else if (requireView) {
      // Check view permission
      if (isAdmin()) {
        hasPermission = true
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = hasModuleAccess(module)
      } else {
        hasPermission = hasModuleAccess(module)
      }
    } else if (requireCreate) {
      // Check create permission
      if (isAdmin()) {
        hasPermission = true
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = canCreate(module)
      } else {
        hasPermission = canCreate(module)
      }
    } else if (requireUpdate) {
      // Check update permission
      if (isAdmin()) {
        hasPermission = true
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = canUpdate(module)
      } else {
        hasPermission = canUpdate(module)
      }
    } else if (requireDelete) {
      // Check delete permission
      if (isAdmin()) {
        hasPermission = true
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = canDelete(module)
      } else {
        hasPermission = canDelete(module)
      }
    } else {
      // Default to view permission
      if (isAdmin()) {
        hasPermission = true
      } else if (isAgent()) {
        // Always use the filtered permission system for agents
        hasPermission = hasModuleAccess(module)
      } else {
        hasPermission = hasModuleAccess(module)
      }
    }
  }

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components for specific actions
export function ViewGate({ children, module, fallback }: { children: ReactNode; module: string; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} requireView fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function CreateGate({ children, module, fallback }: { children: ReactNode; module: string; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} requireCreate fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function UpdateGate({ children, module, fallback }: { children: ReactNode; module: string; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} requireUpdate fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function DeleteGate({ children, module, fallback }: { children: ReactNode; module: string; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} requireDelete fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

// Component for admin-only content
export function AdminGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  if (!isAdmin()) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

// Component for agent-only content
export function AgentGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  if (!isAgent()) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

// Multi-permission gate for complex permission checks
interface MultiPermissionGateProps {
  children: ReactNode
  permissions: Array<{ module: string; action: string }>
  fallback?: ReactNode
  requireAll?: boolean // true = all permissions required, false = any permission suffices
}

export function MultiPermissionGate({
  children,
  permissions,
  fallback = null,
  requireAll = true,
}: MultiPermissionGateProps) {
  let hasPermission = false

  if (isAdmin()) {
    hasPermission = true // Admin has access to everything
  } else if (isAgent()) {
    // Always use the filtered permission system for agents
    if (requireAll) {
      hasPermission = permissions.every(({ module, action }) => 
        hasModulePermission(module, action)
      )
    } else {
      hasPermission = permissions.some(({ module, action }) => 
        hasModulePermission(module, action)
      )
    }
  } else {
    // Fallback to general permission check
    if (requireAll) {
      hasPermission = permissions.every(({ module, action }) => 
        hasModulePermission(module, action)
      )
    } else {
      hasPermission = permissions.some(({ module, action }) => 
        hasModulePermission(module, action)
      )
    }
  }

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
