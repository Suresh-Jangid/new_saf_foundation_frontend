import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
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

    console.log('Received pension yojana data:', data);
    console.log('Image data received:', !!imageData);
    if (imageData) {
      console.log('Image data type:', typeof imageData);
      console.log('Image data starts with:', imageData.substring(0, 50));
      console.log('Image data length:', imageData.length);
    }

    // Use the pension yojana template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'salakar_pension', 'salakar_pension_yojana.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Pension yojana template PDF not found: ${templatePath}`);
    }

    console.log('Using pension yojana template:', templatePath);

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
    if (imageData && typeof imageData === 'string' && imageData.trim().length > 0) {
      console.log('Processing image data...');
      console.log('Image data type:', typeof imageData);
      console.log('Image data length:', imageData.length);
      
      try {
        let imageBytes: Uint8Array;
        let imageFormat: string;
        
        // Check if it's a base64 data URL or a regular URL
        if (imageData.startsWith('data:image/')) {
          // Handle base64 data URL
          console.log('Processing base64 image data...');
          
          // Helper function to decode base64 in Node.js environment
          const base64ToUint8Array = (base64String: string): Uint8Array => {
            try {
              // Remove data URL prefix if present
              const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
              
              // Convert base64 to Uint8Array directly using Buffer
              return new Uint8Array(Buffer.from(base64Data, 'base64'));
            } catch (error) {
              console.error('Error decoding base64:', error);
              throw new Error('Invalid base64 image data');
            }
          };

          imageBytes = base64ToUint8Array(imageData);
          imageFormat = imageData.split(';')[0];
          console.log('Base64 image bytes length:', imageBytes.length);
        } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
          // Handle regular URL
          console.log('Processing image from URL:', imageData);
          
          try {
            const response = await fetch(imageData);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            imageBytes = new Uint8Array(arrayBuffer);
            
            // Determine format from content-type header or URL extension
            const contentType = response.headers.get('content-type');
            if (contentType) {
              imageFormat = contentType;
            } else {
              // Fallback to URL extension
              const url = new URL(imageData);
              const pathname = url.pathname.toLowerCase();
              if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
                imageFormat = 'image/jpeg';
              } else if (pathname.endsWith('.png')) {
                imageFormat = 'image/png';
              } else {
                imageFormat = 'image/jpeg'; // Default assumption
              }
            }
            
            console.log('URL image bytes length:', imageBytes.length);
            console.log('Detected format:', imageFormat);
          } catch (fetchError) {
            console.error('Error fetching image from URL:', fetchError);
            throw fetchError;
          }
        } else {
          console.warn('Invalid image data format. Expected data:image/... or http(s)://... but got:', imageData.substring(0, 50));
          console.log('Skipping image embedding due to invalid format');
          return;
        }
        
        // Determine image type and embed accordingly
        let image;
        console.log('Image format detection:', {
          fullFormat: imageFormat,
          isJPEG: imageFormat.includes('jpeg') || imageFormat.includes('jpg'),
          isPNG: imageFormat.includes('png'),
          dataLength: imageBytes.length
        });
        
        if (imageFormat.includes('jpeg') || imageFormat.includes('jpg')) {
          console.log('Embedding JPEG image...');
          try {
            image = await pdfDoc.embedJpg(imageBytes);
            console.log('JPEG image embedded successfully');
          } catch (jpgError) {
            console.error('Error embedding JPEG:', jpgError);
            throw jpgError;
          }
        } else if (imageFormat.includes('png')) {
          console.log('Embedding PNG image...');
          try {
            image = await pdfDoc.embedPng(imageBytes);
            console.log('PNG image embedded successfully');
          } catch (pngError) {
            console.error('Error embedding PNG:', pngError);
            throw pngError;
          }
        } else {
          console.warn('Unsupported image format, skipping image embedding');
          console.log('Supported formats: image/jpeg, image/jpg, image/png');
          console.log('Received format:', imageFormat);
        }

        if (image) {
          console.log('Image embedded successfully, drawing to PDF...');
          // Calculate image position and size for passport photo
          // Adjust these coordinates based on your form layout
          const imageX = 484; // X position for photo
          const imageY = 280; // Y position for photo
          const imageWidth = 85; // Width of the photo
          const imageHeight = 107; // Height of the photo

          console.log('Image coordinates:', { imageX, imageY, imageWidth, imageHeight });
          console.log('Page dimensions:', { pageWidth, pageHeight });

          // Draw the image on the PDF
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight, // Convert to bottom-left coordinate system
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image drawn successfully');
        } else {
          console.log('No image object created, skipping drawing');
        }
      } catch (imageError) {
        console.error('Error embedding image:', imageError);
        console.error('Image error details:', imageError);
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

    // Base field mappings for pension yojana form
    // These coordinates need to be adjusted based on the actual PDF template
    // A4 size is approximately 595 x 842 points
    const baseFieldMappings: { field: keyof typeof data; x: number; y: number }[] = [
      // Header section
      { field: 'date' as any, x: 80, y: 210 }, // Application date

      // Main form section - Adjusted based on form structure
      { field: 'name' as any, x: 90, y: 290 },    // Applicant name
      { field: 'fatherName' as any, x: 290, y: 290 },      // Father's name
      { field: 'gotra' as any, x: 80, y: 320 },            // Gotra
      { field: 'age' as any, x: 250, y: 320 },             // Age
      { field: 'village' as any, x: 345, y: 320 },          // Village
      
      // Address section
      { field: 'tehsil' as any, x: 110, y: 360 },          // Tehsil
      { field: 'district' as any, x: 110, y: 390 },        // District
      { field: 'mobile' as any, x: 320, y: 390 },          // Mobile number
      
    //   // Bank details section
    //   { field: 'bankName' as any, x: 80, y: 460 },         // Bank name
    //   { field: 'accountNumber' as any, x: 210, y: 460 },   // Account number
    //   { field: 'ifscCode' as any, x: 350, y: 460 },        // IFSC code
      { field: 'monthlyPension' as any, x: 305, y: 560 },   // Monthly pension
    ];

    // Target anchors for the actual A4 form layout
    const anchorTargetFor: Record<string, { x: number; y: number }> = {
      'date': { x: 80, y: 210 },
      'name': { x: 90, y: 290 },
    };

    // Compute affine transform (scale + translate) using the two anchors (assume no rotation)
    const anchorBase1 = baseFieldMappings.find((f) => f.field === ('date' as any))!;
    const anchorBase2 = baseFieldMappings.find((f) => f.field === ('name' as any))!;
    const anchorNew1 = anchorTargetFor['date'];
    const anchorNew2 = anchorTargetFor['name'];

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
      date: formatDateToDDMMYYYY(data?.date || data?.तिथि),
      name: data?.name || data?.नाम || '',
      fatherName: data?.fatherName || data?.पिता_का_नाम || '',
      gotra: data?.gotra || data?.गोत्र || '',
      age: data?.age || data?.आयु || '',
      mobile: data?.mobile || data?.मोबाइल || '',
      village: data?.village || data?.गाँव || '',
      tehsil: data?.tehsil || data?.तहसील || '',
      district: data?.district || data?.जिला || '',
      bankName: data?.bankName || data?.बैंक_का_नाम || '',
      accountNumber: data?.accountNumber || data?.खाता_संख्या || '',
      ifscCode: data?.ifscCode || data?.IFSC_कोड || '',
      monthlyPension: data?.monthlyPension || data?.मासिक_पेंशन || '',
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
    const applicantName = data?.name || data?.नाम || 'filled';
    const safeName = applicantName
      .replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_')
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const filename = `pension_yojana_${safeName}.pdf`;

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
    console.error('Error generating pension yojana PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate pension yojana PDF',
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
