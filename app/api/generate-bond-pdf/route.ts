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
    const { record, imageData, duration } = await request.json();

    console.log('Received record for bond PDF:', record);
    console.log('Image data received for bond:', !!imageData);

    // Determine template path (supporting unified approved Vivah Yojana bond template with fallbacks)
    const candidateTemplates = [
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'vivah_yojana_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'viva yojana bond(1).pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'girl_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'boys_bond.pdf'),
    ];
    
    const templatePath = candidateTemplates.find((p) => fs.existsSync(p));

    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`Bond template not found in candidates: ${candidateTemplates.join(', ')}`);
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
        if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageData.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
        }

        if (image) {
          // Precise passport photo box dimensions for approved Vivah Yojana bond template (504 x 324 pt canvas)
          const imageX = 405;
          const imageY = 146;
          const imageWidth = 74;
          const imageHeight = 84;

          // Draw the image on the PDF (converted to bottom-left coordinate system)
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight,
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully in bond PDF');
        }
      } catch (imageError) {
        console.error('Error embedding image in bond PDF:', imageError);
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
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: false });
    } else {
      const containsHindi = Object.values(record ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Helper for drawing text at top-left coordinates
    const drawTextAt = (text: string | number | undefined | null, x: number, topY: number, size = 10, color = rgb(0.1, 0.1, 0.1)) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      firstPage.drawText(String(text).trim(), {
        x,
        y: pageHeight - topY,
        size,
        font,
        color,
      });
    };

    // 1. सदस्यता क्र. (Membership Number Box)
    const membershipNo = record?.membershipNumber || record?.formNumber || record?.सदस्यता_क्रमांक || '';
    drawTextAt(membershipNo, 80, 126, 11, rgb(0, 0.15, 0.6));

    // 2. आवेदन क्र. (Application Number Box)
    const applicationNo = record?.applicationNumber || record?.formNumber || record?.application_no || '';
    drawTextAt(applicationNo, 388, 126, 11, rgb(0, 0.15, 0.6));

    // 3. श्रीमान् (Applicant Name)
    const applicantName = record?.applicantName || record?.name || record?.आवेदक_का_नाम || '';
    drawTextAt(applicantName, 55, 172, 10);

    // 4. पिता का नाम (Father's Name)
    const fatherName = record?.fatherName || record?.father_husband_name || record?.पिता_का_नाम || '';
    drawTextAt(fatherName, 230, 172, 10);

    // 5. उम्र (Age)
    const ageVal = record?.age || record?.उम्र || '';
    const ageStr = ageVal ? (String(ageVal).includes('वर्ष') ? String(ageVal) : `${ageVal} वर्ष`) : '';
    drawTextAt(ageStr, 348, 172, 9.5);

    // 6. गोत्र (Gotra)
    const gotra = record?.gotra || record?.गोत्र || '';
    drawTextAt(gotra, 46, 197, 10);

    // 7. निवासी (Residence / Full Address)
    const rawAddress = record?.address || record?.full_address || record?.पता || '';
    const tehsil = record?.tehsil || record?.तहसील || '';
    const district = record?.district || record?.जिला || '';
    const fullAddress = [rawAddress, tehsil, district].filter(Boolean).join(', ') || rawAddress;
    drawTextAt(fullAddress, 208, 197, 9.5);

    // 8. Duration / Maturity ("आपको विवाह योजना का लाभ ... के बाद मिलेगा ।")
    let durationText = duration || record?.duration || record?.durationText || 'बारह महीने';
    if (durationText === 'अठारह महीने' || durationText === '18 महीने' || !durationText) {
      durationText = 'बारह महीने';
    }
    drawTextAt(durationText, 200, 245, 10, rgb(0.6, 0.1, 0.1));

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Create a safe filename without Hindi characters
    const safeName = (record?.applicantName || record?.formNumber || 'bond')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    
    // Generate appropriate filename based on gender
    const gender = record?.gender || record?.लिंग;
    let fileName: string;
    if (gender === 'Female' || gender === 'महिला') {
      fileName = `GIRL_BOND_${safeName}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      fileName = `BOYS_BOND_${safeName}.pdf`;
    } else {
      fileName = `VIVAH_YOJANA_BOND_${safeName}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error generating bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate bond PDF',
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
