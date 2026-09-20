import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

// Helper to sanitize agent offline numbers
function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper === 'EMP' ||
    upper === 'ADMIN' ||
    upper === 'SUPER ADMIN' ||
    upper === 'N/A' ||
    upper === 'NA' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'UUID' ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  ) {
    return '';
  }
  return str;
}

function sanitizeValue(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'N/A' ||
    upper === 'NA'
  ) {
    return '';
  }
  return str;
}

// Helper to resolve authoritative installment category text for the Kanyadaan line
function resolveInstallmentCategoryText(rec: any): string {
  const rawAmt =
    rec?.installmentAmount ??
    rec?.installment_amount ??
    rec?.installment ??
    rec?.monthlyInstallment ??
    rec?.monthly_installment ??
    rec?.installmentCategory ??
    rec?.installment_category ??
    rec?.planAmount ??
    rec?.plan_amount ??
    '';

  if (!rawAmt) {
    const catStr = String(rec?.category || rec?.plan || '').trim();
    if (catStr.includes('300')) return '₹300 किस्त';
    if (catStr.includes('1000') || catStr.includes('1,000')) return '₹1,000 किस्त';
    return '';
  }

  const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^\d.]/g, ''));
  if (num === 300) {
    return '₹300 किस्त';
  }
  if (num === 1000) {
    return '₹1,000 किस्त';
  }
  const str = String(rawAmt).trim();
  if (str.includes('300')) return '₹300 किस्त';
  if (str.includes('1000') || str.includes('1,000')) return '₹1,000 किस्त';

  return '';
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
    const { record, imageData, duration } = await request.json();

    console.log('Received record for General Bond PDF:', record?.applicantName || record?.formNumber || 'Unknown');
    console.log('Image data received for General Bond:', !!imageData);

    // Canonical official template path for Vivah Yojana General Bond
    const candidateTemplates = [
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'saf_vivah_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'vivah_yojana_bond.pdf'),
      path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'viva yojana bond(1).pdf'),
    ];
    
    const templatePath = candidateTemplates.find((p) => fs.existsSync(p));

    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`General Bond template not found in candidates: ${candidateTemplates.join(', ')}`);
    }

    console.log('Using General Bond template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
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
          // Precise passport photo box dimensions for official saf_vivah_bond.pdf [453.47–540.30] x [519.44–624.84]
          const imageX = 454.5;
          const imageY = 520.5;
          const imageWidth = 84.8;
          const imageHeight = 103.3;

          // Draw the image on the PDF directly using bottom-left coordinates
          firstPage.drawImage(image, {
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully in General Bond PDF');
        }
      } catch (imageError) {
        console.error('Error embedding image in General Bond PDF:', imageError);
      }
    }

    // Embed Devanagari font; fallback to Helvetica
    let font;
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Helper for drawing bounded text directly on baseline Y (blY)
    const drawBounded = (
      text: string | number | undefined | null,
      x: number,
      blY: number,
      size = 10.5,
      maxW?: number,
      color = rgb(0.1, 0.1, 0.1)
    ) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      const str = String(text).trim();
      let fontSize = size;
      if (maxW && (font as any).widthOfTextAtSize) {
        try {
          const textWidth = (font as any).widthOfTextAtSize(str, fontSize);
          if (textWidth > maxW) {
            fontSize = Math.max(6.0, fontSize * (maxW / textWidth));
          }
        } catch {
          // fallback if widthOfTextAtSize fails
        }
      }
      firstPage.drawText(str, {
        x,
        y: blY,
        size: fontSize,
        font,
        color,
      });
    };

    // Helper for drawing horizontally centered text within a defined box
    const drawCenteredInBox = (
      text: string | number | undefined | null,
      minX: number,
      maxX: number,
      blY: number,
      size = 10.5,
      color = rgb(0, 0.15, 0.6)
    ) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      const str = String(text).trim();
      let fontSize = size;
      const boxW = maxX - minX - 4;
      try {
        let textW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(str, fontSize) : 0;
        if (boxW > 0 && textW > boxW) {
          fontSize = Math.max(6.0, fontSize * (boxW / textW));
          textW = (font as any).widthOfTextAtSize ? (font as any).widthOfTextAtSize(str, fontSize) : 0;
        }
        const x = minX + Math.max(0, (maxX - minX - textW) / 2);
        firstPage.drawText(str, {
          x,
          y: blY,
          size: fontSize,
          font,
          color,
        });
      } catch {
        firstPage.drawText(str, {
          x: minX + 2,
          y: blY,
          size: fontSize,
          font,
          color,
        });
      }
    };

    // Extract & sanitize dynamic field values
    const workerCode = sanitizeOfflineNumber(
      record?.workerOfflineFormNumber ||
      record?.worker_offline_form_number ||
      record?.agentOfflineFormNumber ||
      record?.agent_offline_form_number ||
      record?.कार्यकर्ता_कोड ||
      ''
    );

    const seniorCode = sanitizeOfflineNumber(
      record?.seniorOfflineFormNumber ||
      record?.senior_offline_form_number ||
      record?.seniorAgentOfflineFormNumber ||
      record?.senior_agent_offline_form_number ||
      record?.सीनियर_कोड ||
      record?.सीनियर_कार्यकर्ता_कोड ||
      ''
    );

    // फॉर्म नं. - Application offline form number only; blank if missing (never internal UUID/ID)
    const applicationOfflineNo = sanitizeValue(
      record?.offlineFormNumber ||
      record?.offline_form_number ||
      record?.applicationOfflineFormNumber ||
      record?.ऑफलाइन_फॉर्म_नं ||
      ''
    );

    // सदस्यता क्र. - Authoritative membership number only; blank if missing
    const membershipNo = sanitizeValue(
      record?.membershipNumber ||
      record?.membership_number ||
      record?.memberNumber ||
      record?.member_number ||
      record?.formNumber ||
      ''
    );

    // आवेदन दि. - Formatted application date
    const rawAppDate = record?.applicationDate || record?.application_date || record?.created_at || '';
    const applicationDate = rawAppDate ? formatDateToDDMMYYYY(rawAppDate) : '';

    const applicantName = sanitizeValue(record?.applicantName || record?.applicant_name || record?.name || record?.आवेदक_का_नाम || '');
    const fatherName = sanitizeValue(record?.fatherName || record?.father_name || record?.father_husband_name || record?.husbandName || record?.पिता_का_नाम || '');
    const gotra = sanitizeValue(
      record?.gotra ||
      record?.gotraName ||
      record?.gotra_name ||
      record?.Gotra ||
      record?.गोत्र ||
      ''
    );
    const village = sanitizeValue(record?.village || record?.गाँव || record?.address || record?.पता || '');
    const warisdar = sanitizeValue(record?.nomineeName || record?.nominee_name || record?.warisdar || record?.वारिसदार || record?.नामिनी_का_नाम || '');
    const district = sanitizeValue(record?.district || record?.जिला || '');
    const agentMobile = sanitizeValue(record?.agentMobile || record?.workerMobile || record?.agent_mobile || record?.worker_mobile || record?.added_mobile || record?.कार्यकर्ता_का_मोबाइल || '');
    const state = sanitizeValue(record?.state || record?.राज्य || 'राजस्थान');
    const applicantAadhaar = sanitizeValue(record?.aadharNumber || record?.aadhar_number || record?.aadhaar || record?.आधार_संख्या || '');
    const relation = sanitizeValue(record?.nomineeRelation || record?.nominee_relation || record?.relation || record?.सम्बन्ध || record?.नामिनी_का_सम्बन्ध || '');
    const nomineeAadhaar = sanitizeValue(
      record?.nomineeAadhar ||
      record?.nomineeAadhaar ||
      record?.nominee_aadhar ||
      record?.nominee_aadhaar ||
      record?.nomineeAadharNumber ||
      record?.nomineeAadhaarNumber ||
      record?.नामिनी_का_आधार ||
      ''
    );
    const nomineeMobile = sanitizeValue(
      record?.nomineeMobile ||
      record?.nominee_mobile ||
      record?.nomineePhone ||
      record?.nominee_phone ||
      record?.नामिनी_का_मोबाइल ||
      ''
    );

    // Installment category text for Kanyadaan line (₹300 किस्त / ₹1,000 किस्त)
    const kanyadaanInstallment = resolveInstallmentCategoryText(record);

    // Benefit duration text for bottom line
    let durationText = duration || record?.duration || record?.durationText || 'बारह महीने';
    if (durationText === 'अठारह महीने' || durationText === '18 महीने' || !durationText) {
      durationText = 'बारह महीने';
    }

    // =========================================================================
    // 1. TOP HEADER BOXES (Official saf_vivah_bond.pdf vector box coordinates)
    // =========================================================================

    // 1.1 फॉर्म नं. (Box 1 Left: minX=113.57, maxX=202.02, minY=689.90, maxY=710.76)
    drawCenteredInBox(applicationOfflineNo, 113.57, 202.02, 696.5, 11, rgb(0, 0.15, 0.6));

    // 1.2 एजेंट कोड (Box 2 Left: minX=113.57, maxX=202.02, minY=663.76, maxY=684.63)
    drawCenteredInBox(workerCode, 113.57, 202.02, 670.5, 11, rgb(0.8, 0, 0));

    // 1.3 अपलाईन कोड (Box 3 Left: minX=113.57, maxX=202.02, minY=638.78, maxY=659.64)
    drawCenteredInBox(seniorCode, 113.57, 202.02, 645.5, 11, rgb(0.8, 0, 0));

    // 1.4 आवेदन दि. (Box 1 Right: minX=451.84, maxX=540.30, minY=689.90, maxY=710.76)
    drawCenteredInBox(applicationDate, 451.84, 540.30, 696.5, 10.5, rgb(0, 0.15, 0.6));

    // 1.5 सदस्यता क्र. (Box 2 Right: minX=451.84, maxX=540.30, minY=657.72, maxY=678.59)
    drawCenteredInBox(membershipNo, 451.84, 540.30, 664.5, 10.5, rgb(0, 0.15, 0.6));

    // =========================================================================
    // 2. MIDDLE TABLE SECTION (Two columns, Rows 1-6)
    // =========================================================================

    // Row 1: नाम :- (blY: 612.34) | नॉमिनी नाम :- (blY: 611.98)
    drawBounded(applicantName, 72, 612.34, 10.5, 190);
    drawBounded(warisdar, 340, 611.98, 10.5, 108);

    // Row 2: पिता/पति का नाम :- (blY: 589.11) | नॉमिनी आधार नं. :- (blY: 588.81)
    drawBounded(fatherName, 136, 589.11, 10.5, 126);
    drawBounded(nomineeAadhaar, 364, 588.81, 10, 84);

    // Row 3: आधार नं. :- (blY: 565.88) | नॉमिनी मो. नं. :- (blY: 565.64)
    drawBounded(applicantAadhaar, 96, 565.88, 10.5, 166);
    drawBounded(nomineeMobile, 350, 565.64, 10, 98);

    // Row 4: जाति :- (blY: 542.65) | एजेंट मो. नं. :- (blY: 542.48)
    drawBounded(gotra, 76, 542.65, 10.5, 186);
    drawBounded(agentMobile, 344, 542.48, 10, 104);

    // Row 5: गांव :- (blY: 519.42) | सम्बन्ध :- (blY: 519.31)
    drawBounded(village, 74, 519.42, 10.5, 188);
    drawBounded(relation, 320, 519.31, 10.5, 128);

    // Row 6: जिला :- (blY: 496.20) | राज्य :- (blY: 496.14)
    drawBounded(district, 78, 496.20, 10.5, 184);
    drawBounded(state, 310, 496.14, 10.5, 230);

    // =========================================================================
    // 3. BOTTOM SECTION (Installment category on Kanyadaan line, Duration below)
    // =========================================================================

    // 3.1 कन्यादान ... रूपये प्रत्येक विवाह पर लागू (Installment Category: ₹300 किस्त / ₹1,000 किस्त)
    drawCenteredInBox(kanyadaanInstallment, 212, 278, 471.56, 11, rgb(0, 0.15, 0.6));

    // 3.2 आपको विवाह योजना का लाभ ... के बाद मिलेगा । (Duration Text: बारह महीने)
    drawCenteredInBox(durationText, 284, 365, 448.09, 11, rgb(0.8, 0, 0));

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Safe filename without Hindi characters
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
    console.error('Error generating General Bond PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate General Bond PDF',
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
