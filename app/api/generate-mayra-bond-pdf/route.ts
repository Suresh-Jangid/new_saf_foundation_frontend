import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';

export const runtime = 'nodejs';

function getField(record: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
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
    const pageHeight = firstPage.getSize().height;

    // Measured Photo Boxes from official mayra_bond.pdf template (612 x 792):
    // Nominee Photo Box (Top):          x = 295.5, yFromTop = 131.0, w = 46.0, h = 53.0 (y in PDF: 608 to 661)
    // Account-holder Photo Box (Bottom): x = 295.5, yFromTop = 200.5, w = 46.0, h = 53.0 (y in PDF: 538.5 to 591.5)
    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 295.5, 131.0, 46.0, 53.0);
    }
    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 295.5, 200.5, 46.0, 53.0);
    }

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    const font = fs.existsSync(fontPath)
      ? await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica');

    const drawBounded = (
      text: string,
      x: number,
      y: number,
      size: number = 9.5,
      maxW?: number,
      color = rgb(0, 0, 0)
    ) => {
      if (!text) return;
      const str = String(text).trim();
      if (!str) return;
      let s = size;
      if (maxW && font.widthOfTextAtSize) {
        const w = font.widthOfTextAtSize(str, size);
        if (w > maxW) {
          s = Math.max(6.0, size * (maxW / w));
        }
      }
      firstPage.drawText(str, {
        x,
        y,
        size: s,
        font,
        color,
      });
    };

    // ── Field Extraction According to Project Rules ──────────────────────
    // 1. Membership number MUST use ONLY record.membershipNumber / membership_number
    const membershipNo = getField(record, 'membershipNumber', 'membership_number');

    // 2. Application number maps to authoritative Mayra application/form-number field ONLY
    const applicationNo = getField(
      record,
      'formNumber',
      'form_number',
      'applicationNumber',
      'application_number',
      'applicationNo',
      'mayraNumber',
      'mayra_number',
    );

    // 3. Nominee details (Left Section: "नॉमिनी का विवरण")
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeFathername = getField(
      record,
      'nomineeFathername',
      'nominee_father_name',
      'nominee_fathername',
      'nomineeFather',
      'nominee_fathers_name',
      'nomineeHusbandName',
      'nominee_husband_name',
    );
    const nomineeGotra = getField(record, 'nomineeGotra', 'nominee_gotra', 'gotra');
    const nomineeAddress = getField(record, 'nomineeAddress', 'nominee_address', 'address');

    // 4. Account holder / Bhanej-Bhanji details (Right Section: "भाणेज-भाणजी का विवरण")
    const applicantName = getField(record, 'applicantName', 'applicant_name');
    const fatherName = getField(record, 'fatherName', 'father_name', 'parentName', 'parent_name');
    const gotra = getField(record, 'gotra', 'gotra_name');
    const rawAge = getField(record, 'age');
    const age = rawAge ? (/^\d+$/.test(rawAge) ? `${rawAge} वर्ष` : rawAge) : '';
    const address = getField(record, 'address', 'applicant_address');

    // ── Draw Text on Official Template Coordinates ───────────────────────
    // TOP HEADER INPUT BOXES
    drawBounded(membershipNo, 160, 669.5, 10, 80);
    drawBounded(applicationNo, 442, 669.5, 10, 84);

    // LEFT SECTION: नॉमिनी का विवरण
    drawBounded(nomineeName, 132, 625.5, 9.5, 150);
    drawBounded(nomineeFathername, 152, 604.5, 9.5, 130);
    drawBounded(nomineeGotra, 122, 583.5, 9.5, 160);
    drawBounded(nomineeAddress, 130, 557.0, 9.0, 118);

    // RIGHT SECTION: भाणेज-भाणजी का विवरण
    drawBounded(applicantName, 396, 625.5, 9.5, 128);
    drawBounded(fatherName, 392, 606.0, 9.5, 132);
    drawBounded(gotra, 374, 586.5, 9.5, 62);
    drawBounded(age, 460, 586.5, 9.5, 64);
    drawBounded(address, 385, 567.5, 9.0, 138);

    // Fixed statement: "इस योजना का लाभ एक वर्ष के बाद मिलेगा" is pre-printed on template.

    const pdfBytes = await pdfDoc.save();
    const rawSafeName = applicantName || membershipNo || applicationNo || record?.id || 'bond';
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
