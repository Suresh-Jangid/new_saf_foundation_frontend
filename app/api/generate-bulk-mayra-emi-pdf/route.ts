import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

/** maya_bulk_emi.pdf actual page size (pt) */
const TEMPLATE_WIDTH = 360;
const TEMPLATE_HEIGHT = 504;
const BASELINE_NUDGE = 5;
const TABLE_ROW_BASELINE = 13;

function numberToHindiWords(num: number): string {
  if (num === 0) return 'शून्य';

  const ones = [
    '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छः', 'सात', 'आठ', 'नौ',
    'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह',
    'सत्रह', 'अठारह', 'उन्नीस',
  ];
  const tens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];
  const scales = ['', 'हज़ार', 'लाख', 'करोड़'];

  function chunkToWords(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' सौ ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) str += ones[n] + ' ';
    return str.trim();
  }

  let words = '';
  const parts: number[] = [];
  parts.push(num % 1000);
  num = Math.floor(num / 1000);
  while (num > 0) {
    parts.push(num % 100);
    num = Math.floor(num / 100);
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] > 0) {
      words += chunkToWords(parts[i]) + ' ' + scales[i] + ' ';
    }
  }

  return words.trim();
}

function estimateTextWidth(text: string, fontSize: number): number {
  let spacingCount = 0;
  for (const char of text) {
    if (/[\u0900-\u097F]/.test(char)) {
      spacingCount += /[\u0901\u0902\u093C\u094D]/.test(char) ? 0.1 : 0.65;
    } else {
      spacingCount += 0.55;
    }
  }
  return spacingCount * fontSize;
}

function truncateToWidth(text: string, fontSize: number, maxWidth: number): string {
  if (!text || maxWidth <= 0) return text;
  let result = text;
  while (result.length > 0 && estimateTextWidth(result, fontSize) > maxWidth) {
    result = result.slice(0, -1);
  }
  if (result.length < text.length && result.length > 3) {
    let shortened = result.slice(0, -3) + '...';
    while (shortened.length > 3 && estimateTextWidth(shortened, fontSize) > maxWidth) {
      shortened = shortened.slice(0, -4) + '...';
    }
    return shortened;
  }
  return result;
}

export async function OPTIONS() {
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
    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const {
      data,
      offsetX,
      offsetY,
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      baseWidth,
      baseHeight,
    } = body;

    if (!data) {
      throw new Error('No data provided for PDF generation');
    }

    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'maya_bulk_emi.pdf');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Bulk Mayra EMI template PDF not found: ${templatePath}`);
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const originalTemplateBytes = existingPdfBytes;
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    const globalOffsetX = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY = typeof offsetY === 'number' ? offsetY : 0;
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;

    const baseW = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : TEMPLATE_WIDTH;
    const baseH = typeof baseHeight === 'number' && baseHeight > 0 ? baseHeight : TEMPLATE_HEIGHT;
    const scaleX = pageWidth / baseW;
    const scaleY = pageHeight / baseH;

    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    const font = devanagariFontPath
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath) as any, { subset: true })
      : await pdfDoc.embedFont(StandardFonts.Helvetica);

    /**
     * Coordinates measured on maya_bulk_emi.pdf (360 × 504 pt, top-left origin).
     */
    const fieldMappings: { field: string; x: number; y: number; maxWidth?: number }[] = [
      { field: 'marriageNumber', x: 70, y: 130, maxWidth: 90 },
      { field: 'todayDate', x: 278, y: 130, maxWidth: 75 },
      { field: 'applicantName', x: 55, y: 155, maxWidth: 165 },
      { field: 'fatherName', x: 235, y: 155, maxWidth: 120 },
      { field: 'gotra', x: 36, y: 180, maxWidth: 68 },
      { field: 'address', x: 155, y: 180, maxWidth: 155 },
      { field: 'emiAmount', x: 280, y: 180, maxWidth: 70 },
      { field: 'amountInWords', x: 150, y: 430, maxWidth: 210 },
      { field: 'totalEmiAmount', x: 50, y: 470, maxWidth: 55 },
    ];

    const todayDate = formatDateToDDMMYYYY(new Date().toISOString());

    const basePdfData = {
      marriageNumber: data.userId || '',
      applicantName: data.applicantName || '',
      fatherName: data.fatherName || '',
      gotra: data.gotra || '',
      address: data.address || '',
      todayDate,
      emiAmount: data.emiAmount != null ? String(data.emiAmount) : '',
    };

    const fontSize = 9;
    const textColor = rgb(0, 0, 0);

    const toDrawY = (yFromTop: number) =>
      pageHeight - (yFromTop * scaleY + valueOffsetY + globalOffsetY + BASELINE_NUDGE);

    const toDrawX = (x: number) => x * scaleX + valueOffsetX + globalOffsetX;

    const drawFieldText = (
      page: ReturnType<typeof pdfDoc.getPages>[0],
      text: string,
      x: number,
      yFromTop: number,
      maxWidth?: number,
    ) => {
      if (!text) return;
      const display = maxWidth
        ? truncateToWidth(text, fontSize, maxWidth * scaleX)
        : text;
      page.drawText(display, {
        x: toDrawX(x),
        y: toDrawY(yFromTop),
        size: fontSize,
        font,
        color: textColor,
      });
    };

    const fillPageWithRecords = (page: ReturnType<typeof pdfDoc.getPages>[0], records: any[]) => {
      const tableStartY = 210;
      const rowHeight = 28;
      const codeColumnX = 50;
      const nameColumnX = 110;
      const dateColumnX = 295;
      const nameMaxWidth = 175;

      records.forEach((record: any, index: number) => {
        const rowY = tableStartY + index * rowHeight + TABLE_ROW_BASELINE;

        const codeText = `${record.mayraNumber || record.marriageNumber || ''}`;
        drawFieldText(page, codeText, codeColumnX, rowY);

        const village = record.village ? ` (${record.village})` : '';
        const nameText = `${record.applicantName || ''}/${record.fatherName || ''}${village}`.trim();
        drawFieldText(page, nameText, nameColumnX, rowY, nameMaxWidth);

        const dateText = formatDateToDDMMYYYY(record.date) || 'N/A';
        drawFieldText(page, dateText, dateColumnX, rowY);
      });
    };

    const fillPageHeader = (
      page: ReturnType<typeof pdfDoc.getPages>[0],
      pageRecords: any[],
    ) => {
      const pageTotalEmiAmount = pageRecords.reduce((sum, record) => {
        const emiAmount = record.emiAmount || 0;
        return sum + (typeof emiAmount === 'number' ? emiAmount : parseFloat(emiAmount) || 0);
      }, 0);

      const pageAmountInWords =
        pageTotalEmiAmount > 0 ? numberToHindiWords(Math.floor(pageTotalEmiAmount)) : '';

      const pagePdfData = {
        ...basePdfData,
        totalEmiAmount: `${pageTotalEmiAmount}`,
        amountInWords: pageAmountInWords,
      };

      for (const mapping of fieldMappings) {
        const value = (pagePdfData as Record<string, string>)[mapping.field];
        if (!value) continue;
        drawFieldText(page, String(value), mapping.x, mapping.y, mapping.maxWidth);
      }
    };

    if (data.records && Array.isArray(data.records) && data.records.length > 0) {
      const maxRows = 10;
      const totalRecords = data.records.length;
      const totalPages = Math.ceil(totalRecords / maxRows);

      const firstPageRecords = data.records.slice(0, maxRows);
      fillPageHeader(firstPage, firstPageRecords);
      fillPageWithRecords(firstPage, firstPageRecords);

      if (totalPages > 1) {
        for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
          const templatePdfDoc = await PDFDocument.load(originalTemplateBytes);
          const embeddedPages = await pdfDoc.embedPdf(templatePdfDoc);
          const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
          newPage.drawPage(embeddedPages[0], { x: 0, y: 0, xScale: 1, yScale: 1 });

          const startIndex = pageIndex * maxRows;
          const endIndex = Math.min(startIndex + maxRows, totalRecords);
          const pageRecords = data.records.slice(startIndex, endIndex);

          fillPageHeader(newPage, pageRecords);
          fillPageWithRecords(newPage, pageRecords);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bulk_mayra_emi_${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('Error generating bulk Mayra EMI PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate bulk Mayra EMI PDF',
        details: error?.message || 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  }
}
