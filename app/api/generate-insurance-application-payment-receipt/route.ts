import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

function numberToHindiWords(num: number): string {
  if (num === 0) return "शून्य";

  const ones = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छः", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह",
    "सत्रह", "अठारह", "उन्नीस"
  ];

  const tens = [
    "", "", "बीस", "तीस", "चालीस", "पचास",
    "साठ", "सत्तर", "अस्सी", "नब्बे"
  ];

  const scales = ["", "हज़ार", "लाख", "करोड़"];

  function chunkToWords(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " सौ ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  let scaleIndex = 0;

  // Split according to Indian numbering system (3,2,2...)
  const parts = [];
  parts.push(num % 1000); // first 3 digits
  num = Math.floor(num / 1000);

  while (num > 0) {
    parts.push(num % 100);
    num = Math.floor(num / 100);
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] > 0) {
      words += chunkToWords(parts[i]) + " " + scales[i] + " ";
    }
  }

  return words.trim();
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    console.log('Received insurance payment receipt data:', data);

    // Use the payment receipt template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'payement', 'payment_reciept.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Payment receipt template PDF not found: ${templatePath}`);
    }

    console.log('Using payment receipt template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
      try {
        await import('regenerator-runtime/runtime');
      } catch {}
      const fontkitModule: any = await import('@pdf-lib/fontkit');
      const fontkit = fontkitModule?.default ?? fontkitModule;
      if (fontkit) {
        (pdfDoc as any).registerFontkit(fontkit);
        fontkitAvailable = true;
      }
    } catch {
      fontkitAvailable = false;
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Try to embed a Devanagari-capable font; fallback to Helvetica
    let font;
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed. Run npm i @pdf-lib/fontkit and try again.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      // Check if there's Hindi text in the data
      const containsHindi = Object.values(data ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        console.warn('Hindi text detected but no Devanagari TTF font found. Using fallback font.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Convert totalAmount to Hindi words if it exists
    if (data.totalAmount) {
      const amountNum = parseFloat(data.totalAmount.toString().replace(/[^\d.]/g, ''));
      console.log('Total Amount:', data.totalAmount, 'Parsed:', amountNum);
      if (!isNaN(amountNum)) {
        data.amountInWords = numberToHindiWords(Math.floor(amountNum)) + " रुपये मात्र ";
        console.log('Amount in words:', data.amountInWords);
      }
    }

    // Field mappings for the payment receipt PDF - adjust coordinates as needed
    const fieldMappings = [
      // Receipt details
      { field: 'receiptNumber', x: 90, y: 140, label: 'Receipt No.' },
      { field: 'receiptDate', x: 480, y: 160, label: 'Receipt Date' },
      { field: 'formNumber', x: 80, y: 170, label: 'Form Number' },
      
      // Applicant details
      { field: 'applicantName', x: 295, y: 198, label: 'Name' },
      { field: 'fatherName', x: 170, y: 232, label: 'Father Name' },
      { field: 'gotra', x: 350, y: 232, label: 'Gotra' },
     
      // Address
      { field: 'address', x: 490, y: 232, label: 'Address' },
     
      // Payment details
      { field: 'totalAmount', x: 80, y: 385, label: 'Total Amount' },
      { field: 'amountInWords', x: 150, y: 266, label: 'Amount in Words' },
     ];

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      let value = data[mapping.field];
      console.log(`Processing field: ${mapping.field}, value: ${value}`);
      if (!value) continue;
      
      // // Format date fields
      // if (mapping.field === 'receiptDate' || mapping.field === 'applicationDate' || mapping.field === 'paymentDate') {
      //   value = formatDateDDMMYYYY(value);
      // }

      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert to bottom-left coordinate system

      console.log(`Drawing ${mapping.field} at coordinates: x=${drawX}, y=${drawY}, value="${value}"`);

      firstPage.drawText(String(value), {
        x: drawX,
        y: drawY,
        size: 13.5,
        font,
        color: rgb(0, 0, 0),
      });
    }

    console.log('Insurance payment receipt PDF generation completed successfully');

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    // Ensure we pass an ArrayBuffer (BodyInit compatible in this environment)
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Create a safe filename without special characters
    const safeName = (data.applicantName || data.formNumber || 'receipt')
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const fileName = `insurance_payment_receipt_${safeName}.pdf`;

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error generating insurance payment receipt PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insurance payment receipt PDF', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
