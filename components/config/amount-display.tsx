"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AmountDisplayProps {
  amount: number | string | undefined | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSymbol?: boolean;
  prefix?: string;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  className,
  size = "md",
  showSymbol = true,
  prefix = "",
}) => {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "0")) || 0;
  const formatted = num.toLocaleString("en-IN");

  const sizeClasses = {
    sm: "text-xs font-medium",
    md: "text-sm font-semibold",
    lg: "text-base sm:text-lg font-bold",
    xl: "text-xl sm:text-2xl font-black",
  };

  return (
    <span className={cn("inline-flex items-baseline font-mono", sizeClasses[size], className)}>
      {prefix && <span className="mr-1 text-muted-foreground font-normal">{prefix}</span>}
      {showSymbol && <span className="mr-0.5">₹</span>}
      <span>{formatted}</span>
    </span>
  );
};
