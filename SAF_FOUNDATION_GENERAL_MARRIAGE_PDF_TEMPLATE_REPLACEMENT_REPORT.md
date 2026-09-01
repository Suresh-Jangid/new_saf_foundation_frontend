# SAF FOUNDATION — GENERAL MARRIAGE PDF TEMPLATE REPLACEMENT REPORT
**Date:** September 1, 2026  
**Status:** COMPLETED & VERIFIED (Quality Gates Passed)  
**Target Module:** General Applications (`/dashboard/general-applications`) — "Generate PDF Form" Action  
**Template Replaced:** Replaced legacy separate templates (`balika_application_form.pdf` / `boys_application_form.pdf`) with the newly approved single-page unified PDF template `3 (general form).pdf` (`general_application_form.pdf`).

---

## 1. Executive Summary & Objective Alignment

| Requirement | Status | Details |
|---|---|---|
| **Target Action** | ✅ Verified | `/dashboard/general-applications` "Generate PDF Form" button calls `POST /api/fill-pdf-form` with `type: 'general-application'`. |
| **New Approved Template** | ✅ Deployed | Stored approved `3 (general form).pdf` at `public/pdf/general_application/general_application_form.pdf` and `public/pdf/general_application/3 (general form).pdf`. |
| **Two Distinct Form Sections** | ✅ Calibrated | Top: **"आवेदन–फॉर्म"** (Application Form) <br> Bottom: **"सदस्यता फार्म रसीद"** (Membership Form Receipt). |
| **Dynamic Field Population** | ✅ Precision Aligned | All form fields, receipt fields, Hindi Devanagari font glyphs, dates, amounts, and photo coordinates aligned without overlapping lines or labels. |
| **Scope Boundaries** | ✅ Preserved | Backend, database, Prisma schemas, APIs, business rules, E-PIN, and other module PDFs untouched. |
| **Quality Gates** | ✅ Passed | `npm run type-check`, `npm run lint`, and `npm run build` all passed with code 0. |

---

## 2. Template Architecture & Coordinate Calibration

The approved template is a single-page A4 document (`595.28 pt` × `841.89 pt`) with 2 distinct sections.

### Section 1: "आवेदन–फॉर्म" (Top Section)

| Field Name | Coordinate $(x, y)$ | Size / Style | Notes |
|---|---|---|---|
| **क्रमांक** (Form No.) | $x = 135, y = 191$ | 10pt / Blue | Populated after `क्रमांक : NGO/26/` |
| **दिनांक** (Date) | $x = 465, y = 191$ | 9.5pt / Dark | Formatted as `DD/MM/YYYY` |
| **नाम** (Applicant Name) | $x = 75, y = 222$ | 10pt / Dark | Sits cleanly on the dotted line |
| **पिता/पति का नाम** (Father/Husband) | $x = 140, y = 248$ | 10pt / Dark | Sits cleanly on the dotted line |
| **जन्म दिनांक** (DOB) | $x = 110, y = 274$ | 9.5pt / Dark | Formatted as `DD/MM/YYYY` |
| **लिंग** (Gender) | $x = 220, y = 274$ | 9.5pt / Dark | e.g. `महिला` / `पुरुष` |
| **शिक्षा** (Education) | $x = 330, y = 274$ | 9.5pt / Dark | Qualification / Education |
| **आवेदन के आधार नं.** (Aadhaar) | $x = 155, y = 301$ | 10pt / Dark | 12-digit Aadhaar |
| **पता** (Address) | $x = 75, y = 331$ | 9.5pt / Dark | Full residential address |
| **जिला** (District) | $x = 75, y = 357$ | 9.5pt / Dark | District |
| **राज्य** (State) | $x = 215, y = 357$ | 9.5pt / Dark | State (e.g. राजस्थान) |
| **मो. नं.** (Mobile) | $x = 370, y = 357$ | 9.5pt / Dark | 10-digit Mobile |
| **नॉमिनी का नाम** (Nominee Name) | $x = 130, y = 384$ | 10pt / Dark | Nominee Name |
| **सम्बन्ध** (Relationship) | $x = 380, y = 384$ | 10pt / Dark | Relationship with applicant |
| **नॉमिनी का आधार नं.** | $x = 150, y = 411$ | 9.5pt / Dark | Nominee Aadhaar |
| **मो.** (Nominee Mobile) | $x = 305, y = 411$ | 9.5pt / Dark | Nominee Mobile |
| **कार्यकर्ता कोड** (Worker Code/Name) | $x = 485, y = 411$ | 9.5pt / Dark | Worker identifier |
| **राशि** (Amount) | $x = 70, y = 439$ | 9.5pt / Dark | e.g. `2100/-` |
| **नकद/चैक/डी.डी./यूटीआर नं.** | $x = 310, y = 439$ | 9.5pt / Dark | Payment Mode / Ref |
| **सीनियर कोड** (Senior Code) | $x = 485, y = 439$ | 9.5pt / Dark | Senior code |
| **Passport Photo Box** | $x = 460, y = 218$, $w = 92, h = 120$ | Embedded JPG/PNG | Fits exactly into the photo frame |

---

### Section 2: "सदस्यता फार्म रसीद" (Bottom Section)

| Field Name | Coordinate $(x, y)$ | Size / Style | Notes |
|---|---|---|---|
| **क्रमांक** (Receipt Form No.) | $x = 135, y = 656$ | 10pt / Blue | Populated after `क्रमांक : NGO/26/` |
| **दिनांक** (Receipt Date) | $x = 485, y = 656$ | 9.5pt / Dark | Formatted as `DD/MM/YYYY` |
| **नाम** (Receipt Name) | $x = 75, y = 681$ | 10pt / Dark | Applicant name |
| **पिता/पति का नाम** | $x = 335, y = 681$ | 10pt / Dark | Father / Husband name |
| **पता** (Receipt Address) | $x = 75, y = 706$ | 9.5pt / Dark | Full address |
| **मो.** (Receipt Mobile) | $x = 75, y = 731$ | 9.5pt / Dark | Mobile number |
| **नगद/चैक/डीडी** | $x = 325, y = 731$ | 9.5pt / Dark | Payment Mode / Ref |
| **बाबत राशि** | $x = 110, y = 756$ | 9.5pt / Dark | e.g. `2100/-` |
| **रु Box** (Amount Box) | $x = 120, y = 788$ | 11pt / Blue | Fits centered in the white `रु` box |

---

## 3. Implementation Verification & Quality Gates

### Quality Gates Summary
1. **TypeScript Typecheck (`npm run type-check`)**:
   - Status: **PASSED (0 Errors)**
2. **ESLint Validation (`npm run lint`)**:
   - Status: **PASSED (0 Errors)**
3. **Next.js Production Build (`npm run build`)**:
   - Status: **PASSED (96/96 static & dynamic routes compiled successfully)**
4. **Visual & Rendering Audit**:
   - Status: **PASSED** — Generated high-resolution PDF and rendered PNG screenshot using Edge Headless to confirm pixel-level typography and line alignment.

---

## 4. Conclusion
The approved General Marriage PDF template `3 (general form).pdf` has been integrated into `new_saf_foundation_frontend` under `app/api/fill-pdf-form/route.ts`. All field alignments for both the application form and the receipt form are verified, with full backward compatibility and strict safety bounds preserved.
