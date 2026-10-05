import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

// Helper to sanitize agent and application offline numbers
function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('INS-') ||
    upper.startsWith('INS_') ||
    upper.startsWith('SAF-') ||
    upper.startsWith('SAF_') ||
    upper === 'EMP' ||
    upper === 'ADMIN' ||
    upper === 'SUPER ADMIN' ||
    upper === 'N/A' ||
    upper === 'NA' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'UUID' ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  ) {
    return '';
  }
  return str;
}

function sanitizeValue(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'N/A' ||
    upper === 'NA'
  ) {
    return '';
  }
  return str;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body in Insurance Bond API:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    const daysText = body?.daysText || body?.duration || record?.daysText || record?.duration || '180 दिन';

    console.log('Generating Insurance Bond PDF for:', record?.applicantName || record?.formNumber || 'Unknown');

    // Canonical official common template for all Insurance Bima Applications (both male & female)
    const candidateTemplates = [
      path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'bond', 'saf_parivar_kalyan_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'saf_parivar_kalyan_bond.pdf'),
    ];

    const templatePath = candidateTemplates.find((p) => fs.existsSync(p));

    if (!templatePath || !fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Official Insurance bond template not found. Expected: saf_parivar_kalyan_bond.pdf` },
        { status: 500 }
      );
    }

    console.log('Using Official Common Insurance Bond template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Template PDF has no pages' }, { status: 500 });
    }

    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Pick photos
    const applicantPhotoSource = pickPhotoSource(
      body?.imageData,
      record?.imageData,
      record?.applicantPhotoData,
      record?.passportPhoto,
      record?.passport_photo,
      record?.passportPhotoUrl,
      record?.applicantPhoto,
      record?.applicant_photo
    );

    const nomineePhotoSource = pickPhotoSource(
      body?.nomineeImageData,
      body?.nomineePhotoData,
      body?.nomineePhoto,
      body?.nomineePhotoUrl,
      body?.nomineePassportPhoto,
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
      record?.nomineePhotoUrl,
      record?.nominee_photo_url,
      record?.spousePhotoUrl
    );

    // Embed photos inside inner photo area of calibrated photo boxes on official A4 template (595.28 x 841.89 pt):
    // Top Photo Box (खाताधारक का फोटो):   inner x = 457.80, yFromTop = 186.65, w = 83.88, h = 71.15
    // Bottom Photo Box (नॉमिनी का फोटो): inner x = 457.80, yFromTop = 265.96, w = 83.88, h = 71.15
    if (applicantPhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 457.80, 186.65, 83.88, 71.15, 'cover');
      } catch (err) {
        console.warn('Could not embed applicant photo in Insurance Bond:', err);
      }
    }

    if (nomineePhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 457.80, 265.96, 83.88, 71.15, 'cover');
      } catch (err) {
        console.warn('Could not embed nominee photo in Insurance Bond:', err);
      }
    }

    // Embed Devanagari font (prioritizes SemiBold for matching bold printed label weights)
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    const font = devanagariFontPath
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica-Bold');

    const navyColor = rgb(0.0, 0.15, 0.58);       // #002694
    const charcoalColor = rgb(0.12, 0.14, 0.18);  // #1f242e

    // Helper to draw text horizontally and vertically centered inside a rectangular box
    const drawCenteredInBox = (
      text: string | number | undefined | null,
      boxX: number,
      boxY: number, // bottom of box in PDF coords
      boxW: number,
      boxH: number,
      size = 11.0,
      color = navyColor
    ) => {
      if (text === undefined || text === null) return;
      const str = String(text).trim();
      if (!str) return;

      let fontSize = size;
      let textWidth = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(str, fontSize) : str.length * fontSize * 0.6;
      const maxW = boxW - 4;
      if (textWidth > maxW && (font as any).widthOfTextAtSize) {
        fontSize = Math.max(7.0, size * (maxW / textWidth));
        textWidth = (font as any).widthOfTextAtSize(str, fontSize);
      }

      const drawX = boxX + (boxW - textWidth) / 2;
      // Optical vertical centering: capHeight is approx 0.72 of font size
      const capHeight = fontSize * 0.72;
      const boxMidY = boxY + boxH / 2;
      const drawY = boxMidY - capHeight / 2;

      firstPage.drawText(str, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color,
      });
    };

    // Drawing helper with baseline alignment and proportional bounds fitting
    const drawBounded = (
      text: string | number | undefined | null,
      x: number,
      blY: number,
      size = 10.5,
      maxW?: number,
      color = charcoalColor
    ) => {
      if (text === undefined || text === null) return;
      const str = String(text).trim();
      if (!str) return;

      let fontSize = size;
      if (maxW && (font as any).widthOfTextAtSize) {
        try {
          const textWidth = (font as any).widthOfTextAtSize(str, size);
          if (textWidth > maxW) {
            fontSize = Math.max(6.0, size * (maxW / textWidth));
          }
        } catch {
          // Fallback if measurement fails
        }
      }

      firstPage.drawText(str, {
        x,
        y: blY,
        size: fontSize,
        font,
        color,
      });
    };

    // Extract dynamic fields adhering strictly to business rules:
    // 1. Form Number / Offline Form Number (preserves leading zeros e.g. "005")
    const rawOfflineFormNumber =
      record.offlineFormNumber ||
      record.offline_form_number ||
      record.offlineFormNo ||
      record.offline_form_no ||
      record.formNumber ||
      record.form_number ||
      '';
    const formNumber = sanitizeOfflineNumber(rawOfflineFormNumber);

    // 2. Application Date formatting (DD/MM/YYYY)
    const rawDate =
      record.applicationDate ||
      record.application_date ||
      record.created_at ||
      record.createdAt ||
      record.date ||
      '';
    const applicationDate = rawDate ? formatDateToDDMMYYYY(String(rawDate)) : '';

    // 3. Worker offline number (sanitized) - from assigned Agent Registration
    const rawWorkerOffline =
      record.workerOfflineFormNumber ||
      record.worker_offline_form_number ||
      record.agentOfflineFormNumber ||
      record.agent_offline_form_number ||
      record.workerOffline ||
      record.workerCode ||
      record.worker_code ||
      record.agentCode ||
      record.agent_code ||
      '';
    const workerOffline = sanitizeOfflineNumber(rawWorkerOffline);

    // 4. Membership Number - strictly real authoritative membershipNumber only, else blank
    const rawMembershipNumber =
      record.membershipNumber ||
      record.membership_number ||
      record.membershipNo ||
      '';
    const membershipNumber = sanitizeOfflineNumber(rawMembershipNumber);

    // 5. Senior offline number (sanitized) - from parent Level-1 Senior Agent
    const rawSeniorOffline =
      record.seniorOfflineFormNumber ||
      record.senior_offline_form_number ||
      record.seniorAgentOfflineFormNumber ||
      record.senior_agent_offline_form_number ||
      record.seniorOffline ||
      record.seniorWorkerCode ||
      record.senior_worker_code ||
      record.seniorCode ||
      record.senior_code ||
      '';
    const seniorOffline = sanitizeOfflineNumber(rawSeniorOffline);

    // 6. Left Column: Applicant Info & Strict Field Separations
    const applicantName = sanitizeValue(record.applicantName || record.name || '');
    const fatherHusbandName = sanitizeValue(
      record.husbandName ||
      record.fatherName ||
      record.fatherHusbandName ||
      record.wifeName ||
      ''
    );
    const aadharNumber = sanitizeValue(record.aadharNumber || record.aadhar || record.applicantAadhar || '');
    const caste = sanitizeValue(
      record.gotra ||
      record.gotraName ||
      record.gotra_name ||
      record['गोत्र'] ||
      record['जाति'] ||
      record.caste ||
      record.category ||
      ''
    );
    const nomineeRelation = sanitizeValue(
      record.nomineeRelation ||
      record.nominee_relation ||
      record.relation ||
      record['सम्बन्ध'] ||
      record['नामिनी_का_सम्बन्ध'] ||
      record['नॉमिनी_का_सम्बन्ध'] ||
      ''
    );
    const village = sanitizeValue(record.village || record.address || record.tehsil || '');

    // 7. Right Column: Nominee & Other Info
    const nomineeName = sanitizeValue(
      record.nomineeName ||
      record.nominee_name ||
      record.nominee ||
      record['वारिसदार'] ||
      record['नामिनी_का_नाम'] ||
      record['नॉमिनी_का_नाम'] ||
      ''
    );
    const nomineeAadhar = sanitizeValue(
      record.nomineeAadhaarNumber ||
      record.nomineeAadharNumber ||
      record.nominee_aadhaar_number ||
      record.nominee_aadhar_number ||
      record.nomineeAadhaar ||
      record.nomineeAadhar ||
      record.nominee_aadhaar ||
      record.nominee_aadhar ||
      record.nomineeAadhaarNo ||
      record.nomineeAadharNo ||
      record.nominee_aadhaar_no ||
      record.nominee_aadhar_no ||
      record['नॉमिनी_आधार_नं'] ||
      record['नॉमिनी_आधार'] ||
      record['वारिसदार_आधार'] ||
      ''
    );
    const nomineeMobile = sanitizeValue(
      record.nomineeMobileNumber ||
      record.nominee_mobile_number ||
      record.nomineeMobile ||
      record.nominee_mobile ||
      record.nomineeMobileNo ||
      record.nominee_mobile_no ||
      record.nomineePhone ||
      record.nominee_phone ||
      record['नॉमिनी_मोबाइल_नं'] ||
      record['नॉमिनी_मोबाइल'] ||
      record['वारिसदार_मोबाइल'] ||
      ''
    );
    // Agent Mobile must come ONLY from the assigned Agent/Worker's authoritative mobile field.
    // Allowed resolution:
    // 1. agentMobileNumber / agent_mobile_number
    // 2. agentMobile / agent_mobile / workerMobile / worker_mobile / workerMobileNumber / assignedAgentMobile
    // 3. resolved assigned Agent/Worker profile mobile (addedBy?.mobile, added_mobile, agentPhone, workerPhone)
    // If no valid assigned Agent mobile exists: BLANK.
    // NEVER use applicantMobile, nomineeMobile, applicant's phone, user phone, or arbitrary contact number.
    const agentMobile = sanitizeValue(
      record.agentMobileNumber ||
      record.agent_mobile_number ||
      record.agentMobile ||
      record.agent_mobile ||
      record.workerMobile ||
      record.worker_mobile ||
      record.workerMobileNumber ||
      record.worker_mobile_number ||
      record.assignedAgentMobile ||
      record.agentPhone ||
      record.agent_phone ||
      record.workerPhone ||
      record.worker_phone ||
      record.addedBy?.mobile ||
      record.added_mobile ||
      record['कार्यकर्ता_का_मोबाइल'] ||
      ''
    );
    const district = sanitizeValue(record.district || '');
    const state = sanitizeValue(record.state || 'राजस्थान');

    // 8. Bottom Insurance Scheme Amount: "परिवार कल्याण बीमा [ 300 ] रुपये प्रत्येक बीमा पर लागू"
    // The Insurance Bima Bond uses a fixed ₹300 monthly installment amount rendered in the dotted blank area.
    const rawAmt =
      record?.installmentAmount ??
      record?.installment_amount ??
      record?.insuranceInstallment ??
      record?.insurance_installment ??
      record?.monthly_installment ??
      record?.monthlyInstallment ??
      record?.premiumAmount ??
      record?.premium_amount;
    let insuranceAmountText = '300';
    if (rawAmt !== undefined && rawAmt !== null && rawAmt !== '') {
      const cleanAmtStr = String(rawAmt).trim();
      const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(cleanAmtStr.replace(/[^\d.]/g, ''));
      if (!isNaN(num) && num > 0) {
        insuranceAmountText = String(num);
      } else if (cleanAmtStr && /^\d+$/.test(cleanAmtStr)) {
        insuranceAmountText = cleanAmtStr;
      }
    }

    // Normalized diagnostic logging (safe development-only trace, no PII)
    const normalizedNomineeAadhaar = nomineeAadhar ? 'PRESENT' : 'MISSING';
    const normalizedNomineeMobile = nomineeMobile ? 'PRESENT' : 'MISSING';
    const normalizedNomineePhoto = nomineePhotoSource ? 'PRESENT' : 'MISSING';
    const normalizedInstallmentAmount = rawAmt !== undefined && rawAmt !== null && rawAmt !== '' ? rawAmt : null;
    const normalizedInstallmentText = insuranceAmountText;

    console.log('INSURANCE_BOND_PDF_NORMALIZED_PAYLOAD', {
      nomineeAadhaar: normalizedNomineeAadhaar,
      nomineeMobile: normalizedNomineeMobile,
      nomineePhoto: normalizedNomineePhoto,
      installmentAmount: normalizedInstallmentAmount,
      installmentText: normalizedInstallmentText || 'BLANK',
    });

    // ── Draw Header Meta Fields Centered inside their respective pre-printed boxes ──
    // 1. Form No Box [X: 110.48, Y: 703.58, W: 87.92, H: 19.04]
    drawCenteredInBox(formNumber, 110.48, 703.58, 87.92, 19.04, 11.0, navyColor);

    // 2. Application Date Box [X: 454.77, Y: 697.47, W: 87.92, H: 19.04]
    drawCenteredInBox(applicationDate, 454.77, 697.47, 87.92, 19.04, 11.0, navyColor);

    // 3. Agent Code Box [X: 110.48, Y: 679.73, W: 87.92, H: 19.04]
    drawCenteredInBox(workerOffline, 110.48, 679.73, 87.92, 19.04, 11.0, navyColor);

    // 4. Membership No Box [X: 454.77, Y: 668.30, W: 87.92, H: 19.04]
    drawCenteredInBox(membershipNumber, 454.77, 668.30, 87.92, 19.04, 11.0, navyColor);

    // 5. Upline Code Box [X: 110.48, Y: 656.93, W: 87.92, H: 19.04]
    drawCenteredInBox(seniorOffline, 110.48, 656.93, 87.92, 19.04, 11.0, navyColor);

    // ── Draw Left Column Fields (खाताधारक विवरण) on Calibrated Baselines ──
    // नाम %& (Applicant Name) - baseline y = 634.00
    drawBounded(applicantName, 70.0, 634.00, 10.5, 190, charcoalColor);

    // पिता/पति का नाम %& (Father/Husband Name) - baseline y = 610.00
    drawBounded(fatherHusbandName, 134.0, 610.00, 10.5, 130, charcoalColor);

    // आधार नं. %& (Applicant Aadhaar) - baseline y = 586.00
    drawBounded(aadharNumber, 94.0, 586.00, 10.5, 165, charcoalColor);

    // जाति %& (Caste/Gotra) - baseline y = 562.10
    drawBounded(caste, 74.0, 562.10, 10.5, 185, charcoalColor);

    // सम्बन्ध %& (Nominee Relation) - baseline y = 538.10
    drawBounded(nomineeRelation, 84.0, 538.10, 10.5, 175, charcoalColor);

    // गांव %& (Village/Address) - baseline y = 514.10
    drawBounded(village, 70.0, 514.10, 10.5, 190, charcoalColor);

    // ── Draw Right Column Fields (नॉमिनी एवं अन्य विवरण) on Calibrated Baselines ──
    // नॉमिनी नाम %& (Nominee Name) - baseline y = 634.00
    drawBounded(nomineeName, 333.0, 634.00, 10.5, 120, charcoalColor);

    // नॉमिनी आधार नं. %& (Nominee Aadhaar) - baseline y = 610.00
    drawBounded(nomineeAadhar, 358.0, 610.00, 10.5, 95, charcoalColor);

    // नॉमिनी मो. नं. %& (Nominee Mobile) - baseline y = 586.00
    drawBounded(nomineeMobile, 343.0, 586.00, 10.5, 110, charcoalColor);

    // एजेंट मो. नं. %& (Agent Mobile) - baseline y = 562.10
    drawBounded(agentMobile, 338.0, 562.10, 10.5, 115, charcoalColor);

    // जिला %& (District) - baseline y = 538.10
    drawBounded(district, 306.0, 538.10, 10.5, 145, charcoalColor);

    // राज्य %& (State) - baseline y = 514.10
    drawBounded(state, 302.0, 514.10, 10.5, 150, charcoalColor);

    // ── Draw Bottom Insurance Amount on Dotted Line ──
    // "परिवार कल्याण बीमा [ 300 ] रुपये प्रत्येक बीमा पर लागू"
    // Dotted line runs from X: 242.0 to 308.0 (W: 66.0) at baseline Y: 493.50
    const amtWidth = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(insuranceAmountText, 12.0) : 22.0;
    const amtX = 242.0 + Math.max(0, (66.0 - amtWidth) / 2);
    drawBounded(insuranceAmountText, amtX, 493.50, 12.0, 65, navyColor);

    const pdfBytes = await pdfDoc.save();

    const safeName = (applicantName || membershipNumber || formNumber || record?.id || 'bond')
      .replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_')
      .trim();

    const filename = `INSURANCE_BOND_${encodeURIComponent(safeName || 'document')}.pdf`;

    return new NextResponse(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error generating insurance bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insurance bond PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
