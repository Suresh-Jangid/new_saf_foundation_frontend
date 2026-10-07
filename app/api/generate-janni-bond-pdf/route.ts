import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

// Helper to sanitize agent offline numbers (preserves ADMIN)
function sanitizeAgentOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('JNN-') ||
    upper.startsWith('JNN_') ||
    upper.startsWith('JN-') ||
    upper.startsWith('JN_') ||
    upper.startsWith('SAF-') ||
    upper.startsWith('SAF_') ||
    upper === 'EMP' ||
    upper === 'DEFAULT AGENT' ||
    upper === 'DEFAULT' ||
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

// Helper to sanitize application and membership offline numbers
function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('JNN-') ||
    upper.startsWith('JNN_') ||
    upper.startsWith('JN-') ||
    upper.startsWith('JN_') ||
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

// Resolve authoritative Janni Delivery dynamic amount for clause: "जननी सुरक्षा प्रसव योजना ...... रूपये प्रत्येक डिलीवरी पर लागू"
function resolveJanniDeliveryAmountText(rec: any, body?: any): string {
  // Canonical per-delivery installment / contribution fields ONLY.
  // NEVER fall back to fee, totalAmount, membershipFee, paymentAmount, or installments[0]?.amount,
  // which represent one-time registration fees or ledger payments (e.g. ₹300, ₹3,100, ₹5,100),
  // nor to total assistance grants (e.g. ₹11,000).
  const rawAmt =
    rec?.janniInstallment ??
    rec?.janni_installment ??
    rec?.deliveryAmount ??
    rec?.delivery_amount ??
    rec?.installmentAmount ??
    rec?.installment_amount ??
    rec?.kistAmount ??
    rec?.kist_amount ??
    rec?.janniKist ??
    rec?.janni_kist ??
    rec?.janniAmount ??
    rec?.janni_amount ??
    body?.janniInstallment ??
    body?.janni_installment ??
    body?.deliveryAmount ??
    body?.delivery_amount ??
    body?.installmentAmount ??
    body?.installment_amount ??
    body?.janniAmount ??
    body?.janni_amount ??
    '';

  if (rawAmt === undefined || rawAmt === null || rawAmt === '') {
    return '';
  }

  const numStr = String(rawAmt).replace(/[^\d.]/g, '');
  if (!numStr) return '';
  const parsedNum = parseFloat(numStr);
  if (!isNaN(parsedNum) && parsedNum > 0) {
    return parsedNum % 1 === 0 ? String(parsedNum) : numStr;
  }
  return '';
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
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body in Janni Bond API:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    let rawDuration = body?.duration || record?.duration || record?.benefitDuration;
    if (!rawDuration || rawDuration === 'नौ माह' || rawDuration === '9 माह' || rawDuration === '9' || rawDuration === '9 months') {
      rawDuration = '7 माह';
    }
    const duration = sanitizeValue(rawDuration);

    console.log('Generating Janni Delivery Bond PDF for:', record?.applicantName || record?.formNumber || 'Unknown');

    // Canonical official template path for Janni Bond
    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_bond', 'janni_sahayata_bond.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_sahayata_bond.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Janni bond template not found on server' },
        { status: 500 }
      );
    }

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
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
      record?.spousePhotoUrl
    );

    // Embed photo in the single calibrated right-hand photo box on official Janni Delivery Bond:
    // Outer Charcoal Border: x = 448.0, yFromTop = 234.0, w = 86.5, h = 105.0
    // Inner Image Box:       x = 455.6, yFromTop = 197.0, w = 84.3, h = 94.2 (1.0pt inset keeps border visible)
    const photoToEmbed = applicantPhotoSource || nomineePhotoSource;
    if (photoToEmbed) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, photoToEmbed, 455.6, 197.0, 84.3, 94.2, 'contain');
      } catch (err) {
        console.warn('Could not embed photo in Janni Bond:', err);
      }
    }

    // Embed director signature if available
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature
    );
    if (directorSignatureSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 440, 750, 80, 30);
      } catch (err) {
        console.warn('Could not embed director signature in Janni Bond:', err);
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

    // Extract dynamic fields adhering strictly to business rules:
    // 1. Worker offline number (sanitized) - from assigned Agent Registration
    const rawWorkerOffline =
      record.workerOfflineFormNumber ||
      record.worker_offline_form_number ||
      record.agentOfflineFormNumber ||
      record.agent_offline_form_number ||
      record.workerCode ||
      record.worker_code ||
      record.agentCode ||
      record.agent_code ||
      record.workerOffline ||
      '';
    const workerOffline = sanitizeAgentOfflineNumber(rawWorkerOffline);

    // 2. Senior offline number (sanitized) - from parent Level-1 Senior Agent
    const rawSeniorOffline =
      record.seniorOfflineFormNumber ||
      record.senior_offline_form_number ||
      record.seniorAgentOfflineFormNumber ||
      record.senior_agent_offline_form_number ||
      record.seniorCode ||
      record.senior_code ||
      record.uplineCode ||
      record.upline_code ||
      record.seniorOffline ||
      '';
    const seniorOffline = sanitizeAgentOfflineNumber(rawSeniorOffline);

    // 3. Application number - strictly Offline Form No., leave blank if absent (never fallback to system formNumber)
    const rawOfflineFormNumber =
      record.offlineFormNumber ||
      record.offline_form_number ||
      record.offlineFormNo ||
      record.offline_form_no ||
      '';
    const applicationNo = sanitizeOfflineNumber(rawOfflineFormNumber);

    // 4. Membership Number - strictly real authoritative membershipNumber only, else blank
    const rawMembershipNumber =
      record.membershipNumber ||
      record.membership_number ||
      record.memberNumber ||
      record.member_number ||
      record.membershipNo ||
      '';
    const membershipNumber = sanitizeOfflineNumber(rawMembershipNumber);

    // 5. Date formatting
    const rawDate =
      record.applicationDate ||
      record.created_at ||
      record.createdAt ||
      record.date ||
      '';
    const applicationDate = rawDate ? formatDateToDDMMYYYY(String(rawDate)) : '';

    // 6. Applicant info & Strict Field Separations
    const applicantName = sanitizeValue(record.applicantName || record.name || '');
    const fatherHusbandName = sanitizeValue(
      record.husbandName ||
      record.fatherName ||
      record.fatherHusbandName ||
      ''
    );

    // PDF 'जाति' strictly preserves Janni's existing source contract
    const caste = sanitizeValue(
      record.gotra ||
      record.gotraName ||
      record.gotra_name ||
      record['गोत्र'] ||
      record['जाति'] ||
      record.category ||
      ''
    );

    const village = sanitizeValue(record.village || record.address || record.tehsil || '');

    // Nominee Name (वारिसदार / नॉमिनी नाम)
    const nomineeName = sanitizeValue(
      record.nomineeName ||
      record.nominee_name ||
      record.nominee ||
      record['वारिसदार'] ||
      record['नामिनी_का_नाम'] ||
      record['नॉमिनी_का_नाम'] ||
      ''
    );

    const district = sanitizeValue(record.district || '');

    // Assigned Agent's mobile (एजेन्ट मो. नं.) - strictly assigned worker/agent mobile, NEVER applicant mobile
    const agentMobile = sanitizeValue(
      record.agentMobile ||
      record.workerMobile ||
      record.agentPhone ||
      record.workerPhone ||
      record.addedBy?.mobile ||
      record.added_mobile ||
      record['कार्यकर्ता_का_मोबाइल'] ||
      ''
    );

    const state = sanitizeValue(record.state || 'राजस्थान');
    const aadharNumber = sanitizeValue(record.aadharNumber || record.aadhar || record.applicantAadhar || '');

    // Nominee Relation (सम्बन्ध)
    const nomineeRelation = sanitizeValue(
      record.nomineeRelation ||
      record.nominee_relation ||
      record.relation ||
      record['सम्बन्ध'] ||
      record['नामिनी_का_सम्बन्ध'] ||
      record['नॉमिनी_का_सम्बन्ध'] ||
      ''
    );

    const nomineeAadhar = sanitizeValue(record.nomineeAadhar || record.nomineeAadhaar || record.nominee_aadhar || '');
    const nomineeMobile = sanitizeValue(record.nomineeMobile || record.nomineePhone || record.nominee_mobile || '');

    // Selected per-delivery installment amount (strictly canonical per-delivery field)
    const janniAmount = sanitizeValue(resolveJanniDeliveryAmountText(record, body));

    const navyColor = rgb(0.04, 0.15, 0.58);
    const darkColor = rgb(0.12, 0.12, 0.12);
    const redColor = rgb(0.75, 0.08, 0.08);

    // Helper to draw centered text in box
    const drawCenteredInBox = (text: string, boxX: number, boxYTop: number, boxW: number, boxH: number, fontSize: number, color: any) => {
      if (!text) return;
      let size = fontSize;
      if ((font as any).widthOfTextAtSize) {
        let textW = (font as any).widthOfTextAtSize(text, size);
        if (textW > boxW - 6) {
          size = Math.max(7.0, size * ((boxW - 6) / textW));
          textW = (font as any).widthOfTextAtSize(text, size);
        }
        const x = boxX + (boxW - textW) / 2;
        const y = pageHeight - (boxYTop + boxH / 2 + size * 0.35);
        firstPage.drawText(text, { x, y, size, font, color });
      } else {
        const x = boxX + 6;
        const y = pageHeight - (boxYTop + boxH / 2 + size * 0.35);
        firstPage.drawText(text, { x, y, size, font, color });
      }
    };

    // Helper to draw bounded text at baseline
    const drawBounded = (text: string, x: number, yTop: number, fontSize: number, maxW: number, color: any) => {
      if (!text) return;
      let size = fontSize;
      if ((font as any).widthOfTextAtSize) {
        const textW = (font as any).widthOfTextAtSize(text, size);
        if (textW > maxW) {
          size = Math.max(6.5, size * (maxW / textW));
        }
      }
      const y = pageHeight - yTop;
      firstPage.drawText(text, { x, y, size, font, color });
    };

    // ── 1. Draw Header Boxes (Top 5 blue boxes) ──
    // Form No: box at x=117.04, y=117.84, w=87.92, h=19.04
    drawCenteredInBox(applicationNo, 117.04, 117.84, 87.92, 19.04, 10.5, navyColor);
    // Agent Code: box at x=117.04, y=141.69, w=87.92, h=19.04
    drawCenteredInBox(workerOffline, 117.04, 141.69, 87.92, 19.04, 10.5, navyColor);
    // Upline Code: box at x=117.04, y=164.49, w=87.92, h=19.04
    drawCenteredInBox(seniorOffline, 117.04, 164.49, 87.92, 19.04, 10.5, navyColor);
    // Application Date: box at x=458.97, y=117.84, w=87.92, h=19.04
    drawCenteredInBox(applicationDate, 458.97, 117.84, 87.92, 19.04, 10.0, navyColor);
    // Membership No: box at x=458.97, y=147.01, w=87.92, h=19.04
    drawCenteredInBox(membershipNumber, 458.97, 147.01, 87.92, 19.04, 10.5, navyColor);

    // ── 2. Draw Left Column Fields ──
    // नाम :-
    drawBounded(applicantName, 74.0, 197.9, 10.0, 188, darkColor);
    // पिता/पति का नाम :-
    drawBounded(fatherHusbandName, 138.0, 221.2, 10.0, 124, darkColor);
    // आधार नं. :-
    drawBounded(aadharNumber, 99.0, 244.6, 10.0, 163, darkColor);
    // जाति :-
    drawBounded(caste, 79.0, 268.0, 10.0, 183, darkColor);
    // सम्बन्ध :-
    drawBounded(nomineeRelation, 89.0, 291.3, 10.0, 173, darkColor);
    // गांव :-
    drawBounded(village, 75.0, 314.7, 10.0, 187, darkColor);

    // ── 3. Draw Center Column Fields ──
    // नॉमिनी नाम :-
    drawBounded(nomineeName, 339.0, 197.6, 10.0, 108, darkColor);
    // नॉमिनी आधार नं. :-
    drawBounded(nomineeAadhar, 364.0, 221.0, 10.0, 83, darkColor);
    // नॉमिनी मो. नं. :-
    drawBounded(nomineeMobile, 349.0, 244.3, 10.0, 98, darkColor);
    // एजेन्ट मो. नं. :-
    drawBounded(agentMobile, 344.0, 267.7, 10.0, 103, darkColor);
    // जिला :-
    drawBounded(district, 312.0, 291.0, 10.0, 135, darkColor);
    // राज्य :-
    drawBounded(state, 309.0, 314.4, 10.0, 138, darkColor);

    // ── 4. Draw Bottom Scheme Amount Line ──
    // "जननी सुरक्षा प्रसव योजना [ 11000 ] रूपये प्रत्येक डिलीवरी पर लागू"
    // Dotted line runs from X: 209.0 to 278.0 (W: 69.0) at baseline yTop: 332.2
    if (janniAmount) {
      const amtW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(janniAmount, 11.5) : 30.0;
      const amtX = 209.0 + Math.max(0, (69.0 - amtW) / 2);
      drawBounded(janniAmount, amtX, 332.2, 11.5, 67, navyColor);
    }

    // ── 5. Draw Benefit Duration Line ──
    // "इस योजना का लाभ [ नौ माह ] के बाद मिलेगा ।"
    // Dotted line from X: 261.0 to 345.0 (W: 84.0) at baseline yTop: 354.3
    if (duration) {
      const durW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(duration, 10.5) : 27.0;
      const durX = 261.0 + Math.max(0, (84.0 - durW) / 2);
      drawBounded(duration, durX, 354.3, 10.5, 82, redColor);
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `Janni_Bond_${applicationNo || record.formNumber || record.id || 'document'}.pdf`;

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
    console.error('Error generating Janni Bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Janni Bond PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
