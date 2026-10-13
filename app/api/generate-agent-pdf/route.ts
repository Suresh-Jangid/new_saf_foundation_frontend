import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToSlashDDMMYYYY } from '../../utils/dateFormatter';
import { loadImageBytes } from '../../utils/pdfImage';
import { drawDevanagariText, drawDevanagariBounded } from '@/lib/pdf-devanagari';

export const runtime = 'nodejs';

function formatAgentIdAddress(record: any, profile: any): string {
  const rawAddress = (profile?.address || record?.address || '').trim();
  const rawVillage = (profile?.village || record?.village || '').trim();
  const rawTehsil = (profile?.tehsil || record?.tehsil || '').trim();
  const rawDistrict = (profile?.district || record?.district || '').trim();

  const parts: string[] = [];
  if (rawAddress) {
    parts.push(rawAddress);
  }

  if (rawVillage) {
    const lowerAddr = rawAddress.toLowerCase();
    const lowerVill = rawVillage.toLowerCase();
    if (!lowerAddr || (!lowerAddr.includes(lowerVill) && !lowerVill.includes(lowerAddr))) {
      parts.push(rawVillage);
    }
  }

  if (rawTehsil) {
    const lowerAddr = rawAddress.toLowerCase();
    const lowerTeh = rawTehsil.toLowerCase();
    if (!lowerAddr || (!lowerAddr.includes(lowerTeh) && !lowerTeh.includes(lowerAddr))) {
      parts.push(rawTehsil);
    }
  }

  if (rawDistrict) {
    const lowerDist = rawDistrict.toLowerCase();
    const alreadyPresent = parts.some((p) => p.toLowerCase().includes(lowerDist));
    if (!alreadyPresent) {
      parts.push(rawDistrict);
    }
  }

  if (parts.length === 0) {
    const city = (profile?.city || record?.city || '').trim();
    const state = (profile?.state || record?.state || '').trim();
    if (city) parts.push(city);
    if (state && !city.toLowerCase().includes(state.toLowerCase())) parts.push(state);
  }

  return parts.filter(Boolean).join(', ');
}

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

export async function POST(request: NextRequest) {
  try {
    const { record, imageData } = await request.json();

    console.log('Received record for agent PDF:', record);
    console.log('Image data received for agent:', !!imageData);

    const profile = record?.agentProfile || record?.agent_profile || record?.profile || {};

    // Use the agent ID card template
    const templatePath = path.join(process.cwd(), 'public', 'pdf', 'agent', 'agent_id_card.pdf');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Agent template not found: ${templatePath}`);
    }

    console.log('Using agent template:', templatePath);

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
    
    // Preserve the original template dimensions without clipping
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Handle image embedding if imageData or profile_image is provided
    const imageToUse =
      imageData ||
      record?.profile_image ||
      record?.profileImage ||
      record?.profile_image_url ||
      record?.profileImageUrl ||
      profile?.profileImageUrl ||
      profile?.profile_image_url ||
      profile?.profile_image ||
      profile?.profileImage ||
      record?.photo ||
      record?.photoUrl ||
      profile?.photo ||
      profile?.photoUrl ||
      null;

    if (imageToUse) {
      try {
        const loaded = await loadImageBytes(imageToUse);
        if (loaded) {
          const { bytes, mime } = loaded;
          let image;
          try {
            if (mime && mime.includes('png')) {
              image = await pdfDoc.embedPng(bytes);
            } else {
              image = await pdfDoc.embedJpg(bytes);
            }
          } catch {
            try {
              image = await pdfDoc.embedPng(bytes);
            } catch {
              image = await pdfDoc.embedJpg(bytes);
            }
          }

          if (image) {
            // Precise photo box coordinates on the agent ID card template:
            // Box dimensions: x=119.5, width=37.0 pt, height=51.5 pt
            const imageX = 119.5;
            const imageYFromTop = 113.2;
            const imageWidth = 37.0;
            const imageHeight = 51.5;

            // Position the image using bottom-left coordinate system
            const drawY = pageHeight - imageYFromTop - imageHeight;

            firstPage.drawImage(image, {
              x: imageX,
              y: drawY,
              width: imageWidth,
              height: imageHeight,
            });
            console.log('Image drawn successfully');
          }
        }
      } catch (error) {
        console.error('Error embedding image:', error);
      }
    } else {
      console.log('No image data provided');
    }

    // Load Devanagari font for Hindi text
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf'),
    ];

    let font;
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed. Run npm i @pdf-lib/fontkit and try again.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      // Check if there's Hindi text in the record
      const containsHindi = Object.values(record ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Extract raw dates from either root or nested profile
    const rawDoj =
      profile?.dateOfJoining ||
      profile?.date_of_joining ||
      profile?.doj ||
      record?.doj ||
      record?.dateOfJoining ||
      record?.date_of_joining ||
      profile?.registrationDate ||
      profile?.registration_date ||
      record?.registrationDate ||
      record?.registration_date ||
      record?.date ||
      '';

    const rawDob =
      profile?.dateOfBirth ||
      profile?.date_of_birth ||
      record?.dateOfBirth ||
      record?.date_of_birth ||
      profile?.dob ||
      record?.dob ||
      '';

    // Resolved field values mapping camelCase, snake_case, aliases, and nested agentProfile properties
    const resolvedValues: Record<string, string> = {
      name:
        record?.name ||
        record?.fullName ||
        record?.full_name ||
        profile?.name ||
        profile?.fullName ||
        profile?.full_name ||
        record?.user?.name ||
        '',
      fatherName:
        profile?.fatherName ||
        profile?.father_name ||
        record?.fatherName ||
        record?.father_name ||
        profile?.father ||
        record?.father ||
        '',
      designation:
        profile?.designation ||
        record?.designation ||
        (profile?.role && profile.role !== 'agent' ? profile.role : '') ||
        (record?.role && record.role !== 'agent' ? record.role : '') ||
        '',
      doj: formatDateToSlashDDMMYYYY(rawDoj),
      mobile:
        record?.mobile ||
        record?.mobileNumber ||
        record?.mobile_number ||
        profile?.mobile ||
        profile?.mobileNumber ||
        profile?.mobile_number ||
        record?.phone ||
        record?.phoneNumber ||
        record?.user?.mobile ||
        '',
      agent_code:
        record?.offlineFormNumber ||
        record?.offline_form_number ||
        profile?.offlineFormNumber ||
        profile?.offline_form_number ||
        record?.agent_code ||
        record?.agentCode ||
        profile?.agent_code ||
        profile?.agentCode ||
        record?.code ||
        profile?.code ||
        '',
      employee_id:
        profile?.employeeId ||
        profile?.employee_id ||
        record?.employee_id ||
        record?.employeeId ||
        profile?.emp_id ||
        profile?.empId ||
        record?.emp_id ||
        record?.empId ||
        '',
      address: formatAgentIdAddress(record, profile),
      dateOfBirth: formatDateToSlashDDMMYYYY(rawDob),
    };

    // Field mappings aligned with the printed labels on the template
    const fieldMappings = [
      { key: 'name', x: 44, y: 83.0, size: 5, maxW: 72 },
      { key: 'fatherName', x: 65, y: 98.0, size: 5, maxW: 52 },
      { key: 'designation', x: 42, y: 115.5, size: 5, maxW: 74 },
      { key: 'doj', x: 61, y: 130.5, size: 5, maxW: 56 },
      { key: 'mobile', x: 50, y: 148.0, size: 5, maxW: 67 },
      { key: 'agent_code', x: 70, y: 163.0, size: 5, maxW: 47 },
      { key: 'employee_id', x: 71, y: 178.0, size: 5, maxW: 88 },
      { key: 'address', x: 42, y: 196.8, size: 4.8, maxW: 118 },
      { key: 'dateOfBirth', x: 60, y: 211.8, size: 5, maxW: 100 },
    ];

    // Add data to the PDF
    for (const mapping of fieldMappings) {
      const value = resolvedValues[mapping.key];
      if (!value) continue;

      const drawX = mapping.x;
      const drawY = pageHeight - mapping.y; // Convert top-left Y coordinate to PDF bottom-left

      drawDevanagariBounded(firstPage, font, String(value), {
        x: drawX,
        y: drawY,
        size: mapping.size,
        maxW: mapping.maxW,
        minSize: 3.5,
        color: rgb(0, 0, 0),
      });
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Create a safe filename without Hindi characters
    const asciiFiltered = (
      resolvedValues.name ||
      resolvedValues.employee_id ||
      resolvedValues.agent_code ||
      ''
    )
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const safeName = asciiFiltered || 'agent';
    const filename = `agent_id_card_${safeName}.pdf`;

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
    console.error('Error generating agent PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent PDF',
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
