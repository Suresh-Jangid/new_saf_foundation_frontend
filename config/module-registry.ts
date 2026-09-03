import { ModuleRegistryItem } from "@/lib/config-types";
export type { ModuleRegistryItem };

/**
 * SAF Foundation Centralized Module Registry
 *
 * This registry acts as the frontend metadata source for navigation, route mapping, and permissions.
 * Active vs Disabled status is controlled dynamically (with default values matching Phase 2-B requirements).
 */
export const MODULE_REGISTRY: ModuleRegistryItem[] = [
  {
    id: "dashboard",
    name: { en: "Dashboard", hi: "डैशबोर्ड" },
    category: "ADMINISTRATION",
    route: "/dashboard",
    iconName: "LayoutDashboard",
    permissionKey: "dashboard",
    enabled: true,
  },

  // --- E-PIN Operational Management ---
  {
    id: "epin_management",
    name: { en: "E-PIN Management", hi: "ई-पिन प्रबंधन" },
    subtitle: { en: "E-PIN Inventory & Lifecycle", hi: "ई-पिन आवंटन व रिकॉर्ड" },
    category: "ADMINISTRATION",
    route: "/dashboard/epin-management",
    iconName: "KeyRound",
    permissionKey: "epin_management",
    enabled: true,
  },

  // --- 1. General Marriage Application ---
  {
    id: "applicant_registration",
    name: { en: "General Marriage Application", hi: "सामान्य आवेदन" },
    subtitle: { en: "General Marriage Application", hi: "सामान्य विवाह आवेदन" },
    category: "SCHEME",
    route: "/dashboard/general-applications",
    iconName: "FileText",
    permissionKey: "applicant_registration",
    enabled: true,
    hasGrantPayment: true,
    hasBulkEmi: true,
  },
  {
    id: "marriage_congratulations",
    name: { en: "General Marriage Congratulation Payment", hi: "विवाह फॉर्म आवेदन पत्र" },
    subtitle: { en: "General Marriage Congratulation Payment", hi: "विवाह बधाई पत्र" },
    category: "SCHEME",
    route: "/dashboard/marriage-congratulations",
    iconName: "Gift",
    permissionKey: "marriage_congratulations",
    enabled: true,
    children: [
      {
        id: "marriage_sewing_machine_distribution",
        name: { en: "Marriage Sewing Machine Distribution", hi: "विवाह सिलाई मशीन वितरण" },
        subtitle: { en: "Marriage Sewing Machine Distribution", hi: "सिलाई मशीन वितरण" },
        category: "SCHEME",
        route: "/dashboard/marriage-congratulations/sewing-machine-distribution",
        iconName: "Scissors",
        permissionKey: "marriage_sewing_machine_distribution",
        enabled: false, // DISABLED MODULE (preserved)
      },
    ],
  },

  // --- 2. Mayra General Application ---
  {
    id: "mayra_registration",
    name: { en: "Mayra General Application", hi: "मायरा फॉर्म आवेदन पत्र" },
    subtitle: { en: "Mayra General Application", hi: "मायरा सामान्य आवेदन" },
    category: "SCHEME",
    route: "/dashboard/mayra-registration",
    iconName: "FileText",
    permissionKey: "mayra_registration",
    enabled: true,
    hasGrantPayment: true,
    hasBulkEmi: true,
    children: [
      {
        id: "mayra_congratulations",
        name: { en: "Mayra Marriage Congratulation Payment", hi: "मायरा बधाई पत्र" },
        subtitle: { en: "Mayra Congratulation Payment", hi: "मायरा बधाई पत्र" },
        category: "SCHEME",
        route: "/dashboard/mayra-congratulations",
        iconName: "Gift",
        permissionKey: "mayra_registration",
        enabled: true,
      },
    ],
  },

  // --- 3. Insurance Bima Application ---
  {
    id: "security_application",
    name: { en: "Insurance Bima Application", hi: "सुरक्षा बीमा हेतु सामान्य आवेदन" },
    subtitle: { en: "Insurance Bima Application", hi: "सुरक्षा बीमा आवेदन" },
    category: "SCHEME",
    route: "/dashboard/general-applications-insurance",
    iconName: "FileText",
    permissionKey: "security_application",
    enabled: true,
    hasGrantPayment: true,
    hasBulkEmi: true,
    children: [
      {
        id: "suraksha_bima_yojana",
        name: { en: "Insurance Bima Payment", hi: "सुरक्षा बीमा योजना" },
        subtitle: { en: "Insurance Bima Payment", hi: "सुरक्षा बीमा योजना" },
        category: "SCHEME",
        route: "/dashboard/suraksha-bima-yojana",
        iconName: "Wallet",
        permissionKey: "suraksha_bima_yojana",
        enabled: true,
      },
    ],
  },

  // --- 4. Janni Delivery Registration Application (Generic Architecture Slot) ---
  {
    id: "janni_delivery",
    name: { en: "Janni Delivery Registration", hi: "जननी प्रसूति पंजीकरण" },
    subtitle: { en: "Janni Delivery Registration Application", hi: "जननी प्रसूति आवेदन" },
    category: "SCHEME",
    route: "/dashboard/janni-delivery",
    iconName: "HeartHandshake",
    permissionKey: "janni_delivery",
    enabled: true,
    isNewSlot: true,
    hasGrantPayment: true,
    children: [
      {
        id: "janni_congress_payment",
        name: { en: "Janni Congress Payment", hi: "जननी प्रसूति बधाई पत्र" },
        subtitle: { en: "Janni Congress Payment", hi: "जननी प्रसूति बधाई पत्र" },
        category: "SCHEME",
        route: "/dashboard/janni-delivery/congress-payment",
        iconName: "Gift",
        permissionKey: "janni_delivery",
        enabled: true,
      },
    ],
  },

  // --- 5. Aawas (Home) Registration Application (Generic Architecture Slot) ---
  {
    id: "aawas_home",
    name: { en: "Aawas (Home) Registration", hi: "आवास योजना पंजीकरण" },
    subtitle: { en: "Aawas (Home) Registration Application", hi: "गृह प्रवेश आवास योजना" },
    category: "SCHEME",
    route: "/dashboard/aawas",
    iconName: "Home",
    permissionKey: "aawas_home",
    enabled: true,
    isNewSlot: true,
    hasGrantPayment: true,
  },

  // --- 6. Lado Bahin Registration Application (Generic Architecture Slot) ---
  {
    id: "lado_bahin",
    name: { en: "Lado Bahin Registration", hi: "लाडो बहिन पंजीकरण" },
    subtitle: { en: "Lado Bahin Registration Application", hi: "लाडो बहिन आवेदन" },
    category: "SCHEME",
    route: "/dashboard/lado-bahin",
    iconName: "Sparkles",
    permissionKey: "lado_bahin",
    enabled: true,
    isNewSlot: true,
    hasGrantPayment: true,
  },

  // --- 7. Dhundhotsav Registration Application (Generic Architecture Slot) ---
  {
    id: "dhundhotsav",
    name: { en: "Dhundhotsav Registration", hi: "ढूंढोत्सव पंजीकरण" },
    subtitle: { en: "Dhundhotsav Registration Application", hi: "ढूंढोत्सव आवेदन" },
    category: "SCHEME",
    route: "/dashboard/dhundhotsav",
    iconName: "Gift",
    permissionKey: "dhundhotsav",
    enabled: true,
    isNewSlot: true,
    hasGrantPayment: true,
  },

  // --- 8. ShubhLaxmi (Deepawali) Registration Application (Generic Architecture Slot) ---
  {
    id: "shubh_laxmi",
    name: { en: "ShubhLaxmi (Deepawali) Registration", hi: "शुभलक्ष्मी पंजीकरण" },
    subtitle: { en: "ShubhLaxmi Registration Application", hi: "शुभलक्ष्मी आवेदन" },
    category: "SCHEME",
    route: "/dashboard/shubh-laxmi",
    iconName: "Sparkles",
    permissionKey: "shubh_laxmi",
    enabled: true,
    isNewSlot: true,
    hasGrantPayment: true,
  },

  // --- 9. Agent Registration & Permissions ---
  {
    id: "agent_registration",
    name: { en: "Agent Registration", hi: "एजेंट आवेदन" },
    subtitle: { en: "Agent Registration", hi: "एजेंट पंजीकरण" },
    category: "ADMINISTRATION",
    route: "/dashboard/agent-registration",
    iconName: "BriefcaseBusiness",
    permissionKey: "agent_registration",
    enabled: true,
    children: [
      {
        id: "agent_permission",
        name: { en: "Agent Permission", hi: "एजेंट की अनुमति" },
        subtitle: { en: "Agent permission", hi: "एजेंट अनुमति" },
        category: "ADMINISTRATION",
        route: "/dashboard/agent-permission",
        iconName: "LockKeyhole",
        permissionKey: "agent_permission",
        enabled: true,
      },
    ],
  },

  // --- 10 & 11 & 12. Agent Commissions & Reports ---
  {
    id: "agent_commission",
    name: { en: "Agent Commission Payment", hi: "एजेंट कमिशन का भुगतान करे" },
    subtitle: { en: "Agents commission Payment", hi: "कमिशन भुगतान" },
    category: "FINANCIAL",
    route: "/dashboard/agent-commission",
    iconName: "FileBarChart",
    permissionKey: "agent_commission",
    enabled: true,
  },
  {
    id: "agent_commission_report",
    name: { en: "Agent Commission Report", hi: "एजेंट कमिशन रिपोर्ट" },
    subtitle: { en: "Agent Commission Report", hi: "कमिशन रिपोर्ट" },
    category: "REPORT",
    route: "/dashboard/agent-commission-report",
    iconName: "FileBarChart",
    permissionKey: "agent_commission_report",
    enabled: true,
  },

  // --- 13, 14, 15. Bulk EMIs ---
  {
    id: "bulk_marriage_emi",
    name: { en: "Bulk Marriage EMI", hi: "बल्क विवाह ईएमआई" },
    subtitle: { en: "Bulk Marriage EMI", hi: "बल्क विवाह ईएमआई" },
    category: "FINANCIAL",
    route: "/dashboard/bulk-marriage-emi",
    iconName: "Receipt",
    permissionKey: "bulk_marriage_emi",
    enabled: true,
  },
  {
    id: "bulk_suraksha_bima_emi",
    name: { en: "Bulk Insurance Bima EMI", hi: "बल्क सुरक्षा बीमा ईएमआई" },
    subtitle: { en: "Bulk Insurance Bima EMI", hi: "बल्क सुरक्षा बीमा ईएमआई" },
    category: "FINANCIAL",
    route: "/dashboard/bulk-suraksha-bima-emi",
    iconName: "Shield",
    permissionKey: "bulk_suraksha_bima_emi",
    enabled: true,
  },
  {
    id: "bulk_mayra_emi",
    name: { en: "Bulk Mayra EMI", hi: "बल्क मायरा ईएमआई" },
    subtitle: { en: "Bulk Mayra EMI", hi: "बल्क मायरा ईएमआई" },
    category: "FINANCIAL",
    route: "/dashboard/bulk-mayra-emi",
    iconName: "Receipt",
    permissionKey: "bulk_mayra_emi",
    enabled: true,
  },

  // --- 16. Payment Management ---
  {
    id: "payment_management",
    name: { en: "Payment Management", hi: "भुगतान प्रबंधन" },
    subtitle: { en: "Payment management", hi: "भुगतान प्रबंधन" },
    category: "FINANCIAL",
    route: "/dashboard/payment-management",
    iconName: "BriefcaseBusiness",
    permissionKey: "payment_management",
    enabled: true,
  },

  // --- Retained Active Modules (Explicitly Preserved) ---
  {
    id: "balika_loan_application",
    name: { en: "Balika Loan Application", hi: "बालिका ऋण आवेदन फॉर्म" },
    subtitle: { en: "Balika loan Application", hi: "बालिका ऋण" },
    category: "FINANCIAL",
    route: "/dashboard/loan-application",
    iconName: "BriefcaseBusiness",
    permissionKey: "balika_loan_application",
    enabled: true, // Retained active per instruction
  },
  {
    id: "financial_help",
    name: { en: "Financial Application Payment", hi: "वित्त सहायता आवेदन" },
    subtitle: { en: "Financial Application Payment", hi: "वित्तीय सहायता" },
    category: "FINANCIAL",
    route: "/dashboard/financal-help",
    iconName: "BriefcaseBusiness",
    permissionKey: "financial_help",
    enabled: true, // Retained active per instruction
  },

  // --- Disabled Modules (Non-Destructive Feature Flag) ---
  {
    id: "disability_cycle_distribution",
    name: { en: "Disability Cycle Distribution", hi: "निशुल्क साइकिल वितरण" },
    subtitle: { en: "Disability Cycle Distribution", hi: "साइकिल वितरण" },
    category: "SCHEME",
    route: "/dashboard/disability-cycle",
    iconName: "Bike",
    permissionKey: "disability_cycle_distribution",
    enabled: false, // DISABLED
  },
  {
    id: "sewing_machine_camp",
    name: { en: "Sewing Machine Camp", hi: "निशुल्क सिलाई मशीन शिविर कैम्प" },
    subtitle: { en: "Sewing Machine Camp", hi: "सिलाई मशीन शिविर" },
    category: "SCHEME",
    route: "/dashboard/sewing-machine",
    iconName: "Scissors",
    permissionKey: "sewing_machine_camp",
    enabled: false, // DISABLED
  },
  {
    id: "salakar_pension_yojana",
    name: { en: "Pension Yojana Application Payment", hi: "सहलाकर पेंशन योजना" },
    subtitle: { en: "Pension Yojana Application Payment", hi: "पेंशन योजना" },
    category: "SCHEME",
    route: "/dashboard/pension-yojana",
    iconName: "IndianRupee",
    permissionKey: "salakar_pension_yojana",
    enabled: false, // DISABLED
  },

  // --- Admin Configuration Screen ---
  {
    id: "system_settings",
    name: { en: "Configuration & Settings", hi: "सिस्टम सेटिंग्स एवं कॉन्फ़िगरेशन" },
    subtitle: { en: "SAF Foundation Central Configuration", hi: "सिस्टम सेटिंग्स" },
    category: "ADMINISTRATION",
    route: "/dashboard/settings/configuration",
    iconName: "Settings",
    permissionKey: "system_settings",
    enabled: true,
  },
];

/**
 * Get flattened list of all modules including nested children.
 */
export function getAllRegistryModules(items: ModuleRegistryItem[] = MODULE_REGISTRY): ModuleRegistryItem[] {
  const result: ModuleRegistryItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children && item.children.length > 0) {
      result.push(...getAllRegistryModules(item.children));
    }
  }
  return result;
}

/**
 * Find module by route
 */
export function getModuleByRoute(route: string): ModuleRegistryItem | undefined {
  const all = getAllRegistryModules();
  return all.find((m) => m.route === route || route.startsWith(`${m.route}/`));
}

/**
 * Find module by id
 */
export function getModuleById(id: string): ModuleRegistryItem | undefined {
  const all = getAllRegistryModules();
  return all.find((m) => m.id === id);
}
