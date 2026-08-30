"use client"

import React, { memo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InputFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange?: (value: string) => void
  type?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  maxLength?: number
  inputMode?: "numeric" | "text"
}

export const InputField = memo<InputFieldProps>(({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  readOnly = false,
  maxLength,
  inputMode
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    
    let newValue = e.target.value
    
    // Handle numeric input validation
    if (type === "number" && inputMode === "numeric") {
      newValue = newValue.replace(/\D/g, '')
      if (maxLength) {
        newValue = newValue.slice(0, maxLength)
      }
    }
    
    onChange(newValue)
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
      />
    </div>
  )
})

InputField.displayName = "InputField"
