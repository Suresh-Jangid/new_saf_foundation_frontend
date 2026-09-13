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

    // Helper for drawing text at top-left coordinates
    const drawTextAt = (text: string | number | undefined | null, x: number, topY: number, size = 10, color = rgb(0.1, 0.1, 0.1)) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      firstPage.drawText(String(text).trim(), {
        x,
        y: pageHeight - topY,
        size,
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

    // 1. कार्यकर्ता कोड
    drawTextAt(workerCode, 160, 125, 10, rgb(0.8, 0, 0));

    // 2. सीनियर कार्यकर्ता कोड
    drawTextAt(seniorCode, 480, 125, 10, rgb(0.8, 0, 0));

    // 3. आवेदन क्र.
    drawTextAt(applicationOfflineNo, 123, 159, 10, rgb(0, 0.15, 0.6));

    // 4. सदस्यता क्र.
    drawTextAt(membershipNo, 330, 153, 10, rgb(0, 0.15, 0.6));

    // 5. आवेदन दि.
    drawTextAt(applicationDate, 474, 153, 10, rgb(0, 0.15, 0.6));

    // 6. नाम
    drawTextAt(applicantName, 93, 196, 10);

    // 7. पिता/पति का नाम
    drawTextAt(fatherName, 311, 196, 10);

    // 8. जाति (Displays Gotra value)
    drawTextAt(gotra, 93, 220, 10);

    // 9. गांव
    drawTextAt(village, 256, 217, 10);

    // 10. वारिसदार
    drawTextAt(warisdar, 112, 245, 10);

    // 11. जिला
    drawTextAt(district, 256, 242, 10);

    // 12. एजेन्ट मो. नं.
    drawTextAt(agentMobile, 132, 269, 10);

    // 13. राज्य
    drawTextAt(state, 256, 266, 10);

    // 14. आधार नं.
    drawTextAt(applicantAadhaar, 110, 294, 10);

    // 15. सम्बन्ध
    drawTextAt(relation, 270, 291, 10);

    // 16. नॉमिनी आधार नं.
    drawTextAt(nomineeAadhaar, 152, 318, 10);

    // 17. नॉमिनी मो. नं.
    drawTextAt(nomineeMobile, 304, 315, 10);

    // 18. लाभ अवधि ("आपको विवाह योजना का लाभ ... के बाद मिलेगा ।")
    drawTextAt(durationText, 280, 363, 10, rgb(0.8, 0, 0));

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
