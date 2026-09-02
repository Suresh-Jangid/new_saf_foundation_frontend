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
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
    } = await request.json();

    console.log('Received marriage congratulations data:', data);

    // Primary official template: vivahHisab.pdf
    const officialTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'vivahHisab.pdf');
    let templatePath = officialTemplatePath;

    if (!fs.existsSync(templatePath)) {
      // Graceful fallback to legacy template if official template is missing
      const gender = data?.gender || data?.लिंग;
      if (gender === 'Male' || gender === 'पुरुष' || gender === 'male') {
        templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'boys_marriage_payment_form.pdf');
      } else {
        templatePath = path.join(process.cwd(), 'public', 'pdf', 'marriage_application', 'girl_marriage_payment_form.pdf');
      }
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

    // Embed Devanagari font
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
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: false });
    } else {
      font = await pdfDoc.embedFont('Helvetica');
    }

    // Determine gender
    const rawGender = data?.gender || data?.लिंग || '';
    const isMale = rawGender === 'Male' || rawGender === 'पुरुष' || rawGender === 'male';

    // Extract raw field values from either English or Hindi keys
    const rawDate = data?.date || data?.दिनांक || '';
    const dateStr = rawDate ? formatDateToDDMMYYYY(rawDate) : '';
    const codeNumber = String(data?.codeNumber || data?.कोड_नंबर || data?.formNumber || '');
    const marriageNumber = String(data?.marriageNumber || data?.विवाह_संख्या || '');
    const applicantName = String(data?.applicantName || data?.आवेदक_का_नाम || '');
    const fatherName = String(data?.fatherName || data?.पिता_का_नाम || '');
    const wifeOf = String(data?.wifeOf || data?.पति_का_नाम || '');
    const parentOrSpouse = isMale ? (fatherName || wifeOf) : (wifeOf || fatherName);
    const gotra = String(data?.gotra || data?.गोत्र || '');
    const address = String(data?.address || data?.निवासी || '');

    const rawJoinDate = data?.membershipJoinDate || data?.सदस्यता_तिथि || '';
    const membershipJoinDate = rawJoinDate ? formatDateToDDMMYYYY(rawJoinDate) : '';
    const associatedUntil = String(data?.associatedUntil || data?.संस्था_से_जुड़ी_रही || '');
    const permanentFee = String(data?.permanentFee || data?.स्थायी_शुल्क || '');
    const installmentAmount = String(data?.installmentAmount || data?.किस्त_राशि || '');
    const totalGrantAmount = String(data?.totalGrantAmount || data?.कुल_अनुदान || '');
    const totalMembersServing = String(data?.totalMembersServing || data?.कुल_सदस्य || '');

    // Calculations for 300 / 1000 installment table
    const rate300Count = Number(data?.rate300 ?? data?.rate_300 ?? 0);
    const rate1000Count = Number(data?.rate1000 ?? data?.rate_1000 ?? 0);
    const rate100Count = Number(data?.rate100 ?? data?.rate_100 ?? 0);
    const rate200Count = Number(data?.rate200 ?? data?.rate_200 ?? 0);

    const sum300 = rate300Count > 0 ? rate300Count * 300 : 0;
    const sum1000 = rate1000Count > 0 ? rate1000Count * 1000 : 0;

    // Determine total installment sum
    let totalMultipliedRate = 0;
    if (data?.totalMultipliedRate !== undefined && data?.totalMultipliedRate !== null) {
      totalMultipliedRate = Number(data.totalMultipliedRate);
    } else if (rate1000Count > 0 || (rate100Count === 0 && rate200Count === 0)) {
      totalMultipliedRate = sum300 + sum1000;
    } else {
      totalMultipliedRate = (rate100Count * 100) + (rate200Count * 200) + sum300;
    }

    // Deduction calculation
    const rawDeductedAmount = data?.deductedAmount ?? data?.कटौती_राशि;
    const deductedAmount = rawDeductedAmount !== undefined && rawDeductedAmount !== null && rawDeductedAmount !== ''
      ? String(rawDeductedAmount)
      : String(Math.round(totalMultipliedRate * 0.15));

    // Final total payment calculation
    const rawTotalPaid = data?.totalPaidAmount ?? data?.कुल_भुगतान;
    const totalPaidAmount = rawTotalPaid !== undefined && rawTotalPaid !== null && rawTotalPaid !== ''
      ? String(rawTotalPaid)
      : String(totalMultipliedRate - Number(deductedAmount));

    // Note line details
    const runningNumber = String(data?.runningNumber || data?.रनिंग_क्रम_संख्या || marriageNumber || '');
    const closedAccounts = String(data?.closedAccounts || data?.बंद_खाते || '0');
    const activeAccounts = String(data?.activeAccounts || data?.चालू_खाते || totalMembersServing || '');

    // Request offsets
    const globalOffsetX = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY = typeof offsetY === 'number' ? offsetY : 0;
    const valOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;

    // Helper: draw text with dynamic width scaling to prevent overflow/overlap
    const drawBoundedText = (
      text: string,
      x: number,
      y: number,
      defaultSize: number = 9.5,
      maxWidth: number = 200,
      textColor = rgb(0.1, 0.1, 0.1)
    ) => {
      if (!text || text.trim() === '') return;
      const cleanText = text.trim();
      let size = defaultSize;

      if (font.widthOfTextAtSize) {
        try {
          const textWidth = font.widthOfTextAtSize(cleanText, defaultSize);
          if (textWidth > maxWidth) {
            size = Math.max(6.5, defaultSize * (maxWidth / textWidth));
          }
        } catch {}
      }

      firstPage.drawText(cleanText, {
        x: x + globalOffsetX + valOffsetX,
        y: y + globalOffsetY + valOffsetY,
        size,
        font,
        color: textColor,
      });
    };

    // --- RENDER DYNAMIC DATA ON OFFICIAL vivahHisab.pdf ---
    // 1. Header Details
    drawBoundedText(dateStr, 80, 627, 9.5, 75);
    drawBoundedText(codeNumber, 495, 627, 9.5, 75);
    drawBoundedText(marriageNumber, 495, 604, 9.5, 75);

    // 2. Personal Information
    drawBoundedText(applicantName, 72, 581, 9.5, 150);
    drawBoundedText(parentOrSpouse, 298, 581, 9.5, 140);
    drawBoundedText(gotra, 475, 581, 9.5, 90);
    drawBoundedText(address, 80, 559, 9.5, 485);

    // 3. Institution Details (colon at x=274)
    drawBoundedText(membershipJoinDate, 290, 538, 9.5, 275);
    drawBoundedText(associatedUntil, 290, 515, 9.5, 275);
    drawBoundedText(permanentFee, 290, 492, 9.5, 275);
    drawBoundedText(installmentAmount, 290, 470, 9.5, 275);
    drawBoundedText(totalGrantAmount, 290, 447, 9.5, 275);
    drawBoundedText(totalMembersServing, 290, 424, 9.5, 275);

    // 4. Installment Calculation Table
    // Row 1: 300 x [सदस्य] = [योग]
    drawBoundedText(String(rate300Count), 290, 361, 9.5, 75);
    drawBoundedText(String(sum300), 395, 361, 9.5, 70);

    // Row 2: 1000 x [सदस्य] = [योग]
    drawBoundedText(String(rate1000Count), 290, 342, 9.5, 75);
    drawBoundedText(String(sum1000), 395, 342, 9.5, 70);

    // Row 3: कुल योग
    drawBoundedText(String(totalMultipliedRate), 320, 318, 9.5, 130);

    // 5. 15% Deduction & Final Payment
    drawBoundedText(deductedAmount, 360, 263, 10, 105);
    drawBoundedText(totalPaidAmount, 360, 232, 10, 105);

    // 6. Note Line (रनिंग क्रम संख्या, बंद खाते, चालू खाते)
    drawBoundedText(runningNumber, 160, 151, 9, 100);
    drawBoundedText(closedAccounts, 345, 151, 9, 65);
    drawBoundedText(activeAccounts, 475, 151, 9, 90);

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Preserve filename convention
    const safeMarriageNumber = marriageNumber || 'form';
    let filename = 'marriage_congratulations_form.pdf';
    if (rawGender === 'Female' || rawGender === 'महिला') {
      filename = `girl_marriage_congratulations_${safeMarriageNumber}.pdf`;
    } else if (rawGender === 'Male' || rawGender === 'पुरुष') {
      filename = `boys_marriage_congratulations_${safeMarriageNumber}.pdf`;
    } else {
      filename = `marriage_congratulations_${safeMarriageNumber}.pdf`;
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
