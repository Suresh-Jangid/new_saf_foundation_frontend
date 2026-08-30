import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { record, imageData, duration } = await request.json();

    console.log('Received record for bond PDF:', record);
    console.log('Image data received for bond:', !!imageData);

    // Determine template path based on gender
    let templatePath: string;
    const gender = record?.gender;
    console.log('Gender detected for bond:', gender);
    
    if (gender === 'Female' || gender === 'महिला') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'girl_bond.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'boys_bond.pdf');
    } else {
      // Default to girl bond template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'girl_bond.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Bond template not found: ${templatePath}`);
    }

    console.log('Using bond template:', templatePath);

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
          // Calculate image position and size for passport photo in bond
          // Adjust these coordinates based on your bond form layout
          const imageX = 420; // X position for photo
          const imageY = 180; // Y position for photo
          const imageWidth = 60; // Width of the photo
          const imageHeight = 75; // Height of the photo

          // Draw the image on the PDF
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight, // Convert to bottom-left coordinate system
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully in bond PDF');
        }
      } catch (imageError) {
        console.error('Error embedding image in bond PDF:', imageError);
        // Continue without image if there's an error
      }
    }

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
      // Check if there's Hindi text in the record
      const containsHindi = Object.values(record ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Field mappings for the bond PDF - adjust coordinates as needed
    const fieldMappings = [
        { field: 'formNumber', x: 80, y: 150, label: 'Form Number' },
        { field: 'applicationDate', x: 425, y: 150, label: 'Application Date' },
      { field: 'applicantName', x: 60, y: 185, label: 'Applicant Name' },
      { field: 'fatherName', x: 250, y: 185, label: 'Father Name' },    
      { field: 'age', x: 380, y: 185, label: 'Age' },  
      { field: 'gotra', x: 60, y: 215, label: 'Gotra' },     
      { field: 'address', x: 240, y: 215, label: 'Address' },
    ];

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      let value = record[mapping.field];
      if (!value) continue;
      
      // Format date fields
      if (mapping.field === 'applicationDate') {
        value = formatDateToDDMMYYYY(value);
      }

      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert to top-left coordinate system

      firstPage.drawText(String(value), {
        x: drawX,
        y: drawY,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // Add duration text at the bottom of the page
    if (duration) {
      const durationY = 65; // Position at bottom (70 points from bottom, moved up 20px)
      const fontSize = 12;
      const textWidth = font.widthOfTextAtSize(duration, fontSize);
      const durationX = (pageWidth - textWidth) / 2; // Center horizontally
      
      firstPage.drawText(duration, {
        x: durationX,
        y: durationY,
        size: fontSize,
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

    // Create a safe filename without Hindi characters
    const safeName = (record.applicantName || record.formNumber || 'bond')
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    // Generate appropriate filename based on gender
    let fileName: string;
    if (gender === 'Female' || gender === 'महिला') {
      fileName = `GIRL_BOND_${safeName}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      fileName = `BOYS_BOND_${safeName}.pdf`;
    } else {
      fileName = `BOND_${safeName}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate bond PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
