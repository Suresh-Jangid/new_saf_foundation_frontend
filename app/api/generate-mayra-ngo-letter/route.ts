import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

const TEXT_SIZE = 11;

type FieldMapping = {
  field: string;
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

function resolveDearName(record: Record<string, any>): string {
  const gender = getField(record, 'gender', 'लिंग');
  const isFemale =
    gender === 'Female' ||
    gender === 'female' ||
    gender === 'महिला';

  return (
    getField(record, 'nomineeName', 'nominee_name') ||
    (isFemale ? getField(record, 'wifeOf', 'wife_of', 'पति_का_नाम') : '') ||
    getField(record, 'added_name', 'addedName', 'workerName', 'worker_name') ||
    getField(record, 'fatherName', 'father_name', 'पिता_का_नाम')
  );
}

function resolveNephewNieceName(record: Record<string, any>): string {
  return getField(
    record,
    'applicantName',
    'applicant_name',
    'आवेदक_का_नाम',
    'name',
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body?.data || body?.record || body || {};

    console.log('Received data for Mayra NGO letter:', data);

    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'maya_ngo_letter.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Mayra NGO letter template not found: ${templatePath}`);
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
    if (fs.existsSync(fontPath) && fontkitAvailable) {
      font = await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: true });
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const applicantName = resolveNephewNieceName(data);
    const dearName = resolveDearName(data);

    const pdfData: Record<string, string> = {
      date: formatDateToDDMMYYYY(getField(data, 'date', 'createdAt', 'created_at', 'दिनांक')) || '',
      mayraNumber: getField(data, 'mayraNumber', 'mayra_number', 'मायरा_संख्या'),
      nomineeName: dearName,
      nomineeGotra: getField(data, 'nomineeGotra', 'nominee_gotra', 'gotra', 'गोत्र', 'surname'),
      nomineeAddress: getField(data, 'nomineeAddress', 'nominee_address', 'address', 'निवासी', 'village'),
      applicantName,
      totalPaidAmount: getField(data, 'totalPaidAmount', 'total_paid_amount', 'कुल_भुगतान', 'paymentAmount', 'payment_amount'),
    };

    console.log('Mayra NGO letter pdfData:', pdfData);

    /**
     * Coordinates for maya_ngo_letter.pdf (595.32 × 841.92 pt, A4 portrait).
     * Origin: top-left; converted to pdf-lib bottom-left via pageHeight - y.
     */
    const fieldMappings: FieldMapping[] = [
      { field: 'date', x: 90, y: 250 },
      { field: 'mayraNumber', x: 435, y: 250 },
      { field: 'nomineeName', x: 65, y: 340 },
      { field: 'nomineeGotra', x: 260, y: 340 },
      { field: 'nomineeAddress', x: 85, y: 365 },
      { field: 'applicantName', x: 335, y: 395 },
      { field: 'totalPaidAmount', x: 120, y: 605 },
    ];

    // Cover and correct payment method labels
    firstPage.drawRectangle({
      x: 180,
      y: pageHeight - 612,
      width: 250,
      height: 32,
      color: rgb(1, 1, 1),
    });
    firstPage.drawText('(Cash/Cheque/NEFT/IMPS)', {
      x: 185,
      y: pageHeight - 604,
      size: TEXT_SIZE,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    firstPage.drawLine({
      start: { x: 228, y: pageHeight - 590 },
      end: { x: 232, y: pageHeight - 595 },
      thickness: 2,
      color: rgb(0, 0.6, 0),
    });
    firstPage.drawLine({
      start: { x: 232, y: pageHeight - 595 },
      end: { x: 240, y: pageHeight - 585 },
      thickness: 2,
      color: rgb(0, 0.6, 0),
    });
    firstPage.drawRectangle({
      x: 38,
      y: pageHeight - 636,
      width: 75,
      height: 16,
      color: rgb(1, 1, 1),
    });
    firstPage.drawText('Cheque No.', {
      x: 40,
      y: pageHeight - 630,
      size: TEXT_SIZE,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    const getRunWidth = (runText: string, activeFont: typeof font, isHindi: boolean) => {
      if (isHindi) {
        let spacingCount = 0;
        for (let i = 0; i < runText.length; i++) {
          const char = runText[i];
          if (/[\u0901\u0902\u093C\u0941\u0942\u0943\u0944\u0945\u0946\u0947\u0948\u094C\u094D]/.test(char)) {
            spacingCount += 0.1;
          } else {
            spacingCount += 0.65;
          }
        }
        return spacingCount * TEXT_SIZE;
      }
      return activeFont.widthOfTextAtSize(runText, TEXT_SIZE);
    };

    const drawText = (text: string, x: number, y: number) => {
      if (!text?.trim()) return;
      const strText = String(text).trim();
      const drawY = pageHeight - y;

      let currentX = x;
      let currentRun = '';
      let isDevanagari = false;

      const flushRun = () => {
        if (!currentRun) return;
        const activeFont = isDevanagari ? font : helveticaFont;
        firstPage.drawText(currentRun, {
          x: currentX,
          y: drawY,
          size: TEXT_SIZE,
          font: activeFont,
          color: rgb(0, 0, 0),
        });
        currentX += getRunWidth(currentRun, activeFont, isDevanagari);
        currentRun = '';
      };

      for (let i = 0; i < strText.length; i++) {
        const char = strText[i];
        const charIsDevanagari = /[\u0900-\u097F]/.test(char);
        if (i === 0) {
          isDevanagari = charIsDevanagari;
          currentRun = char;
        } else if (charIsDevanagari === isDevanagari) {
          currentRun += char;
        } else {
          flushRun();
          isDevanagari = charIsDevanagari;
          currentRun = char;
        }
      }

      flushRun();
    };

    for (const mapping of fieldMappings) {
      const value = pdfData[mapping.field];
      if (!value) continue;
      drawText(value, mapping.x, mapping.y);
    }

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    );

    const mayraNumber = getField(data, 'mayraNumber', 'mayra_number') || 'filled';

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mayra_ngo_letter_${mayraNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating Mayra NGO letter:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
