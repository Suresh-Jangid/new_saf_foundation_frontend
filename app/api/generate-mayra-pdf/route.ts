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
    const nomineePhotoSource = pickPhotoSource(
      body?.nomineeImageData,
      record?.nomineeImageData,
      record?.nomineePhotoData,
      record?.nomineePassportPhoto,
      record?.nominee_passport_photo,
      record?.nomineePhoto,
      record?.nominee_photo,
    );

    const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra_application', 'mayra_form.pdf');
    const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'mayra', 'mayra_registration_form.pdf');
    const templatePath = fs.existsSync(primaryTemplatePath) ? primaryTemplatePath : fallbackTemplatePath;

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'PDF template not found on server' }, { status: 500 });
    }

    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    const firstPage = pdfDoc.getPages()[0];
    const pageHeight = firstPage.getSize().height;

    // Measured Photo Boxes from official template:
    // Applicant Photo Box: x = 484.24, y = 519.09 to 627.09 (w: 90, h: 108, yFromTop: 164.91)
    // Nominee Photo Box:   x = 484.24, y = 372.81 to 480.81 (w: 90, h: 108, yFromTop: 311.19)
    const PHOTO_X = 485;
    const PHOTO_WIDTH = 88;
    const PHOTO_HEIGHT = 106;

    if (applicantPhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, PHOTO_X, 166, PHOTO_WIDTH, PHOTO_HEIGHT);
    }
    if (nomineePhotoSource) {
      await embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, PHOTO_X, 312, PHOTO_WIDTH, PHOTO_HEIGHT);
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
      size: number = 10.5,
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
    // Membership number: Uses ONLY record.membershipNumber. Completely blank if missing/empty. Never uses formNumber, sr_no, or E-PIN.
    const membershipNo = getField(record, 'membershipNumber');
    const appDate = formatDate(getField(record, 'applicationDate', 'application_date', 'createdAt', 'created_at', 'date'));
    drawBounded(membershipNo, 120, 669.5, 11, 100);
    drawBounded(appDate, 462, 669.5, 11, 110);

    // ── 2. Applicant Section (भाणेज/भाणेजी का विवरण) ─────────
    const applicantName = getField(record, 'applicantName', 'applicant_name', 'name');
    const parentName = getField(record, 'fatherName', 'father_name', 'parentName', 'parent_name', 'husbandName', 'husband_name');
    const motherName = getField(record, 'motherName', 'mother_name');
    const dob = formatDate(getField(record, 'dateOfBirth', 'date_of_birth', 'dob'));
    const age = getField(record, 'age');
    const gotra = getField(record, 'gotra');
    const address = getField(record, 'address', 'resident', 'village');
    const aadharNo = getField(record, 'aadharNumber', 'aadhar_number', 'aadhaarNumber', 'aadhaar_number', 'aadhar');

    drawBounded(applicantName, 75, 597.5, 10.5, 130);
    drawBounded(parentName, 250, 597.5, 10.5, 205);

    drawBounded(motherName, 95, 572.5, 10.5, 105);
    drawBounded(dob, 245, 572.5, 10, 78);
    drawBounded(age, 352, 572.5, 10.5, 105);

    drawBounded(gotra, 56, 545.5, 10.5, 88);
    drawBounded(address, 180, 545.5, 10, 88);
    drawBounded(aadharNo, 325, 545.5, 10.5, 132);

    // ── 3. Nominee Section (नॉमिनी का विवरण) ─────────────────
    const nomineeName = getField(record, 'nomineeName', 'nominee_name');
    const nomineeFather = getField(record, 'nomineeFathername', 'nominee_father_name', 'nomineeFather', 'nomineeHusbandName', 'nominee_husband_name');
    const nomineeGotra = getField(record, 'nomineeGotra', 'nominee_gotra');
    const nomineeAddress = getField(record, 'nomineeAddress', 'nominee_address');
    const nomineeMobile = getField(record, 'nomineeMobile', 'nominee_mobile', 'mobile');
    const tehsil = getField(record, 'tehsil', 'nomineeTehsil', 'nominee_tehsil');
    const district = getField(record, 'district', 'nomineeDistrict', 'nominee_district');
    const state = getField(record, 'state', 'nomineeState', 'nominee_state') || 'Rajasthan';
    const pinCode = getField(record, 'pinCode', 'pincode', 'pin_code', 'nomineePincode', 'nominee_pincode');
    const nomineeRelation = getField(record, 'nomineeRelation', 'nominee_relation', 'relation');
    const workerName = getField(record, 'workerName', 'worker_name', 'agentName', 'agent_name', 'added_name', 'addedby');
    const workerMobile = getField(record, 'workerMobile', 'worker_mobile', 'agentMobile', 'agent_mobile');

    drawBounded(nomineeName, 100, 478.0, 10.5, 138);
    drawBounded(nomineeFather, 295, 478.0, 10.5, 165);

    drawBounded(nomineeGotra, 54, 449.5, 10.5, 82);
    drawBounded(nomineeAddress, 172, 449.5, 10, 98);
    drawBounded(nomineeMobile, 320, 449.5, 10.5, 140);

    drawBounded(tehsil, 68, 421.5, 10, 62);
    drawBounded(district, 160, 421.5, 10, 62);
    drawBounded(state, 250, 421.5, 10, 67);
    drawBounded(pinCode, 372, 421.5, 10.5, 88);

    drawBounded(nomineeRelation, 115, 392.5, 10.5, 215);

    drawBounded(workerName, 108, 364.0, 10.5, 162);
    drawBounded(workerMobile, 315, 364.0, 10.5, 138);

    // ── 4. Oath Section (शपथ - पत्र) ─────────────────────────
    drawBounded(applicantName, 46, 291.5, 10.5, 180);
    drawBounded(parentName, 280, 291.5, 10.5, 175);
    drawBounded(age, 480, 291.5, 10.5, 92);

    drawBounded(gotra, 58, 262.5, 10.5, 132);
    drawBounded(address, 228, 262.5, 10, 236);

    const pdfBytes = await pdfDoc.save();
    const rawSafeName = applicantName || membershipNo || record?.id || 'form';
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
