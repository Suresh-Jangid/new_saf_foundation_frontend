import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import { buildPdfFilename } from '@/lib/form-values';
import { drawDevanagariBounded, drawDevanagariCenteredAtBaseline } from '@/lib/pdf-devanagari';

export const runtime = 'nodejs';

// Helper to sanitize agent offline numbers
function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
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

// Helper to resolve authoritative installment category text for the Kanyadaan line
function resolveInstallmentCategoryText(rec: any, body?: any): string {
  // 1. Canonical General Marriage installment field + aliases
  const rawAmt =
    rec?.installmentAmount ??
    rec?.installment_amount ??
    rec?.installment ??
    rec?.kistAmount ??
    rec?.kist_amount ??
    body?.installmentAmount ??
    body?.installment_amount ??
    body?.kistAmount ??
    '';

  if (rawAmt === undefined || rawAmt === null || rawAmt === '') {
    return '';
  }

  // 2. Already formatted value
  const str = String(rawAmt).trim();

  if (/^\d+\s*किस्त$/.test(str)) {
    return str;
  }

  // 3. Parse numeric value
  const num =
    typeof rawAmt === 'number'
      ? rawAmt
      : parseFloat(str.replace(/[^\d.]/g, ''));

  if (isNaN(num) || num <= 0) {
    return '';
  }

  // 4. Valid General Marriage scheme amounts
  if (
    num === 300 ||
    num === 500 ||
    num === 1000 ||
    num === 1500
  ) {
    return `${num} किस्त`;
  }

  // 5. Allow other reasonable positive installment amounts
  // below 2000, but NEVER registration-fee amounts.
  if (num < 2000) {
    return `${Math.round(num)} किस्त`;
  }

  return '';
}

// Add OPTIONS method to handle CORS preflight requests
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
    const body = await request.json();
    const { record, imageData, duration } = body || {};

    console.log('Received record for General Bond PDF:', record?.applicantName || record?.formNumber || 'Unknown');
    console.log('Image data received for General Bond:', !!imageData);

    // Canonical official template path for Vivah Yojana General Bond
    const candidateTemplates = [
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'saf_vivah_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'vivah_yojana_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'viva yojana bond(1).pdf'),
    ];

    const templatePath = candidateTemplates.find((p) => fs.existsSync(p));

    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`General Bond template not found in candidates: ${candidateTemplates.join(', ')}`);
    }

    console.log('Using General Bond template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
      const fontkitModule: any = await import('@pdf-lib/fontkit');
      const fontkit = fontkitModule?.default ?? fontkitModule;
      if (fontkit) {
        (pdfDoc as any).registerFontkit(fontkit);
        fontkitAvailable = true;
      }
    } catch {
      fontkitAvailable = false;
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Handle image embedding
    const photoSource = pickPhotoSource(
      imageData,
      record?.imageData,
      record?.applicantPhotoData,
      record?.passportPhoto,
      record?.passport_photo,
      record?.passportPhotoUrl,
      record?.photo,
      record?.photoUrl,
      record?.applicantPhoto
    );

    if (photoSource) {
      try {
        // Precise passport photo box dimensions for official saf_vivah_bond.pdf [458.19–544.49] x [547.83–644.01]
        // Inset by ~1pt on all sides: x = 459.2, yFromTop = 198.89, width = 84.3, height = 94.2
        await embedPdfImage(
          pdfDoc,
          firstPage,
          pageHeight,
          photoSource,
          459.2,
          198.89,
          84.3,
          94.2,
          'contain'
        );
        console.log('Image embedded successfully in General Bond PDF');
      } catch (imageError) {
        console.error('Error embedding image in General Bond PDF:', imageError);
      }
    }

    // Embed Devanagari font; fallback to Helvetica
    let font;
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Helper for drawing bounded text directly on baseline Y (blY)
    const drawBounded = (
      text: unknown,
      x: number,
      y: number,
      size = 9,
      maxW?: number,
      color = rgb(0, 0, 0)
    ) => {
      drawDevanagariBounded(firstPage, font, text, {
        x,
        y,
        size,
        maxW,
        color,
        minSize: 6.5,
      });
    };

    // Helper for drawing horizontally centered text within a defined box using HarfBuzz
    const drawCenteredInBox = (
      text: string | number | undefined | null,
      minX: number,
      maxX: number,
      blY: number,
      size = 10.5,
      color = rgb(0, 0.15, 0.6)
    ) => {
      drawDevanagariCenteredAtBaseline(firstPage, font, text, minX, maxX, blY, {
        size,
        color,
        minSize: 6.0,
      });
    };

    // Extract & sanitize dynamic field values
    const workerCode = sanitizeOfflineNumber(
      record?.workerOfflineFormNumber ||
      record?.worker_offline_form_number ||
      record?.agentOfflineFormNumber ||
      record?.agent_offline_form_number ||
      record?.कार्यकर्ता_कोड ||
      ''
    );

    const seniorCode = sanitizeOfflineNumber(
      record?.seniorOfflineFormNumber ||
      record?.senior_offline_form_number ||
      record?.seniorAgentOfflineFormNumber ||
      record?.senior_agent_offline_form_number ||
      record?.सीनियर_कोड ||
      record?.सीनियर_कार्यकर्ता_कोड ||
      ''
    );

    // फॉर्म नं. - Application offline form number only; blank if missing (never internal UUID/ID)
    const applicationOfflineNo = sanitizeValue(
      record?.offlineFormNumber ||
      record?.offline_form_number ||
      record?.applicationOfflineFormNumber ||
      record?.ऑफलाइन_फॉर्म_नं ||
      ''
    );

    // सदस्यता क्र. - Authoritative membership number only; blank if missing
    const membershipNo = sanitizeValue(
      record?.membershipNumber ||
      record?.membership_number ||
      record?.memberNumber ||
      record?.member_number ||
      record?.formNumber ||
      ''
    );

    // आवेदन दि. - Formatted application date
    const rawAppDate = record?.applicationDate || record?.application_date || record?.created_at || '';
    const applicationDate = rawAppDate ? formatDateToDDMMYYYY(rawAppDate) : '';

    const applicantName = sanitizeValue(record?.applicantName || record?.applicant_name || record?.name || record?.आवेदक_का_नाम || '');
    const fatherName = sanitizeValue(record?.fatherName || record?.father_name || record?.father_husband_name || record?.husbandName || record?.पिता_का_नाम || '');
    const gotra = sanitizeValue(
      record?.gotra ||
      record?.gotraName ||
      record?.gotra_name ||
      record?.Gotra ||
      record?.गोत्र ||
      ''
    );
    const village = sanitizeValue(record?.village || record?.गाँव || record?.address || record?.पता || '');
    const warisdar = sanitizeValue(record?.nomineeName || record?.nominee_name || record?.warisdar || record?.वारिसदार || record?.नामिनी_का_नाम || '');
    const district = sanitizeValue(record?.district || record?.जिला || '');
    const agentMobile = sanitizeValue(record?.agentMobile || record?.workerMobile || record?.agent_mobile || record?.worker_mobile || record?.added_mobile || record?.कार्यकर्ता_का_मोबाइल || '');
    const state = sanitizeValue(record?.state || record?.राज्य || 'राजस्थान');
    const applicantAadhaar = sanitizeValue(record?.aadharNumber || record?.aadhar_number || record?.aadhaar || record?.आधार_संख्या || '');
    const relation = sanitizeValue(record?.nomineeRelation || record?.nominee_relation || record?.relation || record?.सम्बन्ध || record?.नामिनी_का_सम्बन्ध || '');
    const nomineeAadhaar = sanitizeValue(
      record?.nomineeAadhar ||
      record?.nomineeAadhaar ||
      record?.nominee_aadhar ||
      record?.nominee_aadhaar ||
      record?.nomineeAadharNumber ||
      record?.nomineeAadhaarNumber ||
      record?.नामिनी_का_आधार ||
      ''
    );
    const nomineeMobile = sanitizeValue(
      record?.nomineeMobile ||
      record?.nominee_mobile ||
      record?.nomineePhone ||
      record?.nominee_phone ||
      record?.नामिनी_का_मोबाइल ||
      ''
    );

    // Installment category text for Kanyadaan line (₹300 किस्त / ₹1,000 किस्त)
    const kanyadaanInstallment = resolveInstallmentCategoryText(record, body);

    // Benefit duration text for bottom line
    let durationText = duration || record?.duration || record?.durationText || 'बारह महीने';
    if (durationText === 'अठारह महीने' || durationText === '18 महीने' || !durationText) {
      durationText = 'बारह महीने';
    }

    // =========================================================================
    // 1. TOP HEADER BOXES (Official saf_vivah_bond.pdf vector box coordinates)
    // =========================================================================

    // 1.1 फॉर्म नं. (Box 1 Left: minX=120.34, maxX=208.26, minY=703.37, maxY=722.41)
    drawCenteredInBox(applicationOfflineNo, 120.34, 208.26, 709.0, 11, rgb(0, 0.15, 0.6));

    // 1.2 एजेंट कोड (Box 2 Left: minX=120.34, maxX=208.26, minY=679.52, maxY=698.56)
    drawCenteredInBox(workerCode, 120.34, 208.26, 685.0, 11, rgb(0.8, 0, 0));

    // 1.3 अपलाईन कोड (Box 3 Left: minX=120.34, maxX=208.26, minY=656.72, maxY=675.76)
    drawCenteredInBox(seniorCode, 120.34, 208.26, 662.5, 11, rgb(0.8, 0, 0));

    // 1.4 आवेदन दि. (Box 1 Right: minX=456.57, maxX=544.49, minY=703.37, maxY=722.41)
    drawCenteredInBox(applicationDate, 456.57, 544.49, 709.0, 10.5, rgb(0, 0.15, 0.6));

    // 1.5 सदस्यता क्र. (Box 2 Right: minX=456.57, maxX=544.49, minY=674.01, maxY=693.05)
    // drawCenteredInBox(membershipNo, 456.57, 544.49, 679.5, 10.5, rgb(0, 0.15, 0.6));

    // =========================================================================
    // 2. MIDDLE TABLE SECTION (Two columns, Rows 1-6)
    // =========================================================================

    // Row 1: नाम :- (blY: 632.60) | नॉमिनी नाम :- (blY: 632.60)
    drawBounded(applicantName, 76, 632.60, 10.5, 195);
    drawBounded(warisdar, 342, 632.60, 10.5, 110);

    // Row 2: पिता/पति का नाम :- (blY: 611.40) | नॉमिनी आधार नं. :- (blY: 611.40)
    drawBounded(fatherName, 140, 611.40, 10.5, 130);
    drawBounded(nomineeAadhaar, 367, 611.40, 10, 88);

    // Row 3: आधार नं. :- (blY: 590.20) | नॉमिनी मो. नं. :- (blY: 590.20)
    drawBounded(applicantAadhaar, 101, 590.20, 10.5, 170);
    drawBounded(nomineeMobile, 352, 590.20, 10, 100);

    // Row 4: जाति :- (blY: 569.00) | एजेंट मो. नं. :- (blY: 569.00)
    drawBounded(gotra, 81, 569.00, 10.5, 190);
    drawBounded(agentMobile, 347, 569.00, 10, 105);

    // Row 5: गांव :- (blY: 547.80) | सम्बन्ध :- (blY: 547.80)
    drawBounded(village, 77, 547.80, 10.5, 195);
    drawBounded(relation, 323, 547.80, 10.5, 130);

    // Row 6: जिला :- (blY: 526.60) | राज्य :- (blY: 526.60)
    drawBounded(district, 83, 526.60, 10.5, 190);
    drawBounded(state, 312, 526.60, 10.5, 230);

    // =========================================================================
    // 3. BOTTOM SECTION (Installment category on Kanyadaan line, Duration below)
    // =========================================================================

    // 3.1 कन्यादान ... रूपये प्रत्येक विवाह पर लागू (Installment Category: ₹300 किस्त / ₹1,000 किस्त)
    drawCenteredInBox(kanyadaanInstallment, 216, 284, 504.10, 11, rgb(0, 0.15, 0.6));

    // 3.2 आपको विवाह योजना का लाभ ... के बाद मिलेगा । (Duration Text: बारह महीने)
    drawCenteredInBox(durationText, 288, 370, 482.70, 11, rgb(0.8, 0, 0));

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Generate appropriate filename based on gender
    const gender = record?.gender || record?.लिंग;
    let prefix = 'VIVAH_YOJANA_BOND';
    if (gender === 'Female' || gender === 'महिला') {
      prefix = 'GIRL_BOND';
    } else if (gender === 'Male' || gender === 'पुरुष') {
      prefix = 'BOYS_BOND';
    }

    const fileName = buildPdfFilename(record, { prefix });
    const encodedFilename = encodeURIComponent(fileName);

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error generating General Bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate General Bond PDF',
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
