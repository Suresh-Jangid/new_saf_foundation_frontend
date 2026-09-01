"use client"

import React, { memo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { formatBilingual } from "@/lib/translations"
import { RoleGuard } from "@/components/role-guard"
import { RazorpayPayment } from "@/components/razorpay-payment"
import { PAYMENT_MODE, PAYMENT_MODE_OPTIONS, isRazorpayPaymentMode } from "@/lib/form-values"
import { DatePickerField } from "./date-picker-field"
import { InputField } from "./input-field"
import { SelectField } from "./select-field"
import {
  PersonalInfoSection,
  ContactInfoSection,
  NomineeInfoSection,
  WorkerInfoSection
} from "./application-form-sections"
import { useFormData } from "@/hooks/use-form-data"
import { useAgeCategory } from "@/hooks/use-age-category"
import APIService from "@/lib/services"
import { EpinInputVerifier } from "@/components/forms/epin-input-verifier"
import { EpinService } from "@/lib/epin-service"

import { post, API_ENDPOINTS } from "@/lib/api"

interface OptimizedInsuranceFormProps {
  title?: string
  description?: string
}

export const OptimizedInsuranceForm = memo<OptimizedInsuranceFormProps>(({
  title = formatBilingual("navigation.insuranceApplications"),
  description = "Add New Insurance Bima Application"
}) => {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending')
  const [paymentData, setPaymentData] = useState<any>(null)

  const { formData, updateField, updateMultipleFields, isFormValid } = useFormData()
  const { age, category, fee } = useAgeCategory(formData.dateOfBirth)

  // Agents state
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)

  // Fetch agents on component mount
  React.useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true)
        const response = await post(API_ENDPOINTS.GET_AGENTS)
        const data = response.data
        if (data.status && data.data) {
          setAgents(data.data.map((agent: { id: string | number; name: string }) => ({
            id: String(agent.id),
            name: agent.name
          })))
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
        toast({
          title: "Error",
          description: "Failed to load agents",
          variant: "destructive",
        })
      } finally {
        setIsLoadingAgents(false)
      }
    }

    fetchAgents()
  }, [toast])

  // Update category when age changes
  React.useEffect(() => {
    updateField("category", category)
  }, [category, updateField])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (isRazorpayPaymentMode(formData.paymentMode) && paymentStatus !== 'paid') {
      toast({
        title: "Payment Required",
        description: "Please complete the Razorpay payment before submitting the application",
        variant: "destructive",
      })
      return
    }

    if (!formData.selectedAgentId) {
      toast({
        title: "Validation Error",
        description: "कृपया कार्यकर्ता का नाम चुनें / Please select a worker",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const applicationData = {
        applicationDate: formData.applicationDate,
        applicantName: formData.applicantName,
        fatherName: formData.fatherName,
        wifeName: formData.wifeName,
        motherName: formData.motherName,
        dateOfBirth: formData.dateOfBirth,
        aadharNumber: formData.aadharNumber,
        gotra: formData.gotra,
        mobile: formData.mobile,
        address: formData.address,
        pinCode: formData.pinCode,
        tehsil: formData.tehsil,
        district: formData.district,
        state: formData.state,
        nomineeName: formData.nomineeName,
        nomineeRelation: formData.nomineeRelation,
        affidavit: formData.affidavit,
        passportPhoto: formData.passportPhoto || undefined,
        gender: formData.gender,
        category: formData.category,
        age: parseInt(age) || 0,
        totalAmount: fee,
        paymentAmount: formData.paymentAmount || "",
        paymentMode: formData.paymentMode || "",
        paymentDate: formData.paymentDate || "",
        pendingAmount: String(Number(fee) - Number(formData.paymentAmount || 0)),
        selectedAgentId: formData.selectedAgentId,
        agentId: formData.selectedAgentId,
        addedby: "agent",
        addedby_id: formData.selectedAgentId || "",
        epin: (formData as any).epinNumber || "",
        epinNumber: (formData as any).epinNumber || "",
        pinNumber: (formData as any).epinNumber || "",
      }

      const response = await APIService.createInsuranceApplication(applicationData)

      if (response.status) {
        toast({
          title: formatBilingual("common.success"),
          description: formatBilingual("messages.applicationSubmitted"),
        })

        const res = response as any
        const applicationNumber = res.applicationNumber || res.id || res.formNumber || res.form_number

        // Atomically consume E-PIN if applied
        if ((formData as any).epinNumber) {
          try {
            await EpinService.consumeEpin({
              pinNumber: (formData as any).epinNumber,
              applicationId: String(applicationNumber || res.id || ""),
              applicantName: formData.applicantName,
              agentId: formData.selectedAgentId,
              moduleType: "insurance_application",
              remarks: "Consumed for Insurance Application",
            });
          } catch (epinErr) {
            console.error("E-PIN post-registration consumption note:", epinErr);
          }
        }

        router.push("/dashboard/general-applications-insurance")
      } else {
        const errorMsg = response.message || formatBilingual("messages.failedToSave");
        if (/already|assigned|consumed|used/i.test(errorMsg)) {
          toast({
            title: "E-PIN Conflict",
            description: "यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।",
            variant: "destructive",
          });
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error("Error creating insurance application:", error)
      if (error?.response?.status === 409 || error?.status === 409) {
        toast({
          title: "E-PIN Conflict",
          description:
            error.response?.data?.message ||
            "यह E-PIN पहले ही किसी अन्य registration के साथ assign हो चुका है। कृपया दूसरा E-PIN चुनें।",
          variant: "destructive",
        })
      } else {
        toast({
          title: formatBilingual("common.error"),
          description: error.response?.data?.message || error.message || formatBilingual("messages.failedToSave"),
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isFormValid, paymentStatus, age, category, fee, toast, router])

  const handlePaymentSuccess = useCallback((paymentData: any) => {
    setPaymentStatus('paid')
    setPaymentData(paymentData)
    updateMultipleFields({
      paymentAmount: String(paymentData.amount),
      paymentMode: PAYMENT_MODE.RAZORPAY,
      paymentDate: new Date().toISOString().split('T')[0],
    })
    toast({
      title: "Payment Success",
      description: "Payment completed successfully!",
    })
  }, [updateMultipleFields, toast])

  const handlePaymentError = useCallback((error: any) => {
    setPaymentStatus('failed')
    console.error('Payment error:', error)
  }, [])

  const paymentModeOptions = PAYMENT_MODE_OPTIONS.filter(
    (option) =>
      option.value === PAYMENT_MODE.CASH || option.value === PAYMENT_MODE.RAZORPAY
  ).map((option) => ({ value: option.value, label: option.label }))

  return (
    <RoleGuard requiredModule="security_application" requiredAction="create">
      <div className="p-6">
        <div className="flex">
          <div className="mb-4">
            <Button type="button" variant="link" onClick={() => router.back()}>
              ← वापस जाएं / <br/>Go Back
            </Button>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <PersonalInfoSection
                formData={formData}
                updateField={updateField}
                age={age}
                category={category}
                fee={fee}
              />

              <ContactInfoSection
                formData={formData}
                updateField={updateField}
                age={age}
                category={category}
                fee={fee}
              />

              <NomineeInfoSection
                formData={formData}
                updateField={updateField}
                age={age}
                category={category}
                fee={fee}
              />

              <WorkerInfoSection
                formData={formData}
                updateField={updateField}
                age={age}
                category={category}
                fee={fee}
                agents={agents}
                isLoadingAgents={isLoadingAgents}
              />

              {/* Payment Details Section */}
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold">Payment Details</h2>

                {/* E-PIN Voucher Verification */}
                <div className="p-4 bg-muted/20 border rounded-lg">
                  <EpinInputVerifier
                    value={(formData as any).epinNumber || ""}
                    onChange={(val) => updateField("epinNumber" as any, val)}
                    agentId={formData.selectedAgentId}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    id="paymentAmount"
                    label={formatBilingual("formFields.paymentAmount")}
                    placeholder={formatBilingual("placeholders.enterAmount")}
                    value={formData.paymentAmount || ""}
                    onChange={(value) => updateField("paymentAmount", value)}
                    type="number"
                    inputMode="numeric"
                    required
                  />

                  <SelectField
                    id="paymentMode"
                    label={formatBilingual("formFields.paymentMode")}
                    value={formData.paymentMode || ""}
                    onChange={(value) => updateField("paymentMode", value)}
                    options={paymentModeOptions}
                    placeholder={formatBilingual("placeholders.selectPaymentMode")}
                    required
                  />

                  <DatePickerField
                    id="paymentDate"
                    label={formatBilingual("formFields.paymentDate")}
                    placeholder={formatBilingual("placeholders.selectDate")}
                    value={formData.paymentDate || ""}
                    onChange={(value) => updateField("paymentDate", value)}
                    required
                  />
                </div>

                {/* Payment Status Display */}
                {paymentStatus === 'paid' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium">✅ Payment Completed Successfully</p>
                    <p className="text-green-600 text-sm">Payment ID: {paymentData?.payment_id}</p>
                  </div>
                )}

                {paymentStatus === 'failed' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 font-medium">❌ Payment Failed</p>
                    <p className="text-red-600 text-sm">Please try again or use manual payment method</p>
                  </div>
                )}

                {/* Razorpay Payment Button */}
                {isRazorpayPaymentMode(formData.paymentMode) && formData.paymentAmount && Number(formData.paymentAmount) > 0 && paymentStatus !== 'paid' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-blue-900">Online Payment</h3>
                        <p className="text-sm text-blue-700">
                          Pay ₹{formData.paymentAmount} securely using Razorpay
                        </p>
                        {!isFormValid && (
                          <p className="text-xs text-orange-600 mt-1">
                            Please fill in applicant name, mobile, and Aadhaar number before making payment
                          </p>
                        )}
                      </div>
                      <RazorpayPayment
                        amount={Number(formData.paymentAmount)}
                        description={`Insurance Bima Application Fee - ${formData.applicantName || 'Applicant'}`}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={isSubmitting || !isFormValid || !formData.paymentAmount}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                      >
                        Pay ₹{formData.paymentAmount} Now
                      </RazorpayPayment>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  {formatBilingual("common.cancel")}
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {formatBilingual("common.loading")}
                    </>
                  ) : (
                    formatBilingual("common.submit")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
})

OptimizedInsuranceForm.displayName = "OptimizedInsuranceForm"
