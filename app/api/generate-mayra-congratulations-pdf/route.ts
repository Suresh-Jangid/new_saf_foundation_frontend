import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

const TEXT_SIZE = 12;
// Nudge text onto dotted-line baselines (pdf-lib draws from the text baseline)
const BASELINE_NUDGE = 7;

type FieldMapping = {
  field: string;
  x: number;
  y: number;
  /** Right-align within a dotted line ending at this x (top-left coords). */
  lineEndX?: number;
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

function parseNumber(value: string): number {
  const num = parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isNaN(num) ? 0 : num;
}

function resolveNomineeName(record: Record<string, any>, isFemale: boolean): string {
  const direct = getField(record, 'nomineeName', 'nominee_name', 'added_name');
  if (direct) return direct;
  if (isFemale) return getField(record, 'wifeOf', 'wife_of', 'fatherName', 'father_name');
  return getField(record, 'fatherName', 'father_name');
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

    const data = body?.data || body?.record || body || {};
    const offsetX = typeof body?.offsetX === 'number' ? body.offsetX : 0;
    const offsetY = typeof body?.offsetY === 'number' ? body.offsetY : 0;

    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_payment_form.pdf');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    let fontkitAvailable = false;
    try {
      const fontkitModule: any = await import('@pdf-lib/fontkit');
      const fontkit = fontkitModule?.default ?? fontkitModule;
      if (fontkit) {
        pdfDoc.registerFontkit(fontkit);
        fontkitAvailable = true;
      }
    } catch {
      fontkitAvailable = false;
    }

    const firstPage = pdfDoc.getPages()[0];
    const { height: pageHeight } = firstPage.getSize();

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    let font;
    try {
      if (fs.existsSync(fontPath) && fontkitAvailable) {
        font = await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: true });
      } else {
        font = await pdfDoc.embedFont('Helvetica');
      }
    } catch (e) {
      console.error('Error loading font:', e);
      font = await pdfDoc.embedFont('Helvetica');
    }

    const gender = getField(data, 'gender');
    const isFemale = gender === 'Female' || gender === 'female' || gender === 'महिला';

    const rate200 = parseNumber(getField(data, 'rate200', 'rate_200'));
    const rate300 = parseNumber(getField(data, 'rate300', 'rate_300'));
    const multipliedRate200 = rate200 * 200;
    const multipliedRate300 = rate300 * 300;

    const pdfData: Record<string, string | number> = {
      date: formatDateToDDMMYYYY(getField(data, 'date', 'createdAt', 'created_at')) || '',
      codeNumber: getField(data, 'codeNumber', 'code_number', 'formNumber', 'form_number', 'sr_no'),
      mayraNumber: getField(data, 'mayraNumber', 'mayra_number'),
      applicantName: getField(data, 'applicantName', 'applicant_name'),
      nomineeName: resolveNomineeName(data, isFemale),
      gotra: getField(data, 'gotra', 'surname'),
      address: getField(data, 'address', 'applicant_address'),
      membershipJoinDate: formatDateToDDMMYYYY(getField(data, 'membershipJoinDate', 'membership_join_date')) || '',
      associatedUntil: getField(data, 'associatedUntil', 'associated_until'),
      permanentFee: getField(data, 'permanentFee', 'permanent_fee'),
      installmentAmount: getField(data, 'installmentAmount', 'installment_amount'),
      totalGrantAmount: getField(data, 'totalGrantAmount', 'total_grant_amount'),
      totalMembersServing: getField(data, 'totalMembersServing', 'total_members_serving'),
      rate200: rate200 ? String(rate200) : '',
      rate300: rate300 ? String(rate300) : '',
      multipliedRate200: multipliedRate200 ? String(multipliedRate200) : '',
      multipliedRate300: multipliedRate300 ? String(multipliedRate300) : '',
      totalMultipliedRate: multipliedRate200 + multipliedRate300 ? String(multipliedRate200 + multipliedRate300) : '',
      deductedAmount: getField(data, 'deductedAmount', 'deducted_amount'),
      totalPaidAmount: getField(data, 'totalPaidAmount', 'total_paid_amount', 'paymentAmount', 'payment_amount'),
    };

    /**
     * Coordinates for mayra_payment_form.pdf (595.32 × 841.92 pt, A4 portrait).
     * Origin: top-left. y = distance from top; converted to pdf-lib bottom-left via pageHeight - y.
     * Aligned to dotted lines on the template (same layout family as marriage payment forms).
     */
    const fieldMappings: FieldMapping[] = [
      { field: 'date', x: 85, y: 205 },
      { field: 'codeNumber', x: 500, y: 205 },
      { field: 'applicantName', x: 90, y: 295 },
      { field: 'nomineeName', x: 310, y: 295 },
      { field: 'gotra', x: 70, y: 325 },
      { field: 'address', x: 240, y: 325 },
      { field: 'membershipJoinDate', x: 325, y: 350  },
      { field: 'associatedUntil', x: 330, y: 385 },
      { field: 'permanentFee', x: 320, y: 410, lineEndX: 420 },
      { field: 'installmentAmount', x: 320, y: 440, lineEndX: 420 },
      { field: 'totalGrantAmount', x: 320, y: 470, lineEndX: 420 },
      { field: 'totalMembersServing', x: 320, y: 500, lineEndX: 420 },
      { field: 'rate200', x: 275, y: 540 },
      { field: 'rate300', x: 290, y: 562 },
      { field: 'multipliedRate200', x: 370, y: 545 },
      { field: 'multipliedRate300', x: 370, y: 562 },
      { field: 'totalMultipliedRate', x: 330, y: 605 },
      { field: 'deductedAmount', x: 290, y: 635, lineEndX: 400 },
      { field: 'totalPaidAmount', x: 290, y: 658, lineEndX: 400 },
      { field: 'mayraNumber', x: 200, y: 692 },
    ];

    const drawText = (
      text: string | number | undefined,
      x: number,
      y: number,
      lineEndX?: number,
    ) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      const str = String(text);
      let drawX = x + offsetX;
      if (lineEndX !== undefined) {
        drawX = lineEndX - font.widthOfTextAtSize(str, TEXT_SIZE) + offsetX;
      }
      firstPage.drawText(str, {
        x: drawX,
        y: pageHeight - (y + offsetY) - BASELINE_NUDGE,
        size: TEXT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    };

    for (const mapping of fieldMappings) {
      drawText(pdfData[mapping.field], mapping.x, mapping.y, mapping.lineEndX);
    }

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    );

    const mayraNumber = getField(data, 'mayraNumber', 'mayra_number') || String(Date.now());

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mayra_payment_form_${mayraNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Critical error generating mayra congratulations PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
