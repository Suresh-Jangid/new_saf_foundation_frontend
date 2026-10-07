import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { embedPdfImage, pickPhotoSource } from '../../utils/pdfImage';
import {
  formatPaymentModeForPdf,
  resolveCanonicalPaymentAmount,
  formatAmountToHindiWords,
  formatNumericAmountForPdf,
  parseAmountToNumber,
  buildPdfFilename,
} from '@/lib/form-values';

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

    const masterTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'master', 'common_application_form.pdf');
    if (!fs.existsSync(masterTemplatePath)) {
      const canonicalSource = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_application', 'lado_bahin_form.pdf');
      if (fs.existsSync(canonicalSource)) {
        const masterDir = path.dirname(masterTemplatePath);
        if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });
        fs.copyFileSync(canonicalSource, masterTemplatePath);
      }
    }

    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_application', 'lado_bahin_form.pdf');
    const legacyFallbackPath = path.join(process.cwd(), 'public', 'pdf', 'lado_bahin_form.pdf');
    const templatePath = fs.existsSync(masterTemplatePath)
      ? masterTemplatePath
      : fs.existsSync(fallbackTemplatePath)
      ? fallbackTemplatePath
      : legacyFallbackPath;

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

    // Photo Box: exact vector bounds from common_application_form.pdf (x: 476.0, yTop: 204.0, w: 76.3, h: 83.3)
    const PHOTO_X = 476.0;
    const PHOTO_Y_FROM_TOP = 204.0;
    const PHOTO_WIDTH = 76.3;
    const PHOTO_HEIGHT = 83.3;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, PHOTO_Y_FROM_TOP, PHOTO_WIDTH, PHOTO_HEIGHT, 'cover');
    }

    // Nominee Photo Box: exact vector bounds from common_application_form.pdf (x: 476.0, yTop: 295.0, w: 76.3, h: 83.3)
    const NOMINEE_PHOTO_X = 476.0;
    const NOMINEE_PHOTO_Y_FROM_TOP = 295.0;
    const NOMINEE_PHOTO_WIDTH = 76.3;
    const NOMINEE_PHOTO_HEIGHT = 83.3;

    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, NOMINEE_PHOTO_X, NOMINEE_PHOTO_Y_FROM_TOP, NOMINEE_PHOTO_WIDTH, NOMINEE_PHOTO_HEIGHT, 'cover');
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
    const rawFormNo = getField(record, 'offlineFormNumber', 'offline_form_number', 'offlineFormNo', 'formNumber', 'form_number', 'applicationNumber', 'application_number');
    const formNo = rawFormNo.replace(/^NGO\/26\//i, '').trim();
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));
    drawBounded(formNo, 125, 648.8, 10, 100, rgb(0, 0.15, 0.6));
    drawBounded(appDate, 445, 648.8, 9.5, 105);

    // ── 2. Applicant Section ─────────────────────────────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const fatherHusbandName = [
      getField(record, 'husbandName', 'husband_name'),
      getField(record, 'fatherName', 'father_name')
    ].filter(Boolean).join(' / ') || getField(record, 'fatherName', 'father_name');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const gender = getField(record, 'gender') || 'महिला';
    const casteOrGotra =
      getField(record, 'gotra', 'gotraName', 'caste', 'जाति') ||
      getField(body, 'gotra', 'gotraName', 'caste', 'जाति') ||
      getField(record, 'education', 'qualification', 'शिक्षा');
    const aadhar = getField(record, 'aadharNumber', 'aadhar_number', 'aadhaarNumber', 'aadhaar_number', 'aadhar');
    const address = [getField(record, 'address'), getField(record, 'tehsil')].filter(Boolean).join(', ');
    const district = getField(record, 'district', 'जिला');
    const state = getField(record, 'state', 'राज्य') || 'राजस्थान';
    const mobile = getField(record, 'mobile', 'mobileNumber', 'phone');

    drawBounded(applicantName, 62, 621.1, 10, 390);
    drawBounded(fatherHusbandName, 122, 593.3, 10, 330);
    drawBounded(dob, 92, 565.6, 9.5, 75);
    drawBounded(gender, 198, 565.6, 9.5, 62);
    drawBounded(casteOrGotra, 295, 565.6, 9.5, 155);
    drawBounded(aadhar, 130, 537.9, 10, 320);
    drawBounded(address, 58, 510.2, 9.5, 390);
    drawBounded(district, 65, 482.4, 9.5, 92);
    drawBounded(state, 190, 482.4, 9.5, 105);
    drawBounded(mobile, 332, 482.4, 9.5, 215);

    // ── 3. Nominee & Payment Section ─────────────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const nomineeAadhar = getField(record, 'nomineeAadhar', 'nominee_aadhar', 'nomineeAadhaar', 'nominee_aadhaar', 'nomineeAadharNumber', 'nomineeAadhaarNumber');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile') || mobile;
    const workerCodeOrName =
      getField(
        record,
        'workerOfflineFormNumber',
        'worker_offline_form_number',
        'agentOfflineFormNumber',
        'agent_offline_form_number',
        'karyakartaOfflineFormNumber',
        'workerOfflineFormNo',
        'agentOfflineFormNo',
        'workerCode',
        'worker_code',
        'agentCode',
        'agent_code',
        'workerName',
        'worker_name',
        'referralName',
        'addedByName',
        'agentName'
      ) ||
      getField(
        body,
        'workerOfflineFormNumber',
        'worker_offline_form_number',
        'agentOfflineFormNumber',
        'agent_offline_form_number',
        'karyakartaOfflineFormNumber',
        'workerOfflineFormNo',
        'agentOfflineFormNo',
        'workerCode',
        'worker_code',
        'agentCode',
        'agent_code',
        'workerName',
        'worker_name',
        'referralName',
        'addedByName',
        'agentName'
      );

    // Canonical registration amount resolution:
    // strict priority: paymentAmount -> payment_amount -> paidAmount -> receivedAmount -> totalAmount -> total_amount -> fee -> membershipFee
    // Fall back to grantFee or 5100 if no explicit payment amount is found, preserving 5100 default for Lado Bahin scheme.
    const resolvedAmt = resolveCanonicalPaymentAmount(record, body);
    const grantFeeAmt = parseAmountToNumber(
      getField(record, 'grantFee') || getField(body, 'grantFee')
    );
    const canonicalAmount = resolvedAmt !== null ? resolvedAmt : (grantFeeAmt !== null ? grantFeeAmt : 5100);
    const hindiAmountWords = formatAmountToHindiWords(canonicalAmount);
    const receiptAmountStr = formatNumericAmountForPdf(canonicalAmount);
    const formAmountStr = receiptAmountStr;
    const rawPaymentMode =
      getField(record, 'paymentModeRef', 'paymentMode', 'payment_mode') ||
      getField(body, 'paymentModeRef', 'paymentMode', 'payment_mode') ||
      'CASH';
    const cleanPaymentMode = formatPaymentModeForPdf(rawPaymentMode);
    const epin = getField(record, 'epinCode', 'epin_code') || getField(body, 'epinCode', 'epin_code');
    const paymentMode = [
      cleanPaymentMode,
      epin ? `EPIN: ${epin}` : ''
    ].filter(Boolean).join(' / ');
    const seniorWorker =
      getField(
        record,
        'seniorOfflineFormNumber',
        'senior_offline_form_number',
        'seniorAgentOfflineFormNumber',
        'senior_agent_offline_form_number',
        'seniorOfflineFormNo',
        'seniorCode',
        'senior_code',
        'uplineCode',
        'upline_code',
        'seniorWorker',
        'senior_worker',
        'seniorName',
        'senior_name'
      ) ||
      getField(
        body,
        'seniorOfflineFormNumber',
        'senior_offline_form_number',
        'seniorAgentOfflineFormNumber',
        'senior_agent_offline_form_number',
        'seniorOfflineFormNo',
        'seniorCode',
        'senior_code',
        'uplineCode',
        'upline_code',
        'seniorWorker',
        'senior_worker',
        'seniorName',
        'senior_name'
      );

    let finalWorkerCode = workerCodeOrName;
    let finalSeniorCode = seniorWorker;

    // Intelligent fallback for Admin / Default Agent or when addedBy is present
    if (!finalWorkerCode || !finalSeniorCode) {
      const addedBy = record?.addedBy || body?.addedBy || record?.agent || body?.agent;
      const addedRole = String(addedBy?.role || '').toUpperCase();
      const addedName = String(addedBy?.name || '').toLowerCase();
      const addedMobile = String(addedBy?.mobile || '');

      const isDefaultOrAdmin =
        addedRole === 'ADMIN' ||
        addedRole === 'SUPER_ADMIN' ||
        addedName.includes('super admin') ||
        addedName === 'admin' ||
        addedName === 'default agent' ||
        addedMobile === '9999999999' ||
        addedMobile === '8888888888' ||
        addedMobile.startsWith('del-');

      if (isDefaultOrAdmin) {
        if (!finalWorkerCode) finalWorkerCode = 'ADMIN';
        if (!finalSeniorCode) finalSeniorCode = 'ADMIN';
      } else if (addedBy) {
        const addedOffline = String(
          addedBy.offlineFormNumber ||
          addedBy.offline_form_number ||
          addedBy.employee_id ||
          addedBy.employeeId ||
          ''
        ).trim();
        if (addedOffline && !finalWorkerCode) {
          finalWorkerCode = addedOffline;
        }
      }
    }

    drawBounded(nomineeName, 108, 454.7, 10, 185);
    drawBounded(nomineeRelation, 338, 454.7, 10, 210);
    drawBounded(nomineeAadhar, 130, 427.0, 9.5, 120);
    drawBounded(nomineeMobile, 275, 427.0, 9.5, 125);
    drawBounded(finalWorkerCode, 472, 427.0, 9.5, 75);

    drawBounded(formAmountStr, 60, 399.3, 9.5, 90);
    drawBounded(paymentMode, 285, 399.3, 9.5, 120);
    drawBounded(finalSeniorCode, 472, 399.3, 9.5, 75);

    // ── 4. Section 2: सदस्यता फार्म रसीद (Receipt Section) ──────
    drawBounded(formNo, 125, 181.3, 10, 100, rgb(0, 0.15, 0.6));
    drawBounded(appDate, 472, 181.3, 9.5, 80);
    drawBounded(applicantName, 58, 159.5, 10, 180);
    drawBounded(fatherHusbandName, 330, 159.5, 10, 218);
    drawBounded(address, 58, 137.6, 9.5, 490);
    drawBounded(mobile, 55, 115.7, 9.5, 172);
    drawBounded(paymentMode, 308, 115.7, 9.5, 240);
    drawBounded(hindiAmountWords, 88, 93.8, 9.5, 142);
    drawBounded(receiptAmountStr, 115, 51.0, 11, 120, rgb(0, 0.15, 0.6));

    const pdfBytes = await pdfDoc.save();
    const filename = buildPdfFilename(record, { prefix: 'lado_bahin_form' });
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
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
