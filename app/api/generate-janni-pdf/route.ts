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
      record?.passportPhoto,
      record?.passport_photo,
      record?.applicantPhoto,
      record?.applicant_photo,
    );

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_application', 'janni_sahayata_form.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'janni_sahayata_form.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Janni form template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    // Measured Photo Box from official template (612 x 792):
    // Photo box at top right: x = 469, y = 512 to 624 (w: 94, h: 112, yFromTop: 168)
    const PHOTO_X = 469;
    const PHOTO_Y_FROM_TOP = 168;
    const PHOTO_WIDTH = 94;
    const PHOTO_HEIGHT = 112;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT);
    }

    // Embed applicant/director signatures if provided (placed neatly above the bottom signature labels)
    const applicantSignatureSource = pickPhotoSource(
      body?.applicantSignature,
      record?.applicantSignature,
      record?.signature,
      record?.signaturePhoto,
    );
    const directorSignatureSource = pickPhotoSource(
      body?.directorSignature,
      record?.directorSignature,
      record?.authorizedSignature,
    );

    if (applicantSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantSignatureSource, 45, 675, 90, 32);
    }
    if (directorSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 465, 675, 90, 32);
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
      if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return;
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

    // ── 1. Top Header Boxes ──────────────────────────────────
    // Template has "क्रमांक : NGO/26/" pre-printed from x=46.16 to 125.98.
    // Strip leading "NGO/26/" if present to avoid duplication.
    const rawFormNo = getField(record, 'formNumber', 'form_number', 'applicationNumber', 'application_number');
    const formNo = rawFormNo.replace(/^NGO\/26\//i, '').trim();
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));

    drawBounded(formNo, 130, 621.5, 10, 200);
    drawBounded(appDate, 452, 621.5, 10, 110);

    // ── 2. Applicant Section ─────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherHusbandName = getField(record, 'husbandName', 'husband_name', 'fatherName', 'father_name');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const rawGender = getField(record, 'gender', 'childGender') || 'महिला';
    const gender = rawGender.includes('/') ? rawGender.split('/')[0].trim() : rawGender;
    const education = getField(record, 'education', 'qualification');
    const aadhar = getField(record, 'aadharNumber', 'aadhar_number', 'aadhar');
    const address = [getField(record, 'address'), getField(record, 'tehsil')].filter(Boolean).join(', ');
    const district = getField(record, 'district');
    const state = getField(record, 'state') || 'राजस्थान';
    const mobile = getField(record, 'mobile', 'mobileNumber', 'phone');

    drawBounded(applicantName, 72, 593.5, 10, 390);
    drawBounded(fatherHusbandName, 128, 565.8, 10, 330);
    drawBounded(dob, 100, 538.2, 9.5, 80);
    drawBounded(gender, 204, 538.2, 9.5, 68);
    drawBounded(education, 306, 538.2, 9.5, 154);
    drawBounded(aadhar, 140, 510.5, 10, 320);
    drawBounded(address, 70, 482.7, 9.5, 490);
    drawBounded(district, 75, 455.0, 9.5, 95);
    drawBounded(state, 200, 455.0, 9.5, 105);
    drawBounded(mobile, 342, 455.0, 9.5, 220);

    // ── 3. Nominee & Payment Section ─────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadharNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile') || mobile;
    const workerName = getField(record, 'workerName', 'worker_name', 'referralName');

    const totalAmount = getField(record, 'totalAmount', 'total_amount', 'amount', 'fee');
    const amountStr = totalAmount ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : '';
    const paymentMode = [
      getField(record, 'paymentMode', 'payment_mode'),
      getField(record, 'epinCode', 'epin_code') ? `EPIN: ${getField(record, 'epinCode', 'epin_code')}` : ''
    ].filter(Boolean).join(' / ');
    const seniorWorker = getField(record, 'seniorWorker', 'senior_worker');

    drawBounded(nomineeName, 116, 427.3, 9.5, 190);
    drawBounded(nomineeRelation, 348, 427.3, 9.5, 215);
    drawBounded(nomineeAadhar, 140, 399.5, 9, 122);
    drawBounded(nomineeMobile, 286, 399.5, 9, 126);
    drawBounded(workerName, 480, 399.5, 9, 85);

    drawBounded(amountStr, 70, 371.8, 9, 54);
    drawBounded(paymentMode, 255, 371.8, 8.5, 120);
    drawBounded(seniorWorker, 476, 371.8, 9, 88);

    // ── 4. Shapath-Patra (शपथ-पत्र) Section ─────────────────
    const age = getField(record, 'age');
    const ageStr = age ? `${age} वर्ष` : '';
    const gotra = getField(record, 'gotra');
    const fullAddress = [getField(record, 'address'), getField(record, 'tehsil'), district, getField(record, 'state')].filter(Boolean).join(', ');

    drawBounded(applicantName, 56, 237.4, 9.5, 134);
    drawBounded(fatherHusbandName, 292, 237.4, 9.5, 114);
    drawBounded(ageStr, 430, 237.4, 9.5, 54);
    drawBounded(gotra, 510, 237.4, 9.5, 54);
    drawBounded(fullAddress, 78, 203.2, 9, 112);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="janni_form_${formNo || 'document'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Janni form PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Janni PDF' },
      { status: 500 }
    );
  }
}
