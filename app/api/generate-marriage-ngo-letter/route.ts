import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    console.log('Received data for marriage NGO letter:', data);

    // Determine template path based on gender
    let templatePath: string;
    const gender = data?.gender;
    console.log('Gender detected for NGO letter:', gender);
    
    if (gender === 'Female' || gender === 'महिला') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'ngo_letter', 'girl_marriage_ngo.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'ngo_letter', 'boys_marriage_ngo.pdf');
    } else {
      // Default to girl NGO letter template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'ngo_letter', 'girl_marriage_ngo.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Marriage NGO letter template not found: ${templatePath}`);
    }

    console.log('Using marriage NGO letter template:', templatePath);

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
    if (fontkitAvailable) {
      try {
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
        if (fs.existsSync(fontPath)) {
          const fontBytes = fs.readFileSync(fontPath);
          font = await pdfDoc.embedFont(fontBytes);
        } else {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
      } catch {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Field mappings for marriage NGO letter
    // A4 size: 595.28 x 841.89 points (72 DPI)
    // Using proper A4 coordinates for better positioning
    const fieldMappings = [
      { field: 'date', x: 90, y: 240, label: 'दिनांक:' },
      { field: 'marriageNumber', x: 425, y: 240, label: 'विवाह संख्या:' },
      { field: 'applicantName', x: 120, y: 340, label: 'आवेदक का नाम:' },
     { field: 'parentName', x: 238, y: 365, label: 'पिता/पति का नाम:' },
    { field: 'totalPaidAmount', x: 130, y: 570, label: 'कुल भुगतान:' },
    ];

    // Prepare data for PDF
    const genderValue = data?.gender || data?.लिंग || '';
    const isMale = genderValue === 'Male' || genderValue === 'male' || genderValue === 'पुरुष';
    const isFemale = genderValue === 'Female' || genderValue === 'female' || genderValue === 'महिला';
    
    // Extract parent name based on gender
    let parentName = '';
    if (isMale) {
      parentName = data?.fatherName || data?.पिता_का_नाम || '';
      console.log('Male detected - fatherName:', parentName, 'from:', { fatherName: data?.fatherName, पिता_का_नाम: data?.पिता_का_नाम });
    } else if (isFemale) {
      parentName = data?.wifeOf || data?.पति_का_नाम || '';
      console.log('Female detected - wifeOf:', parentName, 'from:', { wifeOf: data?.wifeOf, पति_का_नाम: data?.पति_का_नाम });
    } else {
      // Fallback: try both fields
      parentName = data?.fatherName || data?.पिता_का_नाम || data?.wifeOf || data?.पति_का_नाम || '';
      console.log('Gender not detected - trying both fields, parentName:', parentName);
    }

    const pdfData = {
      date: formatDateToDDMMYYYY(data?.date || data?.दिनांक),
      applicantName: data?.applicantName || data?.आवेदक_का_नाम || '',
      gender: genderValue,
      parentName: parentName,
      gotra: data?.gotra || data?.गोत्र || '',
      address: data?.address || data?.निवासी || '',
      marriageNumber: data?.marriageNumber || data?.विवाह_संख्या || '',
      totalPaidAmount: data?.totalPaidAmount || data?.कुल_भुगतान || '',
    };

    console.log('Final pdfData for PDF generation:', {
      date: pdfData.date,
      applicantName: pdfData.applicantName,
      gender: pdfData.gender,
      parentName: pdfData.parentName,
      marriageNumber: pdfData.marriageNumber,
      totalPaidAmount: pdfData.totalPaidAmount,
    });

    // Fill in the form fields
    for (const mapping of fieldMappings) {
      const value = (pdfData as any)[mapping.field];
      console.log(`Field ${mapping.field} (${mapping.label}):`, value, typeof value);
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.log(`Skipping ${mapping.field} - empty value`);
        continue;
      }
      
      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert to bottom-left coordinate system
      
      console.log(`Drawing ${mapping.field} at (${drawX}, ${drawY}):`, value);
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

    // Generate filename
    const marriageNumber = data?.marriageNumber || data?.विवाह_संख्या || 'filled';
    let filename = 'marriage_ngo_letter.pdf';
    
    if (gender === 'Female' || gender === 'महिला') {
      filename = `girl_marriage_ngo_letter_${marriageNumber}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      filename = `boys_marriage_ngo_letter_${marriageNumber}.pdf`;
    } else {
      filename = `marriage_ngo_letter_${marriageNumber}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating marriage NGO letter PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate marriage NGO letter PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
