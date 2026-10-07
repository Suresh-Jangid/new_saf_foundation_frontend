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
      body?.nomineePhotoData,
      body?.nomineePhoto,
      body?.nomineePhotoUrl,
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
      record?.nomineePhotoUrl,
      record?.nominee_photo_url
    );

    const masterTemplatePath = path.join(
      process.cwd(),
      'public',
      'pdf',
      'master',
      'common_application_form.pdf'
    );
    if (!fs.existsSync(masterTemplatePath)) {
      const canonicalSource = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'parivar_kalyan_form.pdf');
      if (fs.existsSync(canonicalSource)) {
        const masterDir = path.dirname(masterTemplatePath);
        if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });
        fs.copyFileSync(canonicalSource, masterTemplatePath);
      }
    }

    const fallbackTemplatePath = path.join(
      process.cwd(),
      'public',
      'pdf',
      'general_insurance_application',
      'parivar_kalyan_form.pdf'
    );
    const templatePath = fs.existsSync(masterTemplatePath) ? masterTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Insurance PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    // Photo Box: exact vector bounds from common_application_form.pdf (x: 476.0, yTop: 204.0, w: 76.3, h: 83.3)
    const PHOTO_X = 476.0;
    const PHOTO_Y_TOP = 204.0;
    const PHOTO_WIDTH = 76.3;
    const PHOTO_HEIGHT = 83.3;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_TOP, PHOTO_WIDTH, PHOTO_HEIGHT, 'cover');
    }

    // Nominee Photo Box: exact vector bounds from common_application_form.pdf (x: 476.0, yTop: 295.0, w: 76.3, h: 83.3)
    const NOMINEE_PHOTO_X = 476.0;
    const NOMINEE_PHOTO_Y_TOP = 295.0;
    const NOMINEE_PHOTO_WIDTH = 76.3;
    const NOMINEE_PHOTO_HEIGHT = 83.3;

    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, NOMINEE_PHOTO_X, NOMINEE_PHOTO_Y_TOP, NOMINEE_PHOTO_WIDTH, NOMINEE_PHOTO_HEIGHT, 'cover');
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
    // System Form Number: S-###
    const systemFormNo = getField(record, 'formNumber', 'form_number', 'systemFormNumber', 'insuranceNumber');
    // Offline Form Number: after क्रमांक : NGO/26/
    const offlineFormNo = getField(record, 'offlineFormNumber', 'offline_form_number', 'offlineFormNo', 'membershipNumber');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));

    // In the printed "क्रमांक : NGO/26/" field, render offlineFormNo or systemFormNo fallback
    const formNoDisplay = offlineFormNo || systemFormNo;
    drawBounded(formNoDisplay, 125, 648.8, 10, 100, rgb(0, 0.15, 0.6));
    // Application Date
    drawBounded(appDate, 445, 648.8, 9.5, 105);

    // ── 2. Applicant Section ────────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherOrHusband = getField(record, 'fatherName', 'father_name', 'husbandName', 'husband_name', 'parentName', 'parent_name') ||
      (record.gender === 'Female' ? getField(record, 'wifeName', 'wife_name') : '');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const gender = getField(record, 'gender', 'लिंग');
    const gotra =
      getField(record, 'gotra', 'gotra_name') ||
      getField(body, 'gotra', 'gotra_name') ||
      '';
    const aadhaar = getField(record, 'aadharNumber', 'aadhar_number', 'aadhaarNumber', 'aadhaar_number', 'aadhar');
    const address = getField(record, 'address', 'resident', 'village', 'पता');
    const district = getField(record, 'district', 'जिला');
    const state = getField(record, 'state', 'राज्य') || 'Rajasthan';
    const mobile = getField(record, 'mobile', 'phone', 'contact', 'मोबाइल');

    drawBounded(applicantName, 62, 621.1, 10, 390);
    drawBounded(fatherOrHusband, 122, 593.3, 10, 330);
    drawBounded(dob, 92, 565.6, 9.5, 75);
    drawBounded(gender, 198, 565.6, 9.5, 62);
    drawBounded(gotra, 295, 565.6, 9.5, 155);
    drawBounded(aadhaar, 130, 537.9, 10, 320);
    drawBounded(address, 58, 510.2, 9.5, 390);
    drawBounded(district, 65, 482.4, 9.5, 92);
    drawBounded(state, 190, 482.4, 9.5, 105);
    drawBounded(mobile, 332, 482.4, 9.5, 215);

    // ── 3. Nominee & Worker Section ─────────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhaar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadhaar', 'nominee_aadhaar', 'nomineeAadharNumber', 'nomineeAadhaarNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile', 'nomineePhone');
    const workerCodeOrName = getField(record, 'workerOfflineFormNumber', 'worker_offline_form_number', 'agentOfflineFormNumber', 'agent_offline_form_number', 'karyakartaOfflineFormNumber', 'workerOfflineFormNo', 'agentOfflineFormNo', 'workerCode', 'worker_code', 'agentCode', 'workerName', 'worker_name', 'agentName');

    const installments = Array.isArray(record?.installments)
      ? record.installments
      : Array.isArray(body?.installments)
      ? body.installments
      : [];
    const firstInstallment = installments.length > 0 ? installments[0] : null;

    // Membership receipt amount resolution: strict priority paymentAmount -> payment_amount -> paidAmount -> receivedAmount
    // DO NOT use installments[0].amount as the membership receipt amount
    const rawReceiptAmount =
      getField(record, 'paymentAmount', 'payment_amount', 'paidAmount', 'receivedAmount') ||
      getField(body, 'paymentAmount', 'payment_amount', 'paidAmount', 'receivedAmount') ||
      getField(record, 'totalAmount', 'total_amount', 'amount', 'fee', 'rashi', 'राशि', 'membershipFee') ||
      getField(body, 'totalAmount', 'total_amount', 'amount', 'fee', 'rashi', 'राशि', 'membershipFee');
    const receiptAmountStr = rawReceiptAmount ? (rawReceiptAmount.endsWith('/-') ? rawReceiptAmount : `${rawReceiptAmount}/-`) : '';

    // Form Line 10 (Registration fee / Amount field on upper section)
    const rawFormAmount =
      getField(record, 'totalAmount', 'total_amount', 'amount', 'fee', 'rashi', 'राशि', 'membershipFee', 'paymentAmount', 'payment_amount') ||
      getField(body, 'totalAmount', 'total_amount', 'amount', 'fee', 'rashi', 'राशि', 'membershipFee', 'paymentAmount', 'payment_amount') ||
      rawReceiptAmount;
    const formAmountStr = rawFormAmount ? (rawFormAmount.endsWith('/-') ? rawFormAmount : `${rawFormAmount}/-`) : '';

    // Payment mode resolution with strict priority:
    // paymentMode -> payment_mode -> installments.paymentMode -> installments.payment_mode
    const lastInstallment = installments.length > 0 ? installments[installments.length - 1] : null;

    const normalizeMode = (mode: string): string => {
      const trimmed = String(mode || '').trim();
      const upper = trimmed.toUpperCase();
      if (upper === 'CASH') return 'Cash';
      if (upper === 'RAZORPAY') return 'Razorpay';
      if (upper === 'CHEQUE') return 'Cheque';
      if (upper === 'DD') return 'DD';
      return trimmed;
    };

    const rawPaymentMode =
      (lastInstallment?.paymentMode ? String(lastInstallment.paymentMode).trim() : '') ||
      (lastInstallment?.payment_mode ? String(lastInstallment.payment_mode).trim() : '') ||
      getField(record, 'paymentMode') ||
      getField(record, 'payment_mode') ||
      getField(body, 'paymentMode') ||
      getField(body, 'payment_mode') ||
      (firstInstallment?.paymentMode ? String(firstInstallment.paymentMode).trim() : '') ||
      (firstInstallment?.payment_mode ? String(firstInstallment.payment_mode).trim() : '');

    const resolvedPaymentMode = normalizeMode(rawPaymentMode);

    const firstInstallmentRef =
      lastInstallment?.receiptNo ||
      lastInstallment?.transactionId ||
      lastInstallment?.utr ||
      firstInstallment?.receiptNo ||
      firstInstallment?.transactionId ||
      firstInstallment?.utr ||
      '';

    const paymentDisplayValue =
      resolvedPaymentMode ||
      getField(
        record,
        'paymentModeRef',
        'transactionId',
        'transaction_id',
        'utr',
        'utrNo',
        'utr_no',
        'paymentRef',
        'payment_ref',
        'referenceNo'
      ) ||
      getField(
        body,
        'paymentModeRef',
        'transactionId',
        'transaction_id',
        'utr',
        'utrNo',
        'utr_no',
        'paymentRef',
        'payment_ref',
        'referenceNo'
      ) ||
      (firstInstallmentRef ? String(firstInstallmentRef) : '');

    const seniorCodeOrName = getField(record, 'seniorOfflineFormNumber', 'senior_offline_form_number', 'seniorAgentOfflineFormNumber', 'senior_agent_offline_form_number', 'seniorOfflineFormNo', 'seniorCode', 'senior_code', 'seniorWorkerName', 'senior_worker_name', 'seniorName', 'senior_name');

    drawBounded(nomineeName, 108, 454.7, 10, 185);
    drawBounded(nomineeRelation, 338, 454.7, 10, 210);
    drawBounded(nomineeAadhaar, 130, 427.0, 9.5, 120);
    drawBounded(nomineeMobile, 275, 427.0, 9.5, 125);
    drawBounded(workerCodeOrName, 472, 427.0, 9.5, 75);
    drawBounded(formAmountStr, 60, 399.3, 9.5, 90);
    drawBounded(paymentDisplayValue, 285, 399.3, 9.5, 120);
    drawBounded(seniorCodeOrName, 472, 399.3, 9.5, 75);

    // ── 4. Section 2: सदस्यता फार्म रसीद (Receipt Section) ──────
    drawBounded(formNoDisplay, 125, 181.3, 10, 100, rgb(0, 0.15, 0.6));
    drawBounded(appDate, 472, 181.3, 9.5, 80);
    drawBounded(applicantName, 58, 159.5, 10, 180);
    drawBounded(fatherOrHusband, 330, 159.5, 10, 218);
    drawBounded(address, 58, 137.6, 9.5, 490);
    drawBounded(mobile, 55, 115.7, 9.5, 172);
    drawBounded(paymentDisplayValue, 308, 115.7, 9.5, 240);
    drawBounded(receiptAmountStr, 88, 93.8, 9.5, 142);
    drawBounded(receiptAmountStr, 115, 51.0, 11, 120, rgb(0, 0.15, 0.6));

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
