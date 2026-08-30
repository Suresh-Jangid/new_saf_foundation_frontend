"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePools } from "@/hooks/use-app-config";
import { PoolConfig } from "@/lib/config-types";

interface PoolSelectorProps {
  value?: string;
  onValueChange: (value: string, selectedPool?: PoolConfig) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const PoolSelector: React.FC<PoolSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select Pool / पूल चुनें",
  className,
}) => {
  const { pools, loading } = usePools();

  const handleSelect = (val: string) => {
    const selected = pools.find((p) => p.id === val || p.code === val);
    onValueChange(val, selected);
  };

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading pools..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {pools.map((pool) => (
          <SelectItem key={pool.id} value={pool.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{pool.name}</span>
              {pool.nameHi && <span className="text-xs text-muted-foreground">({pool.nameHi})</span>}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
