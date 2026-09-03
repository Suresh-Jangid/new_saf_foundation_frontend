import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
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
      record?.passportPhotoUrl,
      record?.passportPhoto,
      record?.passport_photo,
      record?.applicantPhoto,
      record?.applicant_photo,
      record?.photo,
      record?.photoUrl
    );

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_bond', 'lado_bahin_bond.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_bond.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Lado Bahin bond template not found on server' }, { status: 500 });
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

    // Measured Photo Box from official lado_bahin_bond.pdf template (595.28 x 841.89):
    // Photo box at top right: x = 436, yFromTop = 153, w = 72, h = 80
    const PHOTO_X = 436;
    const PHOTO_Y_FROM_TOP = 153;
    const PHOTO_WIDTH = 72;
    const PHOTO_HEIGHT = 80;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    // Embed director signature if available
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature
    );
    if (directorSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 435, 545, 80, 30);
    }

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    const font = fs.existsSync(fontPath)
      ? await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica');

    const formatDate = (value: string) => {
      if (!value) return '';
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)) {
        return value.replace(/-/g, '/');
      }
      return formatDateToDDMMYYYY(value) || value;
    };

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
          s = Math.max(6.5, size * (maxW / w));
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

    // ── 1. Top Header Boxes (Membership & Application Number) ─
    // CRITICAL: Membership Number must ONLY come from record.membershipNumber. NO fallback.
    const membershipNo = record?.membershipNumber ? String(record.membershipNumber).trim() : '';
    const applicationNo = getField(record, 'formNumber', 'form_number', 'applicationNumber', 'application_number');

    drawBounded(membershipNo, 142, 715, 9.5, 130);
    drawBounded(applicationNo, 430, 715, 9.5, 130);

    // ── 2. Member Info ────────────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherHusbandName = [
      getField(record, 'husbandName', 'husband_name'),
      getField(record, 'fatherName', 'father_name')
    ].filter(Boolean).join(' / ') || getField(record, 'fatherName', 'father_name');

    const ageVal = getField(record, 'age');
    const ageStr = ageVal ? `${ageVal} वर्ष` : '';
    const gotra = getField(record, 'gotra');
    const district = getField(record, 'district');
    const state = getField(record, 'state') || 'राज.';
    const residence = [
      getField(record, 'address'),
      getField(record, 'tehsil'),
      district ? (state ? `${district} (${state})` : district) : state
    ].filter(Boolean).join(', ');

    // Row 1: श्रीमान् / Name, पिता / पति का नाम, उम्र
    drawBounded(applicantName, 95, 675, 9.5, 155);
    drawBounded(fatherHusbandName, 265, 675, 9.5, 100);
    drawBounded(ageStr, 390, 675, 9.5, 35);

    // Row 2: गोत्र, निवासी
    drawBounded(gotra, 70, 645, 9.5, 120);
    drawBounded(residence, 215, 645, 9.5, 205);

    // Row 4: योजना का लाभ के बाद मिलेगा
    const muklawaDate = formatDate(getField(record, 'muklawaDate', 'muklawa_date'));
    const benefitPeriod = muklawaDate ? `मुकलावा दिनांक ${muklawaDate}` : 'मुकलावा उपरांत / 5 वर्ष';
    drawBounded(benefitPeriod, 230, 574, 9.5, 200);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lado_bahin_bond_${membershipNo || applicationNo || 'document'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Lado Bahin bond PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Lado Bahin bond PDF' },
      { status: 500 }
    );
  }
}
