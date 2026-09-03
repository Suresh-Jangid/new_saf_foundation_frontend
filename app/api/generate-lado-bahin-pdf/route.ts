import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';

export const runtime = 'nodejs';

function getField(record: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const record = body?.record || body?.data || (body && typeof body === 'object' && !Array.isArray(body) ? body : {});

    const applicantPhotoSource = pickPhotoSource(
      body?.imageData,
      record?.imageData,
      record?.applicantPhotoData,
      record?.passportPhotoUrl,
      record?.passportPhoto,
      record?.passport_photo,
      record?.applicantPhoto,
      record?.applicant_photo,
      record?.photo,
      record?.photoUrl
    );

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_application', 'lado_bahin_form.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_form.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Lado Bahin form template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Template PDF has no pages' }, { status: 500 });
    }

    const firstPage = pages[0];
    const pageHeight = firstPage.getSize().height;

    // Measured Photo Box from official lado_bahin_form.pdf template (595.28 x 841.89):
    // Photo box at top right: x = 459, yFromTop = 223, w = 98, h = 122
    const PHOTO_X = 459;
    const PHOTO_Y_FROM_TOP = 223;
    const PHOTO_WIDTH = 98;
    const PHOTO_HEIGHT = 122;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    // Embed applicant/director signatures if provided
    const applicantSignatureSource = pickPhotoSource(
      body?.applicantSignature,
      record?.applicantSignature,
      record?.signature,
      record?.signaturePhoto,
      record?.signatureUrl
    );
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature
    );

    if (applicantSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantSignatureSource, 45, 740, 90, 32);
    }
    if (directorSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 455, 740, 90, 32);
    }

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    const font = fs.existsSync(fontPath)
      ? await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false })
      : await pdfDoc.embedFont('Helvetica');

    const formatDate = (value: string) => {
      if (!value) return '';
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)) {
        return value.replace(/-/g, '/');
      }
      return formatDateToDDMMYYYY(value) || value;
    };

    const drawBounded = (
      text: string,
      x: number,
      y: number,
      size: number = 10,
      maxW?: number,
      color = rgb(0, 0, 0)
    ) => {
      if (!text) return;
      const str = String(text).trim();
      if (!str) return;
      let s = size;
      if (maxW && font.widthOfTextAtSize) {
        const w = font.widthOfTextAtSize(str, size);
        if (w > maxW) {
          s = Math.max(6.5, size * (maxW / w));
        }
      }
      firstPage.drawText(str, {
        x,
        y,
        size: s,
        font,
        color,
      });
    };

    // ── 1. Top Header Reference & Date ───────────────────────
    const formNo = getField(record, 'formNumber', 'form_number', 'applicationNumber', 'application_number');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));
    drawBounded(formNo, 200, 646, 10, 130);
    drawBounded(appDate, 445, 646, 10, 110);

    // ── 2. Applicant Section ─────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherHusbandName = [
      getField(record, 'husbandName', 'husband_name'),
      getField(record, 'fatherName', 'father_name')
    ].filter(Boolean).join(' / ') || getField(record, 'fatherName', 'father_name');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const gender = getField(record, 'gender') || 'महिला / Female';
    const education = getField(record, 'education', 'qualification');
    const aadhar = getField(record, 'aadharNumber', 'aadhar_number', 'aadhar');
    const address = [getField(record, 'address'), getField(record, 'tehsil')].filter(Boolean).join(', ');
    const district = getField(record, 'district');
    const state = getField(record, 'state') || 'राजस्थान';
    const mobile = getField(record, 'mobile', 'mobileNumber', 'phone');

    drawBounded(applicantName, 90, 616, 10, 350);
    drawBounded(fatherHusbandName, 140, 587, 10, 300);
    drawBounded(dob, 115, 558, 9.5, 75);
    drawBounded(gender, 215, 558, 9.5, 75);
    drawBounded(education, 315, 558, 9.5, 130);
    drawBounded(aadhar, 150, 529, 10, 290);
    drawBounded(address, 75, 500, 9.5, 370);
    drawBounded(district, 75, 471, 9.5, 100);
    drawBounded(state, 200, 471, 9.5, 100);
    drawBounded(mobile, 350, 471, 9.5, 120);

    // ── 3. Nominee & Payment Section ─────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadharNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile') || mobile;
    const workerName = getField(record, 'workerName', 'worker_name', 'referralName', 'addedByName', 'agentName');

    const totalAmount = getField(record, 'totalAmount', 'total_amount', 'membershipFee', 'grantFee', 'amount', 'fee') || '5100';
    const amountStr = totalAmount ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : '₹5,100';
    const paymentMode = [
      getField(record, 'paymentMode', 'payment_mode') || 'CASH',
      getField(record, 'epinCode', 'epin_code') ? `EPIN: ${getField(record, 'epinCode', 'epin_code')}` : ''
    ].filter(Boolean).join(' / ');
    const seniorWorker = getField(record, 'seniorWorker', 'senior_worker');

    drawBounded(nomineeName, 135, 442, 9.5, 180);
    drawBounded(nomineeRelation, 360, 442, 9.5, 180);
    drawBounded(nomineeAadhar, 145, 413, 9, 120);
    drawBounded(nomineeMobile, 285, 413, 9, 90);
    drawBounded(workerName, 460, 413, 9, 110);

    drawBounded(amountStr, 75, 384, 9, 100);
    drawBounded(paymentMode, 250, 384, 8.5, 180);
    drawBounded(seniorWorker, 460, 384, 9, 110);

    // ── 4. Shapath-Patra (शपथ-पत्र) Section ─────────────────
    const age = getField(record, 'age');
    const ageStr = age ? `${age}` : '';
    const gotra = getField(record, 'gotra');
    const fullAddress = [getField(record, 'address'), getField(record, 'tehsil'), district, state].filter(Boolean).join(', ');

    drawBounded(applicantName, 60, 260, 9.5, 150);
    drawBounded(fatherHusbandName, 255, 260, 9.5, 140);
    drawBounded(ageStr, 410, 260, 9.5, 60);
    drawBounded(gotra, 490, 260, 9.5, 75);
    drawBounded(fullAddress, 85, 231, 9.5, 460);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lado_bahin_form_${formNo || 'document'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Lado Bahin form PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Lado Bahin form PDF' },
      { status: 500 }
    );
  }
}
