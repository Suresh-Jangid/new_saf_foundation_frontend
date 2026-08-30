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

    console.log('Received sewing machine camp data:', data);
    console.log('Image data received:', !!imageData);
    console.log('Passport photo URL:', data?.passportPhoto);

    // Use the sewing machine camp template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'sweing_machine_camp', 'sweing_machine_camp_form.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Sewing machine camp template PDF not found: ${templatePath}`);
    }

    console.log('Using sewing machine camp template:', templatePath);

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

    // Handle image embedding if imageData is provided or passportPhoto URL is in data
    const imageToEmbed = imageData || data?.passportPhoto;
    if (imageToEmbed) {
      try {
        let imageBytes: Uint8Array;
        let imageType: string;

        if (imageData && imageData.startsWith('data:')) {
          // Handle base64 image data
          imageBytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
          imageType = imageData.split(';')[0].split(':')[1];
        } else if (data?.passportPhoto) {
          // Handle URL image
          console.log('Fetching image from URL:', data.passportPhoto);
          const response = await fetch(data.passportPhoto);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBytes = new Uint8Array(arrayBuffer);
          
          // Determine image type from content-type header or URL extension
          const contentType = response.headers.get('content-type');
          if (contentType) {
            imageType = contentType;
          } else {
            const url = data.passportPhoto.toLowerCase();
            if (url.includes('.jpg') || url.includes('.jpeg')) {
              imageType = 'image/jpeg';
            } else if (url.includes('.png')) {
              imageType = 'image/png';
            } else {
              imageType = 'image/jpeg'; // Default assumption
            }
          }
        } else {
          throw new Error('No valid image data provided');
        }
        
        // Determine image type and embed accordingly
        let image;
        if (imageType.includes('jpeg') || imageType.includes('jpg')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageType.includes('png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
          return;
        }

        if (image) {
          // Calculate image position and size for passport photo
          // Adjust these coordinates based on your form layout
          const imageX = 477; // X position for photo
          const imageY = 347; // Y position for photo
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

    // Base field mappings for sewing machine camp form
    // These coordinates need to be adjusted based on the actual PDF template
    // A4 size is approximately 595 x 842 points
    const baseFieldMappings: { field: keyof typeof data; x: number; y: number }[] = [
      // Header section
      { field: 'formNumber' as any, x: 110, y: 235 },   // Form number (top left box)
      { field: 'applicationDate' as any, x: 450, y: 235 }, // Application date

      // Main form section - Adjusted based on form structure
      { field: 'applicantName' as any, x: 90, y: 348 },    // Applicant name
      { field: 'fatherName' as any, x: 305, y: 348 },      // Father's name
      { field: 'motherName' as any, x: 110, y: 382},      // Mother's name
      { field: 'dateOfBirth' as any, x: 350, y: 382 },     // Date of birth
      { field: 'gotra' as any, x: 80, y: 422 },            // Gotra
      { field: 'age' as any, x: 270, y: 425 },             // Age
      { field: 'mobile' as any, x: 360, y: 425 },          // Mobile number
      { field: 'aadharNumber' as any, x: 90, y: 460 },     // Aadhaar number
      
      // Address section
      { field: 'address' as any, x: 80, y: 500 },          // Address
      { field: 'pinCode' as any, x: 80, y: 545 },          // PIN
      { field: 'tehsil' as any, x: 210, y: 545 },          // Tehsil
      { field: 'district' as any, x: 350, y: 545 },        // District
      { field: 'state' as any, x: 470, y: 545 },           // State
    ];

    // Target anchors for the actual A4 form layout
    const anchorTargetFor: Record<string, { x: number; y: number }> = {
      'formNumber': { x: 110, y: 235 },
      'applicationDate': { x: 450, y: 235 },
    };

    // Compute affine transform (scale + translate) using the two anchors (assume no rotation)
    const anchorBase1 = baseFieldMappings.find((f) => f.field === ('formNumber' as any))!;
    const anchorBase2 = baseFieldMappings.find((f) => f.field === ('applicationDate' as any))!;
    const anchorNew1 = anchorTargetFor['formNumber'];
    const anchorNew2 = anchorTargetFor['applicationDate'];

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

    // Prepare data for PDF
    const pdfData = {
      formNumber: data?.formNumber || data?.फॉर्म_नंबर || '',
      applicationDate: formatDateToDDMMYYYY(data?.applicationDate || data?.आवेदन_तिथि),
      applicantName: data?.applicantName || data?.आवेदक_का_नाम || '',
      fatherName: data?.fatherName || data?.पिता_का_नाम || '',
      motherName: data?.motherName || data?.माता_का_नाम || '',
      dateOfBirth: formatDateToDDMMYYYY(data?.dateOfBirth || data?.जन्म_तिथि),
      gotra: data?.gotra || data?.गोत्र || '',
      age: data?.age || data?.आयु || '',
      mobile: data?.mobile || data?.मोबाइल || '',
      aadharNumber: data?.aadharNumber || data?.आधार_नंबर || '',
      address: data?.address || data?.पता || '',
      pinCode: data?.pinCode || data?.पिन_कोड || '',
      tehsil: data?.tehsil || data?.तहसील || '',
      district: data?.district || data?.जिला || '',
      state: data?.state || data?.राज्य || '',
    };

    // Treat mapping coordinates as absolute positions; request offsets allow quick nudging
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    for (const mapping of fieldMappings) {
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
    const formNumber = data?.formNumber || data?.फॉर्म_नंबर || 'filled';
    const filename = `sewing_machine_camp_${formNumber}.pdf`;

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating sewing machine camp PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate sewing machine camp PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
