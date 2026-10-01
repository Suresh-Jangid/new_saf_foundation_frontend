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
      record?.passportPhotoUrl,
      record?.applicantPhoto,
      record?.applicant_photo,
      record?.photo,
      record?.photoUrl,
      record?.profile_photo,
      record?.profilePhoto
    );
    const nomineePhotoSource = pickPhotoSource(
      body?.nomineeImageData,
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
    );

    const masterTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'master', 'common_application_form.pdf');
    if (!fs.existsSync(masterTemplatePath)) {
      const canonicalSource = path.join(process.cwd(), 'public', 'pdf', 'mayra_application', 'mayra_form.pdf');
      if (fs.existsSync(canonicalSource)) {
        const masterDir = path.dirname(masterTemplatePath);
        if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });
        fs.copyFileSync(canonicalSource, masterTemplatePath);
      }
    }

    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra_application', 'mayra_form.pdf');
    const legacyFallbackPath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_registration_form.pdf');
    const templatePath = fs.existsSync(masterTemplatePath)
      ? masterTemplatePath
      : fs.existsSync(fallbackTemplatePath)
      ? fallbackTemplatePath
      : legacyFallbackPath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    // Photo Box: exact vector bounds from common_application_form.pdf (x: 476.0, yTop: 204.0, w: 76.3, h: 83.3)
    const PHOTO_X = 476.0;
    const PHOTO_Y_FROM_TOP = 204.0;
    const PHOTO_WIDTH = 76.3;
    const PHOTO_HEIGHT = 83.3;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT, 'cover');
    }

    // Embed applicant/director signatures if provided
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
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantSignatureSource, 45, 605, 90, 32);
    }
    if (directorSignatureSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, directorSignatureSource, 485, 605, 90, 32);
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

    // ── 1. Top Header Boxes ──────────────────────────────────
    // System Form Number: e.g. MYR-3
    const systemFormNo = getField(record, 'formNumber', 'form_number', 'systemFormNumber', 'mayraNumber');
    // Offline Form Number: e.g. 1259
    const offlineFormNo = getField(record, 'offlineFormNumber', 'offline_form_number', 'offlineFormNo', 'membershipNumber');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));

    const formNoDisplay = offlineFormNo || systemFormNo;
    drawBounded(formNoDisplay, 125, 648.8, 10, 100, rgb(0, 0.15, 0.6));
    drawBounded(appDate, 445, 648.8, 9.5, 105);

    // ── 2. Applicant Section ─────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const parentName = getField(record, 'fatherName', 'father_name', 'parentName', 'parent_name', 'husbandName', 'husband_name');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const gender = getField(record, 'gender', 'लिंग') || 'महिला';
    const educationOrGotra = getField(record, 'education', 'qualification', 'शिक्षा', 'gotra', 'गोत्र', 'caste', 'category');
    const address = getField(record, 'address', 'resident', 'village', 'पता');
    const aadharNo = getField(record, 'aadharNumber', 'aadhar_number', 'aadhaarNumber', 'aadhaar_number', 'aadhar');
    const district = getField(record, 'district', 'nomineeDistrict', 'nominee_district', 'जिला');
    const state = getField(record, 'state', 'nomineeState', 'nominee_state', 'राज्य') || 'राजस्थान';
    const mobile = getField(record, 'mobile', 'mobileNumber', 'phone', 'contact', 'applicantMobile');

    drawBounded(applicantName, 62, 621.1, 10, 390);
    drawBounded(parentName, 122, 593.3, 10, 330);
    drawBounded(dob, 92, 565.6, 9.5, 75);
    drawBounded(gender, 198, 565.6, 9.5, 62);
    drawBounded(educationOrGotra, 295, 565.6, 9.5, 155);
    drawBounded(aadharNo, 130, 537.9, 10, 320);
    drawBounded(address, 58, 510.2, 9.5, 390);
    drawBounded(district, 65, 482.4, 9.5, 92);
    drawBounded(state, 190, 482.4, 9.5, 105);
    drawBounded(mobile, 332, 482.4, 9.5, 215);

    // ── 3. Nominee & Payment Section ─────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadhaar', 'nominee_aadhaar', 'nomineeAadharNumber', 'nomineeAadhaarNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile', 'nomineePhone', 'nominee_phone');
    const workerCodeOrName = getField(record, 'workerOfflineFormNumber', 'worker_offline_form_number', 'agentOfflineFormNumber', 'agent_offline_form_number', 'karyakartaOfflineFormNumber', 'workerOfflineFormNo', 'agentOfflineFormNo', 'workerCode', 'worker_code', 'agentCode', 'workerName', 'worker_name', 'agentName');

    const totalAmount = getField(record, 'totalAmount', 'total_amount', 'membershipFee', 'amount', 'fee', 'paymentAmount') || '5100';
    const amountStr = totalAmount ? (String(totalAmount).endsWith('/-') ? String(totalAmount) : `${totalAmount}/-`) : '5,100/-';
    const paymentMode = [
      getField(record, 'paymentModeRef', 'paymentMode', 'payment_mode') || 'CASH',
      getField(record, 'epinCode', 'epin_code') ? `EPIN: ${getField(record, 'epinCode', 'epin_code')}` : ''
    ].filter(Boolean).join(' / ');
    const seniorWorker = getField(record, 'seniorOfflineFormNumber', 'senior_offline_form_number', 'seniorAgentOfflineFormNumber', 'senior_agent_offline_form_number', 'seniorOfflineFormNo', 'seniorCode', 'senior_code', 'seniorWorker', 'senior_worker', 'seniorName', 'senior_name');

    drawBounded(nomineeName, 108, 454.7, 10, 185);
    drawBounded(nomineeRelation, 338, 454.7, 10, 210);
    drawBounded(nomineeAadhar, 130, 427.0, 9.5, 120);
    drawBounded(nomineeMobile, 275, 427.0, 9.5, 125);
    drawBounded(workerCodeOrName, 472, 427.0, 9.5, 75);

    drawBounded(amountStr, 60, 399.3, 9.5, 90);
    drawBounded(paymentMode, 285, 399.3, 9.5, 120);
    drawBounded(seniorWorker, 472, 399.3, 9.5, 75);

    // ── 4. Section 2: सदस्यता फार्म रसीद (Receipt Section) ──────
    drawBounded(formNoDisplay, 125, 181.3, 10, 100, rgb(0, 0.15, 0.6));
    drawBounded(appDate, 472, 181.3, 9.5, 80);
    drawBounded(applicantName, 58, 159.5, 10, 180);
    drawBounded(parentName, 330, 159.5, 10, 218);
    drawBounded(address, 58, 137.6, 9.5, 490);
    drawBounded(mobile, 55, 115.7, 9.5, 172);
    drawBounded(paymentMode, 308, 115.7, 9.5, 240);
    drawBounded(amountStr, 88, 93.8, 9.5, 142);
    drawBounded(amountStr, 115, 51.0, 11, 120, rgb(0, 0.15, 0.6));

    const pdfBytes = await pdfDoc.save();
    const rawSafeName = applicantName || systemFormNo || offlineFormNo || record?.id || 'form';
    const safeName = String(rawSafeName).trim().replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_');

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MAYRA_FORM_${encodeURIComponent(safeName)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Critical error generating Mayra PDF:', error);
    return NextResponse.json({
      error: 'Failed to generate PDF',
      details: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
