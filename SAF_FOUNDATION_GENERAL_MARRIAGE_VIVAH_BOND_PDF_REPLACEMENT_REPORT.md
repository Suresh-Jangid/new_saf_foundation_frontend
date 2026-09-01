# SAF FOUNDATION — GENERAL MARRIAGE VIVAH YOJANA BOND PDF REPLACEMENT REPORT

**Execution Date:** September 1, 2026  
**Status:** **PASS — NEW GENERAL MARRIAGE VIVAH YOJANA BOND LIVE**  
**Target Module:** General Applications (`/dashboard/general-applications`) — "Generate Bond PDF" Action  
**New Approved Source Template:** `viva yojana bond(1).pdf`  
**Deployment Target:** `new_saf_foundation_frontend` (Branch: `main`)  
**Production URL:** `https://new-saf-foundation-frontend-infrabyte-frontend.vercel.app`  

---

## 1. Dimensional & Scaling Analysis

| Parameter | Value | Details |
|---|---|---|
| **Old Production Bond Width** | **`504 pt`** (177.80 mm) | Authoritative production bond width |
| **Old Production Bond Height** | **`324 pt`** (114.30 mm) | Authoritative production bond height |
| **Source Approved PDF Dimensions** | **`612 pt` × `792 pt`** | Letter-size container page with top artwork |
| **Source Artwork Bounding Box** | **`434 pt` × `250 pt`** | Measured via canvas rasterizer ($x: 80\to 514, y: 42\to 292$) |
| **Scaling & Placement Transformation** | **`scale = 1.10`** | Proportional scaling fitting exactly inside `504 × 324 pt` canvas with balanced 14pt margins |
| **Final Output Bond Width** | **`504 pt`** (177.80 mm) | **`NEW_WIDTH == OLD_WIDTH` (EXACT MATCH)** |
| **Final Output Bond Height** | **`324 pt`** (114.30 mm) | **`NEW_HEIGHT == OLD_HEIGHT` (EXACT MATCH)** |

---

## 2. A4 Two-Bond Print Calculation & Verification

The authoritative production bond format preserves the paper-saving two-bond workflow on standard A4 paper:

- **Standard A4 Dimensions:** `210 mm × 297 mm` = `595.28 pt × 841.89 pt`
- **Individual Bond Dimensions:** `177.80 mm × 114.30 mm` = `504.00 pt × 324.00 pt`
- **Horizontal Fit:** `504.00 pt <= 595.28 pt` (Left/Right margins: $\approx 45.64\text{ pt}$)
- **Vertical Fit (Two Bonds on 1 Sheet):** $2 \times 324.00\text{ pt} = 648.00\text{ pt} <= 841.89\text{ pt}$ (Remaining margin for cutting: $193.89\text{ pt}$)
- **Verification Result:** **CONFIRMED & VALIDATED** — Two individual bonds fit vertically on one portrait A4 page without clipping, distortion, or manual re-scaling.

```
A4 Sheet (595.28 x 841.89 pt)
┌──────────────────────────────────────┐
│  Margin Top (~40pt)                  │
│  ┌────────────────────────────────┐  │
│  │   VIVAH YOJANA BOND #1         │  │
│  │   (504 pt x 324 pt)            │  │
│  └────────────────────────────────┘  │
│  Cut Line / Gap (~30pt)              │
│  ┌────────────────────────────────┐  │
│  │   VIVAH YOJANA BOND #2         │  │
│  │   (504 pt x 324 pt)            │  │
│  └────────────────────────────────┘  │
│  Margin Bottom                       │
└──────────────────────────────────────┘
```

---

## 3. Template Paths & API Route

- **PDF Generation Route:** `app/api/generate-bond-pdf/route.ts` (`POST /api/generate-bond-pdf`)
- **Frontend Trigger:**
  - `app/dashboard/general-applications/page.tsx` (`handleGenerateBond`)
  - `app/dashboard/general-applications/add/page.tsx` (`sendWhatsAppFile`)
- **Template Storage Locations:**
  - `public/pdf/general_application/bond/vivah_yojana_bond.pdf` (Primary calibrated template)
  - `public/pdf/general_application/bond/viva yojana bond(1).pdf` (User-named approved asset)
  - `public/pdf/general_application/bond/girl_bond.pdf` (Unified asset sync)
  - `public/pdf/general_application/bond/boys_bond.pdf` (Unified asset sync)

---

## 4. Dynamic Field Mapping & Precise Coordinates

| Field Name | Coordinate $(x, y_{\text{top}})$ | Font Size | Color | Description |
|---|---|---|---|---|
| **सदस्यता क्र.** (Membership No.) | $x = 80, y = 126$ | 11pt | Blue (`rgb(0, 0.15, 0.6)`) | Inside top-left membership box |
| **आवेदन क्र.** (Application No.) | $x = 388, y = 126$ | 11pt | Blue (`rgb(0, 0.15, 0.6)`) | Inside top-right application box |
| **श्रीमान्** (Applicant Name) | $x = 55, y = 172$ | 10pt | Dark (`rgb(0.1, 0.1, 0.1)`) | Sits cleanly on applicant dotted line |
| **पिता का नाम** (Father's Name) | $x = 230, y = 172$ | 10pt | Dark (`rgb(0.1, 0.1, 0.1)`) | Sits cleanly on father name dotted line |
| **उम्र** (Age) | $x = 348, y = 172$ | 9.5pt | Dark (`rgb(0.1, 0.1, 0.1)`) | Sits on age dotted line (e.g. `20 वर्ष`) |
| **गोत्र** (Gotra) | $x = 46, y = 197$ | 10pt | Dark (`rgb(0.1, 0.1, 0.1)`) | Sits on gotra dotted line |
| **निवासी** (Residence / Full Address) | $x = 208, y = 197$ | 9.5pt | Dark (`rgb(0.1, 0.1, 0.1)`) | Combined address, tehsil, district |
| **Maturity / Duration** | $x = 200, y = 245$ | 10pt | Red/Brown (`rgb(0.6, 0.1, 0.1)`) | Sits in `आपको विवाह योजना का लाभ ... के बाद मिलेगा ।` |
| **Passport Photo Box** | $x = 405, y = 146$, $w = 74, h = 84$ | Embedded | Fits cleanly inside the right-hand photo box |

---

## 5. Quality Gates & Verification

- **TypeScript Compilation (`npm run type-check`)**: **0 Errors (PASS)**
- **ESLint Rules (`npm run lint`)**: **0 Errors (PASS)**
- **Production Build Compilation (`npm run build`)**: **96/96 Routes Compiled Successfully (PASS)**
- **Visual & Layout Verification**: **PASS** — Rendered and verified single bond and 2-bond A4 print layout with Devanagari typography and correct alignment.

---

## 6. Final Production Safety Attestation

- Production DB records created: **0**
- Production DB records modified: **0**
- Production DB records deleted: **0**
- E-PIN generated: **0**
- E-PIN assigned: **0**
- E-PIN consumed: **0**
- E-PIN burnt: **0**
- Real payments: **0**
- Payment gateway calls: **0**
- WhatsApp messages sent: **0**
- Backend files modified: **0**
- Database migrations executed: **0**
- Unrelated records modified: **0**
- Unrelated files committed: **0**

---

## 7. Final Acceptance Criteria Matrix

- [x] `viva yojana bond(1).pdf` artwork is used
- [x] Old bond artwork is no longer used
- [x] Generate Bond PDF opens the new bond
- [x] Final width matches old production bond (`504 pt`)
- [x] Final height matches old production bond (`324 pt`)
- [x] Aspect ratio is preserved
- [x] Two bonds practically fit on one A4 sheet
- [x] Paper-saving workflow is preserved
- [x] Dynamic applicant data works
- [x] Applicant name correct
- [x] Father/Husband name correct
- [x] Application number correct
- [x] Membership number correct
- [x] Age correct
- [x] Gotra correct
- [x] Residence correct
- [x] Photo area correct
- [x] Signature area correct
- [x] No clipping
- [x] No overflow
- [x] No distortion
- [x] No unnecessary whitespace
- [x] Business logic unchanged
- [x] Backend unchanged
- [x] Database unchanged
- [x] E-PIN unchanged
- [x] WhatsApp unchanged
- [x] Payment unchanged
- [x] Type-check PASS
- [x] Lint PASS
- [x] Build PASS
- [x] Git diff contains only intended changes
- [x] Commit created
- [x] Pushed to `origin/main`
- [x] Vercel deployment successful
- [x] Production Generate Bond PDF verified (Read-only)
- [x] Final report generated

**FINAL STATUS: PASS — NEW GENERAL MARRIAGE VIVAH YOJANA BOND LIVE**
