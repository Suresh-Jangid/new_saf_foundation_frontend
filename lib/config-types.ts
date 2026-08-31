/**
 * Centralized Configuration Types for SAF Foundation
 * Backend is authoritative; these types represent the contract consumed by frontend services, hooks, and UI.
 */

export interface AppConfig {
  appName: string;
  appSubtitle: string;
  officialMobile: string;
  supportEmail?: string;
  defaultDeductionPercent: number;
  insuranceDeductionPercent: number;
  agentCommissionPercent: number;
  updatedAt?: string;
}

export interface SchemeType {
  id: string;
  code: string;
  name: string;
  amount: number;
  status: "ACTIVE" | "INACTIVE";
  effectiveFrom?: string;
  effectiveTo?: string;
  description?: string;
}

export interface AgeSlab {
  id: string;
  code: "A" | "B" | "C" | "D" | "E" | "F" | string;
  minAge: number;
  maxAge: number;
  fee: number;
  label: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
}

export interface PoolConfig {
  id: "FEMALE" | "MALE" | string;
  code: string;
  name: string;
  nameHi?: string;
  allowedGenders: string[];
  status: "ACTIVE" | "INACTIVE";
}

export interface DeductionConfig {
  id: string;
  schemeId?: string;
  schemeName?: string;
  percent: number;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

export type EpinState = "ACTIVE" | "ASSIGNED" | "USED" | "BURNT";

export interface EpinRecord {
  id: string;
  pinNumber: string;
  pinCode?: string;
  batchNumber?: string;
  schemeTypeId?: string;
  schemeCode?: string;
  slabCode?: string;
  schemeAmount: number;
  amount?: number;
  poolId?: string;
  status: EpinState;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedDate?: string;
  assignedAt?: string;
  applicationId?: string;
  applicantName?: string;
  usedByApplicationId?: string;
  usedByApplicantName?: string;
  usedDate?: string;
  usedAt?: string;
  burntReason?: string;
  burntDate?: string;
  burntAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EpinAuditItem {
  id: string;
  epinId: string;
  pinNumber: string;
  action: "GENERATED" | "ASSIGNED" | "USED" | "BURNT" | "VALIDATED" | string;
  previousState?: EpinState | string;
  newState: EpinState | string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  remarks?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface EpinFilterParams {
  status?: EpinState | "ALL";
  agentId?: string;
  search?: string;
  batchNumber?: string;
  schemeAmount?: number;
  schemeTypeId?: string;
  poolId?: string;
  page?: number;
  limit?: number;
}

export interface EpinGeneratePayload {
  count: number;
  schemeAmount: number;
  schemeTypeId?: string;
  poolId?: string;
  remarks?: string;
}

export interface EpinAssignPayload {
  epinIds: string[];
  agentId: string;
  agentName?: string;
  remarks?: string;
}

export interface EpinValidationResponse {
  valid: boolean;
  status?: EpinState;
  pinNumber: string;
  schemeAmount?: number;
  amount?: number;
  schemeTypeId?: string;
  schemeCode?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  message: string;
  code: "VALID" | "INVALID" | "ALREADY_USED" | "BURNT" | "NOT_ASSIGNED" | "UNAUTHORIZED" | "UNAVAILABLE";
}

export interface EpinConsumePayload {
  pinNumber: string;
  applicationId: string;
  applicantName: string;
  agentId?: string;
  moduleType?: string;
  remarks?: string;
}

export interface EpinBurnPayload {
  epinId: string;
  pinNumber?: string;
  reason: string;
}

export interface EpinSummaryCounts {
  total: number;
  active: number;
  assigned: number;
  used: number;
  burnt: number;
}

export type EpinSummary = EpinSummaryCounts;

export interface EpinAuditResponse {
  success: boolean;
  data: EpinAuditItem[];
  message?: string;
}

export interface ModuleRegistryItem {
  id: string;
  name: { en: string; hi: string };
  subtitle?: { en: string; hi: string };
  category: "SCHEME" | "FINANCIAL" | "ADMINISTRATION" | "REPORT";
  route: string;
  iconName: string;
  permissionKey: string;
  enabled: boolean;
  isNewSlot?: boolean;
  hasGrantPayment?: boolean;
  hasBulkEmi?: boolean;
  children?: ModuleRegistryItem[];
}

/**
 * Safe client fallback constants.
 * Used for initial rendering while backend configuration resolves, or in offline/fallback state.
 * Backend API responses will override these values dynamically.
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: "SAF Foundation",
  appSubtitle: "SAF Foundation Social & Welfare Portal",
  officialMobile: "9950730637",
  defaultDeductionPercent: 15,
  insuranceDeductionPercent: 10,
  agentCommissionPercent: 15,
};

export const DEFAULT_SCHEME_TYPES: SchemeType[] = [
  { id: "st-300", code: "SCHEME_300", name: "₹300 Scheme", amount: 300, status: "ACTIVE" },
  { id: "st-500", code: "SCHEME_500", name: "₹500 Scheme", amount: 500, status: "ACTIVE" },
  { id: "st-1000", code: "SCHEME_1000", name: "₹1,000 Scheme", amount: 1000, status: "ACTIVE" },
  { id: "st-1500", code: "SCHEME_1500", name: "₹1,500 Scheme", amount: 1500, status: "ACTIVE" },
];

export const DEFAULT_AGE_SLABS: AgeSlab[] = [
  { id: "slab-a", code: "A", minAge: 1, maxAge: 5, fee: 1500, label: "A (1–5 Years)", status: "ACTIVE" },
  { id: "slab-b", code: "B", minAge: 6, maxAge: 10, fee: 3100, label: "B (6–10 Years)", status: "ACTIVE" },
  { id: "slab-c", code: "C", minAge: 11, maxAge: 15, fee: 5100, label: "C (11–15 Years)", status: "ACTIVE" },
  { id: "slab-d", code: "D", minAge: 16, maxAge: 18, fee: 8100, label: "D (16–18 Years)", status: "ACTIVE" },
  { id: "slab-e", code: "E", minAge: 19, maxAge: 21, fee: 10000, label: "E (19–21 Years)", status: "ACTIVE" },
  { id: "slab-f", code: "F", minAge: 22, maxAge: 120, fee: 11000, label: "F (22+ Years)", status: "ACTIVE" },
];

export const DEFAULT_POOLS: PoolConfig[] = [
  { id: "FEMALE", code: "FEMALE", name: "Female Pool", nameHi: "महिला पूल", allowedGenders: ["Female", "female", "महिला"], status: "ACTIVE" },
  { id: "MALE", code: "MALE", name: "Male Pool", nameHi: "पुरुष पूल", allowedGenders: ["Male", "male", "पुरुष"], status: "ACTIVE" },
];

export const DEFAULT_DEDUCTIONS: DeductionConfig[] = [
  { id: "ded-default", percent: 15, description: "Standard Administrative Deduction (15%)", status: "ACTIVE" },
  { id: "ded-marriage", schemeId: "general_marriage", schemeName: "General Marriage", percent: 20, description: "Marriage Grant Administrative Deduction (20%)", status: "ACTIVE" },
  { id: "ded-mayra", schemeId: "mayra", schemeName: "Mayra", percent: 20, description: "Mayra Grant Administrative Deduction (20%)", status: "ACTIVE" },
  { id: "ded-insurance", schemeId: "insurance_bima", schemeName: "Insurance Bima", percent: 10, description: "Insurance Claim Administrative Deduction (10%)", status: "ACTIVE" },
];

export const EPIN_STATES: readonly EpinState[] = ["ACTIVE", "ASSIGNED", "USED", "BURNT"] as const;
