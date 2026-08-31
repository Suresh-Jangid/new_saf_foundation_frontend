// Permission system for SAF Foundation Admin Panel

export interface ModulePermission {
  module: string;
  actions: string[];
}

export interface UserPermissions {
  role: string;
  permissions: ModulePermission[];
}

// Define all available modules and their possible actions
export const AVAILABLE_MODULES: ModulePermission[] = [
  { module: "dashboard", actions: ["view"] },
  { module: "applicant_registration", actions: ["view", "create", "update", "delete"] },
  { module: "marriage_congratulations", actions: ["view", "create", "update", "delete"] },
  { module: "mayra_registration", actions: ["view", "create", "update", "delete"] },
  { module: "security_application", actions: ["view", "create", "update", "delete"] },
  { module: "suraksha_bima_yojana", actions: ["view", "create", "update", "delete"] },
  { module: "janni_delivery", actions: ["view", "create", "update", "delete"] },
  { module: "aawas_home", actions: ["view", "create", "update", "delete"] },
  { module: "aawas", actions: ["view", "create", "update", "delete"] },
  { module: "lado_bahin", actions: ["view", "create", "update", "delete"] },
  { module: "dhundhotsav", actions: ["view", "create", "update", "delete"] },
  { module: "shubhlaxmi", actions: ["view", "create", "update", "delete"] },
  { module: "agent_registration", actions: ["view", "create", "update", "delete"] },
  { module: "agent_permission", actions: ["view", "update"] },
  { module: "agent_commission", actions: ["view", "update"] },
  { module: "agent_commission_report", actions: ["view"] },
  { module: "bulk_marriage_emi", actions: ["view", "update"] },
  { module: "bulk_suraksha_bima_emi", actions: ["view", "update"] },
  { module: "bulk_mayra_emi", actions: ["view", "update"] },
  { module: "payment_management", actions: ["view"] },
  { module: "general_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "insurance_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "marriage_congratulations_payment", actions: ["view", "create", "update", "delete"] },
  { module: "suraksha_bima_yojana_payment", actions: ["view", "create", "update", "delete"] },
  { module: "balika_loan_application", actions: ["view", "create", "update", "delete"] },
  { module: "financial_help", actions: ["view", "create", "update", "delete"] },
  { module: "epin_management", actions: ["view", "create", "update", "delete"] },
  { module: "system_settings", actions: ["view", "update"] },
];

// Module display names mapping
export const MODULE_DISPLAY_NAMES: { [key: string]: string } = {
  dashboard: "Dashboard",
  applicant_registration: "General Marriage Application",
  marriage_congratulations: "General Marriage Congratulations Payment",
  mayra_registration: "Mayra General Application",
  security_application: "Insurance Bima Application",
  suraksha_bima_yojana: "Insurance Bima Payment",
  janni_delivery: "Janni Delivery Registration",
  aawas_home: "Aawas (Home) Registration",
  aawas: "Aawas (Home) Registration",
  lado_bahin: "Lado Bahin Registration",
  dhundhotsav: "Dhundhotsav Registration",
  shubhlaxmi: "ShubhLaxmi Registration",
  agent_registration: "Agent Registration",
  agent_permission: "Agent Permission",
  agent_commission: "Agent Commission Payment",
  agent_commission_report: "Agent Commission Report",
  bulk_marriage_emi: "Bulk Marriage EMI",
  bulk_suraksha_bima_emi: "Bulk Suraksha Bima EMI",
  bulk_mayra_emi: "Bulk Mayra EMI",
  payment_management: "Payment Management",
  general_application_payment: "Payment Management - General Marriage Application",
  insurance_application_payment: "Payment Management - Insurance Bima Application",
  marriage_congratulations_payment: "Payment Management - Marriage Congratulations Payment",
  suraksha_bima_yojana_payment: "Payment Management - Insurance Bima Payment",
  loan_payment: "Payment Management - Loan Application Payment",
  balika_loan_application: "Balika Loan Application",
  financial_help: "Financial Application Payment",
  epin_management: "E-PIN Operational Management",
  system_settings: "Configuration & System Settings",
};

// Action display names mapping
export const ACTION_DISPLAY_NAMES: { [key: string]: string } = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

// Default admin permissions (full access to all available modules)
export const ADMIN_PERMISSIONS: ModulePermission[] = AVAILABLE_MODULES.map((module) => ({
  module: module.module,
  actions: [...module.actions],
}));

// Default agent permissions
export const DEFAULT_AGENT_PERMISSIONS: ModulePermission[] = [
  { module: "dashboard", actions: ["view"] },
  { module: "applicant_registration", actions: ["view", "create", "update", "delete"] },
  { module: "security_application", actions: ["view", "create", "update", "delete"] },
  { module: "payment_management", actions: ["view"] },
  { module: "general_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "insurance_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "marriage_congratulations_payment", actions: ["view", "create", "update", "delete"] },
  { module: "suraksha_bima_yojana_payment", actions: ["view", "create", "update", "delete"] },
  { module: "bulk_marriage_emi", actions: ["view", "update"] },
  { module: "bulk_suraksha_bima_emi", actions: ["view", "update"] },
  { module: "mayra_registration", actions: ["view", "create", "update", "delete"] },
  { module: "bulk_mayra_emi", actions: ["view", "update"] },
  { module: "epin_management", actions: ["view"] },
];

export function getUserRole(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userRole") || "admin";
  }
  return "admin";
}

export function isAdmin(): boolean {
  return getUserRole() === "admin";
}

export function isAgent(): boolean {
  return getUserRole() === "agent";
}

export function convertApiPermissionsToModulePermissions(apiPermissions: any): ModulePermission[] {
  const modulePermissions: ModulePermission[] = [];
  if (!apiPermissions || typeof apiPermissions !== "object") return modulePermissions;

  for (const [module, actions] of Object.entries(apiPermissions)) {
    if (Array.isArray(actions)) {
      modulePermissions.push({
        module,
        actions: actions as string[],
      });
    }
  }

  return modulePermissions;
}

export function getUserPermissions(): ModulePermission[] {
  const role = getUserRole();

  if (role === "admin") {
    return ADMIN_PERMISSIONS;
  }

  if (role === "agent") {
    const agentData = typeof window !== "undefined" ? localStorage.getItem("agent") : null;
    if (agentData) {
      try {
        const agent = JSON.parse(agentData);
        if (agent.permissions) {
          return convertApiPermissionsToModulePermissions(agent.permissions);
        }
      } catch (error) {
        console.error("Error parsing agent data:", error);
      }
    }

    const customPermissions = typeof window !== "undefined" ? localStorage.getItem("agentPermissions") : null;
    if (customPermissions) {
      try {
        return JSON.parse(customPermissions);
      } catch (error) {
        console.error("Error parsing agent permissions:", error);
      }
    }

    return DEFAULT_AGENT_PERMISSIONS;
  }

  return [];
}

export function hasModulePermission(module: string, action = "view"): boolean {
  if (isAdmin()) return true;

  const permissions = getUserPermissions();
  // Check exact module name or aliases
  const modulePermission = permissions.find(
    (p) =>
      p.module === module ||
      (module === "aawas" && p.module === "aawas_home") ||
      (module === "aawas_home" && p.module === "aawas") ||
      (module === "marriage_congratulations" && p.module === "marriage_congratulations_payment") ||
      (module === "suraksha_bima_yojana" && p.module === "suraksha_bima_yojana_payment")
  );

  if (!modulePermission) {
    return false;
  }

  return modulePermission.actions.includes(action);
}

export function hasModuleAccess(module: string): boolean {
  return hasModulePermission(module, "view");
}

export function canCreate(module: string): boolean {
  return hasModulePermission(module, "create");
}

export function canUpdate(module: string): boolean {
  return hasModulePermission(module, "update");
}

export function canDelete(module: string): boolean {
  return hasModulePermission(module, "delete");
}

export function getAccessibleModules(): string[] {
  const permissions = getUserPermissions();
  return permissions.map((p) => p.module);
}

export function setAgentPermissions(permissions: ModulePermission[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("agentPermissions", JSON.stringify(permissions));
  }
}

export function clearAgentPermissions(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("agentPermissions");
  }
}

export function getModulePermissions(module: string): string[] {
  const permissions = getUserPermissions();
  const modulePermission = permissions.find((p) => p.module === module);
  return modulePermission?.actions || [];
}

export function hasAnyPermission(module: string): boolean {
  const permissions = getModulePermissions(module);
  return permissions.length > 0;
}

export function storeAgentData(agentData: any): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("agent", JSON.stringify(agentData));
    localStorage.setItem("userRole", "agent");
    localStorage.setItem("isAuthenticated", "true");
  }
}

export function getAgentData(): any {
  if (typeof window !== "undefined") {
    const agentData = localStorage.getItem("agent");
    if (agentData) {
      try {
        return JSON.parse(agentData);
      } catch {
        return null;
      }
    }
  }
  return null;
}
