"use client"

import React, { memo } from "react"
import { Label } from "@/components/ui/label"

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
}

export const SelectField = memo<SelectFieldProps>(({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  required = false
}) => {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="w-full border rounded px-3 py-2 mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
})

SelectField.displayName = "SelectField"
