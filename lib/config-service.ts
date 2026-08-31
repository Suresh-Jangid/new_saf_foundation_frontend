import api, { post, syncAuthSession } from "@/lib/api";
import { getBackendOrigin } from "./api-url";
import {
  AppConfig,
  SchemeType,
  AgeSlab,
  PoolConfig,
  DeductionConfig,
  DEFAULT_APP_CONFIG,
  DEFAULT_SCHEME_TYPES,
  DEFAULT_AGE_SLABS,
  DEFAULT_POOLS,
  DEFAULT_DEDUCTIONS,
} from "./config-types";
import { getAllRegistryModules } from "@/config/module-registry";

/**
 * In-memory client cache for resolved backend configuration
 */
let cachedAppConfig: AppConfig = { ...DEFAULT_APP_CONFIG };
let cachedSchemeTypes: SchemeType[] = [...DEFAULT_SCHEME_TYPES];
let cachedAgeSlabs: AgeSlab[] = [...DEFAULT_AGE_SLABS];
let cachedPools: PoolConfig[] = [...DEFAULT_POOLS];
let cachedDeductions: DeductionConfig[] = [...DEFAULT_DEDUCTIONS];
let moduleEnabledMap: Record<string, boolean> = {};

// Initialize module enabled map from registry
getAllRegistryModules().forEach((m) => {
  moduleEnabledMap[m.id] = m.enabled;
});

/**
 * Centralized Configuration Service
 *
 * Backend is authoritative. This service calls backend Phase 2-A configuration APIs
 * (/api/v1/config/application), updates in-memory cache, and provides safe fallbacks
 * when backend is unreachable or endpoints return partial data.
 */
export const ConfigService = {
  /**
   * Fetch Application Meta (Name, Support Mobile, Default Deductions)
   * Autoritative Backend Route: GET /api/v1/config/application
   */
  async getAppConfig(forceRefresh = false): Promise<AppConfig> {
    try {
      syncAuthSession();
      // 1. Primary: RESTful endpoint from Phase 2-A Backend
      let response: any = await api
        .get(`${getBackendOrigin()}/api/v1/config/application`)
        .catch(() => null);

      // 2. Secondary fallback: Legacy query dispatcher
      if (!response?.data) {
        response = await post("?apicall=getAppConfig").catch(() => null);
      }

      if (response?.data) {
        const payload = response.data.data || response.data;

        // Populate AppConfig
        if (payload) {
          cachedAppConfig = {
            ...DEFAULT_APP_CONFIG,
            appName: payload.appName || payload.name || DEFAULT_APP_CONFIG.appName,
            appSubtitle: payload.appSubtitle || payload.subtitle || DEFAULT_APP_CONFIG.appSubtitle,
            officialMobile: payload.officialMobile || payload.mobile || DEFAULT_APP_CONFIG.officialMobile,
            supportEmail: payload.supportEmail || payload.email || DEFAULT_APP_CONFIG.supportEmail,
            defaultDeductionPercent: Number(payload.defaultDeductionPercent ?? payload.deductionPercent ?? DEFAULT_APP_CONFIG.defaultDeductionPercent),
            insuranceDeductionPercent: Number(payload.insuranceDeductionPercent ?? DEFAULT_APP_CONFIG.insuranceDeductionPercent),
            agentCommissionPercent: Number(payload.agentCommissionPercent ?? DEFAULT_APP_CONFIG.agentCommissionPercent),
            updatedAt: payload.updatedAt || payload.updated_at,
          };
        }

        // If backend embeds schemeTypes in unified config
        if (Array.isArray(payload.schemeTypes)) {
          cachedSchemeTypes = payload.schemeTypes.map((item: any) => ({
            id: String(item.id || item.code),
            code: String(item.code || `SCHEME_${item.amount}`),
            name: item.name || `₹${item.amount} Scheme`,
            amount: Number(item.amount),
            status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            effectiveFrom: item.effectiveFrom,
            effectiveTo: item.effectiveTo,
            description: item.description,
          }));
        }

        // If backend embeds ageSlabs in unified config
        if (Array.isArray(payload.ageSlabs)) {
          cachedAgeSlabs = payload.ageSlabs.map((item: any) => ({
            id: String(item.id || item.code),
            code: String(item.code),
            minAge: Number(item.minAge ?? item.min_age),
            maxAge: Number(item.maxAge ?? item.max_age),
            fee: Number(item.fee ?? item.amount),
            label: item.label || `${item.code} (${item.minAge ?? item.min_age}–${item.maxAge ?? item.max_age} Years)`,
            status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            description: item.description,
          }));
        }

        // If backend embeds pools in unified config
        if (Array.isArray(payload.pools)) {
          cachedPools = payload.pools.map((item: any) => ({
            id: String(item.id || item.code),
            code: String(item.code),
            name: item.name,
            nameHi: item.nameHi || item.name_hi,
            allowedGenders: Array.isArray(item.allowedGenders) ? item.allowedGenders : [item.gender || "All"],
            status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          }));
        }

        // If backend embeds deductions in unified config
        if (Array.isArray(payload.deductions)) {
          cachedDeductions = payload.deductions.map((item: any) => ({
            id: String(item.id),
            schemeId: item.schemeId || item.scheme_id,
            schemeName: item.schemeName || item.scheme_name,
            percent: Number(item.percent),
            description: item.description,
            status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          }));
        }

        // If backend embeds module statuses in unified config
        if (payload.moduleStatuses && typeof payload.moduleStatuses === "object") {
          moduleEnabledMap = {
            ...moduleEnabledMap,
            ...payload.moduleStatuses,
          };
        }
      }
    } catch {
      // Graceful fallback to default config
    }
    return cachedAppConfig;
  },

  /**
   * Get cached or synchronous App Config
   */
  getAppConfigSync(): AppConfig {
    return cachedAppConfig;
  },

  /**
   * Fetch Dynamic Scheme Types (e.g. ₹300, ₹500, ₹1000, ₹1500)
   */
  async getSchemeTypes(forceRefresh = false): Promise<SchemeType[]> {
    try {
      if (forceRefresh) {
        await this.getAppConfig(true);
      }
      const response = await post("?apicall=getSchemeTypes").catch(() => null);
      if (response?.data?.status && Array.isArray(response.data.data)) {
        cachedSchemeTypes = response.data.data.map((item: any) => ({
          id: String(item.id || item.code),
          code: String(item.code || `SCHEME_${item.amount}`),
          name: item.name || `₹${item.amount} Scheme`,
          amount: Number(item.amount),
          status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          effectiveFrom: item.effectiveFrom,
          effectiveTo: item.effectiveTo,
          description: item.description,
        }));
      }
    } catch {
      // Graceful fallback to default scheme types
    }
    return cachedSchemeTypes;
  },

  /**
   * Get cached synchronous Scheme Types
   */
  getSchemeTypesSync(): SchemeType[] {
    return cachedSchemeTypes.filter((s) => s.status === "ACTIVE");
  },

  /**
   * Fetch Dynamic A–F Age Slabs (A=1–5: ₹1500 to F=22+: ₹11000)
   */
  async getAgeSlabs(forceRefresh = false): Promise<AgeSlab[]> {
    try {
      if (forceRefresh) {
        await this.getAppConfig(true);
      }
      const response = await post("?apicall=getAgeSlabs").catch(() => null);
      if (response?.data?.status && Array.isArray(response.data.data)) {
        cachedAgeSlabs = response.data.data.map((item: any) => ({
          id: String(item.id || item.code),
          code: String(item.code),
          minAge: Number(item.minAge ?? item.min_age),
          maxAge: Number(item.maxAge ?? item.max_age),
          fee: Number(item.fee ?? item.amount),
          label: item.label || `${item.code} (${item.minAge}–${item.maxAge} Years)`,
          status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          description: item.description,
        }));
      }
    } catch {
      // Graceful fallback to default age slabs
    }
    return cachedAgeSlabs;
  },

  /**
   * Get cached synchronous Age Slabs
   */
  getAgeSlabsSync(): AgeSlab[] {
    return cachedAgeSlabs.filter((s) => s.status === "ACTIVE");
  },

  /**
   * Resolve Age Category & Fee from Age Number
   */
  resolveAgeCategory(ageNum: number, slabs: AgeSlab[] = cachedAgeSlabs): { category: string; fee: string; slab?: AgeSlab } {
    if (isNaN(ageNum) || ageNum < 0) {
      return { category: "", fee: "" };
    }

    const activeSlabs = slabs.filter((s) => s.status === "ACTIVE");
    const matchedSlab = activeSlabs.find((slab) => ageNum >= slab.minAge && ageNum <= slab.maxAge);

    if (matchedSlab) {
      return {
        category: matchedSlab.code,
        fee: String(matchedSlab.fee),
        slab: matchedSlab,
      };
    }

    return { category: "", fee: "" };
  },

  /**
   * Fetch Pools Configuration (Female Pool / Male Pool)
   */
  async getPools(forceRefresh = false): Promise<PoolConfig[]> {
    try {
      if (forceRefresh) {
        await this.getAppConfig(true);
      }
      const response = await post("?apicall=getPools").catch(() => null);
      if (response?.data?.status && Array.isArray(response.data.data)) {
        cachedPools = response.data.data.map((item: any) => ({
          id: String(item.id || item.code),
          code: String(item.code),
          name: item.name,
          nameHi: item.nameHi || item.name_hi,
          allowedGenders: Array.isArray(item.allowedGenders) ? item.allowedGenders : [item.gender || "All"],
          status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        }));
      }
    } catch {
      // Graceful fallback to default pools
    }
    return cachedPools;
  },

  /**
   * Get cached synchronous Pools
   */
  getPoolsSync(): PoolConfig[] {
    return cachedPools.filter((p) => p.status === "ACTIVE");
  },

  /**
   * Fetch Administrative Deductions
   */
  async getDeductions(forceRefresh = false): Promise<DeductionConfig[]> {
    try {
      if (forceRefresh) {
        await this.getAppConfig(true);
      }
      const response = await post("?apicall=getDeductions").catch(() => null);
      if (response?.data?.status && Array.isArray(response.data.data)) {
        cachedDeductions = response.data.data.map((item: any) => ({
          id: String(item.id),
          schemeId: item.schemeId || item.scheme_id,
          schemeName: item.schemeName || item.scheme_name,
          percent: Number(item.percent),
          description: item.description,
          status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        }));
      }
    } catch {
      // Graceful fallback
    }
    return cachedDeductions;
  },

  /**
   * Resolve deduction percent for a specific scheme or default
   */
  getDeductionPercentForScheme(schemeId?: string): number {
    if (schemeId) {
      const specific = cachedDeductions.find(
        (d) => d.status === "ACTIVE" && d.schemeId === schemeId
      );
      if (specific) return specific.percent;
    }
    const defaultDed = cachedDeductions.find((d) => d.id === "ded-default");
    return defaultDed ? defaultDed.percent : cachedAppConfig.defaultDeductionPercent || 15;
  },

  /**
   * Check whether a module is enabled
   */
  isModuleEnabled(moduleId: string): boolean {
    if (moduleId in moduleEnabledMap) {
      return moduleEnabledMap[moduleId];
    }
    const regItem = getAllRegistryModules().find((m) => m.id === moduleId);
    return regItem ? regItem.enabled : true;
  },

  /**
   * Fetch Module Status from Backend
   */
  async refreshModuleStatuses(): Promise<Record<string, boolean>> {
    try {
      await this.getAppConfig(true);
      const response = await post("?apicall=getModuleStatuses").catch(() => null);
      if (response?.data?.status && response.data.data) {
        moduleEnabledMap = {
          ...moduleEnabledMap,
          ...response.data.data,
        };
      }
    } catch {
      // Preserve current map
    }
    return moduleEnabledMap;
  },
};

export default ConfigService;
