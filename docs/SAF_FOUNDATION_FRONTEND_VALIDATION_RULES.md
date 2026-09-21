# SAF Foundation Frontend — Validation Rules Matrix

> **Golden Reference Standard**: Form validations across all scheme modules are modeled after the strict verification layers in **General Marriage Application (`/dashboard/general-applications`)**.

---

## 1. Master Validation Rules Matrix

| Field Name | Data Type | Required (Add) | Required (Edit) | Min / Max | Regex Pattern | Sanitization / Transform | Error Message (Bilingual) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`offlineFormNumber`** | String | Optional | Optional | 1 - 20 chars | `^[0-9a-zA-Z\-_/]+$` | `.trim()` (Preserve leading zeros) | *"Please enter a valid offline form number"* | **PASS** |
| **`applicantName`** | String | **Yes** | **Yes** | 2 - 100 chars | `^[a-zA-Z\s\.]+$` / Hindi unicode | `.trim()` | *"Applicant name is required / आवेदक का नाम अनिवार्य है"* | **PASS** |
| **`fatherName`** | String | **Yes** | **Yes** | 2 - 100 chars | None (Accepts text) | `.trim()` | *"Father name is required / पिता का नाम अनिवार्य है"* | **PASS** |
| **`motherName`** | String | Optional | Optional | 0 - 100 chars | None (Accepts text) | `.trim()` | N/A | **PASS** |
| **`dateOfBirth`** | Date / String | **Yes** | **Yes** | Age 1 - 100 yrs | `^\d{4}-\d{2}-\d{2}$` or DD/MM/YYYY | Parsed via `isValidDate()` | *"Please select a valid date of birth / कृपया मान्य जन्म तिथि चुनें"* | **PASS** |
| **`aadharNumber`** | String | **Yes** | **Yes** | Exact 12 digits | `^\d{12}$` | `.replace(/\D/g, '').slice(0, 12)` | *"Aadhaar must be exactly 12 digits / आधार 12 अंकों का होना चाहिए"* | **PASS** |
| **`mobile`** | String | **Yes** | **Yes** | Exact 10 digits | `^[6-9]\d{9}$` | `.replace(/\D/g, '').slice(0, 10)` | *"Please enter a valid 10-digit mobile number / कृपया 10 अंकों का मोबाइल नंबर दर्ज करें"* | **PASS** |
| **`gotra`** | String | Optional | Optional | 0 - 50 chars | None | `.trim()` | N/A | **PASS** |
| **`gender`** | Enum | **Yes** | **Yes** | `Male` \| `Female` \| `Other` | Strict Enum | Cast via `GENDER` constants | *"Please select gender / कृपया लिंग का चयन करें"* | **PASS** |
| **`address`** | String | **Yes** | **Yes** | 5 - 500 chars | None | `.trim()` | *"Address is required / पता अनिवार्य है"* | **PASS** |
| **`pinCode`** | String | **Yes** | **Yes** | Exact 6 digits | `^[1-9]\d{5}$` | `.replace(/\D/g, '').slice(0, 6)` | *"PIN Code must be 6 digits / पिन कोड 6 अंकों का होना चाहिए"* | **PASS** |
| **`tehsil`** | String | **Yes** | **Yes** | 2 - 50 chars | None | `.trim()` | *"Tehsil is required / तहसील अनिवार्य है"* | **PASS** |
| **`district`** | String | **Yes** | **Yes** | 2 - 50 chars | None | `.trim()` | *"District is required / जिला अनिवार्य है"* | **PASS** |
| **`state`** | String | **Yes** | **Yes** | 2 - 50 chars | None (Default: Rajasthan) | `.trim()` | *"State is required / राज्य अनिवार्य है"* | **PASS** |
| **`nomineeName`** | String | **Yes** | **Yes** | 2 - 100 chars | None | `.trim()` | *"Nominee name is required / नामांकित व्यक्ति का नाम अनिवार्य है"* | **PASS** |
| **`nomineeRelation`**| String | **Yes** | **Yes** | 2 - 50 chars | None | `.trim()` | *"Nominee relation is required / नामांकित से संबंध अनिवार्य है"* | **PASS** |
| **`nomineeAadhar`** | String | Optional | Optional | 12 digits (if entered) | `^\d{12}$` | `.replace(/\D/g, '').slice(0, 12)` | *"Nominee Aadhaar must be 12 digits / नामांकित का आधार 12 अंकों का होना चाहिए"* | **PASS** |
| **`nomineeMobile`** | String | Optional | Optional | 10 digits (if entered) | `^[6-9]\d{9}$` | `.replace(/\D/g, '').slice(0, 10)` | *"Nominee mobile must be 10 digits / नामांकित का मोबाइल 10 अंकों का होना चाहिए"* | **PASS** |
| **`workerName`** | String | Optional | Optional | 0 - 100 chars | None | `.trim()` | N/A | **PASS** |
| **`workerMobile`** | String | Optional | Optional | 10 digits (if entered) | `^[6-9]\d{9}$` | `.replace(/\D/g, '').slice(0, 10)` | *"Agent mobile must be 10 digits / एजेंट का मोबाइल 10 अंकों का होना चाहिए"* | **PASS** |
| **`passportPhoto`** | File / String | **Yes** (Add) | Optional (Edit)| Max 5 MB | `image/jpeg, image/png, image/webp` | Validated via `File.size` & `File.type` | *"Please upload applicant photo / कृपया आवेदक का फोटो अपलोड करें"* | **PASS** |
| **`nomineePhoto`** | File / String | Optional | Optional | Max 5 MB | `image/jpeg, image/png, image/webp` | Validated via `File.size` & `File.type` | *"Invalid image file / अमान्य फोटो फाइल"* | **PASS** |
| **`paymentMode`** | Enum | **Yes** | **Yes** | `cash` \| `razorpay` \| `bank_transfer` \| `upi` | Strict Enum | Cast via `PAYMENT_MODE` | *"Please select payment mode / कृपया भुगतान का प्रकार चुनें"* | **PASS** |
| **`paymentAmount`** | Number / Str | **Yes** | **Yes** | Min > 0 | `^\d+(\.\d{1,2})?$` | Parsed to float/string | *"Invalid payment amount / अमान्य राशि"* | **PASS** |
| **`epinCode`** | String | Conditional | Optional | 6 - 20 chars | Alphanumeric | `.trim().toUpperCase()` | *"Invalid or inactive E-PIN / अमान्य ई-पिन"* | **PASS** |

---

## 2. Dynamic Dependencies & Conditional Validation Rules

### 1. Age Slab & Category Dependency (`hooks/use-age-category.ts`)
- Changing `dateOfBirth` triggers automatic calculation:
  $$\text{Age} = \text{Current Year} - \text{DOB Year}$$
- Sets `category` to corresponding slab (e.g., `"18-25"`, `"26-35"`, `"36-50"`, `"50+"`).
- Automatically updates `paymentAmount` and `totalAmount` based on the configured scheme slab price.

### 2. Payment Mode Dependencies (`lib/form-values.ts`)
- If `paymentMode === 'razorpay'`: Requires `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` verified before form submission.
- If `paymentMode === 'cash'`: Requires collection agent or admin verification.

### 3. Add vs. Edit Mode Image Constraints
- **Add Mode**: `passportPhoto` is strictly required. Form submission is blocked if no file is selected.
- **Edit Mode**: `passportPhoto` is optional. If left unchanged, the frontend preserves the existing photo URL (`record.passportPhoto`) without clearing it.

---

## 3. Validation Audit Findings

| Category | Finding | Impact | Evaluation |
| :--- | :--- | :--- | :--- |
| **Aadhaar Validation** | Strips all non-digit characters and strictly enforces 12 digits across all modules. | High Reliability | **PASS** |
| **Mobile Validation** | Enforces Indian 10-digit mobile standards (`^[6-9]\d{9}$`). | High Reliability | **PASS** |
| **Offline Form No.** | Preserves leading zeros (`"005"`) without numeric truncation. | Zero Data Loss | **PASS** |
| **Nominee Isolation** | Nominee Aadhaar and Nominee Mobile are strictly optional and isolated from applicant data. | High Compliance | **PASS** |
