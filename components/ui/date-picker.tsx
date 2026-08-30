"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate, formatDateForInput, parseDateFromDDMMYYYY, isValidDate } from "@/lib/utils"

interface DatePickerProps {
  value: string
  onChange: (date: Date | null) => void
  id: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function DatePicker({ 
  value, 
  onChange, 
  id, 
  placeholder = "dd-mm-yyyy",
  required = false,
  disabled = false,
  className = ""
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [dateObj, setDateObj] = React.useState<Date | null>(
    value ? parseDateFromDDMMYYYY(value) || null : null
  )
  const [inputValue, setInputValue] = React.useState(value || "")
  const lastValueRef = React.useRef(value)
  
  // Update input value when external value changes
  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      setInputValue(value || "")
      setDateObj(value ? parseDateFromDDMMYYYY(value) || null : null)
      lastValueRef.current = value
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Parse the input value
    const parsedDate = parseDateFromDDMMYYYY(newValue)
    if (parsedDate) {
      setDateObj(parsedDate)
      onChange(parsedDate)
    } else if (newValue === "") {
      setDateObj(null)
      onChange(null)
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setDateObj(date)
      const formattedValue = formatDate(date)
      setInputValue(formattedValue)
      onChange(date)
      setOpen(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className={`relative flex gap-2 ${className}`}>
      <Input
        id={id}
        value={inputValue}
        placeholder={placeholder}
        className="bg-background pr-10"
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        required={required}
        disabled={disabled}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`${id}-picker`}
            variant="ghost"
            className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
            tabIndex={-1}
            type="button"
            disabled={disabled}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={dateObj || undefined}
            captionLayout="dropdown"
            month={dateObj || undefined}
            onMonthChange={setDateObj}
            onSelect={handleCalendarSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Export a simpler version for basic date inputs
export function SimpleDatePicker({ 
  value, 
  onChange, 
  id, 
  placeholder = "dd-mm-yyyy",
  required = false,
  disabled = false,
  className = ""
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState(value || "")
  const lastValueRef = React.useRef(value)

  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      setInputValue(value || "")
      lastValueRef.current = value
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Parse the input value
    const parsedDate = parseDateFromDDMMYYYY(newValue)
    if (parsedDate) {
      onChange(parsedDate)
    } else if (newValue === "") {
      onChange(null)
    }
  }

  return (
    <Input
      id={id}
      value={inputValue}
      placeholder={placeholder}
      className={className}
      onChange={handleInputChange}
      required={required}
      disabled={disabled}
    />
  )
}
