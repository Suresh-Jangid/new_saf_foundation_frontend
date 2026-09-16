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
    //   Outer Black Border: x = 463.2, yFromTop = 153.8, w = 84.0, h = 91.0
    //   Inner Image Box:    x = 464.0, yFromTop = 154.6, w = 82.2, h = 89.2
    // Bottom Photo Box (Nominee):
    //   Outer Black Border: x = 463.2, yFromTop = 252.2, w = 84.0, h = 91.0
    //   Inner Image Box:    x = 464.0, yFromTop = 253.2, w = 82.2, h = 89.2
    if (applicantPhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 464.0, 154.6, 82.2, 89.2, 'cover');
      } catch (err) {
        console.warn('Could not embed applicant photo in Dhundhotsav Bond:', err);
      }
    }

    if (nomineePhotoSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 464.0, 253.2, 82.2, 89.2, 'cover');
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

    // Nominee Name (वारिसदार) - strictly nominee name, never applicant/father/agent name
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

    // Applicant Mobile (मो. नं.)
    const mobile = sanitizeValue(record.mobile || record.phone || record.applicantMobile || '');

    // Calibrated dynamic field positions on the official 1-page Dhundhotsav Bond template
    // Every field is aligned directly with the measured template label baseline (PDF baseline = pageHeight - y)
    // Font sizes are calibrated to match the visual text height of the corresponding printed labels
    const fields = [
      // Top Code fields (worker label BL yFromTop: 122.30; senior worker label BL yFromTop: 117.90)
      { field: 'कार्यकर्ता_कोड', val: workerOffline, x: 110.6, y: 122.30, maxW: 75, size: 11.5, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'सीनियर_कार्यकर्ता_कोड', val: seniorOffline, x: 462.3, y: 117.90, maxW: 85, size: 11.5, color: { r: 0, g: 0.15, b: 0.6 } },

      // Numbers & Date row
      { field: 'आवेदन_क्र', val: offlineFormNumber, x: 102.3, y: 145.89, maxW: 135, size: 11.5, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'सदस्यता_क्र', val: membershipNumber, x: 303.8, y: 144.07, maxW: 120, size: 11.0, color: { r: 0, g: 0.15, b: 0.6 } },
      { field: 'आवेदन_दिनांक', val: applicationDate, x: 485.1, y: 142.86, maxW: 75, size: 10.5 },

      // Left Column Fields (exact measured template baselines & matched visual height)
      { field: 'नाम', val: applicantName, x: 69.8, y: 184.60, maxW: 160, size: 10.5 },
      { field: 'जाति', val: caste, x: 74.5, y: 208.82, maxW: 155, size: 10.5 },
      { field: 'वारिसदार', val: nomineeName, x: 92.5, y: 233.05, maxW: 140, size: 10.5 },
      { field: 'एजेन्ट_मो_नं', val: agentMobile, x: 109.0, y: 257.28, maxW: 120, size: 10.5 },
      { field: 'आधार_नं', val: aadharNumber, x: 94.5, y: 281.51, maxW: 135, size: 10.5 },
      { field: 'नॉमिनी_आधार_नं', val: nomineeAadhar, x: 128.7, y: 305.74, maxW: 105, size: 10.5 },

      // Center Column Fields (exact measured template baselines & matched visual height)
      { field: 'पिता_पति_का_नाम', val: fatherName, x: 323.5, y: 184.90, maxW: 132, size: 10.5 },
      { field: 'गांव', val: village, x: 259.7, y: 208.52, maxW: 195, size: 10.5 },
      { field: 'जिला', val: district, x: 266.5, y: 232.13, maxW: 190, size: 10.5 },
      { field: 'राज्य', val: state, x: 262.9, y: 255.75, maxW: 195, size: 10.5 },
      { field: 'सम्बन्ध', val: nomineeRelation, x: 273.5, y: 279.37, maxW: 185, size: 10.5 },
      { field: 'मो_नं', val: mobile, x: 269.2, y: 302.99, maxW: 185, size: 10.5 },

      // Benefit Duration Clause (label baseline yFromTop: 360.83)
      { field: 'अवधि', val: String(duration || 'बारह महीने').trim(), x: 281.1, y: 360.83, maxW: 76, size: 10.0, color: { r: 0.8, g: 0.1, b: 0.1 } },
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
