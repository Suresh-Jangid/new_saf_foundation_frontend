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
    const duration = body?.duration || record?.duration || 'नौ माह';

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

    console.log('Using Janni Bond template:', templatePath);

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

    // Embed photos inside calibrated photo boxes on official A4 template:
    // Top Photo Box (Applicant):   x = 463.63, yFromTop = 154.2, w = 83.04, h = 90.15
    // Bottom Photo Box (Nominee):  x = 463.63, yFromTop = 252.6, w = 83.04, h = 90.15
    if (applicantPhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 463.63 + 1, 154.2 + 1, 83.04 - 2, 90.15 - 2);
      } catch (err) {
        console.warn('Could not embed applicant photo in Janni Bond:', err);
      }
    }

    if (nomineePhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 463.63 + 1, 252.6 + 1, 83.04 - 2, 90.15 - 2);
      } catch (err) {
        console.warn('Could not embed nominee photo in Janni Bond:', err);
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

    // Embed Devanagari font
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    const font = devanagariFontPath
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica');

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

    // 3. Application number - official Janni application formNumber
    const applicationNo = sanitizeValue(
      record.formNumber ||
      record.form_number ||
      record.applicationNumber ||
      record.application_number ||
      record.applicationNo ||
      ''
    );

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

    // Nominee Name (वारिसदार)
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

    // Calibrated dynamic field positions on official 1-page Janni Delivery Bond template (595.28 x 841.89 pt)
    const fields = [
      // Top Code fields
      { field: 'कार्यकर्ता_कोड', val: workerOffline, x: 112, y: 122.3, maxW: 85, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'सीनियर_कार्यकर्ता_कोड', val: seniorOffline, x: 462, y: 122.3, maxW: 80, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },

      // Numbers & Date row
      { field: 'आवेदन_क्र', val: applicationNo, x: 102, y: 145.9, maxW: 130, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'सदस्यता_क्र', val: membershipNumber, x: 304, y: 144.1, maxW: 115, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'आवेदन_दिनांक', val: applicationDate, x: 485, y: 142.9, maxW: 75, size: 9.5 },

      // Left Column Fields
      { field: 'नाम', val: applicantName, x: 80, y: 184.6, maxW: 150, size: 10 },
      { field: 'जाति', val: caste, x: 80, y: 208.8, maxW: 150, size: 9.5 },
      { field: 'वारिसदार', val: nomineeName, x: 95, y: 233.1, maxW: 135, size: 9.5 },
      { field: 'एजेन्ट_मो_नं', val: agentMobile, x: 115, y: 257.3, maxW: 115, size: 9.5 },
      { field: 'आधार_नं', val: aadharNumber, x: 95, y: 281.5, maxW: 135, size: 9.5 },
      { field: 'नॉमिनी_आधार_नं', val: nomineeAadhar, x: 130, y: 305.7, maxW: 100, size: 9.5 },

      // Center Column Fields
      { field: 'पिता_पति_का_नाम', val: fatherHusbandName, x: 325, y: 184.9, maxW: 130, size: 10 },
      { field: 'गांव', val: village, x: 265, y: 208.5, maxW: 190, size: 9.5 },
      { field: 'जिला', val: district, x: 265, y: 232.1, maxW: 190, size: 9.5 },
      { field: 'राज्य', val: state, x: 265, y: 255.8, maxW: 190, size: 9.5 },
      { field: 'सम्बन्ध', val: nomineeRelation, x: 275, y: 279.4, maxW: 180, size: 9.5 },
      { field: 'नॉमिनी_मो_नं', val: nomineeMobile, x: 292, y: 303.0, maxW: 165, size: 9.5 },

      // Benefit Duration Clause
      { field: 'अवधि', val: String(duration || 'नौ माह').trim(), x: 282, y: 360.8, maxW: 75, size: 9.5, color: { r: 0.8, g: 0.1, b: 0.1 } },
    ];

    for (const f of fields) {
      if (!f.val) continue;
      const drawX = f.x;
      const drawY = pageHeight - f.y;
      let size = f.size || 9.5;
      if (f.maxW && (font as any).widthOfTextAtSize) {
        const w = (font as any).widthOfTextAtSize(f.val, size);
        if (w > f.maxW) {
          size = Math.max(6.0, size * (f.maxW / w));
        }
      }
      const textColor = f.color ? rgb(f.color.r, f.color.g, f.color.b) : rgb(0.1, 0.1, 0.1);
      firstPage.drawText(f.val, {
        x: drawX,
        y: drawY,
        size,
        font,
        color: textColor,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `janni_bond_${applicationNo || record.id || 'document'}.pdf`;

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
