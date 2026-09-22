import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';

export const runtime = 'nodejs';

// Helper to sanitize agent and application offline numbers
function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('LB-') ||
    upper.startsWith('LB_') ||
    upper.startsWith('SAF-') ||
    upper.startsWith('SAF_') ||
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
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body in Lado Bahin Bond API:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    const duration =
      String(
        record?.benefitDuration ??
        record?.duration ??
        record?.benefit_duration ??
        body?.benefitDuration ??
        body?.benefit_duration ??
        body?.duration ??
        ""
      ).trim();

    console.log('Generating Lado Bahin Bond PDF for:', record?.applicantName || record?.formNumber || 'Unknown');

    // 1. Load canonical official template PDF
    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_bond', 'lado_bahin_bond.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_bond.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Lado Bahin bond template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Template PDF has no pages' }, { status: 500 });
    }

    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // 2. Photo Embedding (Template has TWO calibrated vector photo boxes on right side)
    // Box 1 (Upper Box: Applicant Photo): [464.83, 579.03] to [551.23, 659.20] (w: 86.40, h: 80.17)
    // Inset by ~1pt on all sides: x = 465.8, yFromTop = 183.69, width = 84.4, height = 78.2
    const applicantPhotoSource = pickPhotoSource(
      record?.passportPhotoUrl,
      record?.passport_photo_url,
      record?.passportPhoto,
      record?.passport_photo,
      record?.applicantPhoto,
      record?.applicant_photo,
      record?.applicantPhotoData,
      body?.imageData,
      record?.imageData,
      record?.photo,
      record?.photoUrl
    );

    if (applicantPhotoSource) {
      try {
        await embedPdfImage(
          pdfDoc,
          firstPage,
          pageHeight,
          applicantPhotoSource,
          465.8,
          183.69,
          84.4,
          78.2,
          'cover'
        );
      } catch (err) {
        console.warn('Could not embed applicant photo in Lado Bahin Bond:', err);
      }
    }

    // Box 2 (Lower Box: Nominee Photo): [464.83, 492.11] to [551.23, 572.28] (w: 86.40, h: 80.17)
    // Inset by ~1pt on all sides: x = 465.8, yFromTop = 270.61, width = 84.4, height = 78.2
    const nomineePhotoSource = pickPhotoSource(
      record?.nomineePhotoUrl,
      record?.nominee_photo_url,
      record?.nomineePhoto,
      record?.nomineePassportPhoto
    );

    if (nomineePhotoSource) {
      try {
        await embedPdfImage(
          pdfDoc,
          firstPage,
          pageHeight,
          nomineePhotoSource,
          465.8,
          270.61,
          84.4,
          78.2,
          'cover'
        );
      } catch (err) {
        console.warn('Could not embed nominee photo in Lado Bahin Bond:', err);
      }
    }

    // Embed Director Signature if provided
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature
    );
    if (directorSignatureSource) {
      try {
        await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 465, 415, 80, 25, 'contain');
      } catch (err) {
        console.warn('Could not embed director signature:', err);
      }
    }

    // 3. Font embedding (SemiBold to match bold printed labels)
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    const font = devanagariFontPath
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica-Bold');

    // Drawing Helpers
    const drawBounded = (
      text: string | number | undefined | null,
      x: number,
      blY: number,
      size = 10.5,
      maxW?: number,
      color = rgb(0.1, 0.1, 0.1)
    ) => {
      if (text === undefined || text === null || String(text).trim() === '') return;
      let str = String(text).trim();
      let fontSize = size;
      if (maxW && font.widthOfTextAtSize) {
        try {
          let textWidth = font.widthOfTextAtSize(str, fontSize);
          if (textWidth > maxW) {
            fontSize = Math.max(6.5, fontSize * (maxW / textWidth));
            textWidth = font.widthOfTextAtSize(str, fontSize);
            while (textWidth > maxW && str.length > 3) {
              str = str.slice(0, -1).trim();
              textWidth = font.widthOfTextAtSize(str + '...', fontSize);
              if (textWidth <= maxW) {
                str = str + '...';
                break;
              }
            }
          }
        } catch {
          // fallback
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
      const boxW = maxX - minX;
      try {
        let textW = font.widthOfTextAtSize ? font.widthOfTextAtSize(str, fontSize) : 0;
        if (boxW > 0 && textW > boxW) {
          fontSize = Math.max(6.0, fontSize * (boxW / textW));
          textW = font.widthOfTextAtSize ? font.widthOfTextAtSize(str, fontSize) : 0;
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

    // 4. Dynamic Field Extraction & Sanitization
    const applicationOfflineNo = sanitizeValue(
      record?.offlineFormNumber ||
      record?.offline_form_number ||
      record?.offlineFormNo ||
      record?.applicationOfflineFormNumber ||
      record?.ऑफलाइन_फॉर्म_नं ||
      ''
    );

    const workerCode = sanitizeOfflineNumber(
      record?.workerOfflineFormNumber ||
      record?.worker_offline_form_number ||
      record?.agentOfflineFormNumber ||
      record?.agent_offline_form_number ||
      record?.agentCode ||
      record?.agent_code ||
      record?.कार्यकर्ता_कोड ||
      record?.addedBy?.offlineFormNumber ||
      ''
    );

    const seniorCode = sanitizeOfflineNumber(
      record?.seniorOfflineFormNumber ||
      record?.senior_offline_form_number ||
      record?.seniorAgentOfflineFormNumber ||
      record?.senior_agent_offline_form_number ||
      record?.seniorCode ||
      record?.senior_code ||
      record?.सीनियर_कोड ||
      record?.सीनियर_कार्यकर्ता_कोड ||
      ''
    );

    const membershipNo = sanitizeValue(
      record?.membershipNumber ||
      record?.membership_number ||
      record?.memberNumber ||
      record?.member_number ||
      record?.formNumber ||
      record?.form_number ||
      ''
    );

    const rawAppDate = record?.applicationDate || record?.application_date || record?.created_at || record?.createdAt || '';
    const applicationDate = rawAppDate ? formatDateToDDMMYYYY(String(rawAppDate)) : '';

    const applicantName = sanitizeValue(
      record?.applicantName ||
      record?.applicant_name ||
      record?.name ||
      record?.आवेदक_का_नाम ||
      ''
    );

    const fatherHusbandName = sanitizeValue(
      record?.husbandName ||
      record?.husband_name ||
      record?.fatherName ||
      record?.father_name ||
      record?.father_husband_name ||
      record?.पिता_का_नाम ||
      ''
    );

    const applicantAadhaar = sanitizeValue(
      record?.aadharNumber ||
      record?.aadhar_number ||
      record?.aadhaar ||
      record?.आधार_संख्या ||
      ''
    );

    const gotra = sanitizeValue(
      record?.gotra ||
      record?.gotraName ||
      record?.gotra_name ||
      record?.Gotra ||
      record?.गोत्र ||
      record?.जाति ||
      ''
    );

    const relation = sanitizeValue(
      record?.nomineeRelation ||
      record?.nominee_relation ||
      record?.relation ||
      record?.सम्बन्ध ||
      record?.नामिनी_का_सम्बन्ध ||
      ''
    );

    const village = sanitizeValue(
      record?.address ||
      record?.village ||
      record?.tehsil ||
      record?.गाँव ||
      record?.पता ||
      ''
    );

    const nomineeName = sanitizeValue(
      record?.nomineeName ||
      record?.nominee_name ||
      record?.nominee ||
      record?.वारिसदार ||
      record?.नामिनी_का_नाम ||
      record?.नॉमिनी_का_नाम ||
      ''
    );

    const nomineeAadhaar = sanitizeValue(
      record?.nomineeAadhar ||
      record?.nomineeAadhaar ||
      record?.nominee_aadhar ||
      record?.nominee_aadhaar ||
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

    const agentMobile = sanitizeValue(
      record?.agentMobile ||
      record?.workerMobile ||
      record?.agent_mobile ||
      record?.worker_mobile ||
      record?.added_mobile ||
      record?.addedBy?.mobile ||
      record?.कार्यकर्ता_का_मोबाइल ||
      ''
    );

    const district = sanitizeValue(record?.district || record?.जिला || '');
    const state = sanitizeValue(record?.state || record?.राज्य || 'राजस्थान');

    // Muklawa Date formatting
    const rawMuklawa = record?.muklawaDate || record?.muklawa_date || '';
    const formattedMuklawa = rawMuklawa ? formatDateToDDMMYYYY(String(rawMuklawa)) : '';

    // =========================================================================
    // 5. RENDER DYNAMIC VALUES (Calibrated against official vector template)
    // =========================================================================

    // ── 5.1 Top Header Vector Boxes ──────────────────────────────
    // 1. फॉर्म नं. (Box 1 Left: minX=112.95, maxX=201.41, minY=703.70, maxY=724.56)
    drawCenteredInBox(applicationOfflineNo, 112.95, 201.41, 710.0, 11, rgb(0, 0.15, 0.6));

    // 2. एजेंट कोड (Box 2 Left: minX=112.95, maxX=201.41, minY=677.57, maxY=698.43)
    drawCenteredInBox(workerCode, 112.95, 201.41, 684.0, 11, rgb(0.8, 0, 0));

    // 3. अपलाईन कोड (Box 3 Left: minX=112.95, maxX=201.41, minY=652.58, maxY=673.45)
    drawCenteredInBox(seniorCode, 112.95, 201.41, 659.0, 11, rgb(0.8, 0, 0));

    // 4. आवेदन दि. (Box 1 Right: minX=462.78, maxX=551.23, minY=703.70, maxY=724.56)
    drawCenteredInBox(applicationDate, 462.78, 551.23, 710.0, 10.5, rgb(0, 0.15, 0.6));

    // 5. सदस्यता क्र. (Box 2 Right: minX=462.78, maxX=551.23, minY=675.85, maxY=696.72)
    drawCenteredInBox(membershipNo, 462.78, 551.23, 682.0, 10.5, rgb(0, 0.15, 0.6));

    // ── 5.2 Middle Table Section ─────────────────────────────────
    // Left Column (Rows 1-6)
    // Row 1: नाम :- (blY: 625.89)
    drawBounded(applicantName, 75, 625.89, 10.5, 170);

    // Row 2: पिता/पति का नाम :- (blY: 602.48)
    drawBounded(fatherHusbandName, 140, 602.48, 10.5, 105);

    // Row 3: आधार नं. :- (blY: 579.06)
    drawBounded(applicantAadhaar, 100, 579.06, 10.5, 145);

    // Row 4: जाति :- (blY: 555.65)
    drawBounded(gotra, 80, 555.65, 10.5, 165);

    // Row 5: सम्बन्ध :- (blY: 532.23)
    drawBounded(relation, 90, 532.23, 10.5, 155);

    // Row 6: गांव :- (blY: 508.82)
    drawBounded(village, 76, 508.82, 10.5, 170);

    // Right Column (Rows 1-6)
    // Row 1: नॉमिनी नाम :- (blY: 625.20)
    drawBounded(nomineeName, 318, 625.20, 10.5, 140);

    // Row 2: नॉमिनी आधार नं. :- (blY: 601.78)
    drawBounded(nomineeAadhaar, 342, 601.78, 10, 116);

    // Row 3: नॉमिनी मो. नं. :- (blY: 578.36)
    drawBounded(nomineeMobile, 328, 578.36, 10, 130);

    // Row 4: एजेंट मो. नं. :- (blY: 554.95)
    drawBounded(agentMobile, 323, 554.95, 10, 135);

    // Row 5: जिला :- (blY: 531.53)
    drawBounded(district, 291, 531.53, 10.5, 165);

    // Row 6: राज्य :- (blY: 508.11)
    drawBounded(state, 287, 508.11, 10.5, 240);

    // ── 5.3 Bottom Amount Line ───────────────────────────────────
    // मुकलावा ... रूपये प्रत्येक मुकलावा पर लागू (blY: 482.5)
    const installmentText = '300 किस्त';
    drawCenteredInBox(installmentText, 213.5, 284.66, 482.5, 10.5, rgb(0, 0.15, 0.6));

    // ── 5.4 Bottom Benefit / Muklawa Line ────────────────────────
    // इस योजना का लाभ 01-03-2027 के बाद मिलेगा (blY: 454.85)
    const fixedBenefitDate = '01-03-2027';
    drawCenteredInBox(fixedBenefitDate, 284.2, 342.84, 454.85, 10.5, rgb(0.8, 0, 0));

    // 6. Serialize and Return PDF
    const pdfBytes = await pdfDoc.save();

    const safeName = (record?.applicantName || record?.formNumber || 'lado_bahin_bond')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const downloadFileName = `lado_bahin_bond_${applicationOfflineNo || membershipNo || safeName || 'document'}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('Error generating Lado Bahin bond PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Lado Bahin bond PDF' },
      { status: 500 }
    );
  }
}
