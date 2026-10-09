"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EpinService } from "@/lib/epin-service";
import { EpinRecord, EpinValidationResponse } from "@/lib/config-types";
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  UserCheck,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EpinInputVerifierProps {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (result: EpinValidationResponse | null) => void;
  required?: boolean;
  agentId?: string;
  schemeCode?: string;
  className?: string;
  disabled?: boolean;
  externalError?: string | null;
  onClearExternalError?: () => void;
}

export const EpinInputVerifier: React.FC<EpinInputVerifierProps> = ({
  value,
  onChange,
  onVerified,
  required = false,
  agentId,
  schemeCode,
  className,
  disabled = false,
  externalError,
  onClearExternalError,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<EpinValidationResponse | null>(null);

  // Agent-wise Active E-PIN State
  const [availableEpins, setAvailableEpins] = useState<EpinRecord[]>([]);
  const [isLoadingEpins, setIsLoadingEpins] = useState(false);
  const [epinFetchError, setEpinFetchError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Track previous agentId to immediately clear previous PIN when agent changes
  const prevAgentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const cleanAgentId = agentId ? String(agentId).trim() : "";
    if (prevAgentIdRef.current !== undefined && prevAgentIdRef.current !== cleanAgentId) {
      // Agent changed: immediately clear previous PIN and verification
      onChange("");
      setValidationResult(null);
      if (onVerified) onVerified(null);
      if (onClearExternalError) onClearExternalError();
    }
    prevAgentIdRef.current = cleanAgentId;
  }, [agentId, onChange, onVerified, onClearExternalError]);

  // Fetch eligible E-PINs for the selected agent
  useEffect(() => {
    let isMounted = true;
    const cleanAgentId = agentId ? String(agentId).trim() : "";

    if (!cleanAgentId) {
      setAvailableEpins([]);
      setIsLoadingEpins(false);
      setEpinFetchError(null);
      return;
    }

    setIsLoadingEpins(true);
    setEpinFetchError(null);

    EpinService.getEligibleEpinsForAgent(cleanAgentId, schemeCode)
      .then((pins) => {
        if (!isMounted) return;
        setAvailableEpins(pins);
        setIsLoadingEpins(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setAvailableEpins([]);
        setIsLoadingEpins(false);
        setEpinFetchError(
          err?.response?.data?.message || err?.message || "Failed to load agent E-PINs"
        );
      });

    return () => {
      isMounted = false;
    };
  }, [agentId, schemeCode, retryCounter]);

  const handleValidate = useCallback(
    async (epinCodeToValidate?: string) => {
      const epinCode = (epinCodeToValidate ?? value).trim();
      if (onClearExternalError) onClearExternalError();
      if (!epinCode) {
        setValidationResult(null);
        if (onVerified) onVerified(null);
        return;
      }

      setIsValidating(true);
      try {
        const result = await EpinService.validateEpin(epinCode, agentId);
        setValidationResult(result);
        if (onVerified) onVerified(result);
      } catch {
        const errorResult: EpinValidationResponse = {
          valid: false,
          pinNumber: epinCode,
          message: "E-PIN service unavailable / सेवा अनुपलब्ध है",
          code: "UNAVAILABLE",
        };
        setValidationResult(errorResult);
        if (onVerified) onVerified(errorResult);
      } finally {
        setIsValidating(false);
      }
    },
    [value, agentId, onVerified, onClearExternalError]
  );

  const handleSelectEpin = (selectedCode: string) => {
    if (!selectedCode) return;
    if (onClearExternalError) onClearExternalError();
    onChange(selectedCode);
    handleValidate(selectedCode);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, "");
    if (onClearExternalError) onClearExternalError();
    onChange(val);
    if (validationResult) {
      setValidationResult(null);
      if (onVerified) onVerified(null);
    }
  };

  const hasExternalConflict = Boolean(externalError && externalError.trim());
  const effectiveResult: EpinValidationResponse | null = hasExternalConflict
    ? {
        valid: false,
        pinNumber: value,
        message: externalError!,
        code: "ALREADY_USED",
      }
    : validationResult;

  const isAgentSelected = Boolean(agentId && String(agentId).trim());

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header Label and Status */}
      <div className="flex items-center justify-between">
        <Label htmlFor="epinInput" className="flex items-center gap-1.5 text-xs font-semibold">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          <span>E-PIN Voucher Code / ई-पिन वाउचर कोड</span>
          {required ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-normal">(Optional)</span>
          )}
        </Label>

        {effectiveResult && (
          <span
            className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              effectiveResult.valid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {effectiveResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Valid (₹{effectiveResult.schemeAmount || 0})</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>{effectiveResult.code}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Agent-Wise Eligible E-PIN Dropdown Section */}
      <div className="rounded-md border bg-slate-50/70 dark:bg-slate-900/40 p-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Agent-Assigned Active E-PINs / एजेंट के सक्रिय ई-पिन</span>
          </span>
          {isAgentSelected && (
            <span className="text-[11px] text-muted-foreground">
              {isLoadingEpins ? (
                "Checking PINs..."
              ) : (
                <span className="font-semibold text-primary">
                  {availableEpins.length} Available
                </span>
              )}
            </span>
          )}
        </div>

        {/* State 1: Agent Not Selected */}
        {!isAgentSelected && (
          <div className="flex items-center gap-2 p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <UserCheck className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Select an Agent in the form above to view and choose from their active assigned E-PINs.
              <br />
              (सक्रिय ई-पिन सूची देखने के लिए कृपया ऊपर कार्यकर्ता/एजेंट का चयन करें।)
            </span>
          </div>
        )}

        {/* State 2: Loading Available E-PINs */}
        {isAgentSelected && isLoadingEpins && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/40 text-[11px] text-muted-foreground animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Loading active E-PINs assigned to this agent... / एजेंट के ई-पिन लोड हो रहे हैं...</span>
          </div>
        )}

        {/* State 3: Fetch Error with Retry */}
        {isAgentSelected && !isLoadingEpins && epinFetchError && (
          <div className="flex items-center justify-between gap-2 p-2 rounded bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span>{epinFetchError}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRetryCounter((c) => c + 1)}
              className="h-6 px-2 text-[10px] text-rose-700 hover:text-rose-900 hover:bg-rose-100 dark:text-rose-300"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry / पुनः प्रयास
            </Button>
          </div>
        )}

        {/* State 4: Available E-PINs Dropdown */}
        {isAgentSelected && !isLoadingEpins && !epinFetchError && availableEpins.length > 0 && (
          <div className="space-y-1.5">
            <select
              id="epinDropdownSelector"
              value={value || ""}
              onChange={(e) => handleSelectEpin(e.target.value)}
              disabled={disabled || isValidating}
              className="w-full text-xs font-mono h-9 px-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
            >
              <option value="">
                -- Click to select an active E-PIN ({availableEpins.length} available) / ई-पिन चुनें --
              </option>
              {availableEpins.map((epin) => {
                const amountText = epin.amount ? `₹${epin.amount.toLocaleString("hi-IN")}` : "";
                const schemeText = epin.schemeCode ? `[${epin.schemeCode}]` : "";
                return (
                  <option key={epin.id || epin.pinCode} value={epin.pinCode}>
                    {epin.pinCode} {amountText ? `• ${amountText}` : ""} {schemeText}
                  </option>
                );
              })}
            </select>
            <p className="text-[10px] text-muted-foreground">
              💡 Selecting a PIN auto-fills and verifies it below. Manual voucher entry remains active.
            </p>
          </div>
        )}

        {/* State 5: No Eligible E-PINs Available */}
        {isAgentSelected && !isLoadingEpins && !epinFetchError && availableEpins.length === 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-slate-100/80 dark:bg-slate-800/60 text-[11px] text-muted-foreground">
            <Inbox className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>
              No active assigned E-PINs found for this agent. You may manually type a voucher code below if available.
              <br />
              (इस एजेंट के पास कोई सक्रिय ई-पिन नहीं है। यदि आपके पास कोड है तो नीचे मैन्युअल दर्ज करें।)
            </span>
          </div>
        )}
      </div>

      {/* Manual Input Box with Verify Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="epinInput"
            placeholder="e.g. EPIN-XXXX-XXXX-XXXX"
            value={value}
            onChange={handleInputChange}
            onBlur={() => {
              if (value.trim().length >= 4 && !validationResult && !hasExternalConflict) {
                handleValidate();
              }
            }}
            disabled={disabled || isValidating}
            className={cn(
              "font-mono uppercase tracking-wider text-sm",
              effectiveResult?.valid && "border-emerald-500 bg-emerald-50/20",
              effectiveResult && !effectiveResult.valid && "border-rose-500 bg-rose-50/20"
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleValidate()}
          disabled={disabled || isValidating || !value.trim()}
          className="shrink-0 text-xs px-3"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Verify / जांचें"
          )}
        </Button>
      </div>

      {/* Validation Result Feedback Banner */}
      {effectiveResult && (
        <div
          className={cn(
            "p-2.5 rounded-lg border text-xs flex items-start gap-2",
            effectiveResult.valid
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50/70 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
          )}
        >
          {effectiveResult.valid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <div className="space-y-0.5">
            <div className="font-medium">{effectiveResult.message}</div>
            {effectiveResult.valid && effectiveResult.schemeAmount ? (
              <div className="text-[11px] opacity-85">
                Voucher value ₹{effectiveResult.schemeAmount.toLocaleString("hi-IN")} will be applied to this registration.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
