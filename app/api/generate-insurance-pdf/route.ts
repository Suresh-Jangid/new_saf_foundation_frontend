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
      record?.photo
    );

    const primaryTemplatePath = path.join(
      process.cwd(),
      'public',
      'pdf',
      'general_insurance_application',
      'insurance_application_official_template.pdf'
    );
    const fallbackTemplatePath = path.join(
      process.cwd(),
      'public',
      'pdf',
      'general_insurance_application',
      'parivar_kalyan_form.pdf'
    );
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Insurance PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    // Photo Box: x = 488, yFromTop = 189 (y = 499), width = 62, height = 104
    const PHOTO_X = 488;
    const PHOTO_Y_TOP = 189;
    const PHOTO_WIDTH = 62;
    const PHOTO_HEIGHT = 104;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_TOP, PHOTO_WIDTH, PHOTO_HEIGHT);
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
      if (maxW && (font as any).widthOfTextAtSize) {
        const w = (font as any).widthOfTextAtSize(str, size);
        if (w > maxW) {
          s = Math.max(6.0, size * (maxW / w));
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

    // ── 1. Header Numbers & Date ────────────────────────────────
    // System Form Number: S-### in upper header area
    const systemFormNo = getField(record, 'formNumber', 'form_number', 'systemFormNumber', 'insuranceNumber');
    // Offline Form Number: after क्रमांक : NGO/26/
    const offlineFormNo = getField(record, 'offlineFormNumber', 'offline_form_number', 'offlineFormNo', 'membershipNumber');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));

    // S-* System Form Number
    drawBounded(systemFormNo, 95, 680, 11, 100);
    // Offline Form Number (only if present, blank if null)
    drawBounded(offlineFormNo, 142, 627, 10.5, 90);
    // Application Date
    drawBounded(appDate, 490, 627, 10.5, 90);

    // ── 2. Applicant Section ────────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherOrHusband = getField(record, 'fatherName', 'father_name', 'husbandName', 'husband_name', 'parentName', 'parent_name') ||
      (record.gender === 'Female' ? getField(record, 'wifeName', 'wife_name') : '');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const gender = getField(record, 'gender', 'लिंग');
    const education = getField(record, 'education', 'qualification', 'शिक्षा');
    const aadhaar = getField(record, 'aadharNumber', 'aadhar_number', 'aadhaarNumber', 'aadhaar_number', 'aadhar');
    const address = getField(record, 'address', 'resident', 'village', 'पता');
    const district = getField(record, 'district', 'जिला');
    const state = getField(record, 'state', 'राज्य') || 'Rajasthan';
    const mobile = getField(record, 'mobile', 'phone', 'contact', 'मोबाइल');

    drawBounded(applicantName, 75, 603, 10, 395);
    drawBounded(fatherOrHusband, 125, 582, 10, 345);
    drawBounded(dob, 110, 561, 10, 105);
    drawBounded(gender, 255, 561, 10, 60);
    drawBounded(education, 355, 561, 10, 110);
    drawBounded(aadhaar, 150, 540, 10, 320);
    drawBounded(address, 75, 519, 10, 395);
    drawBounded(district, 75, 498, 10, 140);
    drawBounded(state, 260, 498, 10, 105);
    drawBounded(mobile, 420, 498, 10, 125);

    // ── 3. Nominee & Worker Section ─────────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhaar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadhaar', 'nominee_aadhaar', 'nomineeAadharNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile', 'nomineePhone');
    const workerName = getField(record, 'workerName', 'worker_name', 'agentName', 'agent_name', 'karyakartaName', 'added_name', 'addedby');
    const amount = getField(record, 'paymentAmount', 'payment_amount', 'amount', 'fee', 'rashi', 'राशि');
    const paymentRef = getField(record, 'transactionId', 'transaction_id', 'utr', 'utrNo', 'utr_no', 'paymentRef', 'payment_ref', 'referenceNo', 'paymentMode', 'payment_mode');
    const seniorWorkerName = getField(record, 'seniorWorkerName', 'senior_worker_name', 'seniorName', 'senior_name', 'seniorWorker', 'senior');

    drawBounded(nomineeName, 125, 477, 10, 230);
    drawBounded(nomineeRelation, 410, 477, 10, 135);
    drawBounded(nomineeAadhaar, 150, 456, 10, 140);
    drawBounded(nomineeMobile, 325, 456, 10, 95);
    drawBounded(workerName, 500, 456, 10, 135);
    drawBounded(amount, 75, 435, 10, 115);
    drawBounded(paymentRef, 335, 435, 9.5, 145);
    drawBounded(seniorWorkerName, 510, 435, 9.5, 125);

    // ── 4. Oath Section (शपथ - पत्र) ─────────────────────────
    const age = getField(record, 'age', 'computedAge', 'computed_age', 'उम्र');
    const gotra = getField(record, 'gotra', 'गोत्र');

    drawBounded(applicantName, 65, 346, 9.5, 185);
    drawBounded(fatherOrHusband, 350, 346, 9.5, 140);
    drawBounded(age, 525, 346, 9.5, 30);
    drawBounded(gotra, 580, 346, 9.5, 45);
    drawBounded(address, 85, 325, 9.5, 200);

    const pdfBytes = await pdfDoc.save();
    const rawSafeName = applicantName || systemFormNo || offlineFormNo || record?.id || 'form';
    const safeName = String(rawSafeName).trim().replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_');

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="INSURANCE_APPLICATION_${encodeURIComponent(safeName)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Critical error generating Insurance Application PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insurance PDF',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
