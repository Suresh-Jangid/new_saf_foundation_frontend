"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronsUpDown, Check, X, Loader2, User } from "lucide-react";
import { cn, formatAgentLevel } from "@/lib/utils";

export interface WorkerOption {
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
  name?: string | null;
  applicantName?: string | null;
  fullName?: string | null;
  employeeName?: string | null;
  agentName?: string | null;
  mobile?: string | null;
  mobileNumber?: string | null;
  phone?: string | null;
  offlineFormNumber?: string | null;
  offline_form_number?: string | null;
  offlineFormNo?: string | null;
  level?: string | number | null;
  employeeId?: string | null;
  employee_id?: string | null;
  agentProfile?: {
    id?: string | number;
    userId?: string | number;
    offlineFormNumber?: string | null;
    offline_form_number?: string | null;
    level?: string | number | null;
    employeeId?: string | null;
    mobile?: string | null;
  } | null;
  agent_profile?: any;
  hierarchy?: any;
  is_active?: number | boolean;
  status?: string;
}

export interface DefaultOptionConfig {
  value: string;
  label: string;
  secondary?: string;
}

export interface WorkerSearchSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  agents: WorkerOption[];
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  defaultOption?: DefaultOptionConfig | null;
  className?: string;
  id?: string;
  required?: boolean;
}

/**
 * Format Worker option for 2-line display:
 * Line 1: [Offline Form Number] — [Worker Name] (or just Name if no offline code)
 * Line 2: [Mobile Number] • Level [X]
 */
export function formatWorkerOption(worker: WorkerOption): {
  primary: string;
  secondary: string;
  offline: string;
  name: string;
  mobile: string;
  level: string;
} {
  const offline = String(
    worker.offlineFormNumber ||
      worker.offline_form_number ||
      worker.offlineFormNo ||
      worker.agentProfile?.offlineFormNumber ||
      worker.agentProfile?.offline_form_number ||
      ""
  ).trim();

  const name = String(
    worker.name ||
      worker.applicantName ||
      worker.fullName ||
      worker.employeeName ||
      worker.agentName ||
      "कार्यकर्ता"
  ).trim();

  const mobile = String(
    worker.mobile ||
      worker.mobileNumber ||
      worker.phone ||
      worker.agentProfile?.mobile ||
      ""
  ).trim();

  const rawLevel =
    worker.level ??
    worker.agentProfile?.level ??
    worker.hierarchy?.level;
  const level = formatAgentLevel(rawLevel);

  const primary = offline ? `${offline} — ${name}` : name;
  const secondary = mobile ? `${mobile} • ${level}` : level;

  return { primary, secondary, offline, name, mobile, level };
}

/**
 * Fast, case-insensitive multi-field search for workers:
 * 1. Offline Form Number
 * 2. Worker Name
 * 3. Mobile Number
 */
export function matchesWorkerSearch(worker: WorkerOption, searchTerm: string): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;
  const term = searchTerm.trim().toLowerCase();

  const offline = String(
    worker.offlineFormNumber ||
      worker.offline_form_number ||
      worker.offlineFormNo ||
      worker.agentProfile?.offlineFormNumber ||
      worker.agentProfile?.offline_form_number ||
      worker.employeeId ||
      worker.employee_id ||
      ""
  ).toLowerCase();

  const name = String(
    worker.name ||
      worker.applicantName ||
      worker.fullName ||
      worker.employeeName ||
      worker.agentName ||
      ""
  ).toLowerCase();

  const mobile = String(
    worker.mobile ||
      worker.mobileNumber ||
      worker.phone ||
      worker.agentProfile?.mobile ||
      ""
  ).toLowerCase();

  // 1. Offline form number
  if (offline && offline.includes(term)) return true;

  // 2. Name
  if (name && name.includes(term)) return true;

  // 3. Mobile
  if (mobile && mobile.includes(term)) return true;
  const cleanTermDigits = term.replace(/\D/g, "");
  if (cleanTermDigits.length >= 3 && mobile.replace(/\D/g, "").includes(cleanTermDigits)) {
    return true;
  }

  return false;
}

export function WorkerSearchSelector({
  value,
  onValueChange,
  agents = [],
  disabled = false,
  isLoading = false,
  placeholder = "कार्यकर्ता का नाम चुनें / Select Worker Name",
  defaultOption = null,
  className,
  id = "selectedAgentId",
}: WorkerSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm("");
    }
  }, [open]);

  // Filter out invalid/inactive agents
  const validAgents = useMemo(() => {
    if (!Array.isArray(agents)) return [];
    return agents.filter((worker) => {
      if (!worker) return false;
      if (worker.is_active === 0 || worker.is_active === false || worker.status === "inactive") {
        return false;
      }
      return true;
    });
  }, [agents]);

  // Filtered by search term (offlineFormNumber, name, mobile)
  const filteredAgents = useMemo(() => {
    if (!searchTerm.trim()) return validAgents;
    return validAgents.filter((w) => matchesWorkerSearch(w, searchTerm));
  }, [validAgents, searchTerm]);

  // Check if default option (e.g. Self/Admin) matches search term
  const showDefaultOption = useMemo(() => {
    if (!defaultOption) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const lbl = defaultOption.label.toLowerCase();
    const sec = (defaultOption.secondary || "").toLowerCase();
    return (
      lbl.includes(term) ||
      sec.includes(term) ||
      term.includes("self") ||
      term.includes("admin") ||
      term.includes("स्वयं")
    );
  }, [defaultOption, searchTerm]);

  // Find currently selected worker object
  const selectedWorker = useMemo(() => {
    if (!value || (defaultOption && value === defaultOption.value)) return null;
    const valStr = String(value).trim();
    return (
      validAgents.find((w) => {
        const wId = String(w.id ?? "").trim();
        const uId = String(w.userId ?? w.user_id ?? "").trim();
        return (wId && wId === valStr) || (uId && uId === valStr);
      }) || null
    );
  }, [validAgents, value, defaultOption]);

  // Compute trigger button display label
  const triggerLabel = useMemo(() => {
    // 1. Default Option (e.g. Self / Admin)
    if (defaultOption && (!value || value === defaultOption.value)) {
      return {
        primary: defaultOption.label,
        secondary: defaultOption.secondary || "",
        isDefault: true,
      };
    }

    // 2. Selected Worker
    if (selectedWorker) {
      const { primary, secondary } = formatWorkerOption(selectedWorker);
      return {
        primary,
        secondary,
        isDefault: false,
      };
    }

    // 3. Fallback for preselected ID in edit mode if worker not yet loaded
    if (value && value.trim() !== "") {
      return {
        primary: `चयनित कार्यकर्ता (ID: ${value})`,
        secondary: "कार्यकर्ता रिकॉर्ड लोड हुआ",
        isDefault: false,
      };
    }

    // 4. Placeholder
    return {
      primary: placeholder,
      secondary: "",
      isDefault: false,
    };
  }, [value, selectedWorker, defaultOption, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between h-auto min-h-[42px] py-2 px-3 bg-background text-left font-normal border hover:bg-accent/50",
            className
          )}
        >
          <div className="flex flex-col truncate text-left mr-2 min-w-0">
            <span
              className={cn(
                "text-sm font-medium truncate",
                triggerLabel.isDefault
                  ? "text-emerald-800 font-semibold"
                  : selectedWorker
                  ? "text-gray-900"
                  : "text-muted-foreground"
              )}
            >
              {triggerLabel.primary}
            </span>
            {triggerLabel.secondary ? (
              <span
                className={cn(
                  "text-xs truncate mt-0.5",
                  triggerLabel.isDefault ? "text-emerald-600 font-medium" : "text-gray-500"
                )}
              >
                {triggerLabel.secondary}
              </span>
            ) : null}
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground ml-auto" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[500px] p-0 shadow-lg border"
        align="start"
      >
        <div className="flex flex-col bg-popover rounded-md overflow-hidden">
          {/* Search Input Bar */}
          <div className="flex items-center border-b px-3 py-2 bg-muted/20">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ऑफलाइन फॉर्म नं, नाम, मोबाइल से खोजें..."
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
            {/* Optional Default Option (Self / Admin / No Specific Worker) */}
            {defaultOption && showDefaultOption && (
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-emerald-50",
                  (!value || value === defaultOption.value) &&
                    "bg-emerald-50/80 border border-emerald-200"
                )}
                onClick={() => {
                  onValueChange(defaultOption.value);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-emerald-950 truncate">
                    {defaultOption.label}
                  </span>
                  {defaultOption.secondary && (
                    <span className="text-xs text-emerald-700 mt-0.5 truncate">
                      {defaultOption.secondary}
                    </span>
                  )}
                </div>
                {(!value || value === defaultOption.value) && (
                  <Check className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                )}
              </button>
            )}

            {/* List of Matching Workers */}
            {filteredAgents.map((worker) => {
              const wId = String(worker.id ?? worker.userId ?? worker.user_id ?? "");
              const isSelected =
                value &&
                (value === wId ||
                  (selectedWorker &&
                    String(selectedWorker.id ?? selectedWorker.userId ?? "") === wId));
              const { primary, secondary } = formatWorkerOption(worker);

              return (
                <button
                  key={wId || `${worker.name}-${worker.mobile}`}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-accent",
                    isSelected && "bg-accent/80 border border-primary/30"
                  )}
                  onClick={() => {
                    onValueChange(wId);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    {/* Line 1: [Offline Form Number] — [Worker Name] */}
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {primary}
                    </span>
                    {/* Line 2: [Mobile Number] • Level [X] */}
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

            {/* Empty State */}
            {!showDefaultOption && filteredAgents.length === 0 && (
              <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                <User className="h-6 w-6 mx-auto mb-1 text-muted-foreground/40" />
                कोई कार्यकर्ता नहीं मिला / No worker found matching &ldquo;{searchTerm}&rdquo;
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
