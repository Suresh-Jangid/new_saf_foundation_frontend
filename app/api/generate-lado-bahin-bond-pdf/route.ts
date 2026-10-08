import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import { buildPdfFilename } from '@/lib/form-values';
import { drawDevanagariBounded } from '@/lib/pdf-devanagari';

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

function resolveLadoBahinInstallmentText(record: any, body: any): string {
  // 1. Explicit canonical installment amounts
  const candidateAmounts = [
    record?.installmentAmount,
    record?.installment_amount,
    record?.kistAmount,
    record?.kist_amount,
    record?.ladoInstallment,
    body?.installmentAmount,
  ];

  for (const cand of candidateAmounts) {
    if (cand !== undefined && cand !== null) {
      const num = Number(String(cand).replace(/[^0-9.]/g, ''));
      if (num === 1000) return '1000 किस्त';
      if (num === 300) return '300 किस्त';
    }
  }

  // 2. Explicit accountType
  const candidateTypes = [
    record?.accountType,
    record?.account_type,
    record?.initialAccountType,
    record?.initial_account_type,
    record?.schemeType,
    record?.scheme_type,
    body?.accountType,
  ];

  for (const type of candidateTypes) {
    if (type && typeof type === 'string') {
      const clean = type.trim();
      if (clean.includes('1000')) return '1000 किस्त';
      if (clean.includes('300')) return '300 किस्त';
    }
  }

  // 3. Installments array
  const instList = Array.isArray(record?.installments)
    ? record.installments
    : Array.isArray(body?.installments)
    ? body.installments
    : [];

  for (const inst of instList) {
    const act = String(inst?.accountType || '').trim();
    const amt = Number(
      String(inst?.amount || '').replace(/[^0-9.]/g, '')
    );

    if (act.includes('1000') || amt === 1000) {
      return '1000 किस्त';
    }

    if (act.includes('300') || amt === 300) {
      return '300 किस्त';
    }
  }

  // 4. Financial summary
  const finSummary =
    record?.financialSummary || body?.financialSummary;

  if (finSummary) {
    const count1000 = Number(
      finSummary?.account1000?.installmentCount ||
      finSummary?.account1000?.totalCollected ||
      0
    );

    const count300 = Number(
      finSummary?.account300?.installmentCount ||
      finSummary?.account300?.totalCollected ||
      0
    );

    if (count1000 > 0 && count300 === 0) {
      return '1000 किस्त';
    }

    if (count300 > 0 && count1000 === 0) {
      return '300 किस्त';
    }
  }

  // Default baseline
  return '300 किस्त';
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
          467.1,
          174.64,
          84.4,
          71.15,
          'contain'
        );
      } catch (err) {
        console.warn('Could not embed applicant photo in Lado Bahin Bond:', err);
      }
    }

    // Box 2 (Lower Box: Nominee Photo): [466.08, 515.78] to [552.48, 588.94] (w: 86.40, h: 73.15)
    // Inset by ~1pt on all sides: x = 467.1, yFromTop = 253.95, width = 84.4, height = 71.15
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
          467.1,
          253.95,
          84.4,
          71.15,
          'contain'
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
      ? await pdfDoc.embedFont(fs.readFileSync(devanagariFontPath), { subset: true })
      : await pdfDoc.embedFont('Helvetica-Bold');

    // Drawing Helpers
    const drawBounded = (
      text: unknown,
      x: number,
      y: number,
      size = 9,
      maxW?: number,
      color = rgb(0, 0, 0)
    ) => {
      drawDevanagariBounded(firstPage, font, text, {
        x,
        y,
        size,
        maxW,
        color,
        minSize: 6.5,
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
    // 1. फॉर्म नं. (Box 1 Left: minX=114.20, maxX=202.66, minY=708.85, maxY=727.89)
    drawCenteredInBox(applicationOfflineNo, 114.20, 202.66, 714.5, 11, rgb(0, 0.15, 0.6));

    // 2. एजेंट कोड (Box 2 Left: minX=114.20, maxX=202.66, minY=685.01, maxY=704.04)
    drawCenteredInBox(workerCode, 114.20, 202.66, 690.5, 11, rgb(0.8, 0, 0));

    // 3. अपलाईन कोड (Box 3 Left: minX=114.20, maxX=202.66, minY=662.20, maxY=681.24)
    drawCenteredInBox(seniorCode, 114.20, 202.66, 668.0, 11, rgb(0.8, 0, 0));

    // 4. आवेदन दि. (Box 1 Right: minX=464.03, maxX=552.48, minY=708.85, maxY=727.89)
    drawCenteredInBox(applicationDate, 464.03, 552.48, 714.5, 10.5, rgb(0, 0.15, 0.6));

    // 5. सदस्यता क्र. (Box 2 Right: minX=464.03, maxX=552.48, minY=683.44, maxY=702.48)
    drawCenteredInBox(membershipNo, 464.03, 552.48, 689.0, 10.5, rgb(0, 0.15, 0.6));

    // ── 5.2 Middle Table Section ─────────────────────────────────
    // Left Column (Rows 1-6)
    // Row 1: नाम :- (blY: 637.90)
    drawBounded(applicantName, 78, 637.90, 10.5, 170);

    // Row 2: पिता/पति का नाम :- (blY: 616.50)
    drawBounded(fatherHusbandName, 142, 616.50, 10.5, 105);

    // Row 3: आधार नं. :- (blY: 595.10)
    drawBounded(applicantAadhaar, 103, 595.10, 10.5, 145);

    // Row 4: जाति :- (blY: 573.80)
    drawBounded(gotra, 83, 573.80, 10.5, 165);

    // Row 5: सम्बन्ध :- (blY: 552.40)
    drawBounded(relation, 92, 552.40, 10.5, 155);

    // Row 6: गांव :- (blY: 531.00)
    drawBounded(village, 79, 531.00, 10.5, 170);

    // Right Column (Rows 1-6)
    // Row 1: नॉमिनी नाम :- (blY: 637.90)
    drawBounded(nomineeName, 320, 637.90, 10.5, 140);

    // Row 2: नॉमिनी आधार नं. :- (blY: 616.50)
    drawBounded(nomineeAadhaar, 345, 616.50, 10, 115);

    // Row 3: नॉमिनी मो. नं. :- (blY: 595.10)
    drawBounded(nomineeMobile, 330, 595.10, 10, 130);

    // Row 4: एजेंट मो. नं. :- (blY: 573.80)
    drawBounded(agentMobile, 325, 573.80, 10, 135);

    // Row 5: जिला :- (blY: 552.40)
    drawBounded(district, 293, 552.40, 10.5, 165);

    // Row 6: राज्य :- (blY: 531.00)
    drawBounded(state, 290, 531.00, 10.5, 240);

    // ── 5.3 Bottom Amount Line ───────────────────────────────────
    // मुकलावा ... रूपये प्रत्येक मुकलावा पर लागू (blY: 506.30)
    const installmentText = resolveLadoBahinInstallmentText(record, body);
    drawCenteredInBox(installmentText, 215.0, 285.0, 506.30, 10.5, rgb(0, 0.15, 0.6));

    // ── 5.4 Bottom Benefit / Muklawa Line ────────────────────────
    // इस योजना का लाभ 01-03-2027 के बाद मिलेगा (blY: 481.80)
    const fixedBenefitDate = '01-03-2027';
    drawCenteredInBox(fixedBenefitDate, 285.0, 342.0, 481.80, 10.5, rgb(0.8, 0, 0));

    // 6. Serialize and Return PDF
    const pdfBytes = await pdfDoc.save();

    const downloadFileName = buildPdfFilename(record, { prefix: 'lado_bahin_bond' });
    const encodedFilename = encodeURIComponent(downloadFileName);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
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
