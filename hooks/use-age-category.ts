"use client";

import { useMemo } from "react";
import ConfigService from "@/lib/config-service";
import { AgeSlab } from "@/lib/config-types";
import { parseDateFromDDMMYYYY } from "@/lib/utils";

/**
 * Safely compute age in full completed years from date string (supports YYYY-MM-DD or DD-MM-YYYY)
 */
export function calculateAgeFromDate(dob: string): number {
  if (!dob) return NaN;

  let birthDate: Date | null = null;
  if (dob.includes("-")) {
    const parts = dob.split("-");
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      birthDate = new Date(dob);
    } else {
      // DD-MM-YYYY
      birthDate = parseDateFromDDMMYYYY(dob) || null;
    }
  } else {
    birthDate = new Date(dob);
  }

  if (!birthDate || isNaN(birthDate.getTime())) {
    return NaN;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Hook to resolve age, category, and fee from Date of Birth against dynamic configuration slabs.
 * Backend configuration remains authoritative.
 */
export function useAgeCategory(dateOfBirth: string, customSlabs?: AgeSlab[]) {
  const { age, category, fee, slab } = useMemo(() => {
    if (!dateOfBirth) {
      return { age: "", category: "", fee: "", slab: undefined };
    }

    const calculatedAge = calculateAgeFromDate(dateOfBirth);
    if (isNaN(calculatedAge) || calculatedAge < 0) {
      return { age: "", category: "", fee: "", slab: undefined };
    }

    const resolution = ConfigService.resolveAgeCategory(
      calculatedAge,
      customSlabs || ConfigService.getAgeSlabsSync()
    );

    return {
      age: calculatedAge.toString(),
      category: resolution.category,
      fee: resolution.fee,
      slab: resolution.slab,
    };
  }, [dateOfBirth, customSlabs]);

  return { age, category, fee, slab };
}
