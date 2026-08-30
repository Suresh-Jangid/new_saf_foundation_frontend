import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

function numberToHindiWords(num: number): string {
  if (num === 0) return "शून्य";

  const ones = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छः", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह",
    "सत्रह", "अठारह", "उन्नीस"
  ];

  const tens = [
    "", "", "बीस", "तीस", "चालीस", "पचास",
    "साठ", "सत्तर", "अस्सी", "नब्बे"
  ];

  const scales = ["", "हज़ार", "लाख", "करोड़"];

  function chunkToWords(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " सौ ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  let scaleIndex = 0;

  // Split according to Indian numbering system (3,2,2...)
  const parts = [];
  parts.push(num % 1000); // first 3 digits
  num = Math.floor(num / 1000);

  while (num > 0) {
    parts.push(num % 100);
    num = Math.floor(num / 100);
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] > 0) {
      words += chunkToWords(parts[i]) + " " + scales[i] + " ";
    }
  }

  return words.trim();
}

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
      gender,
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

    // Validate input data
    if (!data) {
      throw new Error('No data provided for PDF generation');
    }

    console.log('Received bulk Suraksha Bima EMI data:', JSON.stringify(data, null, 2));
    console.log('Gender for PDF template:', gender);
    console.log('Image data received:', !!imageData);
    console.log('Available fields:', Object.keys(data || {}));

    // Determine template path based on gender
    // Try gender-specific templates first, fallback to the default template
    let templatePath: string;
    const baseDir = path.join(process.cwd(), 'public', 'pdf', 'bulk_suraksha_update');
    
    if (gender === 'Female' || gender === "female"  ||gender === 'महिला') {
      const femalePath = path.join(baseDir, 'female_emi_bulk.pdf');
      templatePath = fs.existsSync(femalePath) ? femalePath : path.join(baseDir, 'SURAKSHA_KIST_PAYMENT_RASHID.pdf');
    } else if (gender === 'Male' || gender ==="male"  || gender === 'पुरुष') {
      const malePath = path.join(baseDir, 'male_emi_bulk.pdf');
      templatePath = fs.existsSync(malePath) ? malePath : path.join(baseDir, 'SURAKSHA_KIST_PAYMENT_RASHID.pdf');
    } else {
      // Default to the existing template
      templatePath = path.join(baseDir, 'SURAKSHA_KIST_PAYMENT_RASHID.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Bulk Suraksha Bima EMI template PDF not found: ${templatePath}. Please ensure the template file exists.`);
    }

    console.log('Using bulk Suraksha Bima EMI template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Keep a reference to the original template bytes for copying pages later
    const originalTemplateBytes = existingPdfBytes;
    
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
    
    console.log(`PDF page size: ${pageWidth}x${pageHeight} points`);

    // Set up coordinate system and offsets
    const coordinateSystem = coordSystem || 'top-left';
    const globalOffsetX = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY = typeof offsetY === 'number' ? offsetY : 0;
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    const debugMode = debug === true;

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
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Fill in the PDF form fields based on the data
    const form = pdfDoc.getForm();
    
    try {
      // Fill form fields if they exist
      const fields = form.getFields();
      console.log('Available form fields:', fields.map(f => f.getName()));

      // Field mappings for user details
      const fieldMappings: Record<string, string> = {
        'userId': data.userId || '',
        'applicantName': data.applicantName || '',
        'fatherName': data.fatherName || '',
        'gotra': data.gotra || '',
        'address': data.address || '',
        'category': data.category || '',
        'gender': data.gender || '',
        'emiAmount': data.emiAmount?.toString() || '',
        'startDate': data.startDate || '',
        'endDate': data.endDate || '',
        'totalRecords': data.totalRecords?.toString() || '',
      };

      // Fill each field if it exists in the PDF
      Object.entries(fieldMappings).forEach(([key, value]) => {
        try {
          const field = form.getTextField(key);
          if (field) {
            field.setText(value);
            console.log(`Filled field ${key} with value: ${value}`);
          }
        } catch (error) {
          console.log(`Field ${key} not found in PDF template`);
        }
      });

    } catch (error) {
      console.log('Form field filling failed, continuing with text overlay:', error);
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

    // Define field mappings for bulk Suraksha Bima EMI form based on the actual PDF template
    const fieldMappings = [
      // Header fields - adjusted coordinates based on the PDF layout
      { field: 'serialNumber', x: 80, y: 225 }, // सिंहराशि field (left side)
      { field: 'bimaNumber', x: 115, y: 240 }, // क्रमांक field (after क्रमांक:)
      { field: 'todayDate', x: 450, y: 240 }, // दिनांक field (after दिनांक:)
      { field: 'applicantName', x: 80, y: 280 }, // पुत्री श्री field (after पुत्री श्री)
      { field: 'fatherName', x: 365, y: 280 }, // पिता का नाम field (after पिता का नाम)
      { field: 'gotra', x: 65, y: 320 }, // गोत्र field (after गोत्र)
      { field: 'address', x: 270, y: 320 }, // निवासी field (after निवासी)
      { field: 'emiAmount', x: 450, y: 320 }, // EMI amount field (after EMI amount)
      { field: 'amountInWords', x: 210, y: 746 }, // कुल भुगतान field (after कुल भुगतान)
      { field: 'totalEmiAmount', x: 70, y: 810 }, // कुल ईमी राशि field (after कुल ईमी राशि)
    ];

    // Get today's date
    const todayDate = formatDateToDDMMYYYY(new Date().toISOString());

    // Base PDF data (without totals - totals will be calculated per page)
    const basePdfData = {
      // serialNumber: data.serialNumber || data.क्रमांक || '10',
      bimaNumber: data.userId || '', 
      applicantName: data.applicantName || data.नाम || data.पुत्री_का_नाम || '',
      fatherName: data.fatherName || data.पिता_का_नाम || '',
      gotra: data.gotra || data.गोत्र || '',
      address: data.address || data.पता || data.निवासी || '',
      todayDate: todayDate,
      village: data.village || data.गाँव || '',
    };
    
    console.log('Base PDF data:', basePdfData);
    
    // Add text overlay for data display
    const fontSize = 11;
    const textColor = rgb(0, 0, 0);
    
    // Helper function to fill a page with Suraksha Bima records
    const fillPageWithBimaRecords = (page: any, bimas: any[], pageIndex: number) => {
      const tableStartY = 395; // Y position where table starts (adjusted)
      const rowHeight = 34; // Height of each table row (adjusted to match table)
      const maxRows = 10; // Maximum rows in the table
      
      // Table column positions (based on the PDF template) - better aligned
      const serialColumnX = 80; // क्रमांक column (center of first column)
      const nameColumnX = 180; // नाम/विवरण column (center of second column)
      const dateColumnX = 490; // दिनांक column (center of third column)
      
      bimas.forEach((bima: any, index: number) => {
        const rowY = tableStartY + (index * rowHeight);
        
        // Serial number (क्रमांक)
        const serialText = `${bima.bimaNumber}`;
        const serialX = serialColumnX * scaleX + valueOffsetX + globalOffsetX;
        const serialY = coordinateSystem === 'top-left' ? pageHeight - (rowY * scaleY + valueOffsetY + globalOffsetY) : rowY * scaleY + valueOffsetY + globalOffsetY;
        
        if (debugMode) {
          page.drawRectangle({ x: serialX - 1, y: serialY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
        }
        
        page.drawText(serialText, {
          x: serialX,
          y: serialY,
          size: 9,
          font,
          color: textColor,
        });
        
        // Name/Details (नाम/विवरण)
        const nameText = `${(bima.applicantName + '/' + bima.fatherName || bima.नाम || 'N/A') + ' ' + ('(' + bima.village + ')') }`;
        const nameX = nameColumnX * scaleX + valueOffsetX + globalOffsetX;
        const nameY = coordinateSystem === 'top-left' ? pageHeight - (rowY * scaleY + valueOffsetY + globalOffsetY) : rowY * scaleY + valueOffsetY + globalOffsetY;
        
        if (debugMode) {
          page.drawRectangle({ x: nameX - 1, y: nameY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
        }
        
        page.drawText(nameText, {
          x: nameX,
          y: nameY,
          size: 9,
          font,
          color: textColor,
        });
        
        // Date (दिनांक)
        const dateText = `${formatDateToDDMMYYYY(bima.date) || formatDateToDDMMYYYY(bima.दिनांक) || 'N/A'}`;
        const dateX = dateColumnX * scaleX + valueOffsetX + globalOffsetX;
        const dateY = coordinateSystem === 'top-left' ? pageHeight - (rowY * scaleY + valueOffsetY + globalOffsetY) : rowY * scaleY + valueOffsetY + globalOffsetY;
        
        if (debugMode) {
          page.drawRectangle({ x: dateX - 1, y: dateY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
        }
        
        page.drawText(dateText, {
          x: dateX,
          y: dateY,
          size: 9,
          font,
          color: textColor,
        });
      });
    };

    // Helper function to fill header fields on a page
    const fillPageHeader = (page: any, pageIndex: number, totalPages: number, pageRecords: any[]) => {
      // Calculate total EMI amount for this page only (sum of individual EMI amounts from each record)
      const pageTotalEmiAmount = pageRecords.reduce((sum, record) => {
        const emiAmount = parseFloat(record.emiAmount) || 0;
        return sum + emiAmount;
      }, 0);
      
      // Convert page total to Hindi words
      let pageAmountInWords = '';
      if (pageTotalEmiAmount && !isNaN(pageTotalEmiAmount)) {
        pageAmountInWords = numberToHindiWords(Math.floor(pageTotalEmiAmount));
        console.log(`Page ${pageIndex + 1} - Total EMI Amount: ${pageTotalEmiAmount}, Amount in words: ${pageAmountInWords}`);
      }

      // Create page-specific PDF data with per-page totals
      const pagePdfData = {
        ...basePdfData,
        totalEmiAmount: `${pageTotalEmiAmount}`,
        amountInWords: pageAmountInWords,
        emiAmount: 200,
      };
      
      // Fill header fields for each page
      for (const mapping of fieldMappings) {
        const value = (pagePdfData as any)[mapping.field];
        if (!value) continue;
        
        const scaledX = mapping.x * scaleX + valueOffsetX + globalOffsetX;
        const scaledY = mapping.y * scaleY + valueOffsetY + globalOffsetY;
        const drawX = scaledX;
        const drawY = coordinateSystem === 'top-left' ? pageHeight - scaledY : scaledY;
        
        if (debugMode) {
          page.drawRectangle({ x: drawX - 1, y: drawY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
        }
        
        page.drawText(String(value), {
          x: drawX,
          y: drawY,
          size: fontSize,
          font,
          color: textColor,
        });
      }
    };

    // Add Suraksha Bima records to the table with pagination support
    if (data.bimaYojana && Array.isArray(data.bimaYojana) && data.bimaYojana.length > 0) {
      const maxRows = 10; // Maximum rows per page
      const totalRecords = data.bimaYojana.length;
      const totalPages = Math.ceil(totalRecords / maxRows);
      
      console.log(`Total records: ${totalRecords}, Total pages needed: ${totalPages}`);
      
      // Fill the first page
      const firstPageRecords = data.bimaYojana.slice(0, maxRows);
      fillPageHeader(firstPage, 0, totalPages, firstPageRecords);
      fillPageWithBimaRecords(firstPage, firstPageRecords, 0);
      
      // If there are more than 10 records, create additional pages
      if (totalPages > 1) {
        for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
          // Load the original template again for a clean copy (with all images/content)
          const templatePdfDoc = await PDFDocument.load(originalTemplateBytes);
          
          // Register fontkit for the template document if needed
          if (fontkitAvailable) {
            try {
              const fontkitModule: any = await import('@pdf-lib/fontkit');
              const fontkit = fontkitModule?.default ?? fontkitModule;
              if (fontkit) {
                (templatePdfDoc as any).registerFontkit(fontkit);
              }
            } catch {}
          }
          
          // Embed the template PDF pages - this preserves all images, backgrounds, and content
          const embeddedPages = await pdfDoc.embedPdf(templatePdfDoc);
          const embeddedFirstPage = embeddedPages[0];
          
          // Create a new page with the same size as the template
          const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Draw the embedded template page onto the new page
          // This preserves all images, backgrounds, and visual content
          newPage.drawPage(embeddedFirstPage, {
            x: 0,
            y: 0,
            xScale: 1,
            yScale: 1,
          });
          
          // Get records for this page (10 records per page)
          const startIndex = pageIndex * maxRows;
          const endIndex = Math.min(startIndex + maxRows, totalRecords);
          const pageRecords = data.bimaYojana.slice(startIndex, endIndex);
          
          // Fill header for the new page (with page-specific totals)
          fillPageHeader(newPage, pageIndex, totalPages, pageRecords);
          
          // Fill Suraksha Bima records for this page
          fillPageWithBimaRecords(newPage, pageRecords, pageIndex);
          
          console.log(`Page ${pageIndex + 1}: Records ${startIndex + 1} to ${endIndex}`);
        }
      }
    }

    // Serialize the PDF
    console.log('Serializing PDF...');
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    console.log('PDF serialized successfully, size:', pdfBytes.byteLength, 'bytes');

    // Generate filename based on gender and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    let filename = 'bulk_suraksha_bima_emi.pdf';
    
    if (gender === 'Female' ||  gender ==="female" || gender === 'महिला') {
      filename = `female_bulk_suraksha_bima_emi_${timestamp}.pdf`;
    } else if (gender === 'Male' || gender === "male" ||  gender === 'पुरुष') {
      filename = `male_bulk_suraksha_bima_emi_${timestamp}.pdf`;
    } else {
      filename = `bulk_suraksha_bima_emi_${timestamp}.pdf`;
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
    console.error('Error generating bulk Suraksha Bima EMI PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        error: 'Failed to generate bulk Suraksha Bima EMI PDF',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
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
