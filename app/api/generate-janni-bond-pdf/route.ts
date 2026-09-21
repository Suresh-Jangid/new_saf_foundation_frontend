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
    const duration = sanitizeValue(body?.duration || record?.duration || record?.benefitDuration || 'नौ माह');

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
    // Inner Image Box:       x = 449.0, yFromTop = 235.0, w = 84.5, h = 103.0 (1.0pt inset keeps border visible)
    const photoToEmbed = applicantPhotoSource || nomineePhotoSource;
    if (photoToEmbed) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, photoToEmbed, 449.0, 235.0, 84.5, 103.0, 'cover');
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

    // Scheme grant amount (default ₹11,000 for Janni Delivery)
    const rawAmt =
      record.janniAmount ||
      record.grantAmount ||
      record.paymentAmount ||
      record.totalAmount ||
      record.amount ||
      record.deliveryAmount ||
      '11000';
    const janniAmount = sanitizeValue(String(rawAmt).replace(/[^\d.]/g, '')) || '11000';

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
    // Form No: box at x=108.0, y=148.5, w=88.5, h=20.5
    drawCenteredInBox(applicationNo, 108.0, 148.5, 88.5, 20.5, 10.5, navyColor);
    // Agent Code: box at x=108.0, y=174.5, w=88.5, h=20.5
    drawCenteredInBox(workerOffline, 108.0, 174.5, 88.5, 20.5, 10.5, navyColor);
    // Upline Code: box at x=108.0, y=199.5, w=88.5, h=20.5
    drawCenteredInBox(seniorOffline, 108.0, 199.5, 88.5, 20.5, 10.5, navyColor);
    // Application Date: box at x=452.0, y=148.5, w=88.5, h=20.5
    drawCenteredInBox(applicationDate, 452.0, 148.5, 88.5, 20.5, 10.0, navyColor);
    // Membership No: box at x=452.0, y=180.5, w=88.5, h=20.5
    drawCenteredInBox(membershipNumber, 452.0, 180.5, 88.5, 20.5, 10.5, navyColor);

    // ── 2. Draw Left Column Fields ──
    // नाम :-
    drawBounded(applicantName, 72.0, 234.0, 10.0, 185, darkColor);
    // पिता/पति का नाम :-
    drawBounded(fatherHusbandName, 132.0, 259.5, 10.0, 125, darkColor);
    // आधार नं. :-
    drawBounded(aadharNumber, 94.0, 284.5, 10.0, 163, darkColor);
    // जाति :-
    drawBounded(caste, 74.0, 309.5, 10.0, 183, darkColor);
    // सम्बन्ध :-
    drawBounded(nomineeRelation, 84.0, 335.5, 10.0, 173, darkColor);
    // गांव :-
    drawBounded(village, 72.0, 360.5, 10.0, 185, darkColor);

    // ── 3. Draw Center Column Fields ──
    // नॉमिनी नाम :-
    drawBounded(nomineeName, 330.0, 234.0, 10.0, 112, darkColor);
    // नॉमिनी आधार नं. :-
    drawBounded(nomineeAadhar, 356.0, 259.5, 10.0, 86, darkColor);
    // नॉमिनी मो. नं. :-
    drawBounded(nomineeMobile, 348.0, 284.5, 10.0, 94, darkColor);
    // एजेन्ट मो. नं. :-
    drawBounded(agentMobile, 336.0, 309.5, 10.0, 106, darkColor);
    // जिला :-
    drawBounded(district, 304.0, 335.5, 10.0, 138, darkColor);
    // राज्य :-
    drawBounded(state, 304.0, 360.5, 10.0, 138, darkColor);

    // ── 4. Draw Bottom Scheme Amount Line ──
    // "जननी सुरक्षा प्रसव योजना [ 11000 ] रूपये प्रत्येक डिलीवरी पर लागू"
    // Dotted line runs from X: 199.0 to 271.9 (W: 72.9) at baseline yTop: 380.0
    if (janniAmount) {
      const amtW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(janniAmount, 11.5) : 30.0;
      const amtX = 199.0 + Math.max(0, (72.9 - amtW) / 2);
      drawBounded(janniAmount, amtX, 380.0, 11.5, 70, navyColor);
    }

    // ── 5. Draw Benefit Duration Line ──
    // "आपको विवाह योजना का लाभ [ नौ माह ] के बाद मिलेगा ।"
    // Dotted line runs from X: 245.0 to 330.0 (W: 85.0) at baseline yTop: 425.0
    if (duration) {
      const durW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(duration, 10.5) : 35.0;
      const durX = 245.0 + Math.max(0, (85.0 - durW) / 2);
      drawBounded(duration, durX, 425.0, 10.5, 80, redColor);
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
