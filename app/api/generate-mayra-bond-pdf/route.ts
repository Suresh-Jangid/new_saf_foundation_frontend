import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import { MAYRA_ASSOCIATION_DURATION_HI } from '@/lib/utils';

export const runtime = 'nodejs';

type FieldMapping = {
  getValue: (record: Record<string, any>) => string | undefined;
  x: number;
  y: number;
  size?: number;
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

function normalizeRecord(raw: Record<string, any>): Record<string, any> {
  return {
    ...raw,
    formNumber: getField(raw, 'formNumber', 'form_number', 'sr_no'),
    applicationDate: getField(raw, 'applicationDate', 'application_date'),
    applicantName: getField(raw, 'applicantName', 'applicant_name'),
    fatherName: getField(raw, 'fatherName', 'father_name', 'parentName', 'parent_name'),
    gotra: getField(raw, 'gotra', 'gotra_name'),
    age: getField(raw, 'age'),
    address: getField(raw, 'address', 'applicant_address'),
    nomineeName: getField(raw, 'nomineeName', 'nominee_name'),
    nomineeFathername: getField(
      raw,
      'nomineeFathername',
      'nominee_father_name',
      'nominee_fathername',
      'nomineeFather',
      'nominee_fathers_name',
    ),
    nomineeGotra: getField(raw, 'nomineeGotra', 'nominee_gotra'),
    nomineeAddress: getField(raw, 'nomineeAddress', 'nominee_address'),
    nomineeRelation: getField(raw, 'nomineeRelation', 'nominee_relation', 'relation'),
  };
}

function resolveRelationLabel(record: Record<string, any>): string {
  const relation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
  const r = relation.trim();
  const lower = r.toLowerCase();
  if (r === 'भांजी' || lower === 'bhenji' || lower === 'bhanji') return 'भांजी';
  if (r === 'भांजा' || r === 'भांजे' || lower === 'bhanej' || lower === 'bhanja' || lower === 'bhanje') return 'भांजा';
  return r || 'भांजा';
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

    const record = normalizeRecord(body?.record || body?.data || {});
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
    const duration = body?.duration || MAYRA_ASSOCIATION_DURATION_HI;

    console.log('Generating Mayra bond PDF for:', record.applicantName || 'Unknown');

    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_bond.pdf');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Mayra bond template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    let fontkitAvailable = false;
    try {
      try {
        await import('regenerator-runtime/runtime');
      } catch {}
      const fontkitModule: any = await import('@pdf-lib/fontkit');
      const fontkit = fontkitModule?.default ?? fontkitModule;
      if (fontkit) {
        pdfDoc.registerFontkit(fontkit);
        fontkitAvailable = true;
      }
    } catch {
      fontkitAvailable = false;
    }

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Template PDF has no pages' }, { status: 500 });
    }

    const firstPage = pages[0];
    const { height: pageHeight } = firstPage.getSize();

    // Photo boxes measured from mayra_bond.pdf template (648 x 504)
    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 284, 206, 79, 95);
    }
    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 284, 325, 79, 97);
    }

    let font;
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    try {
      if (fs.existsSync(fontPath) && fontkitAvailable) {
        const customFontBytes = fs.readFileSync(fontPath);
        font = await pdfDoc.embedFont(customFontBytes, { subset: true });
      } else {
        font = await pdfDoc.embedFont('Helvetica');
      }
    } catch (e) {
      console.error('Error loading font:', e);
      font = await pdfDoc.embedFont('Helvetica');
    }

    const formatDate = (value: string) => {
      if (!value) return '';
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)) {
        return value.replace(/-/g, '/');
      }
      return formatDateToDDMMYYYY(value) || value;
    };

    const drawText = (text: string | undefined, x: number, y: number, size = 11) => {
      try {
        if (!text?.trim()) return;
        firstPage.drawText(String(text), {
          x,
          y: pageHeight - y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      } catch (e) {
        console.error(`Error drawing text "${text}" at (${x}, ${y}):`, e);
      }
    };

    const fieldMappings: FieldMapping[] = [
      // Header boxes
      { getValue: (r) => r.formNumber, x: 105, y: 190 },
      { getValue: (r) => formatDate(r.applicationDate), x: 535, y: 190 },

      // Nominee details (left column)
      { getValue: (r) => r.nomineeName, x: 60, y: 252 },
      { getValue: (r) => r.nomineeFathername, x: 90, y: 278 },
      { getValue: (r) => r.nomineeGotra || r.gotra, x: 45, y: 304 },
      { getValue: (r) => r.nomineeAddress || r.address, x: 62, y: 331 },
      { getValue: (r) => resolveRelationLabel(r), x: 135, y: 357 },

      // Applicant / nephew-niece details (right column)
      { getValue: (r) => r.applicantName, x: 452, y: 260 },
      { getValue: (r) => r.fatherName, x: 440, y: 286 },
      { getValue: (r) => r.gotra, x: 420, y: 312 },
      { getValue: (r) => r.age, x: 570, y: 312 },
      { getValue: (r) => r.address, x: 437, y: 339 },
    ];

    for (const mapping of fieldMappings) {
      drawText(mapping.getValue(record), mapping.x, mapping.y, mapping.size);
    }

    // Duration — dotted blank in "इस योजना का लाभ ___ के बाद मिलेगा"
    if (duration) {
      drawText(duration, 438, 392, 11);
    }

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    );

    const safeName =
      getField(record, 'applicantName', 'formNumber', 'id')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'bond';

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MAYRA_BOND_${safeName}.pdf"`,
        'Cache-Control': 'no-store',
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
