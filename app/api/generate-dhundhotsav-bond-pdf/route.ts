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
    upper.startsWith('DH-') ||
    upper.startsWith('DH_') ||
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
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body in Dhundhotsav Bond API:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    const duration =
      String(
        record?.benefitDuration ??
        record?.duration ??
        record?.benefit_duration ??
        body?.benefitDuration ??
        body?.benefit_duration ??
        (body?.duration && body.duration !== 'बारह महीने' ? body.duration : (record?.benefitDuration || record?.duration ? undefined : body?.duration)) ??
        ""
      ).trim() || "बारह महीने";

    console.log('Generating Dhundhotsav Bond PDF for:', record?.applicantName || record?.formNumber || 'Unknown');

    // Canonical official template path for Dhundhotsav Bond
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'saf_dhundh_bond.pdf');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Dhundhotsav bond template not found on server' },
        { status: 500 }
      );
    }

    console.log('Using Dhundhotsav Bond template:', templatePath);

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
      record?.applicant_photo,
    );

    const nomineePhotoSource = pickPhotoSource(
      body?.nomineeImageData,
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
    );

    // Embed photos inside calibrated photo boxes:
    // Top Photo Box (Applicant):
    //   Outer Border: x = 470.5, yFromTop = 194.5, w = 76.0, h = 80.0
    //   Inner Image:  x = 471.5, yFromTop = 195.5, w = 74.0, h = 78.0
    // Bottom Photo Box (Nominee):
    //   Outer Border: x = 470.5, yFromTop = 281.5, w = 76.0, h = 80.0
    //   Inner Image:  x = 471.5, yFromTop = 282.5, w = 74.0, h = 78.0
    if (applicantPhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 471.5, 195.5, 74.0, 78.0, 'cover');
      } catch (err) {
        console.warn('Could not embed applicant photo in Dhundhotsav Bond:', err);
      }
    }

    if (nomineePhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 471.5, 282.5, 74.0, 78.0, 'cover');
      } catch (err) {
        console.warn('Could not embed nominee photo in Dhundhotsav Bond:', err);
      }
    }

    // Embed Devanagari font (prioritize SemiBold for matching bold printed label weights)
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
      record.workerOffline ||
      '';
    const workerOffline = sanitizeOfflineNumber(rawWorkerOffline);

    // 2. Senior offline number (sanitized) - from parent Level-1 Senior Agent
    const rawSeniorOffline =
      record.seniorOfflineFormNumber ||
      record.senior_offline_form_number ||
      record.seniorAgentOfflineFormNumber ||
      record.senior_agent_offline_form_number ||
      record.seniorOffline ||
      '';
    const seniorOffline = sanitizeOfflineNumber(rawSeniorOffline);

    // 3. Application offline number strictly (never system DH-xxx or UUID)
    const rawOfflineFormNumber =
      record.offlineFormNumber ||
      record.offline_form_number ||
      record.offlineFormNo ||
      '';
    const offlineFormNumber = sanitizeOfflineNumber(rawOfflineFormNumber);

    // Membership Number - strictly real authoritative membershipNumber only, else blank (do not copy offlineFormNumber)
    const rawMembershipNumber =
      record.membershipNumber ||
      record.membership_number ||
      record.memberNumber ||
      record.member_number ||
      record.membershipNo ||
      '';
    const membershipNumber = sanitizeOfflineNumber(rawMembershipNumber);

    // 4. Date formatting
    const rawDate =
      record.applicationDate ||
      record.created_at ||
      record.createdAt ||
      record.date ||
      '';
    const applicationDate = rawDate ? formatDateToDDMMYYYY(String(rawDate)) : '';

    // 5. Applicant info & Strict Field Separations
    const applicantName = sanitizeValue(record.applicantName || record.name || '');
    const fatherName = sanitizeValue(record.fatherName || record.husbandName || record.fatherHusbandName || '');
    // PDF 'जाति' strictly maps to gotra (never category/gender/caste fallback)
    const caste = sanitizeValue(
      record.gotra ||
      record.gotraName ||
      record.gotra_name ||
      record['गोत्र'] ||
      record['जाति'] ||
      ''
    );
    const village = sanitizeValue(record.village || record.tehsil || record.address || '');

    // Nominee Name (नॉमिनी नाम) - strictly nominee name, never applicant/father/agent name
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
      record.added_mobile ||
      record['कार्यकर्ता_का_मोबाइल'] ||
      ''
    );

    const state = sanitizeValue(record.state || 'राजस्थान');
    const aadharNumber = sanitizeValue(record.aadharNumber || record.aadhar || record.applicantAadhar || '');

    // Nominee Relation (सम्बन्ध) - strictly nominee relation, never inferred
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

    // Nominee Mobile (नॉमिनी मो. नं.) - fall back to applicant mobile if nominee mobile not specifically present
    const rawNomineeMobile =
      record.nomineeMobile ||
      record.nominee_mobile ||
      record.nomineePhone ||
      record.nominee_phone ||
      record.mobile ||
      record.phone ||
      record.applicantMobile ||
      '';
    const nomineeMobile = sanitizeValue(rawNomineeMobile);

    // Scheme / Benefit Amount (ढूंढ ... रूपये प्रत्येक ढूंढ पर लागू)
    const rawAmount =
      record.paymentAmount ??
      record.payment_amount ??
      record.membershipFee ??
      record.membership_fee ??
      record.amount ??
      record.schemeAmount ??
      record.scheme_amount ??
      body?.amount ??
      '5,100/-';
    let cleanAmt = String(rawAmount || '').trim();
    if (/^\d+$/.test(cleanAmt)) {
      cleanAmt = Number(cleanAmt).toLocaleString('en-IN') + '/-';
    } else if (cleanAmt && !cleanAmt.endsWith('/-') && /^\d+[\d,]*$/.test(cleanAmt)) {
      cleanAmt += '/-';
    }
    const amount = sanitizeValue(cleanAmt || '5,100/-');

    const navyColor = rgb(0.0, 0.15, 0.6);
    const darkColor = rgb(0.12, 0.12, 0.12);
    const redColor = rgb(0.8, 0.1, 0.1);

    // Helper to draw centered text in header box
    const drawCenteredInBox = (
      text: string,
      boxX: number,
      boxW: number,
      baselineY: number,
      fontSize: number,
      color: any
    ) => {
      if (!text) return;
      let size = fontSize;
      if ((font as any).widthOfTextAtSize) {
        let textW = (font as any).widthOfTextAtSize(text, size);
        if (textW > boxW - 8) {
          size = Math.max(6.5, size * ((boxW - 8) / textW));
          textW = (font as any).widthOfTextAtSize(text, size);
        }
        const x = boxX + (boxW - textW) / 2;
        firstPage.drawText(text, { x, y: baselineY, size, font, color });
      } else {
        firstPage.drawText(text, { x: boxX + 6, y: baselineY, size, font, color });
      }
    };

    // Helper to draw bounded text at baseline
    const drawBounded = (
      text: string,
      x: number,
      baselineY: number,
      fontSize: number,
      maxW: number,
      color: any
    ) => {
      if (!text) return;
      let size = fontSize;
      if (maxW && (font as any).widthOfTextAtSize) {
        const isDevanagari = /[^\u0000-\u007F]/.test(text);
        const textW = (font as any).widthOfTextAtSize(text, size) * (isDevanagari ? 1.25 : 1.0);
        if (textW > maxW) {
          size = Math.max(6.0, size * (maxW / textW));
        }
      }
      firstPage.drawText(text, { x, y: baselineY, size, font, color });
    };

    // Helper to draw centered text in dotted line range
    const drawCenteredInRange = (
      text: string,
      startX: number,
      endX: number,
      baselineY: number,
      fontSize: number,
      maxW: number,
      color: any
    ) => {
      if (!text) return;
      let size = fontSize;
      const availableW = endX - startX;
      if (maxW && (font as any).widthOfTextAtSize) {
        const isDevanagari = /[^\u0000-\u007F]/.test(text);
        let textW = (font as any).widthOfTextAtSize(text, size) * (isDevanagari ? 1.25 : 1.0);
        if (textW > maxW) {
          size = Math.max(6.0, size * (maxW / textW));
          textW = (font as any).widthOfTextAtSize(text, size) * (isDevanagari ? 1.25 : 1.0);
        }
        const x = startX + Math.max(0, (availableW - textW) / 2);
        firstPage.drawText(text, { x, y: baselineY, size, font, color });
      } else {
        firstPage.drawText(text, { x: startX + 4, y: baselineY, size, font, color });
      }
    };

    // ── 1. Top Header Boxes (Centered horizontally in blue boxes) ──
    // फॉर्म नं. Box 1: x: 121.67, w: 89.0, centered BL y = 695.0
    drawCenteredInBox(offlineFormNumber, 121.67, 89.0, 695.0, 11.0, navyColor);
    // एजेन्ट कोड Box 2: x: 121.67, w: 89.0, centered BL y = 669.2
    drawCenteredInBox(workerOffline, 121.67, 89.0, 669.2, 11.0, navyColor);
    // अपलाईन कोड Box 3: x: 121.67, w: 89.0, centered BL y = 643.5
    drawCenteredInBox(seniorOffline, 121.67, 89.0, 643.5, 11.0, navyColor);
    // आवेदन दि. Box 4: x: 463.33, w: 89.0, centered BL y = 694.5
    drawCenteredInBox(applicationDate, 463.33, 89.0, 694.5, 10.5, darkColor);
    // सदस्यता क्र. Box 5: x: 463.33, w: 89.0, centered BL y = 663.2
    drawCenteredInBox(membershipNumber, 463.33, 89.0, 663.2, 10.5, navyColor);

    // ── 2. Left Column Fields (gap = 6.0 pt from label right edge, calibrated vertical alignment) ──
    // Optical micro-calibration: NotoSansDevanagari-SemiBold optical bounding box sits ~1.8pt lower
    // than the template's KrutiDev vector glyphs when drawn at identical nominal font baseline.
    // Adding +1.8pt (+Y in PDF space) elevates dynamic text to perfectly align its visual center and baseline.
    const gap = 6.0;
    const labelSize = 10.5;
    const VERTICAL_OFFSET = 1.8;

    // नाम :- (rightX: 74.87, y: 615.61)
    drawBounded(applicantName, 74.87 + gap, 615.61 + VERTICAL_OFFSET, labelSize, 165.0, darkColor);
    // पिता/पति का नाम :- (rightX: 139.16, y: 588.95)
    drawBounded(fatherName, 139.16 + gap, 588.95 + VERTICAL_OFFSET, labelSize, 105.0, darkColor);
    // आधार नं. :- (rightX: 99.67, y: 562.30)
    drawBounded(aadharNumber, 99.67 + gap, 562.30 + VERTICAL_OFFSET, labelSize, 144.0, darkColor);
    // जाति :- (rightX: 79.63, y: 535.64)
    drawBounded(caste, 79.63 + gap, 535.64 + VERTICAL_OFFSET, labelSize, 164.0, darkColor);
    // सम्बन्ध :- (rightX: 89.21, y: 508.98)
    drawBounded(nomineeRelation, 89.21 + gap, 508.98 + VERTICAL_OFFSET, labelSize, 154.0, darkColor);
    // गांव :- (rightX: 75.46, y: 482.33)
    drawBounded(village, 75.46 + gap, 482.33 + VERTICAL_OFFSET, labelSize, 168.0, darkColor);

    // ── 3. Center Column Fields (gap = 6.0 pt from label right edge, calibrated vertical alignment) ──
    // Center column boundary ends strictly before x: 455.0 (photo box starts at 470.50)
    // नॉमिनी नाम :- (rightX: 339.38, y: 611.69)
    drawBounded(nomineeName, 339.38 + gap, 611.69 + VERTICAL_OFFSET, labelSize, 108.0, darkColor);
    // नॉमिनी आधार नं. :- (rightX: 364.18, y: 586.10)
    drawBounded(nomineeAadhar, 364.18 + gap, 586.10 + VERTICAL_OFFSET, labelSize, 84.0, darkColor);
    // नॉमिनी मो. नं. (rightX: 337.39, y: 560.52)
    drawBounded(nomineeMobile, 337.39 + gap, 560.52 + VERTICAL_OFFSET, labelSize, 110.0, darkColor);
    // एजेन्ट मो. नं. :- (rightX: 344.53, y: 534.93)
    drawBounded(agentMobile, 344.53 + gap, 534.93 + VERTICAL_OFFSET, labelSize, 104.0, darkColor);
    // जिला :- (rightX: 312.56, y: 509.34)
    drawBounded(district, 312.56 + gap, 509.34 + VERTICAL_OFFSET, labelSize, 136.0, darkColor);
    // राज्य :- (rightX: 308.95, y: 483.75)
    drawBounded(state, 308.95 + gap, 483.75 + VERTICAL_OFFSET, labelSize, 140.0, darkColor);

    // ── 4. Bottom Clauses ──
    // ढूंढ [ 5,100/- ] रूपये प्रत्येक ढूंढ पर लागू
    // Dotted space from 219.27 to 290.34, baseline y: 463.89
    drawCenteredInRange(amount, 219.27, 290.34, 463.89 + VERTICAL_OFFSET, labelSize, 68.0, navyColor);

    // इस योजना का लाभ [ बारह महीने ] के बाद मिलेगा ।
    // Dotted space from 276.56 to 344.35, baseline y: 443.76
    drawCenteredInRange(duration, 276.56, 344.35, 443.76 + VERTICAL_OFFSET, labelSize, 65.0, redColor);

    const pdfBytes = await pdfDoc.save();
    const filename = `dhundhotsav_bond_${offlineFormNumber || record.formNumber || 'bond'}.pdf`;

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
    console.error('Error generating Dhundhotsav Bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Dhundhotsav Bond PDF',
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
