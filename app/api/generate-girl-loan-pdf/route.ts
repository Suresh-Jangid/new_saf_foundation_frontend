import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

// Add OPTIONS method to handle CORS preflight requests
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
    const { data } = await request.json();

    console.log('Received data for girl loan PDF:', data);

    // Use the girl loan template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'girl_loan', 'girl_loan_hindi.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Girl loan template PDF not found: ${templatePath}`);
    }

    console.log('Using girl loan template:', templatePath);

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

    // A4 dimensions in points
    const a4Width = 595;
    const a4Height = 842;
    
    // Calculate scaling factors
    const scaleX = pageWidth / a4Width;
    const scaleY = pageHeight / a4Height;

    // Try to embed a Devanagari-capable font
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
      const containsHindi = Object.values(data ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Define field mappings for the girl loan form using A4 coordinates
    // These coordinates are based on A4 size (595 x 842 points)
    const fieldMappings = [
      { field: 'date', x: 80, y: 300 },
      { field: 'applicantName', x: 130, y: 338 },
      { field: 'address', x: 90, y:365 },
    ];

    // Fill the form fields with A4 scaling
    for (const mapping of fieldMappings) {
      let value = (data as any)[mapping.field];
      if (!value) continue;
      
      // Format date fields
      if (mapping.field === 'date') {
        value = formatDateToDDMMYYYY(value);
      }
      
      // Scale coordinates to match the actual PDF size
      const drawX = mapping.x * scaleX;
      const drawY = pageHeight - (mapping.y * scaleY); // Convert to bottom-left coordinate system
      
      firstPage.drawText(String(value), {
        x: drawX,
        y: drawY,
        size: 10 * Math.min(scaleX, scaleY), // Scale font size proportionally (reduced for better fit)
        font,
        color: rgb(0, 0, 0),
      });
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Generate filename
    const applicantName = data?.applicantName || 'loan';
    const safeName = applicantName
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const filename = `girl_loan_${safeName}.pdf`;

    return new NextResponse(arrayBuffer as ArrayBuffer, {
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
    console.error('Error generating girl loan PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate girl loan PDF',
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
