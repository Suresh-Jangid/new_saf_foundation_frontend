"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  lookupPostalPincode,
  PincodeLookupResponse,
  PostOfficeRecord,
  sanitizeBlockName,
} from "@/lib/postal-pincode-service";

export interface LocationFoundData {
  state: string;
  district: string;
  tehsil: string;
  city?: string;
  village?: string;
  postOffices: PostOfficeRecord[];
  localities: string[];
  selectedPostOffice?: PostOfficeRecord;
}

export interface UsePincodeLookupOptions {
  pinCode: string;
  onLocationFound?: (data: LocationFoundData) => void;
  debounceMs?: number;
  initialPinCode?: string;
  isEditMode?: boolean;
}

export function usePincodeLookup({
  pinCode,
  onLocationFound,
  debounceMs = 350,
  initialPinCode = "",
  isEditMode = false,
}: UsePincodeLookupOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<PincodeLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostOffice, setSelectedPostOffice] = useState<PostOfficeRecord | null>(null);

  // Keep track of the initial PIN to avoid overwriting existing saved data on mount in Edit mode
  const initialPinRef = useRef<string>(initialPinCode || (isEditMode ? pinCode : ""));
  const lastFetchedPinRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const onLocationFoundRef = useRef(onLocationFound);
  onLocationFoundRef.current = onLocationFound;

  // Sync initialPinRef if loaded asynchronously in Edit forms
  useEffect(() => {
    if (initialPinCode && !initialPinRef.current) {
      initialPinRef.current = initialPinCode;
    }
  }, [initialPinCode]);

  useEffect(() => {
    if (isEditMode && pinCode && !initialPinRef.current) {
      initialPinRef.current = pinCode;
    }
  }, [isEditMode, pinCode]);

  // Clean 6-digit digits
  const cleanPin = (pinCode || "").replace(/\D/g, "").slice(0, 6);

  const performLookup = useCallback(
    async (codeToLookup: string, force = false) => {
      if (codeToLookup.length !== 6) {
        setIsLoading(false);
        setLookupResult(null);
        setError(null);
        setSelectedPostOffice(null);
        return;
      }

      // If already fetched this exact pin and not forced, skip
      if (!force && lastFetchedPinRef.current === codeToLookup && lookupResult) {
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const result = await lookupPostalPincode(codeToLookup, {
          signal: controller.signal,
          timeoutMs: 6000,
        });

        // Ensure response is still for the latest requested PIN
        if (codeToLookup !== cleanPin && cleanPin.length === 6) {
          return;
        }

        lastFetchedPinRef.current = codeToLookup;
        setLookupResult(result);

        if (result.status === "success") {
          setError(null);
          const firstPO = result.postOffices[0] || null;
          setSelectedPostOffice(firstPO);

          if (onLocationFoundRef.current) {
            onLocationFoundRef.current({
              state: result.state,
              district: result.district,
              tehsil: result.tehsil,
              city: result.city || result.district,
              village: firstPO?.name || "",
              postOffices: result.postOffices,
              localities: result.localities,
              selectedPostOffice: firstPO,
            });
          }
        } else if (result.status === "not_found") {
          setError(result.message || "पिन कोड नहीं मिला / No records found");
        } else {
          setError(result.message || "पिन कोड सेवा अनुपलब्ध / Postal service error");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError("पिन कोड खोजने में विफल / Failed to lookup PIN code");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cleanPin, lookupResult]
  );

  useEffect(() => {
    // If empty or incomplete, reset
    if (cleanPin.length < 6) {
      setIsLoading(false);
      setError(null);
      setLookupResult(null);
      setSelectedPostOffice(null);
      return;
    }

    // Guard: In edit mode or initial mount, do not auto-overwrite if PIN hasn't changed from saved initial value
    if (initialPinRef.current && cleanPin === initialPinRef.current && !lastFetchedPinRef.current) {
      // Just populate available postOffices silently in background without invoking onLocationFound overwrite
      lookupPostalPincode(cleanPin)
        .then((res) => {
          if (res.status === "success") {
            setLookupResult(res);
            setSelectedPostOffice(res.postOffices[0] || null);
            lastFetchedPinRef.current = cleanPin;
          }
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(() => {
      performLookup(cleanPin);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [cleanPin, debounceMs, performLookup]);

  const selectPostOfficeByName = useCallback(
    (name: string) => {
      if (!lookupResult?.postOffices) return null;
      const found = lookupResult.postOffices.find((po) => po.name === name) || null;
      setSelectedPostOffice(found);
      if (found && onLocationFoundRef.current) {
        const block = sanitizeBlockName(found.block);
        onLocationFoundRef.current({
          state: found.state || lookupResult.state,
          district: found.district || lookupResult.district,
          tehsil: block || lookupResult.tehsil,
          city: found.district || lookupResult.district,
          village: found.name,
          postOffices: lookupResult.postOffices,
          localities: lookupResult.localities,
          selectedPostOffice: found,
        });
      }
      return found;
    },
    [lookupResult]
  );

  return {
    isLoading,
    error,
    lookupResult,
    postOffices: lookupResult?.postOffices || [],
    localities: lookupResult?.localities || [],
    selectedPostOffice,
    selectPostOfficeByName,
    refetch: () => performLookup(cleanPin, true),
  };
}
