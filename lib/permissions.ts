// Permission system for SAF Foundation Admin Panel
// Canonical Permission Catalog & Role-Based Access Control

export type PermissionAction = "view" | "create" | "update" | "delete";

export const VALID_ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

export interface ModulePermission {
  module: string;
  actions: string[];
}

export interface UserPermissions {
  role: string;
  permissions: ModulePermission[];
}

export interface CanonicalPermissionDefinition {
  module: string;
  displayName: { en: string; hi: string };
  allowedActions: PermissionAction[];
  enabled: boolean;
  agentManageable: boolean;
  category: "ADMINISTRATION" | "SCHEME" | "FINANCIAL" | "REPORT";
  aliases?: string[];
}

/**
 * SAF FOUNDATION CANONICAL PERMISSION CATALOG
 * Single authoritative source of truth for modules, actions, and roles across backend & frontend.
 */
export const CANONICAL_PERMISSION_CATALOG: CanonicalPermissionDefinition[] = [
  // 1. Dashboard
  {
    module: "dashboard",
    displayName: { en: "Dashboard", hi: "डैशबोर्ड" },
    allowedActions: ["view"],
    enabled: true,
    agentManageable: true,
    category: "ADMINISTRATION",
  },

  // 2. General Marriage Application
  {
    module: "applicant_registration",
    displayName: { en: "General Marriage Application", hi: "सामान्य विवाह आवेदन" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 3. General Marriage Congratulation Payment
  {
    module: "marriage_congratulations",
    displayName: { en: "General Marriage Congratulation Payment", hi: "विवाह बधाई पत्र" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
    aliases: ["marriage_congratulations_payment"],
  },

  // 4. Mayra General Application
  {
    module: "mayra_registration",
    displayName: { en: "Mayra General Application", hi: "मायरा सामान्य आवेदन" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 5. Insurance Bima Application
  {
    module: "security_application",
    displayName: { en: "Insurance Bima Application", hi: "सुरक्षा बीमा आवेदन" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 6. Insurance Bima Payment
  {
    module: "suraksha_bima_yojana",
    displayName: { en: "Insurance Bima Payment", hi: "सुरक्षा बीमा योजना" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
    aliases: ["suraksha_bima_yojana_payment"],
  },

  // 7. Janni Delivery Registration
  {
    module: "janni_delivery",
    displayName: { en: "Janni Delivery Registration", hi: "जननी प्रसूति पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 8. Aawas (Home) Registration
  {
    module: "aawas_home",
    displayName: { en: "Aawas (Home) Registration", hi: "आवास योजना पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
    aliases: ["aawas"],
  },

  // 9. Lado Bahin Registration
  {
    module: "lado_bahin",
    displayName: { en: "Lado Bahin Registration", hi: "लाडो बहिन पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 10. Dhundhotsav Registration
  {
    module: "dhundhotsav",
    displayName: { en: "Dhundhotsav Registration", hi: "ढूंढोत्सव पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
  },

  // 11. ShubhLaxmi Registration
  {
    module: "shubh_laxmi",
    displayName: { en: "ShubhLaxmi (Deepawali) Registration", hi: "शुभलक्ष्मी पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "SCHEME",
    aliases: ["shubhlaxmi"],
  },

  // 12. Agent Registration (Hierarchical downline agent registration)
  {
    module: "agent_registration",
    displayName: { en: "Agent Registration", hi: "एजेंट पंजीकरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "ADMINISTRATION",
  },

  // 13. Agent Commission Report
  {
    module: "agent_commission_report",
    displayName: { en: "Agent Commission Report", hi: "एजेंट कमिशन रिपोर्ट" },
    allowedActions: ["view"],
    enabled: true,
    agentManageable: true,
    category: "REPORT",
  },

  // 14. Bulk Marriage EMI
  {
    module: "bulk_marriage_emi",
    displayName: { en: "Bulk Marriage EMI", hi: "बल्क विवाह ईएमआई" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 15. Bulk Suraksha Bima EMI
  {
    module: "bulk_suraksha_bima_emi",
    displayName: { en: "Bulk Insurance Bima EMI", hi: "बल्क सुरक्षा बीमा ईएमआई" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 16. Bulk Mayra EMI
  {
    module: "bulk_mayra_emi",
    displayName: { en: "Bulk Mayra EMI", hi: "बल्क मायरा ईएमआई" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 17. Payment Management
  {
    module: "payment_management",
    displayName: { en: "Payment Management", hi: "भुगतान प्रबंधन" },
    allowedActions: ["view"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 18. General Application Payment
  {
    module: "general_application_payment",
    displayName: { en: "Payment Management - General Marriage Application", hi: "सामान्य विवाह आवेदन भुगतान" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 19. Insurance Application Payment
  {
    module: "insurance_application_payment",
    displayName: { en: "Payment Management - Insurance Bima Application", hi: "सुरक्षा बीमा आवेदन भुगतान" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 20. Balika Loan Application
  {
    module: "balika_loan_application",
    displayName: { en: "Balika Loan Application", hi: "बालिका ऋण आवेदन" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 21. Financial Help
  {
    module: "financial_help",
    displayName: { en: "Financial Application Payment", hi: "वित्त सहायता आवेदन" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: true,
    agentManageable: true,
    category: "FINANCIAL",
  },

  // 22. E-PIN Management
  {
    module: "epin_management",
    displayName: { en: "E-PIN Operational Management", hi: "ई-पिन प्रबंधन" },
    allowedActions: ["view"],
    enabled: true,
    agentManageable: true,
    category: "ADMINISTRATION",
  },

  // 23. Agent Commission Payment (Admin Only)
  {
    module: "agent_commission",
    displayName: { en: "Agent Commission Payment", hi: "एजेंट कमिशन भुगतान" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: false, // ADMIN ONLY
    category: "FINANCIAL",
  },

  // 24. Agent Permission Management (Admin Only)
  {
    module: "agent_permission",
    displayName: { en: "Agent Permission Management", hi: "एजेंट अनुमति प्रबंधन" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: false, // ADMIN ONLY
    category: "ADMINISTRATION",
  },

  // 25. System Settings (Admin Only)
  {
    module: "system_settings",
    displayName: { en: "Configuration & System Settings", hi: "सिस्टम सेटिंग्स एवं कॉन्फ़िगरेशन" },
    allowedActions: ["view", "update"],
    enabled: true,
    agentManageable: false, // ADMIN ONLY
    category: "ADMINISTRATION",
  },

  // 26. Marriage Sewing Machine Distribution (Disabled)
  {
    module: "marriage_sewing_machine_distribution",
    displayName: { en: "Marriage Sewing Machine Distribution", hi: "विवाह सिलाई मशीन वितरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: false,
    agentManageable: false,
    category: "SCHEME",
  },

  // 27. Disability Cycle Distribution (Disabled)
  {
    module: "disability_cycle_distribution",
    displayName: { en: "Disability Cycle Distribution", hi: "निशुल्क साइकिल वितरण" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: false,
    agentManageable: false,
    category: "SCHEME",
  },

  // 28. Sewing Machine Camp (Disabled)
  {
    module: "sewing_machine_camp",
    displayName: { en: "Sewing Machine Camp", hi: "निशुल्क सिलाई मशीन शिविर कैम्प" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: false,
    agentManageable: false,
    category: "SCHEME",
  },

  // 29. Pension Yojana Application Payment (Disabled)
  {
    module: "salakar_pension_yojana",
    displayName: { en: "Pension Yojana Application Payment", hi: "सहलाकर पेंशन योजना" },
    allowedActions: ["view", "create", "update", "delete"],
    enabled: false,
    agentManageable: false,
    category: "SCHEME",
  },
];

// Alias mapping: alias -> canonical key
export const MODULE_ALIASES: Record<string, string> = {
  aawas: "aawas_home",
  shubhlaxmi: "shubh_laxmi",
  marriage_congratulations_payment: "marriage_congratulations",
  suraksha_bima_yojana_payment: "suraksha_bima_yojana",
};

// Module catalog map
export const CANONICAL_CATALOG_MAP = new Map<string, CanonicalPermissionDefinition>(
  CANONICAL_PERMISSION_CATALOG.map((def) => [def.module, def])
);

/**
 * Resolves any module string (canonical or alias) to its canonical key.
 */
export function resolveCanonicalModule(moduleName: string): string {
  if (!moduleName) return moduleName;
  const trimmed = moduleName.trim();
  return MODULE_ALIASES[trimmed] || trimmed;
}

/**
 * Returns an array containing the canonical module key and all known aliases.
 */
export function getModuleWithAliases(moduleName: string): string[] {
  const canonical = resolveCanonicalModule(moduleName);
  const def = CANONICAL_CATALOG_MAP.get(canonical);
  const aliases = def?.aliases || [];
  return Array.from(new Set([canonical, ...aliases, moduleName]));
}

// Active modules assignable to agents
export const AGENT_MANAGEABLE_MODULES: CanonicalPermissionDefinition[] =
  CANONICAL_PERMISSION_CATALOG.filter((m) => m.enabled && m.agentManageable);

// Preserved for backwards compatibility with existing UI components
export const AVAILABLE_MODULES: ModulePermission[] = CANONICAL_PERMISSION_CATALOG.map((m) => ({
  module: m.module,
  actions: m.allowedActions,
}));

// Module display names mapping
export const MODULE_DISPLAY_NAMES: { [key: string]: string } = {};
CANONICAL_PERMISSION_CATALOG.forEach((m) => {
  MODULE_DISPLAY_NAMES[m.module] = m.displayName.en;
  if (m.aliases) {
    m.aliases.forEach((alias) => {
      MODULE_DISPLAY_NAMES[alias] = m.displayName.en;
    });
  }
});
// Legacy fallback entries
MODULE_DISPLAY_NAMES["loan_payment"] = "Payment Management - Loan Application Payment";

// Action display names mapping
export const ACTION_DISPLAY_NAMES: { [key: string]: string } = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

// Default admin permissions (full access to all active modules)
export const ADMIN_PERMISSIONS: ModulePermission[] = CANONICAL_PERMISSION_CATALOG.filter((m) => m.enabled).map(
  (module) => ({
    module: module.module,
    actions: [...module.allowedActions],
  })
);

// Default agent permissions (canonical keys)
export const DEFAULT_AGENT_PERMISSIONS: ModulePermission[] = [
  { module: "dashboard", actions: ["view"] },
  { module: "applicant_registration", actions: ["view", "create", "update", "delete"] },
  { module: "security_application", actions: ["view", "create", "update", "delete"] },
  { module: "payment_management", actions: ["view"] },
  { module: "general_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "insurance_application_payment", actions: ["view", "create", "update", "delete"] },
  { module: "marriage_congratulations", actions: ["view", "create", "update", "delete"] },
  { module: "suraksha_bima_yojana", actions: ["view", "create", "update", "delete"] },
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
        module: resolveCanonicalModule(module),
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
  const canonicalTarget = resolveCanonicalModule(module);
  const targetAliases = getModuleWithAliases(canonicalTarget);

  // Check canonical module name or any registered alias
  const modulePermission = permissions.find((p) => {
    const canonicalP = resolveCanonicalModule(p.module);
    return canonicalP === canonicalTarget || targetAliases.includes(p.module);
  });

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
  const canonicalTarget = resolveCanonicalModule(module);
  const targetAliases = getModuleWithAliases(canonicalTarget);
  const modulePermission = permissions.find((p) => {
    const canonicalP = resolveCanonicalModule(p.module);
    return canonicalP === canonicalTarget || targetAliases.includes(p.module);
  });
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
