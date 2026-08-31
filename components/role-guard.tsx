"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getUserRole,
  hasModulePermission,
  isAdmin,
  isAgent,
  getAgentData,
} from "@/lib/permissions";
import ConfigService from "@/lib/config-service";
import { ModuleDisabledBanner } from "./module-disabled-banner";
import { getModuleById } from "@/config/module-registry";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredModule?: string;
  requiredAction?: string;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  requiredModule,
  requiredAction = "view",
  requiredRoles,
  fallback,
}: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);

    const agentData = getAgentData();
    if (agentData) {
      setAgentInfo(agentData);
    }

    // 1. Check if module is enabled in configuration
    if (requiredModule) {
      const enabled = ConfigService.isModuleEnabled(requiredModule);
      setIsModuleEnabled(enabled);
      if (!enabled) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
    }

    // 2. Check RBAC permissions
    let access = false;

    if (requiredRoles) {
      access = requiredRoles.includes(role);
    } else if (requiredModule) {
      if (isAdmin()) {
        access = true;
      } else if (isAgent() && agentData?.permissions) {
        const modulePermissions = agentData.permissions[requiredModule];
        if (modulePermissions && Array.isArray(modulePermissions)) {
          access = modulePermissions.includes(requiredAction);
        } else {
          access = hasModulePermission(requiredModule, requiredAction);
        }
      } else {
        access = hasModulePermission(requiredModule, requiredAction);
      }
    } else {
      access = isAdmin();
    }

    setHasAccess(access);
    setIsLoading(false);
  }, [requiredModule, requiredAction, requiredRoles]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Checking permissions / अनुमतियाँ जांची जा रही हैं...</p>
        </div>
      </div>
    );
  }

  // Handle disabled module direct route visit
  if (!isModuleEnabled && requiredModule) {
    const regItem = getModuleById(requiredModule);
    return (
      <ModuleDisabledBanner
        moduleName={regItem?.name.en || requiredModule}
        moduleNameHi={regItem?.name.hi}
        route={regItem?.route}
      />
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl font-semibold">Access Denied / पहुंच अस्वीकृत</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {requiredModule ? (
                <>
                  You don't have permission to {requiredAction} the{" "}
                  <span className="font-semibold">{requiredModule}</span> module.
                </>
              ) : requiredRoles ? (
                <>
                  You don't have permission to access this page. Required role:{" "}
                  <span className="font-semibold">{requiredRoles.join(", ")}</span>
                </>
              ) : (
                "You don't have permission to access this page."
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Your role: <span className="font-semibold">{userRole}</span>
              {agentInfo && (
                <span className="block mt-0.5">
                  Agent: {agentInfo.name} ({agentInfo.employee_id})
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                onClick={() => router.push("/dashboard")}
                className="bg-[#0B4A8F] hover:bg-[#072E5C] text-white flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredModule?: string,
  requiredAction?: string,
  requiredRoles?: string[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <RoleGuard
        requiredModule={requiredModule}
        requiredAction={requiredAction}
        requiredRoles={requiredRoles}
      >
        <Component {...props} />
      </RoleGuard>
    );
  };
}

export function ModuleGuard({
  children,
  module,
  action = "view",
}: {
  children: React.ReactNode;
  module: string;
  action?: string;
}) {
  return (
    <RoleGuard requiredModule={module} requiredAction={action}>
      {children}
    </RoleGuard>
  );
}

export function ViewGuard({ children, module }: { children: React.ReactNode; module: string }) {
  return <ModuleGuard module={module} action="view">{children}</ModuleGuard>;
}

export function CreateGuard({ children, module }: { children: React.ReactNode; module: string }) {
  return <ModuleGuard module={module} action="create">{children}</ModuleGuard>;
}

export function UpdateGuard({ children, module }: { children: React.ReactNode; module: string }) {
  return <ModuleGuard module={module} action="update">{children}</ModuleGuard>;
}

export function DeleteGuard({ children, module }: { children: React.ReactNode; module: string }) {
  return <ModuleGuard module={module} action="delete">{children}</ModuleGuard>;
}
