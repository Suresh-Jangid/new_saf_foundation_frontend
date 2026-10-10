"use client";

import { useState, useEffect, useMemo, memo, useCallback, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  KeyRound,
  ChevronDown,
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
  KeyRound,
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
    searchParams,
    onMenuItemClick,
    agentHasPermission,
  }: {
    item: ModuleRegistryItem;
    pathname: string;
    searchParams: URLSearchParams | null;
    onMenuItemClick?: () => void;
    agentHasPermission: (permKey: string) => boolean;
  }) => {
    const IconComponent = ICON_MAP[item.iconName] || FileText;

    const filteredChildren = (item.children || []).filter((child) => {
      if (!ConfigService.isModuleEnabled(child.id)) return false;
      if (isAdmin()) return true;
      return agentHasPermission(child.permissionKey);
    });

    const isChildActive = (childRoute: string) => {
      if (childRoute.includes("?")) {
        const [childPath, childQuery] = childRoute.split("?");
        if (pathname !== childPath) return false;
        const targetParams = new URLSearchParams(childQuery);
        const targetGroup = targetParams.get("group");
        const currentGroup = searchParams?.get("group");
        return Boolean(targetGroup && currentGroup === targetGroup);
      }
      return pathname === childRoute;
    };

    const hasActiveChild = filteredChildren.some((child) => isChildActive(child.route));

    const isParentActive = hasActiveChild
      ? false
      : item.route.includes("?")
      ? isChildActive(item.route)
      : pathname === item.route && (!searchParams?.get("group") || searchParams.get("group") === "all");

    const isSectionActive =
      pathname === item.route ||
      filteredChildren.some((child) => {
        const childPath = child.route.split("?")[0];
        return pathname === childPath;
      });

    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
      if (isSectionActive) {
        setIsExpanded(true);
      }
    }, [isSectionActive]);

    return (
      <div key={item.route} className="rounded-lg">
        <div className="flex items-center">
          <Link
            href={item.route}
            className={cn(
              "flex-1 flex flex-col gap-1 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
              isParentActive
                ? "bg-gradient-to-r from-[#0B4A8F] to-[#0D5EB3] text-white shadow-md shadow-blue-950/30 border-l-4 border-[#F57C00]"
                : isSectionActive
                ? "text-white font-medium hover:bg-white/10"
                : "text-slate-200/80 hover:bg-white/10 hover:text-white"
            )}
            onClick={() => {
              if (onMenuItemClick) onMenuItemClick();
              setIsExpanded(true);
            }}
          >
            <div className="flex items-center gap-3">
              <IconComponent className={cn("h-4 w-4 shrink-0", (isParentActive || isSectionActive) ? "text-[#F57C00]" : "text-slate-300")} />
              <span className="font-semibold">{item.name.hi}</span>
            </div>
            {item.subtitle && (
              <span className={cn("text-xs ml-7", isParentActive ? "text-slate-200" : "text-slate-400")}>{item.subtitle.en}</span>
            )}
          </Link>
          {filteredChildren.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="p-2 mr-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label={isExpanded ? "Collapse submenu" : "Expand submenu"}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
            </button>
          )}
        </div>

        {/* Render children if present */}
        {filteredChildren.length > 0 && isExpanded && (
          <div className="ml-6 mt-1 pl-2 border-l border-white/10 space-y-1">
            {filteredChildren.map((child) => {
              const ChildIcon = ICON_MAP[child.iconName] || FileText;
              const active = isChildActive(child.route);
              return (
                <Link
                  key={child.route}
                  href={child.route}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    active
                      ? "bg-[#0B4A8F] text-white font-medium shadow-sm border-l-2 border-[#F57C00]"
                      : "text-slate-300/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={onMenuItemClick}
                >
                  <ChildIcon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[#F57C00]" : "text-slate-400")} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{child.name.hi}</span>
                    {child.subtitle && (
                      <span className="text-[11px] text-slate-400 truncate">{child.subtitle.en}</span>
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

const SidebarContent = memo(
  ({
    className,
    onMenuItemClick,
  }: {
    className?: string;
    onMenuItemClick?: () => void;
  }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
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
        if (item.permissionKey === "agent_permission" || item.permissionKey === "system_settings" || item.permissionKey === "agent_commission") {
          return false;
        }

        // 4. Check if agent has permission for this module (or any of its children)
        return (
          agentHasPermission(item.permissionKey) ||
          (item.children && item.children.some((c) => agentHasPermission(c.permissionKey)))
        );
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
          background: "var(--sidebar-bg, #071E3D)",
          width: "var(--sidebar-width, 20rem)",
        }}
      >
        <div className="flex-1 space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="px-3 py-3 border-b border-white/10 mb-2">
              <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg text-white group">
                <div className="bg-white rounded-full p-1.5 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src="/assets/images/logo.png" alt="SAF Foundation Logo" className="h-10 w-10 object-contain rounded-full" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white leading-snug truncate">SAF Foundation</span>
                  <span className="text-[11px] text-white/70 leading-none truncate">शिक्षा अमृतम फाउंडेशन</span>
                </div>
              </Link>
            </div>

            <div className="space-y-1 mt-4">
              {filteredMenuItems.map((item) => (
                <MenuItem
                  key={item.route}
                  item={item}
                  pathname={pathname}
                  searchParams={searchParams}
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F57C00] to-[#E65100] hover:from-[#E65100] hover:to-[#BF360C] text-white shadow-md transition-all duration-200 hover:shadow-lg font-medium"
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

SidebarContent.displayName = "SidebarContent";

export const Sidebar = memo(
  ({
    className,
    onMenuItemClick,
  }: {
    className?: string;
    onMenuItemClick?: () => void;
  }) => {
    return (
      <Suspense
        fallback={
          <div
            className={cn("pb-12 flex flex-col h-screen overflow-y-auto", className)}
            style={{
              background: "var(--sidebar-bg, #071E3D)",
              width: "var(--sidebar-width, 20rem)",
            }}
          />
        }
      >
        <SidebarContent className={className} onMenuItemClick={onMenuItemClick} />
      </Suspense>
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
