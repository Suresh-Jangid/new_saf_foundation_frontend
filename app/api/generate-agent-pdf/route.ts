import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { loadImageBytes } from '../../utils/pdfImage';
import { drawDevanagariText } from '@/lib/pdf-devanagari';

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
    const { record, imageData } = await request.json();

    console.log('Received record for agent PDF:', record);
    console.log('Image data received for agent:', !!imageData);

    // Use the agent ID card template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'agent', 'agent_id_card.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Agent template not found: ${templatePath}`);
    }

    console.log('Using agent template:', templatePath);

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
    
    // Set page size to 204x323
    firstPage.setSize(141, 240);
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Handle image embedding if imageData or profile_image is provided
    const imageToUse = imageData || record?.profile_image || record?.photo || record?.photoUrl;
    if (imageToUse) {
      try {
        const loaded = await loadImageBytes(imageToUse);
        if (loaded) {
          const { bytes, mime } = loaded;
          let image;
          try {
            if (mime && mime.includes('png')) {
              image = await pdfDoc.embedPng(bytes);
            } else {
              image = await pdfDoc.embedJpg(bytes);
            }
          } catch {
            try {
              image = await pdfDoc.embedPng(bytes);
            } catch {
              image = await pdfDoc.embedJpg(bytes);
            }
          }

          if (image) {
            // Use the exact original image configuration
            const imageX = 47; // X position for photo (adjusted for smaller page)
            const imageY = 50; // Y position for photo (adjusted for smaller page)
            const imageWidth = 50; // Width of the photo (adjusted for smaller page)
            const imageHeight = 60; // Height of the photo (adjusted for smaller page)

            // Position the image using bottom-left coordinate system
            const drawY = pageHeight - imageY - imageHeight;

            firstPage.drawImage(image, {
              x: imageX,
              y: drawY,
              width: imageWidth,
              height: imageHeight,
            });
            console.log('Image drawn successfully');
          }
        }
      } catch (error) {
        console.error('Error embedding image:', error);
      }
    } else {
      console.log('No image data provided');
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

    // Field mappings for the agent ID card - adjusted for 204x323 dimensions
    const fieldMappings = [
      { field: 'employee_id', x: 55 , y: 196, label: 'Employee ID' },
      { field: 'name', x: 35 , y: 129, label: 'Name' },
      { field: 'fatherName', x: 55, y: 140, label: 'Father Name' },    
      { field: 'address', x: 42, y: 151, label: 'Address' },    
      { field: 'mobile', x: 40, y: 163, label: 'Mobile' },
      { field: 'doj', x: 30, y: 174, label: 'Date of Joining' },
      { field: 'designation', x: 54, y: 185, label: 'Designation' },
    ];

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      const value = record[mapping.field];
      if (!value) continue;

      // Format date fields to dd/mm/yyyy
      let formattedValue = value;
      if (mapping.field === 'doj') {
        formattedValue = formatDateToDDMMYYYY(value);
      }

      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert to top-left coordinate system

      drawDevanagariText(firstPage, font, String(formattedValue), {
        x: drawX,
        y: drawY,
        size: 5,
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
    
    const filename = `agent_id_card_${safeName}.pdf`;

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
    console.error('Error generating agent PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent PDF',
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
