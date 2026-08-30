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
    const {
      data,
      type,
      debug,
      offsetX,
      offsetY,
      coordSystem,        // 'bottom-left' | 'top-left'
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      baseWidth,
      baseHeight,
      imageData, // Add image data parameter
    } = await request.json();

    console.log('Received data:', data);
    console.log('Type:', type);
    console.log('Image data received:', !!imageData);

    // Determine template path based on gender and type
    let templatePath: string;
    
    if (type === 'general-application') {
      // For general applications, use gender-specific templates
      const gender = data?.gender || data?.लिंग;
      console.log('Gender detected:', gender);
      
      if (gender === 'Female' || gender === 'महिला' || gender === 'Female') {
        templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'balika_application_form.pdf');
      } else if (gender === 'Male' || gender === 'पुरुष' || gender === 'Male') {
        templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'boys_application_form.pdf');
      } else {
        // Default to Female template if gender is not specified
        templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'balika_application_form.pdf');
      }
    } else {
      // For other types (like balika-avedan), use the original template resolution
      const candidateTemplates = [
        path.join(process.cwd(), 'public', 'balika_avedan_form.pdf'),
        path.join(process.cwd(), 'public', 'बालिका आवेदन फॉर्म.pdf'),
      ];
      templatePath = candidateTemplates.find((p) => fs.existsSync(p)) || '';
    }

    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`Template PDF not found: ${templatePath}`);
    }

    console.log('Using template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
      // Some builds of @pdf-lib/fontkit expect regeneratorRuntime
      try {
        await import('regenerator-runtime/runtime');
      } catch {}
      // Dynamic import to avoid hard dependency break if not installed
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
        // Convert base64 to Uint8Array
        const imageBytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
        
        // Determine image type and embed accordingly
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
          // Adjust these coordinates based on your form layout
          const imageX = 480; // X position for photo
          const imageY = 210; // Y position for photo
          const imageWidth = 80; // Width of the photo
          const imageHeight = 95; // Height of the photo

          // Draw the image on the PDF
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight, // Convert to bottom-left coordinate system
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully');
        }
      } catch (imageError) {
        console.error('Error embedding image:', imageError);
        // Continue without image if there's an error
      }
    }

    const debugMode: boolean = Boolean(debug);
    const globalOffsetX: number = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY: number = typeof offsetY === 'number' ? offsetY : 0;
    // Default to top-left which usually matches how template coordinates are measured visually
    const coordinateSystem: 'bottom-left' | 'top-left' =
      coordSystem === 'bottom-left' ? 'bottom-left' : 'top-left';

    // Scale factors if coordinates were measured on a different base size
    const baseW: number = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : 595; // A4 width (pt)
    const baseH: number = typeof baseHeight === 'number' && baseHeight > 0 ? baseHeight : 842; // A4 height (pt)
    const scaleX = pageWidth / baseW;
    const scaleY = pageHeight / baseH;

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
      // If there is Hindi text and no Devanagari font, fail fast with a helpful message
      const containsHindi = Object.values(data ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Updated field mappings - each field appears only once
    const baseFieldMappings: { field: keyof typeof data; x: number; y: number }[] = [
      // Header section      

      { field: 'सदस्यता_क्रमांक' as any, x: 80, y: 185 },   // Membership number (top left box)
      { field: 'आवेदन_दिनांक' as any, x: 490, y: 185 },    // Application date (top right box)


        // Main form section - Adjusted based on form structure
        { field: 'आवेदक_का_नाम' as any, x:90, y: 240 },   // Applicant name (श्रीमती field)
        { field: 'पिता_का_नाम' as any, x: 315, y: 240 },    // Father's name (पुत्री field)
        { field: 'माता_का_नाम' as any, x: 120, y: 270 },     // Mother's name
        { field: 'जन्म_तिथि' as any, x: 325, y: 270 },       // Date of birth
        { field: 'गोत्र' as any, x: 80, y: 300 },           // Gotra
        { field: 'उम्र' as any, x: 250, y: 300 },            // Age
        { field: 'मोबाइल' as any, x: 370, y: 300 },          // Mobile number
        { field: 'आधार_संख्या' as any, x: 110, y: 330 },     // Aadhaar number
        
        // Address section
        { field: 'पता' as any, x: 80, y: 360 },             // Address
        { field: 'पिन' as any, x: 80, y: 385 },             // PIN
        { field: 'तहसील' as any, x: 220, y: 385 },           // Tehsil
        { field: 'जिला' as any, x: 350, y: 385 },            // District
        { field: 'राज्य' as any, x: 470, y:385 },           // State
        
        // Nominee section
        { field: 'नामिनी_का_नाम' as any, x: 120, y: 415 },   // Nominee name
        { field: 'नामिनी_का_सम्बन्ध' as any, x: 390, y: 415 },    // Relationship with nominee
        // { field: 'नामिनी_का_पता' as any, x: 120, y: 440 },   // Nominee address
        
        // Worker section
        { field: 'कार्यकर्ता_का_नाम' as any, x: 130, y: 450 }, // Worker name
        { field: 'कार्यकर्ता_का_मोबाइल' as any, x: 340, y: 450 }, // Worker mobile
        
        // Oath section fields (शपथ पत्र)
        { field: 'शपथ_नाम' as any, x: 90, y: 630},         // Name in oath section
        { field: 'शपथ_पिता_का_नाम' as any, x: 300, y: 630 },    // Father name in oath
        { field: 'उम्र' as any, x: 480, y: 630 },
        { field: 'शपथ_गोत्र' as any, x: 60 , y: 660 },       // Gotra in oath
        { field: 'शपथ_पता' as any, x: 225, y: 660 },         // Address in oath  
    ];

    // Target anchors for the actual A4 form layout
    const anchorTargetFor: Record<string, { x: number; y: number }> = {
      'सदस्यता_क्रमांक': { x: 80, y: 185 },
      'आवेदन_दिनांक': { x: 490, y: 180 },
    };

    // Compute affine transform (scale + translate) using the two anchors (assume no rotation)
    const anchorBase1 = baseFieldMappings.find((f) => f.field === ('सदस्यता_क्रमांक' as any))!;
    const anchorBase2 = baseFieldMappings.find((f) => f.field === ('आवेदन_दिनांक' as any))!;
    const anchorNew1 = anchorTargetFor['सदस्यता_क्रमांक'];
    const anchorNew2 = anchorTargetFor['आवेदन_दिनांक'];

    const denomX = anchorBase2.x - anchorBase1.x || 1; // prevent divide-by-zero
    const sxAff = (anchorNew2.x - anchorNew1.x) / denomX;
    const txAff = anchorNew1.x - sxAff * anchorBase1.x;

    // y: anchors had same baseline y, can't solve sy from two points -> assume sy = 1
    const syAff = 1;
    const tyAff = ((anchorNew1.y - anchorBase1.y) + (anchorNew2.y - anchorBase2.y)) / 2;

    // Build effective field mappings by transforming baseline coords
    const fieldMappings = baseFieldMappings.map((f) => ({
      field: f.field,
      x: sxAff * f.x + txAff,
      y: syAff * f.y + tyAff,
    }));

    // Optional debug grid (helps determine coordinates). Coordinates are in PDF points from bottom-left.
    if (debugMode) {
      const gridStep = 25;
      const majorStep = 100;
      // Grid lines
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
      // Axes labels
      for (let x = 0; x <= pageWidth; x += majorStep) {
        firstPage.drawText(String(x), { x: x + 2, y: 4, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
      for (let y = 0; y <= pageHeight; y += majorStep) {
        firstPage.drawText(String(y), { x: 2, y: y + 2, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
      
      // Draw test markers at form field positions
      fieldMappings.forEach(mapping => {
        const drawX = mapping.x;
        const drawY = coordinateSystem === 'top-left' ? pageHeight - mapping.y : mapping.y;
        
        // Draw a red dot at each position
        firstPage.drawCircle({
          x: drawX,
          y: drawY,
          size: 3,
          color: rgb(1, 0, 0),
        });
        // Draw the label
        firstPage.drawText(String(mapping.field), {
          x: drawX + 5,
          y: drawY + 5,
          size: 6,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });
    }

    // Treat mapping coordinates as absolute positions; request offsets allow quick nudging
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    for (const mapping of fieldMappings) {
      let value = (data as any)[mapping.field];
      if (!value) continue;
      
      // Format date fields
      if (mapping.field === 'आवेदन_दिनांक' || mapping.field === 'जन्म_तिथि') {
        value = formatDateToDDMMYYYY(value);
      }
      // Coordinates are absolute (A4 pt). Apply only request offsets.
      const baseX = mapping.x + valueOffsetX + globalOffsetX;
      const baseY = mapping.y + valueOffsetY + globalOffsetY;
      const drawX = baseX;
      const drawY = coordinateSystem === 'top-left' ? pageHeight - baseY : baseY;
      if (debugMode) {
        // Marker to show exact anchor point of text
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
    // Ensure we pass an ArrayBuffer (BodyInit compatible in this environment)
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Generate appropriate filename based on gender and type
    let filename = 'filled_form.pdf';
    if (type === 'general-application') {
      const gender = data?.gender || data?.लिंग;
      const formNumber = (data as any)?.सदस्यता_क्रमांक || (data as any)?.formNumber || 'filled';
      if (gender === 'Female' || gender === 'महिला') {
        filename = `balika_application_form_${formNumber}.pdf`;
      } else if (gender === 'Male' || gender === 'पुरुष') {
        filename = `boys_application_form_${formNumber}.pdf`;
      } else {
        filename = `general_application_form_${formNumber}.pdf`;
      }
    } else {
      filename = `balika_avedan_form_${(data as any)?.सदस्यता_क्रमांक || 'filled'}.pdf`;
    }

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
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
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