import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { data, debug, offsetX, offsetY, coordSystem, valueOffsetX: reqValueOffsetX, valueOffsetY: reqValueOffsetY, baseWidth, baseHeight, imageData } = await request.json();

    console.log('Received suraksha bima data:', data);
    console.log('Image data received:', !!imageData);

    // Determine template path based on gender
    const gender = data?.gender || data?.लिंग;
    console.log('Gender detected:', gender);
    
    let templatePath: string;
    if (gender === 'Female' || gender === 'महिला') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'suraksha_bima_yojana', 'female_suraksha_bima.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'suraksha_bima_yojana', 'male_suraksha_bima.pdf');
    } else {
      // Default to Male template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'suraksha_bima_yojana', 'male_suraksha_bima.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Suraksha Bima template PDF not found: ${templatePath}`);
    }

    console.log('Using suraksha bima template:', templatePath);

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

    // Handle image embedding if imageData is provided
    if (imageData) {
      try {
        const imageBytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
        
        let image;
        if (imageData.startsWith('data:image/jpeg')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageData.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
        }

        if (image) {
          // Calculate image position and size for passport photo
          // Adjust these coordinates based on your suraksha bima form layout
          const imageX = 481; // X position for photo
          const imageY = 205; // Y position for photo
          const imageWidth = 80; // Width of the photo
          const imageHeight = 100; // Height of the photo

          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight,
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully');
        }
      } catch (imageError) {
        console.error('Error embedding image:', imageError);
      }
    }

    const debugMode: boolean = Boolean(debug);
    const globalOffsetX: number = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY: number = typeof offsetY === 'number' ? offsetY : 0;
    const coordinateSystem: 'bottom-left' | 'top-left' = coordSystem === 'bottom-left' ? 'bottom-left' : 'top-left';

    const baseW: number = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : 595;
    const baseH: number = typeof baseHeight === 'number' && baseHeight > 0 ? baseHeight : 842;
    const scaleX = pageWidth / baseW;
    const scaleY = pageHeight / baseH;

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

    // Field mappings for suraksha bima form
    // Updated coordinates based on the new PDF template structure
    const fieldMappings: { field: string; x: number; y: number }[] = [
      // Header section
      { field: 'दिनांक', x: 85, y: 205 },
      { field: 'कोड_नंबर', x: 490 , y: 205 },
      { field: 'बीमा_नंबर', x: 485, y: 230 },
      
      // Applicant details section
      { field: 'आवेदक_का_नाम', x: 85, y: 280 },
      { field: 'पिता_का_नाम', x: 355, y: 280 },
      { field: 'पति_का_नाम', x: 355, y: 280 },
      { field: 'गोत्र', x: 84, y: 310 },
      { field: 'निवासी', x: 310, y: 310 },
      
      // Membership details
      { field: 'सदस्यता_तिथि', x: 305, y: 345 },
      { field: 'संस्था_से_जुड़ी_रही', x: 305, y: 375 },
      
      // Financial details
      { field: 'स्थायी_शुल्क', x: 305, y: 405 },
      { field: 'किस्त_राशि', x: 305, y: 430},
      { field: 'कुल_अनुदान', x: 305, y: 460 },
      { field: 'कुल_सदस्य', x: 305, y: 490 },
      { field: 'rate_200', x: 280, y: 550 },
      { field: 'rate_200_x_200', x: 380, y: 550 },
      { field: 'rate_200_x_200', x: 340, y: 580 },
      
      // Deduction details
      { field: 'कटौती_प्रतिशत', x: 220, y: 637 },
      { field: 'कटौती_राशि', x: 325, y: 637 },
      { field: 'कुल_भुगतान', x: 290, y: 658 },
    
    ];

    // Optional debug grid
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

    // Fill in the form fields
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    
    for (const mapping of fieldMappings) {
      let value = data[mapping.field];
      
      // Handle rate_200_x_200 field - multiply rate_200 by 200
      if (mapping.field === 'rate_200_x_200') {
        const rate200Value = data['rate_200'];
        if (rate200Value && !isNaN(Number(rate200Value))) {
          value = String(Number(rate200Value) * 200);
        } else {
          value = '0';
        }
      }
      
      // Skip processing if no value (except for calculated fields like rate_200_x_200)
      if (!value && mapping.field !== 'rate_200_x_200') continue;
      
      // Format date fields
      if (mapping.field === 'दिनांक' || mapping.field === 'सदस्यता_तिथि') {
        value = formatDateToDDMMYYYY(value);
      }
      
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
        size: 12,
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
    const bimaNumber = data?.बीमा_नंबर || 'filled';
    let filename = 'suraksha_bima_form.pdf';
    
    if (gender === 'Female' || gender === 'महिला') {
      filename = `female_suraksha_bima_${bimaNumber}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      filename = `male_suraksha_bima_${bimaNumber}.pdf`;
    } else {
      filename = `suraksha_bima_${bimaNumber}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating Suraksha Bima PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Suraksha Bima PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
