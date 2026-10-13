import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { loadImageBytes } from '../../utils/pdfImage';
import { drawDevanagariText, drawDevanagariBounded } from '@/lib/pdf-devanagari';

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
    
    // Preserve the original template dimensions without clipping
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
            // Precise photo box coordinates on the agent ID card template:
            // Box dimensions: x=119.5, width=37.0 pt, height=51.5 pt
            const imageX = 119.5;
            const imageYFromTop = 113.2;
            const imageWidth = 37.0;
            const imageHeight = 51.5;

            // Position the image using bottom-left coordinate system
            const drawY = pageHeight - imageYFromTop - imageHeight;

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

    // Resolved field values with fallback property names
    const resolvedValues: Record<string, string> = {
      name: record?.name || '',
      fatherName: record?.fatherName || record?.father_name || '',
      designation: record?.designation || '',
      doj: record?.doj ? formatDateToDDMMYYYY(record.doj) : '',
      mobile: record?.mobile || record?.phone || '',
      agent_code: record?.agent_code || record?.offlineFormNumber || record?.offline_form_number || '',
      employee_id: record?.employee_id || record?.employeeId || '',
      address: record?.address || [record?.village, record?.tehsil, record?.district].filter(Boolean).join(', ') || '',
      dateOfBirth: record?.dateOfBirth ? formatDateToDDMMYYYY(record.dateOfBirth) : (record?.dob ? formatDateToDDMMYYYY(record.dob) : ''),
    };

    // Field mappings aligned with the printed labels on the template
    const fieldMappings = [
      { key: 'name', x: 44, y: 83.0, size: 5, maxW: 72 },
      { key: 'fatherName', x: 65, y: 98.0, size: 5, maxW: 52 },
      { key: 'designation', x: 42, y: 115.5, size: 5, maxW: 74 },
      { key: 'doj', x: 61, y: 130.5, size: 5, maxW: 56 },
      { key: 'mobile', x: 50, y: 148.0, size: 5, maxW: 67 },
      { key: 'agent_code', x: 70, y: 163.0, size: 5, maxW: 47 },
      { key: 'employee_id', x: 71, y: 178.0, size: 5, maxW: 88 },
      { key: 'address', x: 42, y: 196.8, size: 4.8, maxW: 118 },
      { key: 'dateOfBirth', x: 60, y: 211.8, size: 5, maxW: 100 },
    ];

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      const value = resolvedValues[mapping.key];
      if (!value) continue;

      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert top-left Y coordinate to PDF bottom-left

      drawDevanagariBounded(firstPage, font, String(value), {
        x: drawX,
        y: drawY,
        size: mapping.size,
        maxW: mapping.maxW,
        minSize: 3.5,
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
    const asciiFiltered = (record?.name || record?.employee_id || record?.agent_code || '')
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const safeName = asciiFiltered || 'agent';
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
