import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';

export const runtime = 'nodejs';

// A4 template: 595.32 × 841.92 pt — coordinates from top-left (same as fill-pdf-form)
const TEXT_SIZE = 12;
// Nudge text down onto dotted lines (pdf-lib draws from text baseline)
const BASELINE_NUDGE = 7;

type FieldMapping = {
  getValue: (record: Record<string, any>) => string;
  x: number;
  y: number;
};

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

    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_registration_form.pdf');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    const PHOTO_WIDTH = 80;
    const PHOTO_HEIGHT = 95;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 480, 210, PHOTO_WIDTH, PHOTO_HEIGHT);
    }
    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 480, 340, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    const font = fs.existsSync(fontPath)
      ? await pdfDoc.embedFont(fs.readFileSync(fontPath))
      : await pdfDoc.embedFont('Helvetica');

    const formatDate = (value: string) => {
      if (!value) return '';
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)) {
        return value.replace(/-/g, '/');
      }
      return formatDateToDDMMYYYY(value) || value;
    };

    const drawText = (text: string, x: number, y: number) => {
      if (!text) return;
      firstPage.drawText(text, {
        x,
        y: pageHeight - y - BASELINE_NUDGE,
        size: TEXT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // Coordinates aligned to mayra_registration_form.pdf dotted lines (top-left origin).
    const fieldMappings: FieldMapping[] = [
      // ── Header ──────────────────────────────────────────
      { getValue: (r) => getField(r, 'formNumber', 'sr_no', 'form_number'), x: 80, y: 175 },
      { getValue: (r) => formatDate(getField(r, 'applicationDate', 'application_date')), x: 490, y: 175 },

      // ── Applicant (भांजे/भांजी का विवरण) ───────────────
      { getValue: (r) => getField(r, 'applicantName', 'applicant_name'), x: 90, y: 235 },
      { getValue: (r) => getField(r, 'fatherName', 'father_name', 'parentName', 'parent_name'), x: 315, y: 235 },
      { getValue: (r) => getField(r, 'motherName', 'mother_name'), x: 110, y: 265 },
      { getValue: (r) => formatDate(getField(r, 'dateOfBirth', 'date_of_birth', 'dob')), x: 315, y: 265 },
      { getValue: (r) => getField(r, 'age'), x: 420, y: 265 },
      { getValue: (r) => getField(r, 'gotra'), x: 70, y: 290 },
      { getValue: (r) => getField(r, 'address'), x: 200, y: 290 },
      { getValue: (r) => getField(r, 'aadharNumber', 'aadhar_number', 'aadhaarNumber'), x: 375, y: 290 },

      // ── Nominee (नॉमिनी का विवरण) ───────────────────────
      { getValue: (r) => getField(r, 'nomineeName', 'nominee_name'), x: 120, y: 350 },
      { getValue: (r) => getField(r, 'nomineeFathername', 'nominee_father_name', 'nomineeFather'), x: 335, y: 350 },
      { getValue: (r) => getField(r, 'nomineeGotra', 'nominee_gotra'), x: 80, y: 380 },
      { getValue: (r) => getField(r, 'nomineeAddress', 'nominee_address'), x: 190, y: 380 },
      { getValue: (r) => getField(r, 'nomineeMobile', 'mobile', 'nominee_mobile'), x: 380, y: 380},
      { getValue: (r) => getField(r, 'tehsil', 'nomineeTehsil', 'nominee_tehsil'), x: 90, y: 410 },
      { getValue: (r) => getField(r, 'district', 'nomineeDistrict', 'nominee_district'), x: 195, y: 410 },
      { getValue: (r) => getField(r, 'pinCode', 'pincode', 'nomineePincode', 'nominee_pincode'), x: 430, y: 410 },
      { getValue: (r) => getField(r, 'nomineeRelation', 'nominee_relation', 'relation'), x: 150, y: 438 },
      { getValue: (r) => getField(r, 'workerName', 'worker_name', 'added_name'), x: 155, y: 460 },
      { getValue: (r) => getField(r, 'workerMobile', 'worker_mobile'), x: 375, y: 460 },

      // ── Affidavit (शपथ पत्र) ────────────────────────────
      { getValue: (r) => getField(r, 'applicantName', 'applicant_name'), x: 80, y: 625 },
      { getValue: (r) => getField(r, 'fatherName', 'father_name', 'parentName', 'parent_name'), x: 300, y: 625 },
      { getValue: (r) => getField(r, 'age'), x: 500, y: 625 },
      { getValue: (r) => getField(r, 'gotra'), x: 80, y: 650 },
      { getValue: (r) => getField(r, 'address'), x: 240, y: 650 },
    ];

    for (const mapping of fieldMappings) {
      drawText(mapping.getValue(record), mapping.x, mapping.y);
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mayra_registration_${record?.id || Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Critical error generating Mayra PDF:', error);
    return NextResponse.json({
      error: 'Failed to generate PDF',
      details: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
