"use client";

import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EpinService } from "@/lib/epin-service";
import { EpinValidationResponse } from "@/lib/config-types";
import { KeyRound, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EpinInputVerifierProps {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (result: EpinValidationResponse | null) => void;
  required?: boolean;
  agentId?: string;
  className?: string;
  disabled?: boolean;
}

export const EpinInputVerifier: React.FC<EpinInputVerifierProps> = ({
  value,
  onChange,
  onVerified,
  required = false,
  agentId,
  className,
  disabled = false,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<EpinValidationResponse | null>(null);

  const handleValidate = useCallback(
    async (pinToValidate?: string) => {
      const pin = (pinToValidate ?? value).trim();
      if (!pin) {
        setValidationResult(null);
        if (onVerified) onVerified(null);
        return;
      }

      setIsValidating(true);
      try {
        const result = await EpinService.validateEpin(pin, agentId);
        setValidationResult(result);
        if (onVerified) onVerified(result);
      } catch {
        const errorResult: EpinValidationResponse = {
          valid: false,
          pinNumber: pin,
          message: "E-PIN service unavailable / सेवा अनुपलब्ध है",
          code: "UNAVAILABLE",
        };
        setValidationResult(errorResult);
        if (onVerified) onVerified(errorResult);
      } finally {
        setIsValidating(false);
      }
    },
    [value, agentId, onVerified]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, "");
    onChange(val);
    if (validationResult) {
      setValidationResult(null);
      if (onVerified) onVerified(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
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

        {validationResult && (
          <span
            className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              validationResult.valid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {validationResult.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Valid (₹{validationResult.schemeAmount || 0})</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>{validationResult.code}</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="epinInput"
            placeholder="e.g. SAF-2026-XXXX"
            value={value}
            onChange={handleInputChange}
            onBlur={() => {
              if (value.trim().length >= 4 && !validationResult) {
                handleValidate();
              }
            }}
            disabled={disabled || isValidating}
            className={cn(
              "font-mono uppercase tracking-wider text-sm",
              validationResult?.valid && "border-emerald-500 bg-emerald-50/20",
              validationResult && !validationResult.valid && "border-rose-500 bg-rose-50/20"
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

      {validationResult && (
        <div
          className={cn(
            "p-2.5 rounded-lg border text-xs flex items-start gap-2",
            validationResult.valid
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50/70 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
          )}
        >
          {validationResult.valid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <div className="space-y-0.5">
            <div className="font-medium">{validationResult.message}</div>
            {validationResult.valid && validationResult.schemeAmount ? (
              <div className="text-[11px] opacity-85">
                Voucher value ₹{validationResult.schemeAmount.toLocaleString("hi-IN")} will be applied to this registration.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
