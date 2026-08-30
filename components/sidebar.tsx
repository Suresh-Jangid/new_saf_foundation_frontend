"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Gift,
  Bike,
  Receipt,
  FileText,
  Scissors,
  Menu,
  LogOut,
  Wallet,
  IndianRupee,
  BriefcaseBusiness,
  LockKeyhole,
  Shield,
  FileBarChart,
  HeartHandshake,
  Home,
  Sparkles,
  Settings,
} from "lucide-react";
import { getUserRole, hasModulePermission, isAdmin, getAgentData } from "@/lib/permissions";
import { MODULE_REGISTRY } from "@/config/module-registry";
import ConfigService from "@/lib/config-service";
import { ModuleRegistryItem } from "@/lib/config-types";

// Icon mapping dictionary
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FileText,
  Gift,
  Wallet,
  Scissors,
  Bike,
  IndianRupee,
  BriefcaseBusiness,
  LockKeyhole,
  Receipt,
  Shield,
  FileBarChart,
  HeartHandshake,
  Home,
  Sparkles,
  Settings,
};

// Memoized menu item component
const MenuItem = memo(
  ({
    item,
    pathname,
    onMenuItemClick,
    agentHasPermission,
  }: {
    item: ModuleRegistryItem;
    pathname: string;
    onMenuItemClick?: () => void;
    agentHasPermission: (permKey: string) => boolean;
  }) => {
    const isActive = pathname === item.route;
    const IconComponent = ICON_MAP[item.iconName] || FileText;

    const filteredChildren = (item.children || []).filter((child) => {
      if (!ConfigService.isModuleEnabled(child.id)) return false;
      if (isAdmin()) return true;
      return agentHasPermission(child.permissionKey);
    });

    return (
      <div key={item.route}>
        <Link
          href={item.route}
          className={cn(
            "flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-all hover:bg-[#ff5c00]",
            isActive ? "bg-[#ff5c00] text-white" : "text-white/70"
          )}
          onClick={onMenuItemClick}
        >
          <div className="flex items-center gap-3">
            <IconComponent className="h-4 w-4 shrink-0" />
            <span className="font-medium">{item.name.hi}</span>
          </div>
          {item.subtitle && (
            <span className="text-xs text-white/50 ml-7">{item.subtitle.en}</span>
          )}
        </Link>

        {/* Render children if present */}
        {filteredChildren.length > 0 && (
          <div className="ml-8 mt-1 space-y-1">
            {filteredChildren.map((child) => {
              const ChildIcon = ICON_MAP[child.iconName] || FileText;
              const isChildActive = pathname === child.route;
              return (
                <Link
                  key={child.route}
                  href={child.route}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-[#ff5c00]",
                    isChildActive ? "bg-[#ff5c00] text-white" : "text-white/70"
                  )}
                  onClick={onMenuItemClick}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium">{child.name.hi}</span>
                    {child.subtitle && (
                      <span className="text-xs text-white/50">{child.subtitle.en}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";

export const Sidebar = memo(
  ({
    className,
    onMenuItemClick,
  }: {
    className?: string;
    onMenuItemClick?: () => void;
  }) => {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>("admin");
    const [agentInfo, setAgentInfo] = useState<any>(null);

    const initialData = useMemo(() => {
      const role = getUserRole();
      const agentData = getAgentData();
      return { role, agentData };
    }, []);

    useEffect(() => {
      setUserRole(initialData.role);
      if (initialData.agentData) {
        setAgentInfo(initialData.agentData);
      }
    }, [initialData]);

    const agentHasPermission = useCallback(
      (permKey: string): boolean => {
        if (isAdmin()) return true;
        if (!agentInfo?.permissions) return false;
        return agentInfo.permissions[permKey]?.includes("view") || hasModulePermission(permKey, "view");
      },
      [agentInfo?.permissions]
    );

    // Filter menu items based on: 1. Enabled in config, 2. Role & permissions
    const filteredMenuItems = useMemo(() => {
      return MODULE_REGISTRY.filter((item) => {
        // 1. Check if module is enabled in configuration
        if (!ConfigService.isModuleEnabled(item.id)) {
          return false;
        }

        // 2. Admin has access to all enabled modules
        if (isAdmin()) {
          return true;
        }

        // 3. For agents, restrict admin-only modules
        if (item.permissionKey === "agent_permission" || item.permissionKey === "system_settings") {
          return false;
        }

        // 4. Check if agent has permission for this module
        return agentHasPermission(item.permissionKey);
      });
    }, [agentHasPermission]);

    const handleLogout = useCallback(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
      if (onMenuItemClick) onMenuItemClick();
    }, [onMenuItemClick]);

    return (
      <div
        className={cn("pb-12 flex flex-col h-screen overflow-y-auto", className)}
        style={{
          background: "var(--sidebar-bg, #2a120d)",
          width: "var(--sidebar-width, 20rem)",
        }}
      >
        <div className="flex-1 space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="px-4 py-2">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-white">
                <img src="/assets/images/logo.png" alt="SAF Foundation Logo" />
              </Link>
            </div>

            <div className="space-y-1 mt-4">
              {filteredMenuItems.map((item) => (
                <MenuItem
                  key={item.route}
                  item={item}
                  pathname={pathname}
                  onMenuItemClick={onMenuItemClick}
                  agentHasPermission={agentHasPermission}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Logout button at the bottom */}
        <div className="px-4 mt-auto">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#ff5c00] text-white hover:bg-red-600 hover:text-white transition"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </Button>
        </div>
      </div>
    );
  }
);

Sidebar.displayName = "Sidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0"
        style={{ width: "var(--sidebar-width, 20rem)" }}
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Main dashboard navigation links</SheetDescription>
          <Sidebar onMenuItemClick={() => setOpen(false)} />
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
