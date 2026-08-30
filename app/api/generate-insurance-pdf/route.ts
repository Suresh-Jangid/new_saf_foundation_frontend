import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { data, debug, offsetX, offsetY, coordSystem, valueOffsetX: reqValueOffsetX, valueOffsetY: reqValueOffsetY, baseWidth, baseHeight, imageData } = await request.json();

    console.log('Received insurance application data:', data);
    console.log('Image data received:', !!imageData);

    // Determine template path based on gender
    const gender = data?.gender || data?.लिंग;
    console.log('Gender detected:', gender);
    
    let templatePath: string;
    if (gender === 'Female' || gender === 'महिला') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'female_suraksha_bima_application_form.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'male_suraksha_bima_application_form.pdf');
    } else {
      // Default to Male template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'male_suraksha_bima_application_form.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Insurance template PDF not found: ${templatePath}`);
    }

    console.log('Using insurance template:', templatePath);

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
          // Adjust these coordinates based on your insurance form layout
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

    // Transform and prepare data for PDF
    const pdfData = {
      ...data,
      // Map computed age to age field
      age: data.computedAge || data.age,
      // Map category and fee
      category: data.category,
      fee: data.fee,
      // Map oath section fields
      शपथ_नाम: data.applicantName,
      शपथ_पिता_का_नाम: data.gender === 'Female' ? data.wifeName : data.fatherName,
      उम्र: data.computedAge || data.age,
      शपथ_गोत्र: data.gotra,
      शपथ_पता: data.address,
      // Add payment details
      paymentAmount: data.paymentAmount,
      paymentMode: data.paymentMode,
      paymentDate: formatDateToDDMMYYYY(data.paymentDate),
      totalAmount: data.fee,
      pendingAmount: data.pendingAmount,
      // Format date fields
      applicationDate: formatDateToDDMMYYYY(data.applicationDate),
      dateOfBirth: formatDateToDDMMYYYY(data.dateOfBirth)
    };

    // Field mappings for insurance application form - using same coordinates as fill-pdf-form
    const baseFieldMappings: { field: keyof typeof pdfData; x: number; y: number }[] = [
      // Header section      
      { field: 'formNumber' as any, x: 80, y: 185 },   // Membership number (top left box)
      { field: 'applicationDate' as any, x: 490, y: 185 },    // Application date (top right box)

      // Main form section - Using same coordinates as general application
      { field: 'applicantName' as any, x: 90, y: 240 },   // Applicant name
      { field: 'fatherName' as any, x: 315, y: 240 },    // Father's name
      { field: 'wifeName' as any, x: 315, y: 240 },    // Wife's name (for Female applicants)
      { field: 'motherName' as any, x: 110, y: 270 },     // Mother's name
      { field: 'dateOfBirth' as any, x: 320, y: 270 },       // Date of birth
      { field: 'gotra' as any, x: 80, y: 295},           // Gotra
      { field: 'age' as any, x: 240, y: 295 },            // Age
      { field: 'mobile' as any, x: 360, y: 295 },          // Mobile number
      { field: 'aadharNumber' as any, x: 90, y: 330 },     // Aadhaar number
      
      // Address section
      { field: 'address' as any, x: 80, y: 355 },             // Address
      { field: 'pinCode' as any, x: 80, y: 385 },             // PIN
      { field: 'tehsil' as any, x: 210, y: 385 },           // Tehsil
      { field: 'district' as any, x: 350, y: 385 },            // District
      { field: 'state' as any, x: 470, y: 385 },           // State
      
      // Nominee section
      { field: 'nomineeName' as any, x: 120, y: 415 },   // Nominee name
      { field: 'nomineeRelation' as any, x: 390, y: 415 },    // Relationship with nominee
      
      // Worker section
      { field: 'workerName' as any, x: 130, y: 445 }, // Worker name
      { field: 'workerMobile' as any, x: 340, y: 445 }, // Worker mobile
      
  
      
     // Oath section fields (शपथ पत्र)
     { field: 'शपथ_नाम' as any, x: 90, y: 630},         // Name in oath section
     { field: 'शपथ_पिता_का_नाम' as any, x: 305, y: 630 },    // Father name in oath
     { field: 'उम्र' as any, x: 495, y: 630 },
     { field: 'शपथ_गोत्र' as any, x: 60 , y: 655 },       // Gotra in oath
     { field: 'शपथ_पता' as any, x: 220, y: 655 },
    ];

    // Target anchors for the actual A4 form layout - using same as fill-pdf-form
    const anchorTargetFor: Record<string, { x: number; y: number }> = {
      'formNumber': { x: 80, y: 185 },
      'applicationDate': { x: 490, y: 185 },
    };

    // Compute affine transform using the two anchors
    const anchorBase1 = baseFieldMappings.find((f) => f.field === 'formNumber')!;
    const anchorBase2 = baseFieldMappings.find((f) => f.field === 'applicationDate')!;
    const anchorNew1 = anchorTargetFor['formNumber'];
    const anchorNew2 = anchorTargetFor['applicationDate'];

    const denomX = anchorBase2.x - anchorBase1.x || 1;
    const sxAff = (anchorNew2.x - anchorNew1.x) / denomX;
    const txAff = anchorNew1.x - sxAff * anchorBase1.x;

    const syAff = 1;
    const tyAff = ((anchorNew1.y - anchorBase1.y) + (anchorNew2.y - anchorBase2.y)) / 2;

    // Build effective field mappings by transforming baseline coords
    const fieldMappings = baseFieldMappings.map((f) => ({
      field: f.field,
      x: sxAff * f.x + txAff,
      y: syAff * f.y + tyAff,
    }));

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
    const formNumber = data?.formNumber || 'filled';
    let filename = 'insurance_application_form.pdf';
    
    if (gender === 'Female' || gender === 'महिला') {
      filename = `female_suraksha_bima_application_${formNumber}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      filename = `male_suraksha_bima_application_${formNumber}.pdf`;
    } else {
      filename = `suraksha_bima_application_${formNumber}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating insurance PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insurance PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
