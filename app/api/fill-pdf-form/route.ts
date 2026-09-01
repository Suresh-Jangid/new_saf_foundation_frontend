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
      imageData, // Add image data parameter
    } = await request.json();

    console.log('Received data:', data);
    console.log('Type:', type);
    console.log('Image data received:', !!imageData);

    // Determine template path based on type
    let templatePath: string;
    
    if (type === 'general-application') {
      // Use the newly approved unified General Application form template
      const candidateTemplates = [
        path.join(process.cwd(), 'public', 'pdf', 'general_application', 'general_application_form.pdf'),
        path.join(process.cwd(), 'public', 'pdf', 'general_application', '3 (general form).pdf'),
      ];
      templatePath = candidateTemplates.find((p) => fs.existsSync(p)) || '';
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
        if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageData.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
        }

        if (image) {
          // Precise passport photo box dimensions for approved template
          const imageX = type === 'general-application' ? 460 : 480;
          const imageY = type === 'general-application' ? 218 : 210;
          const imageWidth = type === 'general-application' ? 92 : 80;
          const imageHeight = type === 'general-application' ? 120 : 95;

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
    // Default to top-left which matches visual layout measurement
    const coordinateSystem: 'bottom-left' | 'top-left' =
      coordSystem === 'bottom-left' ? 'bottom-left' : 'top-left';

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

    // Define field mappings according to template type
    type FieldDef = {
      field: string;
      valueKeys: string[];
      x: number;
      y: number;
      size?: number;
      color?: { r: number; g: number; b: number };
      isDate?: boolean;
      formatAmount?: boolean;
    };

    let fieldDefinitions: FieldDef[] = [];

    if (type === 'general-application') {
      // Approved single-page template with 2 distinct sections
      fieldDefinitions = [
        // ==========================================
        // SECTION 1: "आवेदन–फॉर्म" (Top Section)
        // ==========================================
        { field: 'क्रमांक', valueKeys: ['सदस्यता_क्रमांक', 'formNumber', 'applicationNumber', 'application_no'], x: 135, y: 191, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'दिनांक', valueKeys: ['आवेदन_दिनांक', 'applicationDate', 'date', 'created_at'], x: 465, y: 191, size: 9.5, isDate: true },
        { field: 'नाम', valueKeys: ['आवेदक_का_नाम', 'applicantName', 'name', 'shapath_name', 'शपथ_नाम'], x: 75, y: 222, size: 10 },
        { field: 'पिता_का_नाम', valueKeys: ['पिता_का_नाम', 'fatherName', 'father_husband_name', 'शपथ_पिता_का_नाम'], x: 140, y: 248, size: 10 },
        { field: 'जन्म_दिनांक', valueKeys: ['जन्म_तिथि', 'dateOfBirth', 'dob'], x: 110, y: 274, size: 9.5, isDate: true },
        { field: 'लिंग', valueKeys: ['gender', 'लिंग'], x: 220, y: 274, size: 9.5 },
        { field: 'शिक्षा', valueKeys: ['education', 'शिक्षा', 'qualification'], x: 330, y: 274, size: 9.5 },
        { field: 'आधार_संख्या', valueKeys: ['आधार_संख्या', 'aadharNumber', 'aadhar_no', 'aadhaar'], x: 155, y: 301, size: 10 },
        { field: 'पता', valueKeys: ['पता', 'address', 'full_address', 'शपथ_पता'], x: 75, y: 331, size: 9.5 },
        { field: 'जिला', valueKeys: ['जिला', 'district'], x: 75, y: 357, size: 9.5 },
        { field: 'राज्य', valueKeys: ['राज्य', 'state'], x: 215, y: 357, size: 9.5 },
        { field: 'मोबाइल', valueKeys: ['मोबाइल', 'mobile', 'phone'], x: 370, y: 357, size: 9.5 },
        { field: 'नामिनी_का_नाम', valueKeys: ['नामिनी_का_नाम', 'nomineeName', 'nominee_name'], x: 130, y: 384, size: 10 },
        { field: 'नामिनी_का_सम्बन्ध', valueKeys: ['नामिनी_का_सम्बन्ध', 'nomineeRelation', 'nominee_relation'], x: 380, y: 384, size: 10 },
        { field: 'नामिनी_का_आधार', valueKeys: ['नामिनी_का_आधार', 'nomineeAadhar', 'nominee_aadhar'], x: 150, y: 411, size: 9.5 },
        { field: 'नामिनी_का_मोबाइल', valueKeys: ['नामिनी_का_मोबाइल', 'nomineeMobile', 'nominee_mobile'], x: 305, y: 411, size: 9.5 },
        { field: 'कार्यकर्ता_कोड', valueKeys: ['कार्यकर्ता_कोड', 'workerCode', 'worker_code', 'कार्यकर्ता_का_नाम', 'added_name', 'workerName'], x: 485, y: 411, size: 9.5 },
        { field: 'राशि', valueKeys: ['राशि', 'amount', 'total_amount', 'fee'], x: 70, y: 439, size: 9.5, formatAmount: true },
        { field: 'भुगतान_विवरण', valueKeys: ['भुगतान_विवरण', 'paymentModeRef', 'paymentRef', 'payment_mode', 'utr_no', 'transaction_id'], x: 310, y: 439, size: 9.5 },
        { field: 'सीनियर_कोड', valueKeys: ['सीनियर_कोड', 'seniorCode', 'senior_code'], x: 485, y: 439, size: 9.5 },

        // ==========================================
        // SECTION 2: "सदस्यता फार्म रसीद" (Bottom Section)
        // ==========================================
        { field: 'रसीद_क्रमांक', valueKeys: ['सदस्यता_क्रमांक', 'formNumber', 'applicationNumber', 'application_no'], x: 135, y: 656, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'रसीद_दिनांक', valueKeys: ['आवेदन_दिनांक', 'applicationDate', 'date', 'created_at'], x: 485, y: 656, size: 9.5, isDate: true },
        { field: 'रसीद_नाम', valueKeys: ['आवेदक_का_नाम', 'applicantName', 'name', 'shapath_name', 'शपथ_नाम'], x: 75, y: 681, size: 10 },
        { field: 'रसीद_पिता_का_नाम', valueKeys: ['पिता_का_नाम', 'fatherName', 'father_husband_name', 'शपथ_पिता_का_नाम'], x: 335, y: 681, size: 10 },
        { field: 'रसीद_पता', valueKeys: ['पता', 'address', 'full_address', 'शपथ_पता'], x: 75, y: 706, size: 9.5 },
        { field: 'रसीद_मोबाइल', valueKeys: ['मोबाइल', 'mobile', 'phone'], x: 75, y: 731, size: 9.5 },
        { field: 'रसीद_भुगतान_विवरण', valueKeys: ['भुगतान_विवरण', 'paymentModeRef', 'paymentRef', 'payment_mode', 'utr_no', 'transaction_id'], x: 325, y: 731, size: 9.5 },
        { field: 'रसीद_राशि', valueKeys: ['राशि', 'amount', 'total_amount', 'fee'], x: 110, y: 756, size: 9.5, formatAmount: true },
        { field: 'रसीद_राशि_बॉक्स', valueKeys: ['राशि', 'amount', 'total_amount', 'fee'], x: 120, y: 788, size: 11, color: { r: 0, g: 0.15, b: 0.6 }, formatAmount: true },
      ];
    } else {
      // Legacy / fallback mappings
      fieldDefinitions = [
        { field: 'सदस्यता_क्रमांक', valueKeys: ['सदस्यता_क्रमांक'], x: 80, y: 185, size: 12 },
        { field: 'आवेदन_दिनांक', valueKeys: ['आवेदन_दिनांक'], x: 490, y: 185, size: 12, isDate: true },
        { field: 'आवेदक_का_नाम', valueKeys: ['आवेदक_का_नाम'], x: 90, y: 240, size: 12 },
        { field: 'पिता_का_नाम', valueKeys: ['पिता_का_नाम'], x: 315, y: 240, size: 12 },
        { field: 'माता_का_नाम', valueKeys: ['माता_का_नाम'], x: 120, y: 270, size: 12 },
        { field: 'जन्म_तिथि', valueKeys: ['जन्म_तिथि'], x: 325, y: 270, size: 12, isDate: true },
        { field: 'गोत्र', valueKeys: ['गोत्र'], x: 80, y: 300, size: 12 },
        { field: 'उम्र', valueKeys: ['उम्र'], x: 250, y: 300, size: 12 },
        { field: 'मोबाइल', valueKeys: ['मोबाइल'], x: 370, y: 300, size: 12 },
        { field: 'आधार_संख्या', valueKeys: ['आधार_संख्या'], x: 110, y: 330, size: 12 },
        { field: 'पता', valueKeys: ['पता'], x: 80, y: 360, size: 12 },
        { field: 'पिन', valueKeys: ['पिन'], x: 80, y: 385, size: 12 },
        { field: 'तहसील', valueKeys: ['तहसील'], x: 220, y: 385, size: 12 },
        { field: 'जिला', valueKeys: ['जिला'], x: 350, y: 385, size: 12 },
        { field: 'राज्य', valueKeys: ['राज्य'], x: 470, y: 385, size: 12 },
        { field: 'नामिनी_का_नाम', valueKeys: ['नामिनी_का_नाम'], x: 120, y: 415, size: 12 },
        { field: 'नामिनी_का_सम्बन्ध', valueKeys: ['नामिनी_का_सम्बन्ध'], x: 390, y: 415, size: 12 },
        { field: 'कार्यकर्ता_का_नाम', valueKeys: ['कार्यकर्ता_का_नाम'], x: 130, y: 450, size: 12 },
        { field: 'कार्यकर्ता_का_मोबाइल', valueKeys: ['कार्यकर्ता_का_मोबाइल'], x: 340, y: 450, size: 12 },
        { field: 'शपथ_नाम', valueKeys: ['शपथ_नाम'], x: 90, y: 630, size: 12 },
        { field: 'शपथ_पिता_का_नाम', valueKeys: ['शपथ_पिता_का_नाम'], x: 300, y: 630, size: 12 },
        { field: 'शपथ_गोत्र', valueKeys: ['शपथ_गोत्र'], x: 60, y: 660, size: 12 },
        { field: 'शपथ_पता', valueKeys: ['शपथ_पता'], x: 225, y: 660, size: 12 },
      ];
    }

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
    }

    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;

    for (const def of fieldDefinitions) {
      let val: any = undefined;
      for (const key of def.valueKeys) {
        if (data && data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') {
          val = data[key];
          break;
        }
      }

      if (val === undefined || val === null || String(val).trim() === '') {
        continue;
      }

      let textValue = String(val).trim();

      // Format date
      if (def.isDate) {
        textValue = formatDateToDDMMYYYY(textValue);
      }

      // Format amount
      if (def.formatAmount) {
        if (textValue && !textValue.endsWith('/-') && !isNaN(Number(textValue.replace(/,/g, '')))) {
          textValue = `${textValue}/-`;
        }
      }

      const baseX = def.x + valueOffsetX + globalOffsetX;
      const baseY = def.y + valueOffsetY + globalOffsetY;
      const drawX = baseX;
      const drawY = coordinateSystem === 'top-left' ? pageHeight - baseY : baseY;
      const fontSize = def.size || 9.5;
      const textColor = def.color
        ? rgb(def.color.r, def.color.g, def.color.b)
        : rgb(0.1, 0.1, 0.1);

      if (debugMode) {
        firstPage.drawRectangle({ x: drawX - 1, y: drawY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
      }

      firstPage.drawText(textValue, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: textColor,
      });
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
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