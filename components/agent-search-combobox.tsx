"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X, AlertCircle, RotateCcw } from "lucide-react";
import { defaultFilter } from "cmdk";
import { cn } from "@/lib/utils";

export interface AgentOption {
  id: string;
  name: string;
  employee_id?: string | null;
  employeeId?: string | null;
  offlineFormNumber?: string | null;
  offline_form_number?: string | null;
  mobile?: string | null;
  mobileNumber?: string | null;
  village?: string | null;
}

export interface AgentSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  agents: AgentOption[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
  allowClear?: boolean;
}

/**
 * High-precision, forgiving multi-field search filter for agents:
 * 1. Exact or partial substring matching across name, employee_id, offlineFormNumber, mobile
 * 2. Multi-word search (e.g. "mamta 066", "118 9928")
 * 3. Stripped alphanumeric matching (e.g. "EMP066" matches "EMP-066", "118" matches "NGO/26/118")
 * 4. Fallback to cmdk's defaultFilter
 */
function customAgentFilter(value: string, search: string, keywords?: string[]): number {
  if (!search) return 1;
  const term = search.trim().toLowerCase();
  const val = value.toLowerCase();

  // 1. Direct substring in value string
  if (val.includes(term)) return 1;

  // 2. Check explicitly provided keywords
  if (keywords && keywords.some((k) => k && k.toLowerCase().includes(term))) {
    return 1;
  }

  // 3. Multi-word query (e.g. "mamta 066" or "emp 066" or "118 9928")
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const allWordsMatch = words.every((word) => {
      if (val.includes(word)) return true;
      const cleanW = word.replace(/[^a-z0-9]/g, "");
      const cleanV = val.replace(/[^a-z0-9]/g, "");
      return cleanW && cleanV.includes(cleanW);
    });
    if (allWordsMatch) return 0.95;
  }

  // 4. Strip non-alphanumeric characters for fuzzy code / phone / offline number matches
  const cleanTerm = term.replace(/[^a-z0-9]/g, "");
  const cleanVal = val.replace(/[^a-z0-9]/g, "");
  if (cleanTerm && cleanVal.includes(cleanTerm)) return 0.9;

  // 5. Fall back to cmdk's built-in defaultFilter
  if (defaultFilter) {
    return defaultFilter(val, term, keywords) || 0;
  }
  return 0;
}

export function AgentSearchCombobox({
  value,
  onValueChange,
  agents = [],
  isLoading = false,
  error = null,
  onRetry,
  disabled = false,
  placeholder = "एजेंट चुनें / Select Agent",
  searchPlaceholder = "नाम, कर्मचारी ID, ऑफलाइन नंबर, मोबाइल से खोजें...",
  emptyMessage = "कोई एजेंट नहीं मिला / No agent found matching your search",
  className,
  triggerClassName,
  id = "agent-search-combobox",
  allowClear = true,
}: AgentSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  // Find currently selected agent object
  const selectedAgent = useMemo(() => {
    if (!value) return null;
    const strVal = String(value).trim();
    return (
      agents.find((a) => {
        if (!a) return false;
        return (
          String(a.id).trim() === strVal ||
          String(a.employee_id || a.employeeId || "").trim() === strVal
        );
      }) || null
    );
  }, [agents, value]);

  // Format selected agent for trigger label display
  const selectedDetails = useMemo(() => {
    if (!selectedAgent) return null;
    const name = selectedAgent.name || "Unnamed Agent";
    const empId = selectedAgent.employee_id || selectedAgent.employeeId || "";
    const offlineNo =
      selectedAgent.offlineFormNumber ||
      selectedAgent.offline_form_number ||
      "";
    const mobile = selectedAgent.mobile || selectedAgent.mobileNumber || "";
    return { name, empId, offlineNo, mobile };
  }, [selectedAgent]);

  // If there's an API error, present the error state with retry action
  if (error) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between p-2.5 border border-red-200 rounded-md bg-red-50 text-xs text-red-700">
          <div className="flex items-center gap-1.5 min-w-0 mr-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="truncate">{error}</span>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs text-red-700 hover:bg-red-100 shrink-0 font-medium"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

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
            "w-full justify-between h-auto min-h-[42px] py-1.5 px-3 bg-background text-left font-normal border hover:bg-accent/50",
            triggerClassName,
            className
          )}
        >
          <div className="flex flex-col text-left truncate mr-2 min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading agents...</span>
              </div>
            ) : selectedDetails ? (
              <>
                <span className="text-sm font-medium text-foreground truncate">
                  {selectedDetails.name}
                  {selectedDetails.empId ? ` (${selectedDetails.empId})` : ""}
                </span>
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  {selectedDetails.offlineNo ? (
                    <span className="text-emerald-700 font-medium">
                      फॉर्म: {selectedDetails.offlineNo}
                    </span>
                  ) : null}
                  {selectedDetails.offlineNo && selectedDetails.mobile ? <span>•</span> : null}
                  {selectedDetails.mobile ? <span>{selectedDetails.mobile}</span> : null}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground truncate">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {allowClear && value && !disabled && !isLoading && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange("");
                  }
                }}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Clear selection"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[500px] p-0 shadow-lg border"
        align="start"
      >
        <Command filter={customAgentFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>
              <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {agents.map((agent) => {
                const empId = agent.employee_id || agent.employeeId || "";
                const offlineNo =
                  agent.offlineFormNumber ||
                  agent.offline_form_number ||
                  "";
                const mobile = agent.mobile || agent.mobileNumber || "";
                const isSelected = String(agent.id) === String(value);

                // Value string that cmdk filters on
                const filterValue = `${agent.name} ${empId} ${offlineNo} ${mobile} ${agent.id} ${agent.village || ""}`;
                const keywords = [
                  agent.name,
                  empId,
                  offlineNo,
                  mobile,
                  agent.village || "",
                ].filter(Boolean) as string[];

                return (
                  <CommandItem
                    key={agent.id}
                    value={filterValue}
                    keywords={keywords}
                    onSelect={() => {
                      onValueChange(String(agent.id));
                      setOpen(false);
                    }}
                    className="flex items-start justify-between py-2 px-3 cursor-pointer data-[selected=true]:bg-accent"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          isSelected ? "text-primary opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        {/* Line 1: Agent Name + Employee ID badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate">
                            {agent.name}
                          </span>
                          {empId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              {empId}
                            </span>
                          )}
                        </div>

                        {/* Line 2: Offline Form No + Mobile Number + Village */}
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {offlineNo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <span className="text-[10px] uppercase font-semibold text-emerald-800/80">ऑफलाइन:</span>
                              <span className="font-mono">{offlineNo}</span>
                            </span>
                          ) : null}
                          {offlineNo && mobile ? <span>•</span> : null}
                          {mobile ? (
                            <span className="font-mono">{mobile}</span>
                          ) : null}
                          {agent.village ? (
                            <>
                              <span>•</span>
                              <span className="truncate text-slate-500">{agent.village}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
