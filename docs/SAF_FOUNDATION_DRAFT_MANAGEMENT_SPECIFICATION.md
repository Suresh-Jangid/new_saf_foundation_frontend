# SAF Foundation — Reusable Draft Management Architecture & Specification

## 1. Executive Summary

This document establishes the architecture, persistence strategy, RBAC isolation, data minimization, and API specification for the **Common Registration Draft Management System** in `new_saf_foundation_frontend`.

Prior to this implementation, the application had **zero draft support**. Users who refreshed the page, closed the tab, or navigated to the E-PIN inventory lost all entered data. The new system introduces two clearly separate actions on every Add Registration form:
1. **Save as Draft (ड्राफ्ट सहेजें)** — Persists incomplete forms without E-PIN verification, payment creation, or final validation.
2. **Final Submit (फाइनल सबमिट)** — Executes all module-specific schema validations, E-PIN assignments, and registration creation workflows.

---

## 2. Audited Registration Forms

The following 18 registration forms are audited and covered under the unified Draft Management framework:

| No. | Module Key | Module Name | Route | Form Component / Handler |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `general-applications` | सामान्य विवाह आवेदन (General Marriage) | `/dashboard/general-applications/add` | `AddGeneralApplicationPage` |
| 2 | `mayra-registration` | मायरा फॉर्म आवेदन (Mayra Registration) | `/dashboard/mayra-registration/add` | `AddMayraRegistrationPage` |
| 3 | `insurance` | सुरक्षा बीमा आवेदन (Insurance Bima) | `/dashboard/general-applications-insurance/add` | `OptimizedInsuranceForm` |
| 4 | `janni-delivery` | जननी प्रसूति पंजीकरण (Janni Delivery) | `/dashboard/janni-delivery/add` | `AddJanniDeliveryPage` |
| 5 | `aawas` | आवास योजना पंजीकरण (Aawas Yojana) | `/dashboard/aawas/add` | `AddAawasPage` |
| 6 | `lado-bahin` | लाडो बहिन पंजीकरण (Lado Bahin) | `/dashboard/lado-bahin/add` | `AddLadoBahinPage` |
| 7 | `dhundhotsav` | ढूंढोत्सव पंजीकरण (Dhundhotsav) | `/dashboard/dhundhotsav/add` | `AddDhundhotsavPage` |
| 8 | `shubh-laxmi` | शुभ लक्ष्मी योजना (ShubhLaxmi) | `/dashboard/shubh-laxmi/add` | `AddShubhLaxmiPage` |
| 9 | `sewing-machine` | सिलाई मशीन वितरण (Sewing Machine Camp) | `/dashboard/sewing-machine/add` | `AddSewingMachinePage` |
| 10 | `disability-cycle` | दिव्यांग साइकिल सहायता (Disability Cycle) | `/dashboard/disability-cycle/add` | `AddDisabilityCyclePage` |
| 11 | `marriage-sewing-machine` | विवाह सिलाई मशीन (Marriage Sewing) | `/dashboard/marriage-congratulations/sewing-machine-distribution/add` | `AddMarriageSewingMachinePage` |
| 12 | `marriage-mayra` | विवाह मायरा (Marriage Mayra) | `/dashboard/marriage-congratulations/mayra-registration/add` | `AddMarriageMayraPage` |
| 13 | `pension-yojana` | पेंशन योजना (Pension Yojana) | `/dashboard/pension-yojana/add` | `PensionYojanaAddForm` |
| 14 | `loan-application` | ऋण आवेदन (Loan Application) | `/dashboard/loan-application/add` | `AddLoanApplicationPage` |
| 15 | `financal-help` | आर्थिक सहायता (Financial Help) | `/dashboard/financal-help/add` | `AddDonationPage` |
| 16 | `marriage-congratulations` | विवाह बधाई पत्र (Marriage Congratulation) | `/dashboard/marriage-congratulations/add` | `AddMarriageCongratulationsPage` |
| 17 | `mayra-congratulations` | मायरा बधाई पत्र (Mayra Congratulation) | `/dashboard/mayra-congratulations/add` | `AddMayraCongratulationsPage` |
| 18 | `suraksha-bima-yojana` | सुरक्षा बीमा प्रमाणपत्र (Suraksha Bima) | `/dashboard/suraksha-bima-yojana/add` | `AddSurakshaBimaYojanaPage` |

---

## 3. Persistence Strategy & Architectural Constraints

### 3.1 External Backend & Schema Migration Restrictions
- The main SAF Foundation backend runs as a separate Node.js / Express / Prisma API hosted at `https://new-saf-foundation-backend.onrender.com/api`.
- Modifying production database schemas or running unapproved Prisma migrations on Render from this frontend repository is strictly prohibited.
- Calling registration creation endpoints (e.g., `POST /v1/aawas`, `POST /general-applications`) with partial draft data is **strictly avoided** because those tables require valid Aadhaar uniqueness, mandatory relations, payment records, and burned E-PINs.

### 3.2 Secure Frontend Persistence (Immediate Production-Ready Mode)
- **Engine:** Client-side user-scoped sandbox (`localStorage` + `useRegistrationDraft` hook + `DraftService`).
- **User Scoping:** Draft keys are strictly partitioned by authenticated user ID (`saf_drafts_v1_${userId}`). User A cannot read or modify User B's drafts.
- **Deduplication:** Subsequent "Save as Draft" clicks on the same active form update the existing draft record in place rather than generating duplicate entries.
- **Offline / Navigation Resilience:** If an operator saves a draft and leaves the form to inspect or generate an E-PIN in `/dashboard/epin-management`, the draft remains intact upon returning.
- **BFF Ready:** Next.js App Router API routes (`app/api/drafts`) provide server proxy readiness.

### 3.3 Proposed Backend REST API & Prisma Schema (For Future Backend Migration)
When the backend team schedules a schema migration on Render, the following schema should be added:

```prisma
// Proposed Prisma Model for Backend Express Service
model RegistrationDraft {
  id            String    @id @default(uuid())
  userId        String    // Scoped to Operator / Agent ID
  moduleKey     String    // e.g. "aawas", "general-applications", "mayra-registration"
  moduleTitle   String
  applicantName String?
  mobile        String?
  formData      Json      // Sanitized form payload
  status        String    @default("DRAFT") // DRAFT, COMPLETED, DISCARDED
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, moduleKey])
  @@index([userId, status])
}
```

Proposed Backend Endpoints:
- `GET /api/v1/drafts` — List user's active drafts (requires JWT)
- `GET /api/v1/drafts/:id` — Fetch single draft (enforces ownership)
- `POST /api/v1/drafts` — Create/Update draft (no E-PIN or payment side-effects)
- `DELETE /api/v1/drafts/:id` — Delete draft (enforces ownership)

---

## 4. Security & Data Minimization

1. **Authentication Secrets:** Passwords, confirm-passwords, API tokens, and secret keys are automatically stripped by `sanitizeFormData()` before persistence.
2. **Payment Credentials:** No CVV, credit card numbers, or transaction tokens are persisted.
3. **E-PIN Integrity:** E-PIN codes entered in draft mode are never validated against the server or consumed. E-PIN consumption occurs **only** during Final Submit.
4. **Human Error Prevention:** Final Submit uses double-submit protection, disabling action buttons and displaying spinners while in-flight.
5. **Post-Submission Cleanup:** Upon successful Final Submit, the draft is marked completed or removed (`clearDraftOnSubmit()`). If Final Submit fails, the draft is preserved so the user does not lose entered data.

---

## 5. UI Architecture & Components

1. **`components/drafts/draft-actions.tsx`**:
   - Replaces single submit buttons with a clear two-action toolbar.
   - Distinct secondary style with `<Save className="h-4 w-4 mr-2" /> ड्राफ्ट सहेजें / Save as Draft`.
   - Distinct primary style with `<CheckCircle2 className="h-4 w-4 mr-2" /> फाइनल सबमिट / Final Submit`.
2. **`components/drafts/draft-banner.tsx`**:
   - Alerts the operator when an uncompleted draft exists for the active form.
   - Provides one-click "ड्राफ्ट लोड करें / Resume Draft" and "हटाएं / Discard".
3. **`app/dashboard/drafts/page.tsx`**:
   - Dedicated Draft Management center with module filter, search, last-saved timestamp, resume links, and discard confirmation dialogs.
