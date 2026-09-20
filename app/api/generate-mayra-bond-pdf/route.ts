import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';

export const runtime = 'nodejs';

// Sanitize agent/upline/offline numbers to prevent leaking dummy UUIDs or placeholder strings
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

function formatDateDisplay(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';
  // If already in DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  // If in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

function getField(record: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

// Resolve authoritative Mayra dynamic amount for bottom line: "मायरा ...... रुपये प्रत्येक मायरा पर लागू"
function resolveMayraAmountText(rec: any): string {
  const rawAmt =
    rec?.installmentAmount ??
    rec?.installment_amount ??
    rec?.totalAmount ??
    rec?.total_amount ??
    rec?.fee ??
    rec?.mayraAmount ??
    rec?.amount ??
    '';

  if (rawAmt === undefined || rawAmt === null || rawAmt === '') {
    return '';
  }

  const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^\d.]/g, ''));
  if (!isNaN(num) && num > 0) {
    if (num === 300) return '300 किस्त';
    if (num === 1000) return '1000 किस्त';
    return String(num);
  }

  const str = String(rawAmt).trim();
  if (str === '300' || str === '300 किस्त') return '300 किस्त';
  if (str === '1000' || str === '1000 किस्त') return '1000 किस्त';

  return sanitizeValue(str);
}

// OPTIONS method to handle CORS preflight requests
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
      console.error('Error parsing request body:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});

    const applicantPhotoSource = pickPhotoSource(
      body?.imageData,
      record?.imageData,
      record?.applicantPhotoData,
      record?.passportPhoto,
      record?.passport_photo,
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

    console.log('Generating Mayra bond PDF for:', record.applicantName || 'Unknown');

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra_bond', 'mayra_bond.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_bond.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Mayra bond template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Template PDF has no pages' }, { status: 500 });
    }

    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // ── Measured Photo Boxes on Official A4 Template (595.28 x 841.89 pt) ─
    // Top Photo Box (खाताधारक का फोटो):   x = 252.0, y = 579.0, w = 87.0, h = 80.0 (yFromTop = 182.89)
    // Bottom Photo Box (नॉमिनी का फोटो): x = 252.0, y = 474.5, w = 87.0, h = 80.0 (yFromTop = 287.39)
    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 252.0, 182.89, 87.0, 80.0, 'cover');
    }
    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 252.0, 287.39, 87.0, 80.0, 'cover');
    }

    // ── Typography Setup ──────────────────────────────────────────────────
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    const font = devanagariFontPath
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath), { subset: false })
      : await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Color definitions
    const navyColor = rgb(0.0, 0.15, 0.58);       // #002694 (Matches template navy)
    const charcoalColor = rgb(0.12, 0.14, 0.18);  // #1f242e (Matches body text)

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
          // If measurement fails, fallback to default size
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

    // ── Field Extraction According to Authoritative Project Rules ─────────
    // 1. Header Meta Fields
    const rawFormNumber = getField(
      record,
      'offlineFormNumber',
      'offline_form_number',
      'offlineFormNo',
      'formNumber',
      'form_number',
    );
    const formNumber = sanitizeOfflineNumber(rawFormNumber);

    const rawAppDate = getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at');
    const applicationDate = formatDateDisplay(rawAppDate);

    const rawAgentCode = getField(
      record,
      'workerCode',
      'worker_code',
      'agentCode',
      'agent_code',
      'workerId',
      'agentId',
      'workerName',
    );
    const agentCode = sanitizeOfflineNumber(rawAgentCode);

    // STRICT: Membership number ONLY queries membershipNumber
    const rawMembership = getField(record, 'membershipNumber', 'membership_number');
    const membershipNo = sanitizeOfflineNumber(rawMembership);

    const rawUplineCode = getField(
      record,
      'seniorCode',
      'senior_code',
      'uplineCode',
      'upline_code',
      'seniorAgentCode',
      'addedby_id',
    );
    const uplineCode = sanitizeOfflineNumber(rawUplineCode);

    // 2. Left Column: भाणेज-भाणजी का विवरण (Child / Account Holder)
    const applicantName = sanitizeValue(getField(record, 'applicantName', 'applicant_name'));
    const applicantAadhaar = sanitizeValue(
      getField(record, 'aadharNumber', 'aadhar_number', 'applicantAadhaar', 'aadhaarNumber'),
    );
    const fatherName = sanitizeValue(
      getField(record, 'fatherName', 'father_name', 'parentName', 'parent_name'),
    );
    const gotra = sanitizeValue(getField(record, 'gotra', 'gotra_name', 'caste'));
    const address = sanitizeValue(getField(record, 'address', 'applicant_address'));
    const nomineeRelation = sanitizeValue(getField(record, 'nomineeRelation', 'nominee_relation', 'relation'));

    // 3. Right Column: नॉमिनी का विवरण (Nominee)
    const nomineeName = sanitizeValue(getField(record, 'nomineeName', 'nominee_name'));
    const nomineeAadhaar = sanitizeValue(
      getField(record, 'nomineeAadhaar', 'nominee_aadhar', 'nomineeAadharNumber', 'nominee_aadhar_number', 'nomineeAadhar'),
    );
    const nomineeFathername = sanitizeValue(
      getField(
        record,
        'nomineeFathername',
        'nominee_father_name',
        'nominee_fathername',
        'nomineeFatherName',
        'nomineeHusbandName',
        'nominee_husband_name',
      ),
    );
    const nomineeGotra = sanitizeValue(getField(record, 'nomineeGotra', 'nominee_gotra'));
    const rawAge = getField(record, 'age');
    const age = rawAge ? (/^\d+$/.test(rawAge) ? `${rawAge} वर्ष` : rawAge) : '';
    const nomineeAddress = sanitizeValue(getField(record, 'nomineeAddress', 'nominee_address'));
    const nomineeMobile = sanitizeValue(getField(record, 'nomineeMobile', 'nominee_mobile', 'mobile'));
    const agentMobile = sanitizeValue(
      getField(record, 'workerMobile', 'worker_mobile', 'agentMobile', 'agent_mobile'),
    );

    // 4. Bottom Mayra Amount: "मायरा ...... रुपये प्रत्येक मायरा पर लागू"
    const mayraAmountText = resolveMayraAmountText(record);

    // ── Draw Text on Official Calibrated Template Baselines ───────────────
    // TOP HEADER META FIELDS (Font size 11.0 pt, Navy)
    drawBounded(formNumber, 75.0, 685.48, 11.0, 150, navyColor);
    drawBounded(applicationDate, 456.0, 683.37, 11.0, 100, navyColor);
    drawBounded(agentCode, 92.0, 656.99, 11.0, 135, navyColor);
    drawBounded(membershipNo, 456.0, 658.37, 11.0, 100, navyColor);
    drawBounded(uplineCode, 107.0, 634.24, 11.0, 120, navyColor);

    // LEFT COLUMN: भाणेज-भाणजी का विवरण (Font size 10.5 pt, Charcoal)
    drawBounded(applicantName, 96.0, 592.43, 10.5, 150, charcoalColor);
    drawBounded(applicantAadhaar, 75.0, 567.20, 10.5, 170, charcoalColor);
    drawBounded(fatherName, 110.0, 541.97, 10.5, 135, charcoalColor);
    drawBounded(gotra, 58.0, 516.74, 10.5, 185, charcoalColor);
    drawBounded(address, 65.0, 491.51, 10.5, 135, charcoalColor);
    drawBounded(nomineeRelation, 117.0, 466.29, 10.5, 33, charcoalColor);

    // RIGHT COLUMN: नॉमिनी का विवरण (Font size 10.5 pt, Charcoal)
    drawBounded(nomineeName, 390.0, 604.28, 10.5, 165, charcoalColor);
    drawBounded(nomineeAadhaar, 387.0, 580.82, 10.5, 168, charcoalColor);
    drawBounded(nomineeFathername, 387.0, 557.35, 10.5, 168, charcoalColor);
    drawBounded(nomineeGotra, 370.0, 533.88, 10.5, 72, charcoalColor);
    drawBounded(age, 463.0, 533.88, 10.5, 90, charcoalColor);
    drawBounded(nomineeAddress, 378.0, 510.41, 10.5, 177, charcoalColor);
    drawBounded(nomineeMobile, 404.0, 486.94, 10.5, 150, charcoalColor);
    drawBounded(agentMobile, 400.0, 463.47, 10.5, 154, charcoalColor);

    // BOTTOM MAYRA AMOUNT (Font size 11.0 pt, Navy)
    drawBounded(mayraAmountText, 223.0, 437.40, 11.0, 65, navyColor);

    const pdfBytes = await pdfDoc.save();
    const rawSafeName = applicantName || membershipNo || formNumber || record?.id || 'bond';
    const safeName = String(rawSafeName).trim().replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_');

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MAYRA_BOND_${encodeURIComponent(safeName)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Mayra bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate bond PDF',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
