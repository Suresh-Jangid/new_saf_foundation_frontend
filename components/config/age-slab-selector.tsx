"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgeSlabs } from "@/hooks/use-app-config";
import { AgeSlab } from "@/lib/config-types";

interface AgeSlabSelectorProps {
  value?: string;
  onValueChange: (value: string, selectedSlab?: AgeSlab) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const AgeSlabSelector: React.FC<AgeSlabSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select Age Slab / आयु श्रेणी चुनें",
  className,
}) => {
  const { ageSlabs, loading } = useAgeSlabs();

  const handleSelect = (val: string) => {
    const selected = ageSlabs.find((s) => s.id === val || s.code === val);
    onValueChange(val, selected);
  };

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading slabs..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ageSlabs.map((slab) => (
          <SelectItem key={slab.id} value={slab.code}>
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="font-medium">
                Category {slab.code} ({slab.minAge}–{slab.maxAge} Yrs)
              </span>
              <span className="text-xs text-muted-foreground font-mono">₹{slab.fee.toLocaleString("en-IN")}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
