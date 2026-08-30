"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EpinState } from "@/lib/config-types";
import { CheckCircle2, UserCheck, KeyRound, Ban, ArrowRight } from "lucide-react";

interface EpinBadgeProps {
  status: EpinState | string;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  EpinState,
  { label: string; labelHi: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ACTIVE: {
    label: "ACTIVE",
    labelHi: "सक्रिय",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  ASSIGNED: {
    label: "ASSIGNED",
    labelHi: "आवंटित",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    icon: UserCheck,
  },
  USED: {
    label: "USED",
    labelHi: "प्रयुक्त",
    className: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    icon: KeyRound,
  },
  BURNT: {
    label: "BURNT",
    labelHi: "रद्द / समाप्त",
    className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    icon: Ban,
  },
};

export const EpinBadge: React.FC<EpinBadgeProps> = ({ status, className, showIcon = true }) => {
  const normalizedStatus = (status?.toUpperCase() || "ACTIVE") as EpinState;
  const config = statusConfig[normalizedStatus] || statusConfig.ACTIVE;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("px-2.5 py-0.5 font-medium transition-colors gap-1.5 inline-flex items-center", config.className, className)}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{config.label}</span>
      <span className="text-[10px] opacity-75 font-normal">({config.labelHi})</span>
    </Badge>
  );
};

interface EpinLifecycleFlowProps {
  currentStatus: EpinState | string;
  className?: string;
}

export const EpinLifecycleFlow: React.FC<EpinLifecycleFlowProps> = ({ currentStatus, className }) => {
  const normalized = (currentStatus?.toUpperCase() || "ACTIVE") as EpinState;
  const isBurnt = normalized === "BURNT";

  const states: EpinState[] = isBurnt ? ["ACTIVE", "ASSIGNED", "BURNT"] : ["ACTIVE", "ASSIGNED", "USED"];

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-muted/30 rounded-lg border text-sm", className)}>
      <span className="text-xs text-muted-foreground font-medium mr-1">E-PIN Lifecycle:</span>
      {states.map((st, index) => {
        const isCurrent = st === normalized;
        const isPast =
          (normalized === "ASSIGNED" && st === "ACTIVE") ||
          (normalized === "USED" && (st === "ACTIVE" || st === "ASSIGNED")) ||
          (normalized === "BURNT" && (st === "ACTIVE" || st === "ASSIGNED"));

        return (
          <React.Fragment key={st}>
            {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold transition-all",
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isPast
                  ? "text-muted-foreground line-through opacity-70"
                  : "text-muted-foreground/50"
              )}
            >
              {st}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
