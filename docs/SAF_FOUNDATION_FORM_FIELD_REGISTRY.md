# SAF Foundation Frontend — Master Form Field Registry

---

## 1. Universal Scheme Form Fields (General Marriage, Mayra, Insurance, Dhundhotsav, Janni, Aawas, Lado Bahin, ShubhLaxmi)

| Section | UI Label (Bilingual) | Frontend Property | API Field Name | Data Type | Required (Add) | Required (Edit) | Validation Rule | Photo / File | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Header Meta** | Form No. / फॉर्म नंबर | `offlineFormNumber` | `offlineFormNumber` | String | Optional | Optional | 1-20 alphanumeric | No | Physical booklet paper form serial (e.g. "005"). |
| **Personal** | Applicant Name / आवेदक का नाम | `applicantName` | `applicantName` | String | **Yes** | **Yes** | 2-100 chars | No | Primary beneficiary legal name. |
| **Personal** | Father Name / पिता का नाम | `fatherName` | `fatherName` | String | **Yes** | **Yes** | 2-100 chars | No | Applicant's father's name. |
| **Personal** | Mother Name / माता का नाम | `motherName` | `motherName` | String | Optional | Optional | 0-100 chars | No | Applicant's mother's name. |
| **Personal** | Date of Birth / जन्म तिथि | `dateOfBirth` | `dateOfBirth` | Date/Str | **Yes** | **Yes** | Age 1-100 yrs | No | Used for age category & fee calculation. |
| **Personal** | Aadhaar Number / आधार नंबर | `aadharNumber` | `aadharNumber` | String | **Yes** | **Yes** | 12 digits | No | Government Unique Identity Number. |
| **Personal** | Mobile Number / मोबाइल नंबर | `mobile` | `mobile` | String | **Yes** | **Yes** | 10 digits (`^[6-9]\d{9}$`) | No | Primary communication phone. |
| **Personal** | Gotra / गोत्र | `gotra` | `gotra` | String | Optional | Optional | 0-50 chars | No | Community sub-caste identifier. |
| **Personal** | Gender / लिंग | `gender` | `gender` | Enum | **Yes** | **Yes** | `Male` \| `Female` \| `Other` | No | Beneficiary gender. |
| **Personal** | Category / श्रेणी | `category` | `category` | String | **Yes** | **Yes** | Dynamic Slab | No | Age slab (e.g. "18-25", "26-35"). |
| **Address** | Full Address / पूरा पता | `address` | `address` | String | **Yes** | **Yes** | 5-500 chars | No | Beneficiary residential address. |
| **Address** | PIN Code / पिन कोड | `pinCode` | `pinCode` | String | **Yes** | **Yes** | 6 digits | No | Postal index code. |
| **Address** | Tehsil / तहसील | `tehsil` | `tehsil` | String | **Yes** | **Yes** | 2-50 chars | No | Administrative sub-district. |
| **Address** | District / जिला | `district` | `district` | String | **Yes** | **Yes** | 2-50 chars | No | Administrative district. |
| **Address** | State / राज्य | `state` | `state` | String | **Yes** | **Yes** | Default "Rajasthan"| No | Beneficiary state. |
| **Nominee** | Nominee Name / नामांकित का नाम | `nomineeName` | `nomineeName` | String | **Yes** | **Yes** | 2-100 chars | No | Legal nominee for death/maturity benefits. |
| **Nominee** | Relation / संबंध | `nomineeRelation` | `nomineeRelation` | String | **Yes** | **Yes** | 2-50 chars | No | Relationship to beneficiary. |
| **Nominee** | Nominee Aadhaar / नामांकित आधार | `nomineeAadhar` | `nomineeAadhar` | String | Optional | Optional | 12 digits | No | Nominee's identity number. |
| **Nominee** | Nominee Mobile / नामांकित मोबाइल | `nomineeMobile` | `nomineeMobile` | String | Optional | Optional | 10 digits | No | Nominee's phone number. |
| **Agent** | Agent Name / एजेंट का नाम | `workerName` | `workerName` | String | Optional | Optional | 0-100 chars | No | Name of facilitating field worker. |
| **Agent** | Agent Mobile / एजेंट मोबाइल | `workerMobile` | `workerMobile` | String | Optional | Optional | 10 digits | No | Field agent contact number. |
| **Payment** | Payment Amount / भुगतान राशि | `paymentAmount` | `paymentAmount` | Number | **Yes** | **Yes** | > 0 | No | Registration fee or first installment. |
| **Payment** | Payment Mode / भुगतान का माध्यम | `paymentMode` | `paymentMode` | Enum | **Yes** | **Yes** | `cash` \| `razorpay` \| `upi` \| `bank_transfer` | No | Transaction payment channel. |
| **Payment** | E-PIN Code / ई-पिन कोड | `epinCode` | `epinCode` | String | Conditional | Optional | 6-20 alphanumeric | No | Voucher code for pre-paid registration. |
| **Documents** | Applicant Photo / आवेदक फोटो | `passportPhoto` | `passportPhoto` | File/Str | **Yes** (Add) | Optional (Edit) | Max 5MB, JPEG/PNG | **Yes** | Passport photo for bond and identity card. |
| **Documents** | Nominee Photo / नामांकित फोटो | `nomineePhoto` | `nomineePhoto` | File/Str | Optional | Optional | Max 5MB, JPEG/PNG | **Yes** | Nominee photo (Insurance Bima bond). |

---

## 2. Agent Registration & Administration Fields

| Section | UI Label | Frontend Field | API Field | Data Type | Required | Validation | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile** | Full Name | `agentName` | `agentName` | String | **Yes** | 2-100 chars | Field agent legal name. |
| **Profile** | Mobile Number | `mobile` | `mobile` | String | **Yes** | 10 digits | Agent login & communication number. |
| **Profile** | Aadhaar Number | `aadharNumber` | `aadharNumber` | String | **Yes** | 12 digits | Verification document. |
| **Hierarchy**| Senior Agent | `parentAgentId`| `parentAgentId`| String | Optional | Valid UUID | Superior agent for commission distribution. |
| **Financial**| Commission % | `commissionRate`| `commissionRate`| Number | **Yes** | 0 - 100% | Percentage earnings on member EMIs. |
| **Security** | Module Permissions| `permissions` | `permissions` | Array | **Yes** | Valid JSON | Checkbox array of granted module privileges. |

---

## 3. Bulk EMI Master Batch Fields

| Section | UI Label | Frontend Field | API Field | Data Type | Required | Validation | Business Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Batch** | Scheme Type | `schemeType` | `schemeType` | Enum | **Yes** | `MARRIAGE` \| `MAYRA` \| `INSURANCE` | Target scheme for the batch. |
| **Batch** | Collection Date | `collectionDate` | `collectionDate` | Date/Str | **Yes** | Valid date | Date of batch payment. |
| **Batch** | Collecting Agent | `agentId` | `agentId` | String | **Yes** | Valid UUID | Agent submitting the collected sum. |
| **Entries** | Member Records | `entries` | `entries` | Array | **Yes** | Min 1 record | Array of `{ memberId, installmentNo, amount }`. |
| **Summary** | Total Batch Amount| `totalAmount` | `totalAmount` | Number | **Yes** | Auto-sum | Sum of all individual member amounts. |
