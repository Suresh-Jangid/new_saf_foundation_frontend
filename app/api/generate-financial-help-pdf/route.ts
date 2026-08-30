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
    const { data, debug, offsetX, offsetY, coordSystem, valueOffsetX: reqValueOffsetX, valueOffsetY: reqValueOffsetY, baseWidth, baseHeight, imageData } = await request.json();

    console.log('Received financial help data:', data);
    console.log('Image data received:', !!imageData);
    console.log('Gender from data:', data?.gender || data?.लिंग);
    console.log('Available fields:', Object.keys(data || {}));

    // Determine template path based on gender
    const gender = data?.gender || data?.लिंग;
    console.log('Gender detected:', gender);
    
    let templatePath: string;
    if (gender === 'Female' || gender === 'महिला') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'finanical_help', 'girl_financal_help.pdf');
    } else if (gender === 'Male' || gender === 'पुरुष') {
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'finanical_help', 'boys_financal_help.pdf');
    } else {
      // Default to Female template if gender is not specified
      templatePath = path.join(process.cwd(), 'public', 'pdf', 'finanical_help', 'girl_financal_help.pdf');
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Financial help template PDF not found: ${templatePath}`);
    }

    console.log('Using financial help template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    console.log('PDF template loaded successfully');
    
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

    // A4 dimensions in points
    const a4Width = 595;
    const a4Height = 842;
    
    // Ensure the page is A4 size
    if (pageWidth !== a4Width || pageHeight !== a4Height) {
      console.log(`Resizing page from ${pageWidth}x${pageHeight} to A4 size ${a4Width}x${a4Height}`);
      firstPage.setSize(a4Width, a4Height);
    }
    
    // Get updated page dimensions
    const { width: finalWidth, height: finalHeight } = firstPage.getSize();
    console.log(`PDF page size: ${finalWidth}x${finalHeight} points (A4: ${a4Width}x${a4Height})`);

    // Try to embed a Devanagari-capable font
    let font;
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        console.warn('Fontkit not available, using default font');
        font = await pdfDoc.embedFont('Helvetica');
      } else {
        try {
          const fontBytes = fs.readFileSync(devanagariFontPath);
          font = await pdfDoc.embedFont(fontBytes);
          console.log('Devanagari font embedded successfully');
        } catch (fontError) {
          console.warn('Failed to embed Devanagari font, using default:', fontError);
          font = await pdfDoc.embedFont('Helvetica');
        }
      }
    } else {
      font = await pdfDoc.embedFont('Helvetica');
    }

    // Define field mappings for financial help form
    const fieldMappings = [
      { field: 'date', x: 110, y: 235 },
      { field: 'name', x: 110, y: 310},  
      { field: 'fatherName', x: 390, y: 340 },   
      { field: 'donatedAmount', x: 130, y: 615 },
    ];

    // Set up coordinate system and offsets
    const coordinateSystem = coordSystem || 'top-left';
    const globalOffsetX = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY = typeof offsetY === 'number' ? offsetY : 0;
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;
    const debugMode = debug === true;
    
    // Map the data to handle both Hindi and English field names
    const pdfData = {
      date: formatDateToDDMMYYYY(data.date || data.donatedDate || data.दिनांक),
      name: data.name || data.applicantName || data.नाम || '',      
      fatherName: data.fatherName || data.pitaKaNam || data.पिता_का_नाम || '',
      donatedAmount: data.donatedAmount || data.danRashi || data.दान_राशि || '',
    };
    
    console.log('Mapped PDF data:', pdfData);
    
    for (const mapping of fieldMappings) {
      const value = (pdfData as any)[mapping.field];
      if (!value) continue;
      
      const baseX = mapping.x + valueOffsetX + globalOffsetX;
      const baseY = mapping.y + valueOffsetY + globalOffsetY;
      const drawX = baseX;
      const drawY = coordinateSystem === 'top-left' ? finalHeight - baseY : baseY;
      
      if (debugMode) {
        firstPage.drawRectangle({ x: drawX - 1, y: drawY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
      }
      
      firstPage.drawText(String(value), {
        x: drawX,
        y: drawY,
        size: 10,
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
    const formNumber = data.id || data.formNumber || 'filled';
    let filename = 'financial_help_form.pdf';
    
    if (gender === 'Female' || gender === 'महिला') {
      filename = `girl_financial_help_${formNumber}.pdf`;
    } else if (gender === 'Male' || gender === 'पुरुष') {
      filename = `boys_financial_help_${formNumber}.pdf`;
    } else {
      filename = `financial_help_${formNumber}.pdf`;
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
    console.error('Error generating financial help PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate financial help PDF',
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
