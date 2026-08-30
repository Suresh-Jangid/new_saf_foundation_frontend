"use client";

import React, { memo, useMemo, useCallback, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
interface OptimizedDataTableProps {
  data: any[];
  columns: any[];
  loading?: boolean;
  onRefresh?: () => void;
  onFilter?: (filters: Record<string, any>) => void;
  onExport?: () => void;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  className?: string;
}

// Memoized search input component
const SearchInput = memo(({ 
  value, 
  onChange, 
  placeholder = "Search..." 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

// Memoized filter component
const FilterSelect = memo(({ 
  value, 
  onChange, 
  options, 
  placeholder = "Filter..." 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
  placeholder?: string;
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

FilterSelect.displayName = 'FilterSelect';

// Memoized action buttons component
const ActionButtons = memo(({ 
  onRefresh, 
  onExport, 
  loading = false 
}: { 
  onRefresh?: () => void; 
  onExport?: () => void; 
  loading?: boolean;
}) => {
  return (
    <div className="flex items-center space-x-2">
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      )}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center space-x-1"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      )}
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

export const OptimizedDataTable = memo(({
  data,
  columns,
  loading = false,
  onRefresh,
  onFilter,
  onExport,
  searchable = true,
  filterable = true,
  exportable = true,
  refreshable = true,
  className = "",
}: OptimizedDataTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    let result = data;
    
    // Apply search filter
    if (searchTerm && searchable) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        result = result.filter((item) => String(item[key]).toLowerCase() === value.toLowerCase());
      }
    });
    
    return result;
  }, [data, searchTerm, filters, searchable]);

  // Memoize unique filter options
  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {};
    
    columns.forEach((column) => {
      if (column.filterable && column.accessorKey) {
        const uniqueValues = Array.from(
          new Set(data.map((item) => String(item[column.accessorKey])))
        );
        options[column.accessorKey] = uniqueValues.map((value) => ({
          value,
          label: value,
        }));
      }
    });
    
    return options;
  }, [data, columns]);

  // Memoize event handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    }
  }, [onExport]);

  // Apply filters to parent component
  React.useEffect(() => {
    if (onFilter) {
      onFilter({ search: searchTerm, ...filters });
    }
  }, [searchTerm, filters, onFilter]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {searchable && (
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search records..."
            />
          )}
          
          {filterable && Object.keys(filterOptions).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filterOptions).map(([key, options]) => (
                <FilterSelect
                  key={key}
                  value={filters[key] || "all"}
                  onChange={(value) => handleFilterChange(key, value)}
                  options={[{ value: "all", label: "All" }, ...options]}
                  placeholder={`Filter by ${key}...`}
                />
              ))}
            </div>
          )}
        </div>
        
        <ActionButtons
          onRefresh={refreshable ? handleRefresh : undefined}
          onExport={exportable ? handleExport : undefined}
          loading={loading}
        />
      </div>

      {/* Data Table */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Data Table</h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {columns.map((column, index) => (
                    <th key={index} className="text-left p-2 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-gray-50">
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className="p-2">
                        {column.render 
                          ? column.render(row[column.key as keyof typeof row], row)
                          : String(row[column.key as keyof typeof row] || '')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Results summary */}
      <div className="text-sm text-gray-500">
        Showing {filteredData.length} of {data.length} records
        {searchTerm && ` (filtered by "${searchTerm}")`}
      </div>
    </div>
  );
});

OptimizedDataTable.displayName = 'OptimizedDataTable';
