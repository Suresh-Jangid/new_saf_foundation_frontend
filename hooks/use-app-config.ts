"use client";

import { useState, useEffect, useCallback } from "react";
import ConfigService from "@/lib/config-service";
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
  ModuleRegistryItem,
} from "@/lib/config-types";
import { MODULE_REGISTRY, getAllRegistryModules } from "@/config/module-registry";

/**
 * Hook to consume application metadata configuration (Name, Support Phone, Default Deductions)
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(ConfigService.getAppConfigSync());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    ConfigService.getAppConfig()
      .then((data) => {
        if (isMounted) setConfig(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { config, loading };
}

/**
 * Hook to consume dynamic Scheme Types (e.g. ₹300, ₹500, ₹1000, ₹1500)
 */
export function useSchemeTypes() {
  const [schemeTypes, setSchemeTypes] = useState<SchemeType[]>(ConfigService.getSchemeTypesSync());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    ConfigService.getSchemeTypes()
      .then((data) => {
        if (isMounted) setSchemeTypes(data.filter((s) => s.status === "ACTIVE"));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { schemeTypes, loading };
}

/**
 * Hook to consume active Age Slabs (A=1–5: ₹1500 to F=22+: ₹11000)
 */
export function useAgeSlabs() {
  const [ageSlabs, setAgeSlabs] = useState<AgeSlab[]>(ConfigService.getAgeSlabsSync());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    ConfigService.getAgeSlabs()
      .then((data) => {
        if (isMounted) setAgeSlabs(data.filter((s) => s.status === "ACTIVE"));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { ageSlabs, loading };
}

/**
 * Hook to consume Pool configuration (Female Pool / Male Pool)
 */
export function usePools() {
  const [pools, setPools] = useState<PoolConfig[]>(ConfigService.getPoolsSync());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    ConfigService.getPools()
      .then((data) => {
        if (isMounted) setPools(data.filter((p) => p.status === "ACTIVE"));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { pools, loading };
}

/**
 * Hook to consume Administrative Deductions
 */
export function useDeductions() {
  const [deductions, setDeductions] = useState<DeductionConfig[]>(DEFAULT_DEDUCTIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    ConfigService.getDeductions()
      .then((data) => {
        if (isMounted) setDeductions(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getDeductionForScheme = useCallback(
    (schemeId?: string) => {
      return ConfigService.getDeductionPercentForScheme(schemeId);
    },
    []
  );

  return { deductions, getDeductionForScheme, loading };
}

/**
 * Hook to check enabled status of a module
 */
export function useModuleStatus(moduleId: string) {
  const [isEnabled, setIsEnabled] = useState<boolean>(ConfigService.isModuleEnabled(moduleId));

  useEffect(() => {
    setIsEnabled(ConfigService.isModuleEnabled(moduleId));
  }, [moduleId]);

  return { isEnabled };
}

/**
 * Hook to get all registry modules with active/disabled statuses
 */
export function useAllModules() {
  const [modules, setModules] = useState<ModuleRegistryItem[]>(MODULE_REGISTRY);

  useEffect(() => {
    setModules(MODULE_REGISTRY);
  }, []);

  return { modules, allModulesFlat: getAllRegistryModules(modules) };
}

export const useModules = useAllModules;

