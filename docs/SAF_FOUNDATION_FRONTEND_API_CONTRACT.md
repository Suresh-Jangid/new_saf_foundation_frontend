# SAF Foundation Frontend — API & Payload Contracts

---

## 1. Overview & Network Conventions

The frontend connects to the backend REST API via `lib/api.ts` with the following conventions:
- **Base URL Resolver**: Configured dynamically in `lib/api-url.ts` with fallback to `http://localhost:5000/api`.
- **Authorization Header**: Bearer token injected automatically on every request:
  `Authorization: Bearer <jwt_token>` (retrieved from `localStorage.getItem("token")`).
- **Content-Type**:
  - `multipart/form-data` for entity creation and edits involving binary photos/documents.
  - `application/json` for authentication, E-PIN verification, pagination queries, and status updates.
- **In-Flight Deduplication**: Identical requests dispatched concurrently share a single pending network promise.

---

## 2. Master API Endpoint Contracts

### 🔐 2.1 Authentication Subsystem

#### `POST /auth/login`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "username": "admin@saf.org",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "usr_001",
      "username": "admin",
      "role": "admin",
      "permissions": ["all"]
    }
  }
  ```

---

### 🏛️ 2.2 Scheme Applications (General Marriage, Mayra, Insurance, Dhundhotsav, Janni, Aawas, Lado Bahin)

#### `POST /general-applications` (Create Application)
- **Content-Type**: `multipart/form-data`
- **FormData Payload Fields**:
  ```http
  offlineFormNumber: "005"
  applicationDate: "2026-09-22"
  applicantName: "Rahul Sharma"
  fatherName: "Suresh Sharma"
  motherName: "Sunita Sharma"
  dateOfBirth: "2002-05-14"
  aadharNumber: "123456789012"
  gotra: "Kashyap"
  mobile: "9876543210"
  gender: "Male"
  category: "18-25"
  address: "Village Post Rampur"
  pinCode: "302001"
  tehsil: "Sanganer"
  district: "Jaipur"
  state: "Rajasthan"
  nomineeName: "Pooja Sharma"
  nomineeRelation: "Wife"
  nomineeAadhar: "987654321098"
  nomineeMobile: "9876543211"
  workerName: "Vikram Agent"
  workerMobile: "8888888888"
  paymentAmount: "11000"
  paymentMode: "cash"
  epinCode: "MAR-2026-XYZ89"
  passportPhoto: [Binary File]
  nomineePhoto: [Binary File, Optional]
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Application created successfully",
    "data": {
      "id": "app_98234",
      "formNumber": "APP-2026-0042",
      "offlineFormNumber": "005",
      "passportPhoto": "/uploads/applicant_app_98234.jpg"
    }
  }
  ```

#### `PUT /general-applications/:id` (Update Application)
- **Content-Type**: `multipart/form-data`
- **Behavior**: All fields above can be updated. If `passportPhoto` is omitted or passed as a URL string, the backend preserves the existing image path.

---

### 🔑 2.3 E-PIN Operational Management

#### `POST /epin/verify`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "code": "MAR-2026-XYZ89",
    "scheme": "MARRIAGE"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "valid": true,
    "epin": {
      "id": "ep_109",
      "code": "MAR-2026-XYZ89",
      "scheme": "MARRIAGE",
      "status": "ACTIVE",
      "faceValue": 11000
    }
  }
  ```

---

### 📄 2.4 Server-Side PDF Document Generation Handlers

#### `POST /api/generate-bond-pdf` / `POST /api/generate-insurance-bond-pdf`
- **Content-Type**: `application/json`
- **Request Body**: Complete entity record object.
- **Response Headers**:
  - `Content-Type`: `application/pdf`
  - `Content-Disposition`: `attachment; filename="Insurance_Bond_005.pdf"`
- **Response Body**: Binary PDF stream.

---

## 3. Dual-Key Legacy Compatibility Mapping

To support legacy database records and PHP API migrations, the frontend mappers in `lib/services.ts` automatically normalize inconsistent field names:

| Frontend Canonical Field | Accepted Backend Aliases |
| :--- | :--- |
| `offlineFormNumber` | `offlineFormNumber`, `offline_form_number`, `form_no` |
| `nomineeAadhar` | `nomineeAadhar`, `nomineeAadhaar`, `nominee_aadhar`, `nominee_aadhaar` |
| `nomineeMobile` | `nomineeMobile`, `nominee_mobile`, `nomineePhone` |
| `passportPhoto` | `passportPhoto`, `passport_photo`, `photo`, `passportPhotoUrl` |
| `nomineePhoto` | `nomineePhoto`, `nominee_photo`, `nomineePhotoUrl` |
| `installmentAmount` | `installmentAmount`, `installment_amount`, `monthly_installment` |
| `workerMobile` | `workerMobile`, `worker_mobile`, `agentMobile`, `agent_mobile` |
