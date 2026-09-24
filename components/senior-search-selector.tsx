"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronsUpDown, Check, X } from "lucide-react";
import { cn, formatAgentLevel, formatSeniorOptionLabel, matchesSeniorSearch } from "@/lib/utils";

export interface EligibleSenior {
  id?: string;
  userId?: string;
  user_id?: string;
  employee_id?: string;
  employeeId?: string;
  employeeCode?: string;
  code?: string;
  name?: string;
  fullName?: string;
  employeeName?: string;
  level?: string | number;
  designation?: string;
  is_active?: number | boolean;
  status?: string;
  offlineFormNumber?: string | null;
  offline_form_number?: string | null;
  mobile?: string;
  mobileNumber?: string;
  mobile_number?: string;
}

interface SeniorSearchSelectorProps {
  value: string; // "direct_admin" or empty string for root, or senior user ID
  onValueChange: (value: string) => void;
  eligibleSeniors: EligibleSenior[];
  disabled?: boolean;
  excludeId?: string; // e.g. current agent's ID in edit form
  placeholder?: string;
  className?: string;
}

export function SeniorSearchSelector({
  value,
  onValueChange,
  eligibleSeniors,
  disabled = false,
  excludeId,
  placeholder = "सीनियर कर्मचारी चुनें / Select Senior",
  className,
}: SeniorSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [open]);

  // Filter out excluded ID (e.g. self in edit mode) and inactive/deleted agents
  const validSeniors = useMemo(() => {
    return eligibleSeniors.filter((senior) => {
      if (!senior) return false;
      const sId = String(senior.id || senior.userId || senior.user_id || "");
      if (excludeId && sId === excludeId) return false;
      if (senior.is_active === 0 || senior.is_active === false || senior.status === "inactive") return false;
      return true;
    });
  }, [eligibleSeniors, excludeId]);

  // Filtered by search term (offlineFormNumber, name, mobile, level)
  const filteredSeniors = useMemo(() => {
    if (!searchTerm.trim()) return validSeniors;
    return validSeniors.filter((s) => matchesSeniorSearch(s, searchTerm));
  }, [validSeniors, searchTerm]);

  // Check if Direct Under Admin matches current search
  const showDirectAdmin = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      term.includes("admin") ||
      term.includes("direct") ||
      term.includes("root") ||
      term.includes("level-1") ||
      term.includes("level 1") ||
      term === "1"
    );
  }, [searchTerm]);

  // Find currently selected senior object
  const selectedSenior = useMemo(() => {
    if (!value || value === "direct_admin") return null;
    return validSeniors.find(
      (s) =>
        String(s.id || s.userId || s.user_id) === value ||
        (s.employeeId && s.employeeId === value) ||
        (s.employee_id && s.employee_id === value)
    );
  }, [validSeniors, value]);

  // Compute trigger button display label
  const triggerLabel = useMemo(() => {
    if (!value || value === "direct_admin") {
      return {
        primary: "सीधे Admin के अंतर्गत / Direct Under Admin",
        secondary: "LEVEL-1 Senior",
        isDirectAdmin: true,
      };
    }
    if (selectedSenior) {
      const { primary, secondary } = formatSeniorOptionLabel(selectedSenior);
      return {
        primary,
        secondary,
        isDirectAdmin: false,
      };
    }
    return {
      primary: placeholder,
      secondary: "",
      isDirectAdmin: false,
    };
  }, [value, selectedSenior, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="seniorEmployeeId"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-[42px] py-2 px-3 bg-background text-left font-normal border hover:bg-accent/50",
            className
          )}
        >
          <div className="flex flex-col truncate text-left mr-2 min-w-0">
            <span
              className={cn(
                "text-sm font-medium truncate",
                triggerLabel.isDirectAdmin ? "text-emerald-800 font-semibold" : "text-gray-900"
              )}
            >
              {triggerLabel.primary}
            </span>
            {triggerLabel.secondary ? (
              <span
                className={cn(
                  "text-xs truncate mt-0.5",
                  triggerLabel.isDirectAdmin ? "text-emerald-600 font-medium" : "text-gray-500"
                )}
              >
                {triggerLabel.secondary}
              </span>
            ) : null}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[480px] p-0" align="start">
        <div className="flex flex-col bg-popover rounded-md shadow-md overflow-hidden">
          {/* Search Input Bar */}
          <div className="flex items-center border-b px-3 py-2 bg-muted/20">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ऑफलाइन फॉर्म नं, नाम, मोबाइल, लेवल से खोजें..."
              className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm placeholder:text-muted-foreground/70"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
            {/* Direct under admin option */}
            {showDirectAdmin && (
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-emerald-50",
                  (!value || value === "direct_admin") && "bg-emerald-50/80 border border-emerald-200"
                )}
                onClick={() => {
                  onValueChange("direct_admin");
                  setOpen(false);
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-emerald-950">
                    सीधे Admin के अंतर्गत / Direct Under Admin
                  </span>
                  <span className="text-xs text-emerald-700 mt-0.5">
                    LEVEL-1 Senior • Direct Root
                  </span>
                </div>
                {(!value || value === "direct_admin") && (
                  <Check className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                )}
              </button>
            )}

            {/* List of matching seniors */}
            {filteredSeniors.map((senior) => {
              const sId = String(senior.id || senior.userId || senior.user_id || senior.employee_id || "");
              const isSelected = value && (value === sId || (selectedSenior && String(selectedSenior.id || selectedSenior.userId) === sId));
              const { primary, secondary } = formatSeniorOptionLabel(senior);

              return (
                <button
                  key={sId}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-accent",
                    isSelected && "bg-accent/80 border border-primary/30"
                  )}
                  onClick={() => {
                    onValueChange(sId);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    {/* Primary line: OFFLINE-FORM-NO — NAME */}
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {primary}
                    </span>
                    {/* Secondary line: LEVEL-N • MOBILE */}
                    <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                      {secondary}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}

            {/* No matches empty state */}
            {!showDirectAdmin && filteredSeniors.length === 0 && (
              <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                कोई एजेंट नहीं मिला / No agents found matching &ldquo;{searchTerm}&rdquo;
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
