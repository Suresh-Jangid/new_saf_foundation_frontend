# SAF Foundation Frontend — Business & Application Logic Manual

> **Golden Reference Standard**: All business flows, form lifecycles, and transaction pipelines across SAF Foundation modules mirror the canonical implementation established in the **General Marriage Application (`/dashboard/general-applications`)**.

---

## 1. Master Application Lifecycle & Data Flow

Every beneficiary application creation, update, and lifecycle transition follows a strict unidirectional data flow:

```mermaid
graph TD
    UserAction[1. User Action: Input Data / Upload Photo] --> UIComponent[2. UI Layer: ApplicationFormSections]
    UIComponent --> LocalState[3. State Management: React useState / Form Hook]
    LocalState --> AutoCalculations[4. Reactive Logic: Age Calculation & Fee Slab Lookup]
    AutoCalculations --> ClientValidation[5. Validation Engine: Regex & Required Checks]
    ClientValidation -- Invalid --> ShowFieldError[6A. Display Inline Error & Sonner Toast]
    ClientValidation -- Valid --> PayloadTransformer[6B. Transformer: Construct Multipart FormData]
    PayloadTransformer --> APIDedupe[7. API Layer: In-Flight Deduplication lib/api.ts]
    APIDedupe --> BackendRPC[8. HTTP Request to Backend]
    BackendRPC --> ResponseHandler[9. API Response Mapping & Dual-Key Normalizer]
    ResponseHandler -- Success --> SuccessFeedback[10A. Green Toast, Reset Form, Redirect to List]
    ResponseHandler -- Error --> ErrorRecovery[10B. Red Alert Toast, Re-enable Form, Preserve Input]
```

---

## 2. Core Business Logic Engines

### 🎂 2.1 Dynamic Age & Pricing Slab Engine (`hooks/use-age-category.ts`)

```mermaid
flowchart TD
    UserDOB[User selects Date of Birth] --> ParseDate[Parse via parseDateFromDDMMYYYY or Date object]
    ParseDate --> DiffYear[Calculate age in full years]
    DiffYear --> SlabsLookup{Match against Configured Slabs}
    SlabsLookup -->|Age 18 - 25| SlabA[Category: 18-25 | Amount: ₹11,000 | EMI: ₹300]
    SlabsLookup -->|Age 26 - 35| SlabB[Category: 26-35 | Amount: ₹15,000 | EMI: ₹300]
    SlabsLookup -->|Age 36 - 50| SlabC[Category: 36-50 | Amount: ₹21,000 | EMI: ₹300]
    SlabsLookup -->|Age 50+| SlabD[Category: 50+ | Amount: ₹25,000 | EMI: ₹300]
    SlabA --> UpdateForm[Auto-populate category, paymentAmount, totalAmount]
    SlabB --> UpdateForm
    SlabC --> UpdateForm
    SlabD --> UpdateForm
```

---

### 🔑 2.2 E-PIN Lifecycle & Verification Engine (`lib/epin-service.ts`)

1. **Verification**: When an agent enters an E-PIN, `EpinInputVerifier` triggers an asynchronous check against `/api/epin/verify`.
2. **Eligibility Rules**:
   - The E-PIN status must be `ACTIVE` (not `USED`, `EXPIRED`, or `BURNED`).
   - The E-PIN scheme pool (e.g. `MARRIAGE`, `INSURANCE`, `MAYRA`) must match the current form module.
3. **Atomic Burning**: When the application form is successfully submitted, the E-PIN code is sent in the payload. The backend consumes the E-PIN in the same database transaction, ensuring no double-spending.

---

### 💳 2.3 Payment Processing Subsystem (`components/razorpay-payment.tsx`)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Page as Form Page
    participant RazorpayModal as RazorpayPayment Component
    participant NextAPI as /api/razorpay/create-order
    participant Gateway as Razorpay Checkout SDK
    participant VerifyAPI as /api/razorpay/verify-payment

    User->>Page: Selects "Razorpay" Mode & Clicks Pay
    Page->>RazorpayModal: Open payment trigger with amount
    RazorpayModal->>NextAPI: POST { amount, currency: "INR" }
    NextAPI-->>RazorpayModal: { order_id: "order_xyz123" }
    RazorpayModal->>Gateway: Launch Razorpay Modal (Order: order_xyz123)
    User->>Gateway: Completes UPI / NetBanking / Card Payment
    Gateway-->>RazorpayModal: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    RazorpayModal->>VerifyAPI: POST signature payload
    VerifyAPI-->>RazorpayModal: { verified: true }
    RazorpayModal->>Page: onPaymentSuccess(paymentData)
    Page->>Page: Populate payment IDs and submit final form
```

---

### 🖼️ 2.4 Non-Destructive Photo Replacement & URL Resolution

- **Add Flow**: When a user selects a file, `FileReader` creates a local object URL for instant UI preview (`w-24 h-28`). The binary `File` is appended to `FormData`.
- **Edit Flow**:
  1. The page loads existing record data containing `passportPhoto` (e.g. `"/uploads/photo_123.jpg"`).
  2. `resolvePhotoUrl()` in `lib/utils.ts` prepends the backend origin to render the existing image.
  3. If the user does not select a new file, the photo input is left untouched; the frontend retains the existing path without overwriting with null.
  4. If the user selects a new replacement photo, the binary `File` is uploaded, replacing the image on the server.

---

### 📄 2.5 Bond & Certificate PDF Generation Pipeline

```mermaid
graph TD
    ClickGenerate[User clicks Generate Bond PDF] --> RouteCall[POST /api/generate-*-pdf with application record]
    RouteCall --> ReadTemplate[Read static template: saf_parivar_kalyan_bond.pdf]
    RouteCall --> VerifyHash[Verify template SHA-256 hash integrity]
    RouteCall --> EmbedFont[Embed NotoSansDevanagari-SemiBold.ttf]
    RouteCall --> EmbedPhotos[Fetch & embed Applicant and Nominee photos]
    EmbedPhotos --> CropFit[Calculate exact inner-border box crop without stretching]
    CropFit --> OverlayText[Draw bounded text on calibrated baseline coordinates]
    OverlayText --> RenderStream[Output binary PDF stream]
    RenderStream --> ClientSave[Trigger instant client-side browser download]
```

- **Fixed Insurance Bond Installment**: Insurance Bima bonds render fixed `"300"` monthly installment text centered on the baseline dotted line at $X=269.65$, $Y=450.65$.
- **Photo Box Precision**: Photos are clipped inside the exact inner boundaries of the template's gold photo frames to avoid covering the outer printed borders.
