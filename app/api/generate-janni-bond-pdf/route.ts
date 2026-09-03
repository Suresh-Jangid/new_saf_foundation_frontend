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

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_bond', 'janni_sahayata_bond.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_sahayata_bond.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Janni bond template not found on server' }, { status: 500 });
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

    // Measured Photo Box from official janni_sahayata_bond.pdf template (612 x 792):
    // Photo box at top right: x = 444, y = 574 (yFromTop = 138), w = 72, h = 80
    const PHOTO_X = 444;
    const PHOTO_Y_FROM_TOP = 138;
    const PHOTO_WIDTH = 72;
    const PHOTO_HEIGHT = 80;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    // Embed director signature if available
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature,
    );
    if (directorSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 435, 510, 80, 30);
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
    // 1. Membership number MUST use ONLY record.membershipNumber. Blank if missing.
    const membershipNo = getField(record, 'membershipNumber', 'membership_number');

    // 2. Application number maps to Janni form number
    const applicationNo = getField(
      record,
      'formNumber',
      'form_number',
      'applicationNumber',
      'application_number',
      'applicationNo'
    );

    // 3. Applicant details
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherHusbandName = getField(
      record,
      'husbandName',
      'husband_name',
      'fatherName',
      'father_name'
    );
    const age = getField(record, 'age');
    const ageStr = age ? `${age} वर्ष` : '';
    const gotra = getField(record, 'gotra');
    const fullAddress = [
      getField(record, 'address'),
      getField(record, 'tehsil'),
      getField(record, 'district'),
    ].filter(Boolean).join(', ');

    // ── Coordinate Placements on Bond ────────────────────────────────────
    // Top Boxes
    drawBounded(membershipNo, 145, 680, 10, 60);
    drawBounded(applicationNo, 442, 680, 10, 75);

    // Center Details
    drawBounded(applicantName, 95, 638, 9.5, 140);
    drawBounded(fatherHusbandName, 295, 638, 9.5, 140);
    drawBounded(ageStr, 405, 638, 9.5, 30);

    drawBounded(gotra, 85, 620, 9.5, 110);
    drawBounded(fullAddress, 245, 620, 9.5, 190);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="janni_bond_${applicationNo || 'document'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Janni bond PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Janni bond PDF' },
      { status: 500 }
    );
  }
}
