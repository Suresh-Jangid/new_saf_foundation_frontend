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
          // Precise passport photo box dimensions for official saf_vivah_bond.pdf
          const imageX = 448.5;
          const imageY = 226;
          const imageWidth = 87.5;
          const imageHeight = 95;

          // Draw the image on the PDF (converted to bottom-left coordinate system)
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight,
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

    // Helper for drawing text at top-left coordinates with optional maxW auto-scaling
    const drawTextAt = (
      text: string | number | undefined | null,
      x: number,
      topY: number,
      size = 11,
      color = rgb(0.1, 0.1, 0.1),
      maxW?: number
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
        y: pageHeight - topY,
        size: fontSize,
        font,
        color,
      });
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

    // आवेदन क्र. - Use application's offlineFormNumber only; blank if missing
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
    const village = sanitizeValue(record?.address || record?.village || record?.गाँव || record?.पता || '');
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

    let durationText = duration || record?.duration || record?.durationText || 'बारह महीने';
    if (durationText === 'अठारह महीने' || durationText === '18 महीने' || !durationText) {
      durationText = 'बारह महीने';
    }

    // 1. कार्यकर्ता कोड (label rightX: 146.61, blY: 713.66 -> topY: 128.23)
    drawTextAt(workerCode, 153, 128.23, 11, rgb(0.8, 0, 0), 60);

    // 2. सीनियर कार्यकर्ता कोड (label rightX: 448.97, blY: 714.80 -> topY: 127.09)
    drawTextAt(seniorCode, 455, 127.09, 11, rgb(0.8, 0, 0), 60);

    // 3. आवेदन क्र. (label rightX: 84.94, blY: 683.22 -> topY: 158.67)
    drawTextAt(applicationOfflineNo, 91, 158.67, 11, rgb(0, 0.15, 0.6), 75);

    // 4. सदस्यता क्र. (label rightX: 305.54, blY: 685.04 -> topY: 156.85)
    drawTextAt(membershipNo, 312, 156.85, 10.5, rgb(0, 0.15, 0.6), 85);

    // 5. आवेदन दि. (label rightX: 467.72, blY: 682.70 -> topY: 159.19)
    drawTextAt(applicationDate, 474, 159.19, 10.5, rgb(0, 0.15, 0.6), 75);

    // 6. नाम (label rightX: 52.37, blY: 647.99 -> topY: 193.90)
    drawTextAt(applicantName, 59, 193.90, 11, undefined, 160);

    // 7. पिता/पति का नाम (label rightX: 306.05, blY: 646.59 -> topY: 195.30)
    drawTextAt(fatherName, 313, 195.30, 11, undefined, 230);

    // 8. जाति (Displays Gotra value) (label rightX: 57.13, blY: 623.77 -> topY: 218.12)
    drawTextAt(gotra, 64, 218.12, 11, undefined, 155);

    // 9. गांव (label rightX: 242.35, blY: 622.68 -> topY: 219.21)
    drawTextAt(village, 249, 219.21, 11, undefined, 195);

    // 10. वारिसदार (label rightX: 75.08, blY: 599.54 -> topY: 242.35)
    drawTextAt(warisdar, 82, 242.35, 11, undefined, 138);

    // 11. जिला (label rightX: 249.09, blY: 598.76 -> topY: 243.12)
    drawTextAt(district, 256, 243.12, 11, undefined, 190);

    // 12. एजेन्ट मो. नं. (label rightX: 91.66, blY: 575.31 -> topY: 266.58)
    drawTextAt(agentMobile, 98, 266.58, 10.5, undefined, 120);

    // 13. राज्य (label rightX: 245.48, blY: 574.85 -> topY: 267.04)
    drawTextAt(state, 252, 267.04, 11, undefined, 190);

    // 14. आधार नं. (label rightX: 77.16, blY: 551.08 -> topY: 290.81)
    drawTextAt(applicantAadhaar, 84, 290.81, 10.5, undefined, 135);

    // 15. सम्बन्ध (label rightX: 256.11, blY: 550.94 -> topY: 290.95)
    drawTextAt(relation, 263, 290.95, 11, undefined, 180);

    // 16. नॉमिनी आधार नं. (label rightX: 111.30, blY: 526.85 -> topY: 315.04)
    drawTextAt(nomineeAadhaar, 118, 315.04, 10.5, undefined, 105);

    // 17. नॉमिनी मो. नं. (label rightX: 285.89, blY: 527.02 -> topY: 314.87)
    drawTextAt(nomineeMobile, 293, 314.87, 10.5, undefined, 150);

    // 18. लाभ अवधि ("आपको विवाह योजना का लाभ ... के बाद मिलेगा ।") (label rightX: 279.10, blY: 473.89 -> topY: 368.00)
    drawTextAt(durationText, 285, 368.00, 11, rgb(0.8, 0, 0), 80);

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
