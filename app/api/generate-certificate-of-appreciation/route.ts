import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const {
      data,
      debug,
      offsetX,
      offsetY,
      coordSystem,        // 'bottom-left' | 'top-left'
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      baseWidth,
      baseHeight,
    } = await request.json();

    console.log('Received certificate data:', data);
    
    // Log the specific fields we're looking for
    console.log('Applicant Name:', data?.applicantName || data?.आवेदक_का_नाम);
    console.log('Father Name:', data?.fatherName || data?.पिता_का_नाम);
    console.log('Gotra:', data?.gotra || data?.गोत्र);
    console.log('Address:', data?.address || data?.पता);

    // Use the certificate of appreciation template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'sweing_machine_camp', 'certificate_of_appreciation.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Certificate template PDF not found: ${templatePath}`);
    }

    console.log('Using certificate template:', templatePath);

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

    // Image embedding removed as requested

    const debugMode: boolean = Boolean(debug);
    const globalOffsetX: number = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY: number = typeof offsetY === 'number' ? offsetY : 0;
    const coordinateSystem: 'bottom-left' | 'top-left' =
      coordSystem === 'bottom-left' ? 'bottom-left' : 'top-left';

    // Scale factors if coordinates were measured on a different base size
    const baseW: number = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : 595.28; // A4 width (pt)
    const baseH: number = typeof baseHeight === 'number' && baseHeight > 0 ? baseHeight : 841.89; // A4 height (pt)
    const scaleX = pageWidth / baseW;
    const scaleY = pageHeight / baseH;

    // Try to embed a Devanagari-capable font
    let font;
    try {
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
        console.log('Devanagari font embedded successfully');
      } else {
        // If there is Hindi text and no Devanagari font, fail fast with a helpful message
        const containsHindi = Object.values(data ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
        if (containsHindi) {
          throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
        }
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log('Helvetica font embedded successfully');
      }
    } catch (fontError:any) {
      console.error('Error embedding font:', fontError);
      // Fallback to Helvetica if font embedding fails
      try {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log('Fallback to Helvetica font');
      } catch (fallbackError:any) {
        throw new Error(`Font embedding failed: ${fontError.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }

    // Certificate field mappings
    // A4 size: 595.28 x 841.89 points (72 DPI)
    // Using proper A4 coordinates for better positioning
    const fieldMappings: { field: keyof typeof data; x: number; y: number }[] = [
      { field: 'applicantName' as any, x: 120, y: 375 },
      { field: 'fatherName' as any, x: 510, y: 375 },
      { field: 'gotra' as any, x: 150, y: 440 },
      { field: 'address' as any, x: 480, y: 440 },
    ];

    // Debug grid
    if (debugMode) {
      const gridStep = 25;
      const majorStep = 100;
      for (let x = 0; x <= pageWidth; x += gridStep) {
        firstPage.drawLine({
          start: { x, y: 0 },
          end: { x, y: pageHeight },
          thickness: x % majorStep === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
      for (let y = 0; y <= pageHeight; y += gridStep) {
        firstPage.drawLine({
          start: { x: 0, y },
          end: { x: pageWidth, y },
          thickness: y % majorStep === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
      for (let x = 0; x <= pageWidth; x += majorStep) {
        firstPage.drawText(String(x), { x: x + 2, y: 4, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
      for (let y = 0; y <= pageHeight; y += majorStep) {
        firstPage.drawText(String(y), { x: 2, y: y + 2, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
      
      fieldMappings.forEach(mapping => {
        const drawX = mapping.x;
        const drawY = coordinateSystem === 'top-left' ? pageHeight - mapping.y : mapping.y;
        
        firstPage.drawCircle({
          x: drawX,
          y: drawY,
          size: 3,
          color: rgb(1, 0, 0),
        });
        firstPage.drawText(String(mapping.field), {
          x: drawX + 5,
          y: drawY + 5,
          size: 6,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });
    }

    // Prepare data for PDF - simplified like other APIs
    const pdfData = {
      applicantName: data?.applicantName || data?.आवेदक_का_नाम || '',
      fatherName: data?.fatherName || data?.पिता_का_नाम || '',
      gotra: data?.gotra || data?.गोत्र || '',
      address: data?.address || data?.पता || '',
    };

    console.log('Prepared PDF data:', pdfData);

    if (!pdfData.applicantName && !pdfData.fatherName) {
      throw new Error('At least applicant name or father name is required for certificate generation');
    }

    if (!font) {
      throw new Error('Font not properly loaded. Cannot proceed with PDF generation.');
    }
    
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    
    for (const mapping of fieldMappings) {
      const value = (pdfData as any)[mapping.field];
      if (!value) continue;
      
      const baseX = mapping.x + valueOffsetX + globalOffsetX;
      const baseY = mapping.y + valueOffsetY + globalOffsetY;
      const drawX = baseX;
      const drawY = coordinateSystem === 'top-left' ? pageHeight - baseY : baseY;
      
      if (debugMode) {
        firstPage.drawRectangle({ x: drawX - 1, y: drawY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
      }
      
      firstPage.drawText(String(value), {
        x: drawX,
        y: drawY,
        size: 14,
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

    // Generate filename - create a safe filename without Hindi characters
    const applicantName = data?.applicantName || data?.आवेदक_का_नाम || 'certificate';
    const safeName = String(applicantName)
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const filename = `certificate_of_appreciation_${safeName}.pdf`;

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate certificate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}