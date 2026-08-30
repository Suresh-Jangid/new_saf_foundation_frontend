"use client"

import { useState, useCallback, useMemo } from "react"

export interface FormData {
  applicationDate: string
  applicantName: string
  fatherName: string
  wifeName: string
  motherName: string
  dateOfBirth: string
  aadharNumber: string
  gotra: string
  mobile: string
  address: string
  pinCode: string
  tehsil: string
  district: string
  state: string
  nomineeName: string
  nomineeRelation: string
  selectedAgentId?: string
  affidavit: string
  passportPhoto: File | null
  gender: string
  category: string
  paymentAmount?: string
  paymentMode?: string
  paymentDate?: string
  pendingAmount?: string
}

const initialFormData: FormData = {
  applicationDate: "",
  applicantName: "",
  fatherName: "",
  wifeName: "",
  motherName: "",
  dateOfBirth: "",
  aadharNumber: "",
  gotra: "",
  mobile: "",
  address: "",
  pinCode: "",
  tehsil: "",
  district: "",
  state: "",
  nomineeName: "",
  nomineeRelation: "",
  selectedAgentId: "",
  affidavit: "",
  passportPhoto: null,
  gender: "",
  category: "",
  paymentAmount: "",
  paymentMode: "",
  paymentDate: "",
  pendingAmount: ""
}

export function useFormData() {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const updateField = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateMultipleFields = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
  }, [])

  const isFormValid = useMemo(() => {
    return !!(
      formData.applicantName &&
      formData.mobile &&
      formData.aadharNumber
    )
  }, [formData.applicantName, formData.mobile, formData.aadharNumber])

  return {
    formData,
    updateField,
    updateMultipleFields,
    resetForm,
    isFormValid
  }
}
