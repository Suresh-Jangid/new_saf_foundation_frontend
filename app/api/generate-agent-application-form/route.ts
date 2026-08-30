import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

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
      record, 
      imageData,
      debug,
      offsetX,
      offsetY,
      coordSystem,        // 'bottom-left' | 'top-left'
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      baseWidth,
      baseHeight,
    } = await request.json();

    console.log('Received record for agent application form PDF:', record);
    console.log('Image data received for agent application form:', !!imageData);

    // Use the agent application form template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'agent', 'agent_application_form.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Agent application form template not found: ${templatePath}`);
    }

    console.log('Using agent application form template:', templatePath);

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

    // Handle image embedding if imageData or profile_image is provided
    const imageToUse = imageData || record?.profile_image;
    if (imageToUse) {
      try {
        console.log('Processing image data:', typeof imageToUse, imageToUse.substring(0, 50) + '...');
        
        let imageBytes: Uint8Array;
        
        // Check if it's a URL or base64 data
        if (imageToUse.startsWith('http://') || imageToUse.startsWith('https://')) {
          // It's a URL, fetch the image
          console.log('Fetching image from URL:', imageToUse);
          const response = await fetch(imageToUse);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBytes = new Uint8Array(arrayBuffer);
          console.log('Fetched image bytes length:', imageBytes.length);
        } else if (imageToUse.startsWith('data:')) {
          // It's base64 data
          console.log('Processing base64 image data');
          const base64Data = imageToUse.replace(/^data:image\/[a-z]+;base64,/, '');
          imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          console.log('Base64 image bytes length:', imageBytes.length);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
          return;
        }
        
        // Determine image type and embed
        let image;
        try {
          // Try PNG first
          image = await pdfDoc.embedPng(imageBytes);
          console.log('Embedded PNG image:', image.width, 'x', image.height);
        } catch (pngError) {
          try {
            // Try JPEG if PNG fails
            image = await pdfDoc.embedJpg(imageBytes);
            console.log('Embedded JPEG image:', image.width, 'x', image.height);
          } catch (jpegError) {
            console.error('Failed to embed image as PNG or JPEG:', pngError, jpegError);
            return;
          }
        }

        if (image) {
          // Use the standard image configuration from fill-pdf-form
          const imageX = 483; // X position for photo
          const imageY = 265; // Y position for photo
          const imageWidth = 85; // Width of the photo
          const imageHeight = 98; // Height of the photo

          // Draw the image on the PDF using bottom-left coordinate system
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight, // Convert to bottom-left coordinate system
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully in application form');
        }
      } catch (error) {
        console.error('Error embedding image:', error);
      }
    }

    // Load Devanagari font for Hindi text
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf'),
    ];

    let font;
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed. Run npm i @pdf-lib/fontkit and try again.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      // Check if there's Hindi text in the record
      const containsHindi = Object.values(record ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Configuration for coordinate system and scaling
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

    // Base field mappings for the agent application form - adjust coordinates based on the actual form
    const baseFieldMappings = [
      { field: 'date', x: 80, y: 223, label: 'Date' },
      { field: 'employee_id', x: 495, y: 223, label: 'Employee ID' },
      { field: 'name', x: 80, y: 310, label: 'Name' },
      { field: 'fatherName', x: 285, y: 310, label: 'Father Name' },
      { field: 'gotra', x: 80, y: 345, label: 'Gotra' },
      { field: 'age', x: 235, y: 345, label: 'Age' },
      { field: 'village', x: 335, y: 345, label: 'Village' },
      { field: 'address', x: 80, y: 380, label: 'Address' },
      { field: 'tehsil', x: 315, y: 380, label: 'Tehsil' },
      { field: 'district', x: 85, y: 415, label: 'District' },
      { field: 'mobile', x: 315, y: 415, label: 'Mobile' },
      { field: 'aadhaar', x: 148, y: 453, label: 'Aadhaar' },
      { field: 'bankName', x: 215, y: 488, label: 'Bank Name' },
      { field: 'accountNumber', x: 120, y: 525, label: 'Account Number' },
      { field: 'ifsc', x: 365, y: 525, label: 'IFSC' },
      { field: 'nomineeName', x: 140, y: 560, label: 'Nominee Name' },
      { field: 'nomineeMobile', x: 410, y: 560, label: 'Nominee Mobile' },
      { field: 'nomineeRelation', x: 185, y: 590, label: 'Nominee Relation' },
      { field: 'workArea', x: 150, y: 625, label: 'Work Area' },
      
      
    ];

    // Apply scaling to field mappings
    const fieldMappings = baseFieldMappings.map((mapping) => ({
      ...mapping,
      x: mapping.x * scaleX,
      y: mapping.y * scaleY,
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

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      const value = record[mapping.field];
      if (!value) continue;

      // Format date fields to dd/mm/yyyy
      let formattedValue = value;
      if (mapping.field === 'date') {
        formattedValue = formatDateToDDMMYYYY(value);
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

      firstPage.drawText(String(formattedValue), {
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

    // Create a safe filename without Hindi characters
    const safeName = (record.name || record.employee_id || 'agent')
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const filename = `agent_application_form_${safeName}.pdf`;

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
    console.error('Error generating agent application form PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent application form PDF',
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
