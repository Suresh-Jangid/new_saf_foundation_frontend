"use client"

import React, { memo } from "react"
import { InputField } from "./input-field"
import { DatePickerField } from "./date-picker-field"
import { SelectField } from "./select-field"
import { FileUploadField } from "./file-upload-field"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatBilingual } from "@/lib/translations"
import { FormData } from "@/hooks/use-form-data"

interface FormSectionProps {
  formData: FormData
  updateField: (field: keyof FormData, value: any) => void
  age: string
  category: string
  fee: string
}

export const PersonalInfoSection = memo<FormSectionProps>(({
  formData,
  updateField,
  age,
  category,
  fee
}) => {
  const genderOptions = [
    { value: "Male", label: formatBilingual("common.Male") },
    { value: "Female", label: formatBilingual("common.Female") }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DatePickerField
          id="applicationDate"
          label={formatBilingual("formFields.applicationDate")}
          placeholder={formatBilingual("placeholders.selectDate")}
          value={formData.applicationDate}
          onChange={(value) => updateField("applicationDate", value)}
          required
        />

        <DatePickerField
          id="dateOfBirth"
          label={formatBilingual("formFields.dateOfBirth")}
          placeholder={formatBilingual("placeholders.selectDate")}
          value={formData.dateOfBirth}
          onChange={(value) => updateField("dateOfBirth", value)}
          required
        />

        <InputField
          id="applicantName"
          label="आवेदक का नाम / Applicant Name"
          placeholder="आवेदक का नाम दर्ज करें"
          value={formData.applicantName}
          onChange={(value) => updateField("applicantName", value)}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SelectField
          id="gender"
          label={formatBilingual("formFields.gender")}
          value={formData.gender}
          onChange={(value) => updateField("gender", value)}
          options={genderOptions}
          placeholder={formatBilingual("placeholders.selectGender")}
          required
        />

        {formData.gender === "Female" && (
          <InputField
            id="wifeName"
            label="पति का नाम / Wife of"
            placeholder="पति का नाम दर्ज करें"
            value={formData.wifeName}
            onChange={(value) => updateField("wifeName", value)}
            required
          />
        )}

        {formData.gender === "Male" && (
          <>
            <InputField
              id="fatherName"
              label="पिता का नाम / Son of"
              placeholder="पिता का नाम दर्ज करें"
              value={formData.fatherName}
              onChange={(value) => updateField("fatherName", value)}
              required
            />
            <InputField
              id="wifeName"
              label="पत्नी का नाम / Wife Name"
              placeholder="पत्नी का नाम दर्ज करें"
              value={formData.wifeName || ""}
              onChange={(value) => updateField("wifeName", value)}
            />
          </>
        )}

        <InputField
          id="category"
          label={formatBilingual("formFields.category")}
          placeholder={formatBilingual("formFields.category")}
          value={category}
          readOnly
        />

        <InputField
          id="fee"
          label={formatBilingual("formFields.fee")}
          placeholder="शुल्क / Fee"
          value={fee}
          disabled
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="motherName"
          label="माता का नाम / Mother's Name"
          placeholder="माता का नाम दर्ज करें"
          value={formData.motherName}
          onChange={(value) => updateField("motherName", value)}
          required
        />

        <InputField
          id="computedAge"
          label="आयु / Age"
          placeholder="आयु / Age"
          value={age}
          readOnly
        />
      </div>
    </div>
  )
})

export const ContactInfoSection = memo<FormSectionProps>(({
  formData,
  updateField
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="aadharNumber"
          label="आधार संख्या / Aadhar Number"
          placeholder="आधार संख्या दर्ज करें"
          value={formData.aadharNumber}
          onChange={(value) => updateField("aadharNumber", value)}
          type="number"
          inputMode="numeric"
          maxLength={12}
          required
        />

        <InputField
          id="gotra"
          label="गोत्र / Gotra"
          placeholder="गोत्र दर्ज करें"
          value={formData.gotra}
          onChange={(value) => updateField("gotra", value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="mobile"
          label="मोबाइल नंबर / Mobile Number"
          placeholder="मोबाइल नंबर दर्ज करें"
          value={formData.mobile}
          onChange={(value) => updateField("mobile", value)}
          type="number"
          inputMode="numeric"
          maxLength={10}
          required
        />

        <InputField
          id="address"
          label="Village / गाँव"
          placeholder="गांव का नाम दर्ज करे"
          value={formData.address}
          onChange={(value) => updateField("address", value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <InputField
          id="pinCode"
          label="पिन कोड / Pin Code"
          placeholder="पिन कोड दर्ज करें"
          value={formData.pinCode}
          onChange={(value) => updateField("pinCode", value)}
          type="number"
          inputMode="numeric"
          required
        />

        <InputField
          id="tehsil"
          label="तहसील / Tehsil"
          placeholder="तहसील दर्ज करें"
          value={formData.tehsil}
          onChange={(value) => updateField("tehsil", value)}
          required
        />

        <InputField
          id="district"
          label="जिला / District"
          placeholder="जिला दर्ज करें"
          value={formData.district}
          onChange={(value) => updateField("district", value)}
          required
        />

        <InputField
          id="state"
          label="राज्य / State"
          placeholder="राज्य दर्ज करें"
          value={formData.state}
          onChange={(value) => updateField("state", value)}
          required
        />
      </div>
    </div>
  )
})

export const NomineeInfoSection = memo<FormSectionProps>(({
  formData,
  updateField
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Nominee Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="nomineeName"
          label="नॉमिनी का नाम / Nominee Name"
          placeholder="नॉमिनी का नाम दर्ज करें"
          value={formData.nomineeName}
          onChange={(value) => updateField("nomineeName", value)}
        />

        <InputField
          id="nomineeRelation"
          label="नामित व्यक्ति से संबंध / Nominee Relation"
          placeholder="संबंध दर्ज करें"
          value={formData.nomineeRelation}
          onChange={(value) => updateField("nomineeRelation", value)}
        />
      </div>
    </div>
  )
})

interface WorkerInfoSectionProps extends FormSectionProps {
  agents: Array<{ id: number | string; name: string }>
  isLoadingAgents: boolean
}

export const WorkerInfoSection = memo<WorkerInfoSectionProps>(({
  formData,
  updateField,
  agents,
  isLoadingAgents
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Worker Information</h3>
      
      <div>
        <Label htmlFor="selectedAgentId">कार्यकर्ता का नाम / Worker Name</Label>
        <select
          id="selectedAgentId"
          className="w-full border rounded px-3 py-2 mt-1"
          value={formData.selectedAgentId || ""}
          onChange={(e) => updateField("selectedAgentId", e.target.value)}
          required
          disabled={isLoadingAgents}
        >
          <option value="">कार्यकर्ता चुनें / Select Worker</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id.toString()}>
              {agent.name}
            </option>
          ))}
        </select>
        {isLoadingAgents && (
          <p className="text-sm text-gray-500 mt-1">Loading agents...</p>
        )}
      </div>

      <div>
        <Label htmlFor="affidavit">शपथ पत्र / Affidavit</Label>
        <Textarea
          id="affidavit"
          value={formData.affidavit}
          onChange={(e) => updateField("affidavit", e.target.value)}
          placeholder="शपथ पत्र का विवरण दर्ज करें"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FileUploadField
          id="passportPhoto"
          label="पासपोर्ट साइज रंगीन फोटो / Passport Size Color Photo"
          accept="image/*"
          value={formData.passportPhoto}
          onChange={(file) => updateField("passportPhoto", file)}
        />
      </div>
    </div>
  )
})

PersonalInfoSection.displayName = "PersonalInfoSection"
ContactInfoSection.displayName = "ContactInfoSection"
NomineeInfoSection.displayName = "NomineeInfoSection"
WorkerInfoSection.displayName = "WorkerInfoSection"
