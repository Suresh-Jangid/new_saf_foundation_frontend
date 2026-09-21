# SAF Foundation Frontend — Technical Architecture Document

---

## 1. System Architecture Overview

The SAF Foundation frontend is an enterprise web application engineered with **Next.js 14 App Router**, **React 18**, **TypeScript 5**, **Tailwind CSS**, and **Radix UI**. It interfaces with both a modern Node.js/Express/Prisma backend and legacy PHP endpoints while executing complex client and server-side document rendering.

```mermaid
graph TD
    subgraph Browser Client
        UI[React 18 UI Layer]
        State[Form State & React Hooks]
        Guard[RoleGuard & Permission System]
        APIClient[lib/api.ts Client Engine]
    end

    subgraph Next.js 14 Server Layer
        RouteHandlers[App Router API Routes /app/api/*]
        PDFEngine[pdf-lib Document Generator]
        Proxy[CORS Image Proxy Engine]
        PaymentBridge[Razorpay Order API Bridge]
    end

    subgraph Backend & External Services
        NodeBackend[(Main Express / Prisma Backend)]
        Storage[(S3 / Local /uploads Storage)]
        RazorpayGateway[Razorpay Payment Gateway]
        WhatsAppAPI[FireConnect / Cloud WhatsApp API]
    end

    UI --> Guard
    Guard --> State
    State --> APIClient
    APIClient -->|Axios with Deduplication| NodeBackend
    APIClient -->|Internal RPC| RouteHandlers
    RouteHandlers --> PDFEngine
    RouteHandlers --> Proxy
    Proxy --> Storage
    RouteHandlers --> PaymentBridge
    PaymentBridge --> RazorpayGateway
    APIClient --> WhatsAppAPI
```

---

## 2. Layer-by-Layer Architectural Decomposition

### 🏗️ 2.1 Page → Component → Hook → Service → API Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Page as AddGeneralApplicationPage
    participant Form as ApplicationFormSections
    participant Hook as useAgeCategory Hook
    participant Service as GeneralApplicationsAPI
    participant Client as lib/api.ts Axios Instance
    participant Backend as Express/Prisma Backend

    User->>Page: Enters Date of Birth
    Page->>Hook: calculateAgeCategory(dob)
    Hook-->>Page: { age: 24, category: "18-25", amount: 11000 }
    Page->>Form: Re-renders with updated Category & Amount
    User->>Page: Selects photo & clicks Submit
    Page->>Page: Validate required fields & regex
    Page->>Service: create(formData)
    Service->>Client: post('/general-applications', formData)
    Client->>Client: Deduplicate in-flight key
    Client->>Backend: POST multipart/form-data
    Backend-->>Client: HTTP 201 { success: true, data: { id: "..." } }
    Client-->>Page: Response payload
    Page->>User: Toast notification & Redirect to list
```

---

## 3. Core Architectural Subsystems

### 🛡️ 3.1 Authentication & Authorization Architecture (RBAC)

The application implements a multi-tier Role-Based Access Control (RBAC) system defined in `lib/permissions.ts` and enforced via `components/role-guard.tsx`.

```mermaid
graph TD
    UserLogin[User Logs In] --> TokenStorage[Save Token & User Role in localStorage]
    PageLoad[Navigate to Protected Route] --> ReadRole[RoleGuard reads role & permissions]
    ReadRole --> IsAdmin{Is Role Admin?}
    IsAdmin -- Yes --> RenderPage[Grant Full Access & Render Page]
    IsAdmin -- No --> CheckModule{Module Permission Enabled?}
    CheckModule -- No --> RenderDisabled[Render ModuleDisabledBanner or Fallback]
    CheckModule -- Yes --> CheckAction{Action Allowed? view/create/update/delete}
    CheckAction -- Yes --> RenderPage
    CheckAction -- No --> AccessDenied[Render Access Denied Card]
```

- **Roles**: `admin`, `agent`, `manager`, `user`.
- **Granular Actions**: `view`, `create`, `update`, `delete`.
- **Dynamic Feature Flags**: Admins can enable or disable entire modules at runtime via `/dashboard/settings/configuration`. When a module is turned off, `RoleGuard` immediately renders a non-destructive `ModuleDisabledBanner`.

---

### 📝 3.2 Form Architecture & Dual Form Number Handling

Forms are constructed using modular section components in `components/forms/application-form-sections.tsx`.

1. **State Isolation**: Form state is held in parent page components using standard typed interfaces (`GeneralApplication`, `InsuranceApplication`, etc.).
2. **Dual Form Numbers**:
   - `formNumber`: System-generated unique identifier (e.g. `APP-2026-00123`).
   - `offlineFormNumber`: Physical paper booklet sequence number entered manually by agents (e.g. `"005"`, `"042"`). The frontend preserves leading zeros as explicit strings without coercing to numbers.
3. **Dynamic Fee Calculation**: `hooks/use-age-category.ts` binds DOB changes to instant calculation of applicant age, age category slab, and associated registration fee.

---

### 🖼️ 3.3 Photo & File Upload Architecture

```mermaid
graph LR
    UserFile[User Selects Image File] --> ClientValidation[Validate Size < 5MB & MIME image/*]
    ClientValidation --> FileReader[FileReader creates local object preview URL]
    FileReader --> RenderPreview[Display thumbnail in FileUploadField]
    UserFile --> FormState[Attach File object to FormData]
    FormState --> APIPost[POST multipart/form-data to Backend]
    APIPost --> S3Store[Backend saves file and returns /uploads/path.jpg]

    subgraph Edit Flow Non-Destructive Update
        FetchData[Fetch Existing Record] --> SetInitialState[Set initial photo URL string]
        SetInitialState --> IsNewFileSelected{User selected new file?}
        IsNewFileSelected -- No --> RetainOld[Omit photo key or send existing string]
        IsNewFileSelected -- Yes --> SendNew[Append new File object to FormData]
    end
```

---

### 📄 3.4 PDF Generation & Rendering Architecture

The platform supports dual PDF generation pipelines:

```mermaid
graph TD
    TriggerPDF[User Clicks Download Bond / Certificate] --> CheckType{Client vs Server Route?}

    CheckType -- Server Route --> CallAPIRoute[POST to /api/generate-*-pdf]
    CallAPIRoute --> LoadTemplate[Load static byte-perfect PDF template from public/pdf/*]
    CallAPIRoute --> LoadFont[Embed NotoSansDevanagari-SemiBold.ttf]
    CallAPIRoute --> FetchImages[Fetch photos via /api/proxy-image to avoid CORS]
    CallAPIRoute --> OverlayData[pdf-lib draws bounded text & fitted images]
    CallAPIRoute --> ReturnBytes[Return application/pdf stream]
    ReturnBytes --> BrowserDownload[Browser triggers direct file save]

    CheckType -- Client Side --> PDFService[lib/pdf-service.ts using jsPDF / pdf-lib]
    PDFService --> DirectDownload[Generate in memory & trigger download]
```

- **Byte-Perfect Template Integrity**: Official templates in `public/pdf/` are protected with cryptographic SHA-256 hashes.
- **Photo Inset Fitting**: Photos are scaled proportionally with cover/center clipping to fit inside template frames without covering decorative borders.

---

### 💳 3.5 E-PIN & Payment Subsystems

```mermaid
graph TD
    subgraph E-PIN Payment Flow
        InputEPIN[Agent inputs E-PIN Code] --> VerifyEPIN[EpinInputVerifier calls EpinService.verify]
        VerifyEPIN --> IsValid{E-PIN Active & Matches Scheme?}
        IsValid -- Yes --> ShowGreenCheck[Display Verified Green Badge & Set Amount]
        IsValid -- No --> ShowRedError[Display Invalid / Already Used Message]
        ShowGreenCheck --> SubmitWithEPIN[Burn E-PIN atomically upon application submission]
    end

    subgraph Razorpay Online Payment Flow
        SelectRazorpay[Select Payment Mode: Razorpay] --> CreateOrder[POST /api/razorpay/create-order]
        CreateOrder --> OpenCheckout[Launch Razorpay Checkout Modal]
        OpenCheckout --> PaySuccess[Payment Captured]
        PaySuccess --> VerifySignature[POST /api/razorpay/verify-payment]
        VerifySignature --> CompleteApp[Submit Application with Payment ID & Signature]
    end
```

---

## 4. Resilience & Legacy Compatibility

1. **Request Deduplication**: `lib/api.ts` maintains an in-flight `Map<string, Promise>` matching method, URL, and serialized payload (including file hashes) to eliminate duplicate network traffic.
2. **Dual-Key Alias Resilience**: All service mappers safely consume both camelCase and snake_case properties:
   ```typescript
   const offlineNo = record.offlineFormNumber ?? record.offline_form_number ?? '';
   const nomineeAadhar = record.nomineeAadhar ?? record.nomineeAadhaar ?? record.nominee_aadhar ?? '';
   ```
3. **URL Normalizer**: `resolvePhotoUrl()` in `lib/utils.ts` handles relative paths (`/uploads/`), absolute URLs (`https://`), base64 data strings, and legacy PHP directory formats (`/purbiya/api/user/`).
