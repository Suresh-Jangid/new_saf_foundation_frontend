"use client"

import React, { memo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
import { formatDate, formatDateForAPI, parseDateFromDDMMYYYY } from "@/lib/utils"

interface DatePickerFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export const DatePickerField = memo<DatePickerFieldProps>(({
  id,
  label,
  placeholder,
  value,
  onChange,
  required = false
}) => {
  const [dateObj, setDateObj] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(
    formatDate(dateObj as any)
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    const parsed = parseDateFromDDMMYYYY(newValue) || undefined
    if (parsed) {
      setDateObj(parsed)
      onChange(formatDateForAPI(parsed))
    }
  }

  const handleDateSelect = (date: Date | any) => {
    setDateObj(date)
    const formattedDate = formatDate(date)
    setInputValue(formattedDate)
    onChange(date ? formatDateForAPI(date) : "")
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          required={required}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id={`${id}-picker`}
              variant="ghost"
              className="absolute top-1/2 right-2 w-8 h-8 p-0 -translate-y-1/2"
              tabIndex={-1}
              type="button"
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
              selected={dateObj}
              captionLayout="dropdown"
              month={dateObj}
              onMonthChange={setDateObj}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
})

DatePickerField.displayName = "DatePickerField"
