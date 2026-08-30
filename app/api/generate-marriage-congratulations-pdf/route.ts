import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const {
      data,
      debug,
      offsetX,
      offsetY,
      coordSystem,        // 'bottom-left' | 'top-left'
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      baseWidth,
      baseHeight,
      imageData,
    } = await request.json();

    console.log('Received marriage congratulations data:', data);
    console.log('Image data received:', !!imageData);

    // Determine template path based on gender
    const gender = data?.gender || data?.लिंग;
    console.log('Gender detected:', gender);
    
    let templatePath: string;
    if (gender === 'Female' || gender === 'महिला' || gender == "female") {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'girl_marriage_payment_form.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष' || gender == "male") {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'boys_marriage_payment_form.pdf');
    } else {
      // Default to Female template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'girl_marriage_payment_form.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Marriage congratulations template PDF not found: ${templatePath}`);
    }

    console.log('Using marriage congratulations template:', templatePath);

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
          // Calculate image position and size for passport photo
          // Adjust these coordinates based on your form layout
          const imageX = 480; // X position for photo
          const imageY = 210; // Y position for photo
          const imageWidth = 80; // Width of the photo
          const imageHeight = 100; // Height of the photo

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
      font = await pdfDoc.embedFont('Helvetica');
    }

    // Base field mappings for marriage congratulations form
    // These coordinates need to be adjusted based on the actual PDF template
    // A4 size is approximately 595 x 842 points
    const baseFieldMappings: { field: keyof typeof data; x: number; y: number }[] = [
      { field: 'date' as any, x: 85, y: 205 },
      { field: 'codeNumber' as any, x: 500, y: 205 },
      { field: 'marriageNumber' as any, x: 500, y: 230 },
      { field: 'applicantName' as any, x: 80, y: 280},
     
      { field: 'fatherName' as any, x: 300, y: 280 },
      { field: 'wifeOf' as any, x: 300, y: 280 },
      { field: 'gotra' as any, x: 460, y: 280 },
      { field: 'address' as any, x: 100, y: 310 },
      { field: 'membershipJoinDate' as any, x: 320, y: 345 },
      { field: 'associatedUntil' as any, x: 320, y: 375 },
      { field: 'permanentFee' as any, x: 320, y: 400 },
      { field: 'installmentAmount' as any, x: 320, y: 430 },
      { field: 'totalGrantAmount' as any, x: 320, y: 460},
      { field: 'totalMembersServing' as any, x: 320, y: 485 },
      { field: 'rate100' as any, x: 270, y: 545 },
      { field: 'rate200' as any, x: 270, y: 562 },
      { field: 'rate300' as any, x: 270, y: 580 },

      {field : 'multipliedRate100' as any, x: 370, y: 545},
      {field : 'multipliedRate200' as any, x: 370, y: 562},
      {field : 'multipliedRate300' as any, x: 370, y: 580},
      {field : 'totalMultipliedRate' as any, x: 330, y: 605},
          
      { field: 'deductedAmount' as any, x: 290, y: 645 },
      { field: 'totalPaidAmount' as any, x: 290, y: 665 },
    ];

    // Target anchors for the actual A4 form layout
    const anchorTargetFor: Record<string, { x: number; y: number }> = {
      'date': { x: 85, y: 205},
      'codeNumber': { x: 500, y: 205 },
    };

    // Compute affine transform (scale + translate) using the two anchors (assume no rotation)
    const anchorBase1 = baseFieldMappings.find((f) => f.field === ('date' as any))!;
    const anchorBase2 = baseFieldMappings.find((f) => f.field === ('codeNumber' as any))!;
    const anchorNew1 = anchorTargetFor['date'];
    const anchorNew2 = anchorTargetFor['codeNumber'];

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

    console.log("data in the pdf", data)
    // Prepare data for PDF
    const pdfData = {
      date: formatDateToDDMMYYYY(data?.date || data?.दिनांक),
      codeNumber: data?.codeNumber || data?.कोड_नंबर || '',
      marriageNumber: data?.marriageNumber || data?.विवाह_संख्या || '',
      applicantName: data?.applicantName || data?.आवेदक_का_नाम || '',
      gender: data?.gender || data?.लिंग || '',
      fatherName: data?.fatherName || data?.पिता_का_नाम || '',
      wifeOf: data?.wifeOf || data?.पति_का_नाम || '',
      gotra: data?.gotra || data?.गोत्र || '',
      address: data?.address || data?.निवासी || '',
      membershipJoinDate: formatDateToDDMMYYYY(data?.membershipJoinDate || data?.सदस्यता_तिथि),
      associatedUntil: data?.associatedUntil || data?.संस्था_से_जुड़ी_रही || '',
      permanentFee: data?.permanentFee || data?.स्थायी_शुल्क || '',
      installmentAmount: data?.installmentAmount || data?.किस्त_राशि || '',
      totalGrantAmount: data?.totalGrantAmount || data?.कुल_अनुदान || '',
      totalMembersServing: data?.totalMembersServing || data?.कुल_सदस्य || '',
      rate100: data?.rate100 || data?.rate_100 || '',
      rate200: data?.rate200 || data?.rate_200 || '',
      rate300: data?.rate300 || data?.rate_300 || '',
      multipliedRate100: (data?.rate100 || data?.rate_100 || 0) * 100,
      multipliedRate200: (data?.rate200 || data?.rate_200 || 0) * 200,
      multipliedRate300: (data?.rate300 || data?.rate_300 || 0) * 300,
      totalMultipliedRate: (data?.rate100 || data?.rate_100 || 0) * 100 + (data?.rate200 || data?.rate_200 || 0) * 200 + (data?.rate300 || data?.rate_300 || 0) * 300,
      deductionPercent: data?.deductionPercent || data?.कटौती_प्रतिशत || '',
      deductedAmount: data?.deductedAmount || data?.कटौती_राशि || '',
      totalPaidAmount: data?.totalPaidAmount || data?.कुल_भुगतान || '',
    };

    // Treat mapping coordinates as absolute positions; request offsets allow quick nudging
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    
    // Determine gender for conditional field rendering (gender already extracted above)
    const isMale = gender === 'Male' || gender === 'पुरुष' || gender === 'male';
    const isFemale = gender === 'Female' || gender === 'महिला' || gender === 'female';
    
    for (const mapping of fieldMappings) {
      // Skip wifeOf if gender is Male, skip fatherName if gender is Female
      if (mapping.field === 'wifeOf' && isMale) continue;
      if (mapping.field === 'fatherName' && isFemale) continue;
      
      const value = (pdfData as any)[mapping.field];
      if (!value) continue;
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
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Generate filename
    const marriageNumber = data?.marriageNumber || data?.विवाह_संख्या || 'filled';
    let filename = 'marriage_congratulations_form.pdf';
    
    if (gender === 'Female' || gender === 'महिला') {
      filename = `girl_marriage_congratulations_${marriageNumber}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      filename = `boys_marriage_congratulations_${marriageNumber}.pdf`;
    } else {
      filename = `marriage_congratulations_${marriageNumber}.pdf`;
    }

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating marriage congratulations PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate marriage congratulations PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
