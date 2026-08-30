"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "ACTIVE" | "INACTIVE" | "PAID" | "PENDING" | "FAILED" | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const norm = String(status || "").toUpperCase();

  let colorClasses = "bg-gray-100 text-gray-800 border-gray-200";
  if (norm === "ACTIVE" || norm === "PAID" || norm === "1" || norm === "SUCCESS") {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
  } else if (norm === "INACTIVE" || norm === "FAILED" || norm === "BURNT" || norm === "0") {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
  } else if (norm === "PENDING" || norm === "ASSIGNED") {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
  }

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-medium text-xs uppercase tracking-wide", colorClasses, className)}>
      {norm || "UNKNOWN"}
    </Badge>
  );
};
