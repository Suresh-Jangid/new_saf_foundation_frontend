"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSchemeTypes } from "@/hooks/use-app-config";
import { SchemeType } from "@/lib/config-types";

interface SchemeTypeSelectorProps {
  value?: string;
  onValueChange: (value: string, selectedScheme?: SchemeType) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const SchemeTypeSelector: React.FC<SchemeTypeSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select Scheme Type / योजना प्रकार चुनें",
  className,
}) => {
  const { schemeTypes, loading } = useSchemeTypes();

  const handleSelect = (val: string) => {
    const selected = schemeTypes.find((s) => s.id === val || s.code === val || String(s.amount) === val);
    onValueChange(val, selected);
  };

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading schemes..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {schemeTypes.map((scheme) => (
          <SelectItem key={scheme.id} value={String(scheme.amount)}>
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="font-medium">{scheme.name}</span>
              <span className="text-xs text-muted-foreground font-mono">₹{scheme.amount.toLocaleString("en-IN")}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
