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

    // Photo Box: x = 468, yFromTop = 197 (y = 474), width = 93, height = 120
    const PHOTO_X = 468;
    const PHOTO_Y_TOP = 197;
    const PHOTO_WIDTH = 93;
    const PHOTO_HEIGHT = 120;

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
    // System Form Number: S-### in upper header area (above offline number 1259)
    const systemFormNo = getField(record, 'formNumber', 'form_number', 'systemFormNumber', 'insuranceNumber');
    // Offline Form Number: after क्रमांक : NGO/26/
    const offlineFormNo = getField(record, 'offlineFormNumber', 'offline_form_number', 'offlineFormNo', 'membershipNumber');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));

    // S-* System Form Number
    drawBounded(systemFormNo, 140, 642, 11, 85);
    // Offline Form Number (only if present, blank if null)
    drawBounded(offlineFormNo, 138, 622.5, 10.5, 270);
    // Application Date
    drawBounded(appDate, 452, 622.5, 10.5, 110);

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

    drawBounded(applicantName, 72, 595.0, 10.5, 390);
    drawBounded(fatherOrHusband, 128, 567.3, 10, 335);
    drawBounded(dob, 100, 539.5, 10, 78);
    drawBounded(gender, 208, 539.5, 10, 62);
    drawBounded(education, 304, 539.5, 10, 155);
    drawBounded(aadhaar, 140, 511.8, 10.5, 320);
    drawBounded(address, 70, 484.0, 10, 390);
    drawBounded(district, 74, 456.5, 10, 92);
    drawBounded(state, 198, 456.5, 10, 104);
    drawBounded(mobile, 340, 456.5, 10, 120);

    // ── 3. Nominee & Worker Section ─────────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhaar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadhaar', 'nominee_aadhaar', 'nomineeAadharNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile', 'nomineePhone');
    const workerName = getField(record, 'workerName', 'worker_name', 'agentName', 'agent_name', 'karyakartaName', 'added_name', 'addedby');
    const amount = getField(record, 'paymentAmount', 'payment_amount', 'amount', 'fee', 'rashi', 'राशि');
    const paymentRef = getField(record, 'transactionId', 'transaction_id', 'utr', 'utrNo', 'utr_no', 'paymentRef', 'payment_ref', 'referenceNo', 'paymentMode', 'payment_mode');
    const seniorWorkerName = getField(record, 'seniorWorkerName', 'senior_worker_name', 'seniorName', 'senior_name', 'seniorWorker', 'senior');

    drawBounded(nomineeName, 114, 428.8, 10, 188);
    drawBounded(nomineeRelation, 346, 428.8, 10, 215);
    drawBounded(nomineeAadhaar, 138, 401.0, 10, 122);
    drawBounded(nomineeMobile, 284, 401.0, 10, 124);
    drawBounded(workerName, 478, 401.0, 10, 86);
    drawBounded(amount, 68, 373.2, 10, 54);
    drawBounded(paymentRef, 254, 373.2, 9.5, 118);
    drawBounded(seniorWorkerName, 474, 373.2, 9.5, 90);

    // ── 4. Oath Section (शपथ - पत्र) ─────────────────────────
    const age = getField(record, 'age', 'computedAge', 'computed_age', 'उम्र');
    const gotra = getField(record, 'gotra', 'गोत्र');

    drawBounded(applicantName, 55, 238.8, 9.5, 134);
    drawBounded(fatherOrHusband, 290, 238.8, 9.5, 114);
    drawBounded(age, 428, 238.8, 9.5, 52);
    drawBounded(gotra, 508, 238.8, 9.5, 54);
    drawBounded(address, 78, 204.6, 9.5, 110);

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
