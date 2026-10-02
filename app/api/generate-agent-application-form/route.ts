import 'regenerator-runtime/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';
import { loadImageBytes } from '../../utils/pdfImage';

export const runtime = 'nodejs';

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

function sanitizeOfflineNumber(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('DH-') ||
    upper.startsWith('DH_') ||
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

function formatDisplayDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    return str.replace(/\//g, '-');
  }
  const m = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return formatDateToDDMMYYYY(str) || str;
}

function formatAadhaarNumber(val: any): string {
  if (!val) return '';
  const clean = String(val).replace(/\s+/g, '').trim();
  if (/^\d{12}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
  }
  return String(val).trim();
}

const DISTRICT_PREFIX_REGEXES = [
  /^जिला[\s:-]*/i,
  /^district[\s:-]*/i,
  /^dist\.?[\s:-]*/i,
];

const TEHSIL_PREFIX_REGEXES = [
  /^तहसील[\s:-]*/i,
  /^tehsil[\s:-]*/i,
  /^teh\.?[\s:-]*/i,
];

const VILLAGE_PREFIX_REGEXES = [
  /^ग्राम[\s:-]*/i,
  /^गांव[\s:-]*/i,
  /^village[\s:-]*/i,
  /^vill\.?[\s:-]*/i,
];

function cleanPrefix(val: string, prefixes: RegExp[]): string {
  let str = (val || '').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const rx of prefixes) {
      if (rx.test(str)) {
        str = str.replace(rx, '').trim();
        changed = true;
      }
    }
  }
  return str;
}

function formatFullAddress(rec: any): string {
  const parts: string[] = [];
  const rawAddress = (
    rec?.address ||
    rec?.agentProfile?.address ||
    rec?.agent_profile?.address ||
    ''
  ).trim();
  const rawVillage = (
    rec?.village ||
    rec?.agentProfile?.village ||
    rec?.agent_profile?.village ||
    ''
  ).trim();
  const cleanVillage = cleanPrefix(rawVillage, VILLAGE_PREFIX_REGEXES);
  const rawTehsil = (
    rec?.tehsil ||
    rec?.agentProfile?.tehsil ||
    rec?.agent_profile?.tehsil ||
    ''
  ).trim();
  const cleanTehsil = cleanPrefix(rawTehsil, TEHSIL_PREFIX_REGEXES);
  const rawDistrict = (
    rec?.district ||
    rec?.agentProfile?.district ||
    rec?.agent_profile?.district ||
    ''
  ).trim();
  const cleanDistrict = cleanPrefix(rawDistrict, DISTRICT_PREFIX_REGEXES);

  if (rawAddress) {
    parts.push(rawAddress);
  }

  if (cleanVillage) {
    const lowerAddr = rawAddress.toLowerCase();
    const lowerVill = cleanVillage.toLowerCase();
    if (!lowerAddr.includes(lowerVill)) {
      parts.push(`ग्राम- ${cleanVillage}`);
    }
  }

  if (cleanTehsil) {
    const hasTehsilLabel =
      rawAddress &&
      /(?:तहसील|tehsil|teh[\s.:-])/i.test(rawAddress) &&
      rawAddress.toLowerCase().includes(cleanTehsil.toLowerCase());
    if (!hasTehsilLabel) {
      parts.push(`तहसील- ${cleanTehsil}`);
    }
  }

  if (cleanDistrict) {
    const hasDistrictLabel =
      rawAddress &&
      /(?:जिला|district|dist[\s.:-])/i.test(rawAddress) &&
      rawAddress.toLowerCase().includes(cleanDistrict.toLowerCase());
    if (!hasDistrictLabel) {
      parts.push(`जिला- ${cleanDistrict}`);
    }
  }

  return parts.join(', ');
}

export async function POST(request: NextRequest) {
  try {
    const { 
      record, 
      imageData,
      debug,
      offsetX,
      offsetY,
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
    } = await request.json();

    console.log('Received record for agent application form PDF:', record);
    console.log('Image data received for agent application form:', !!imageData);

    // Use the agent application form template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'agent', 'agent_application_form.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Agent application form template not found: ${templatePath}`);
    }

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
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

    // Handle image embedding if imageData or profile_image is provided
    const imageToUse =
      imageData ||
      record?.profile_image ||
      record?.profileImageUrl ||
      record?.agentProfile?.profileImageUrl ||
      record?.agentProfile?.profile_image;

    if (imageToUse) {
      try {
        const loaded = await loadImageBytes(imageToUse);
        if (loaded) {
          const { bytes, mime } = loaded;
          let image;
          if (mime && mime.includes('png')) {
            image = await pdfDoc.embedPng(bytes);
          } else {
            image = await pdfDoc.embedJpg(bytes);
          }

          if (image) {
            // Designated photo box in template: BL x=452.8..557.8, y=510.7..631.9 (w=105, h=121.2)
            // Preserving exact original coordinates and dimensions
            firstPage.drawImage(image, {
              x: 455.0,
              y: 513.0,
              width: 100.5,
              height: 116.5,
            });
            console.log('Image embedded successfully in application form photo box');
          }
        }
      } catch (error) {
        console.warn('Non-fatal error embedding image:', error);
      }
    }

    // Load Devanagari font for Hindi text
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf'),
    ];

    let font;
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath && fontkitAvailable) {
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: false });

      // Patch computeWidths so all glyphs (including Devanagari ligatures and matra variants) have proper advance widths in /W
      if ((font as any).embedder && typeof (font as any).embedder.computeWidths === 'function') {
        const embedder = (font as any).embedder;
        embedder.computeWidths = function () {
          const widths: any[] = [0];
          const section: number[] = [];
          const numGlyphs = this.font.numGlyphs || 0;
          for (let id = 0; id < numGlyphs; id++) {
            const g = this.font.getGlyph(id);
            section.push(g.advanceWidth * this.scale);
          }
          widths.push(section);
          return widths;
        };

        // Patch encodeText and widthOfTextAtSize to segment mixed Latin & Devanagari runs
        const origEncode = embedder.encodeText.bind(embedder);
        const origWidth = embedder.widthOfTextAtSize.bind(embedder);
        const PDFHexString = Object.getPrototypeOf(origEncode(' ')).constructor;

        const layoutRuns = (emb: any, text: string) => {
          const runs = text.split(/([\u0900-\u097F]+)/g).filter(Boolean);
          const glyphs: any[] = [];
          for (const run of runs) {
            const isDeva = /[\u0900-\u097F]/.test(run);
            const glyphRun = emb.font.layout(run, emb.fontFeatures, isDeva ? 'deva' : undefined);
            glyphs.push(...glyphRun.glyphs);
          }
          return glyphs;
        };

        embedder.encodeText = function (text: string) {
          if (!/[\u0900-\u097F]/.test(text)) return origEncode(text);
          const glyphs = layoutRuns(this, text);
          const hex = glyphs.map((g: any) => g.id.toString(16).padStart(4, '0')).join('');
          return PDFHexString.of(hex);
        };

        embedder.widthOfTextAtSize = function (text: string, size: number) {
          if (!/[\u0900-\u097F]/.test(text)) return origWidth(text, size);
          const glyphs = layoutRuns(this, text);
          let totalWidth = 0;
          for (const g of glyphs) totalWidth += g.advanceWidth * this.scale;
          return totalWidth * (size / 1000);
        };
      }
    } else {
      const containsHindi = Object.values(record ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-SemiBold.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Resolve Agent Code strictly using Offline Form Number
    const rawAgentOffline =
      record?.offlineFormNumber ||
      record?.offline_form_number ||
      record?.agentOfflineFormNumber ||
      record?.agent_offline_form_number ||
      record?.workerOffline ||
      record?.worker_offline ||
      record?.agentProfile?.offlineFormNumber ||
      record?.agentProfile?.offline_form_number ||
      record?.agent_profile?.offline_form_number ||
      (record?.agentCode && !String(record.agentCode).toUpperCase().startsWith('EMP-') ? record.agentCode : '') ||
      '';
    const agentCodeDisplay = sanitizeOfflineNumber(rawAgentOffline);

    // Resolve Senior Code strictly using Senior Agent Offline Form Number
    const rawSeniorOffline =
      record?.seniorOfflineFormNumber ||
      record?.senior_offline_form_number ||
      record?.parentOfflineFormNumber ||
      record?.parent_offline_form_number ||
      record?.seniorOffline ||
      record?.senior_offline ||
      record?.agentProfile?.seniorOfflineFormNumber ||
      record?.agentProfile?.senior_offline_form_number ||
      record?.agentProfile?.parentOfflineFormNumber ||
      record?.hierarchy?.parentOfflineFormNumber ||
      (record?.seniorCode && record.seniorCode !== 'ADMIN' && !String(record.seniorCode).toUpperCase().startsWith('EMP-') ? record.seniorCode : '') ||
      '';
    const seniorCodeDisplay = sanitizeOfflineNumber(rawSeniorOffline);

    // Dynamic field values extraction from record (supporting flat and nested profile structures)
    const appDate = formatDisplayDate(
      record?.date ||
      record?.registrationDate ||
      record?.agentProfile?.registrationDate ||
      record?.createdAt ||
      ''
    );
    const applicantName = record?.name || record?.applicantName || '';
    const fatherName = record?.fatherName || record?.father_name || record?.agentProfile?.fatherName || '';
    const dob = formatDisplayDate(record?.dateOfBirth || record?.date_of_birth || record?.agentProfile?.dateOfBirth || '');
    const rawAge = record?.age ?? record?.agentProfile?.age ?? '';
    const ageStr = rawAge !== '' && rawAge !== undefined && rawAge !== null ? `${rawAge} वर्ष` : '';
    const dobAndAge = dob ? (ageStr ? `${dob} (${ageStr})` : dob) : ageStr;
    const mobile = record?.mobile || record?.agentProfile?.mobile || '';
    const gender = record?.gender || record?.agentProfile?.gender || '';
    const gotra = record?.gotra || record?.agentProfile?.gotra || '';
    const fullAddress = formatFullAddress(record);
    const aadhaar = formatAadhaarNumber(record?.aadhaar || record?.agentProfile?.aadhaar || '');
    const education =
      record?.education ||
      record?.qualification ||
      record?.educationQualification ||
      record?.designation ||
      record?.agentProfile?.designation ||
      '';
    const occupation =
      record?.occupation ||
      record?.workArea ||
      record?.agentProfile?.workArea ||
      record?.agent_profile?.work_area ||
      '';
    const whatsapp =
      record?.whatsapp ||
      record?.whatsappNumber ||
      record?.mobile ||
      record?.agentProfile?.mobile ||
      '';
    const email = record?.email || record?.emailId || record?.agentProfile?.email || '';
    const place =
      record?.place ||
      record?.tehsil ||
      record?.village ||
      record?.district ||
      record?.agentProfile?.tehsil ||
      record?.agentProfile?.village ||
      'समदड़ी';
    const regDate = formatDisplayDate(
      record?.registrationDate ||
      record?.dateOfJoining ||
      record?.doj ||
      record?.agentProfile?.registrationDate ||
      record?.agentProfile?.dateOfJoining ||
      record?.agentProfile?.doj ||
      record?.date ||
      record?.createdAt ||
      ''
    );

    // Configuration for offsets & styling
    const globalOffsetX = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY = typeof offsetY === 'number' ? offsetY : 0;
    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;

    const darkColor = rgb(0.12, 0.12, 0.12);
    const officeColor = rgb(0.06, 0.18, 0.52);
    const checkColor = rgb(0.0, 0.45, 0.15);

    // Helper to draw text with auto-shrink on max width (prevents clipping/overlap)
    const drawBounded = (
      text: any,
      x: number,
      y: number,
      fontSize: number,
      maxW?: number,
      color = darkColor
    ) => {
      if (text === undefined || text === null) return;
      const str = String(text).trim();
      if (!str) return;

      let size = fontSize;
      if (maxW && (font as any).widthOfTextAtSize) {
        const w = (font as any).widthOfTextAtSize(str, size);
        if (w > maxW) {
          size = Math.max(6.5, size * (maxW / w));
        }
      }

      firstPage.drawText(str, {
        x: x + globalOffsetX + valueOffsetX,
        y: y + globalOffsetY + valueOffsetY,
        size,
        font,
        color,
      });
    };

    // Helper to draw vector checkmarks in attached document boxes
    const drawCheckMark = (cx: number, cy: number) => {
      firstPage.drawLine({
        start: { x: cx - 4.5 + globalOffsetX + valueOffsetX, y: cy + 0.5 + globalOffsetY + valueOffsetY },
        end: { x: cx - 1.0 + globalOffsetX + valueOffsetX, y: cy - 3.5 + globalOffsetY + valueOffsetY },
        thickness: 1.5,
        color: checkColor,
      });
      firstPage.drawLine({
        start: { x: cx - 1.0 + globalOffsetX + valueOffsetX, y: cy - 3.5 + globalOffsetY + valueOffsetY },
        end: { x: cx + 4.5 + globalOffsetX + valueOffsetX, y: cy + 4.5 + globalOffsetY + valueOffsetY },
        thickness: 1.5,
        color: checkColor,
      });
    };

    // ─────────────────────────────────────────────────────────────
    // 1. Top Meta Row 1
    // ─────────────────────────────────────────────────────────────
    // क्रमांक :- (Form / Serial Number: Agent Offline Form Number)
    drawBounded(agentCodeDisplay, 88.0, 688.0, 11, 200, darkColor);
    // दिनांक (Date: Application Date)
    drawBounded(appDate, 455.0, 690.5, 11, 100, darkColor);

    // ─────────────────────────────────────────────────────────────
    // 2. Top Meta Row 2
    // ─────────────────────────────────────────────────────────────
    // कार्यकर्ता कोड (Agent Code: Agent Offline Form Number)
    drawBounded(agentCodeDisplay, 115.67, 657.5, 11, 120, darkColor);
    // सीनियर कोड (Senior Code: Senior Agent Offline Form Number)
    drawBounded(seniorCodeDisplay, 486.75, 657.5, 11, 120, darkColor);

    // ─────────────────────────────────────────────────────────────
    // 3. Main Form: Applicant Personal Details
    // ─────────────────────────────────────────────────────────────
    // आवेदक का नाम (Applicant Name)
    drawBounded(applicantName, 126.0, 618.5, 11, 310, darkColor);
    // पिता/पति का नाम (Father / Husband Name)
    drawBounded(fatherName, 133.0, 588.0, 11, 300, darkColor);
    // जन्म तिथि (Date of Birth & Age)
    drawBounded(dobAndAge, 91.0, 558.0, 10.5, 148, darkColor);
    // मो. नं. (Mobile Number)
    drawBounded(mobile, 280.0, 558.0, 11, 155, darkColor);
    // लिंग (Gender)
    drawBounded(gender, 63.0, 527.0, 11, 170, darkColor);
    // जाति (Gotra / Caste)
    drawBounded(gotra, 270.0, 527.0, 11, 170, darkColor);
    // पूरा पता (Full Unified Address)
    drawBounded(fullAddress, 80.0, 496.5, 10.5, 475, darkColor);
    // आधार नंबर (Aadhaar Number)
    drawBounded(aadhaar, 97.0, 465.0, 10.5, 138, darkColor);
    // शिक्षा योग्यता (Educational Qualification)
    drawBounded(education, 312.0, 465.0, 10.5, 98, darkColor);
    // व्यवसाय (Occupation)
    drawBounded(occupation, 460.0, 465.0, 10.5, 98, darkColor);
    // व्हाट्सएप नंबर (WhatsApp Number)
    drawBounded(whatsapp, 105.0, 435.0, 10.5, 145, darkColor);
    // ई-मेल आईडी (Email ID)
    drawBounded(email, 332.0, 435.0, 10.0, 228, darkColor);

    // ─────────────────────────────────────────────────────────────
    // 4. Attached Documents Checkboxes (संलग्न दस्तावेज)
    // ─────────────────────────────────────────────────────────────
    if (aadhaar) drawCheckMark(165.65, 373.3);
    if (imageToUse) drawCheckMark(165.65, 344.0);
    if (
      record?.bankName ||
      record?.accountNumber ||
      record?.agentProfile?.bankName ||
      record?.agentProfile?.accountNumber
    ) {
      drawCheckMark(165.65, 314.8);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Declaration Section (घोषणा-पत्र)
    // ─────────────────────────────────────────────────────────────
    // दिनांक (Declaration Date)
    drawBounded(appDate, 73.0, 184.5, 10.5, 90, darkColor);
    // स्थान (Declaration Place)
    drawBounded(place, 293.0, 184.5, 10.5, 88, darkColor);
    // आवेदक के हस्ताक्षर is preserved blank for physical applicant signature

    // ─────────────────────────────────────────────────────────────
    // 6. Office Use Section (संस्था द्वारा उपयोग हेतु)
    // ─────────────────────────────────────────────────────────────
    // क्रमांक :- (Office Form Number: Agent Offline Form Number)
    drawBounded(agentCodeDisplay, 88.0, 126.5, 10.5, 150, officeColor);
    // कार्यकर्ता कोड (Office Agent Code: Agent Offline Form Number)
    drawBounded(agentCodeDisplay, 113.01, 105.0, 10.5, 120, officeColor);
    // सीनियर कोड (Office Senior Code: Senior Agent Offline Form Number)
    drawBounded(seniorCodeDisplay, 423.89, 105.0, 10.5, 120, officeColor);
    // पंजीकरण दिनांक- (Office Registration Date)
    drawBounded(regDate || appDate, 125.0, 80.0, 10.5, 115, officeColor);
    // स्वीकृत अधिकारी के हस्ताक्षर is preserved blank for physical officer signature

    // Debug grid if explicitly requested
    if (debug) {
      const gridStep = 25;
      for (let x = 0; x <= pageWidth; x += gridStep) {
        firstPage.drawLine({
          start: { x, y: 0 },
          end: { x, y: pageHeight },
          thickness: x % 100 === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
      for (let y = 0; y <= pageHeight; y += gridStep) {
        firstPage.drawLine({
          start: { x: 0, y },
          end: { x: pageWidth, y },
          thickness: y % 100 === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Create a safe filename without special characters
    const safeName = (record?.name || record?.employee_id || 'agent')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    
    const filename = `agent_application_form_${safeName || 'record'}.pdf`;

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error generating agent application form PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent application form PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}
