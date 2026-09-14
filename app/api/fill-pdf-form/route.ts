import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { formatDateToDDMMYYYY } from '../../utils/dateFormatter';

export const runtime = 'nodejs';

// Add OPTIONS method to handle CORS preflight requests
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
    const {
      data,
      type,
      debug,
      offsetX,
      offsetY,
      coordSystem,        // 'bottom-left' | 'top-left'
      valueOffsetX: reqValueOffsetX,
      valueOffsetY: reqValueOffsetY,
      imageData, // Add image data parameter
    } = await request.json();

    console.log('Received data:', data);
    console.log('Type:', type);
    console.log('Image data received:', !!imageData);

    // Determine template path based on type
    let templatePath: string;
    
    if (type === 'dhundhotsav' || type === 'dhundhotsav-application') {
      const candidateTemplates = [
        path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf'),
      ];
      templatePath = candidateTemplates.find((p) => fs.existsSync(p)) || '';
    } else if (type === 'general-application') {
      // Use the newly approved unified General Application form template
      const candidateTemplates = [
        path.join(process.cwd(), 'public', 'pdf', 'general_application', 'Saf_general_form.pdf'),
        path.join(process.cwd(), 'public', 'pdf', 'general_application', 'general_application_form.pdf'),
        path.join(process.cwd(), 'public', 'pdf', 'general_application', '3 (general form).pdf'),
      ];
      templatePath = candidateTemplates.find((p) => fs.existsSync(p)) || '';
    } else {
      // For other types (like balika-avedan), use the original template resolution
      const candidateTemplates = [
        path.join(process.cwd(), 'public', 'balika_avedan_form.pdf'),
        path.join(process.cwd(), 'public', 'बालिका आवेदन फॉर्म.pdf'),
      ];
      templatePath = candidateTemplates.find((p) => fs.existsSync(p)) || '';
    }

    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`Template PDF not found: ${templatePath}`);
    }

    console.log('Using template:', templatePath);

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    // Register fontkit to allow embedding TTF fonts
    let fontkitAvailable = false;
    try {
      // Some builds of @pdf-lib/fontkit expect regeneratorRuntime
      try {
        await import('regenerator-runtime/runtime');
      } catch {}
      // Dynamic import to avoid hard dependency break if not installed
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
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Handle image embedding if imageData is provided
    if (imageData) {
      try {
        // Convert base64 to Uint8Array
        const imageBytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
        
        // Determine image type and embed accordingly
        let image;
        if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageData.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn('Unsupported image format, skipping image embedding');
        }

        if (image) {
          // Precise passport photo box dimensions for approved official templates
          let imageX = 475;
          let imageY = 242.5;
          let imageWidth = 76;
          let imageHeight = 99;

          if (type === 'dhundhotsav' || type === 'dhundhotsav-application') {
            imageX = 460.5;
            imageY = 224.3;
            imageWidth = 91.3;
            imageHeight = 119.1;
          }

          // Draw the image on the PDF
          firstPage.drawImage(image, {
            x: imageX,
            y: pageHeight - imageY - imageHeight, // Convert to bottom-left coordinate system
            width: imageWidth,
            height: imageHeight,
          });

          console.log('Image embedded successfully');
        }
      } catch (imageError) {
        console.error('Error embedding image:', imageError);
        // Continue without image if there's an error
      }
    }

    const debugMode: boolean = Boolean(debug);
    const globalOffsetX: number = typeof offsetX === 'number' ? offsetX : 0;
    const globalOffsetY: number = typeof offsetY === 'number' ? offsetY : 0;
    // Default to top-left which matches visual layout measurement
    const coordinateSystem: 'bottom-left' | 'top-left' =
      coordSystem === 'bottom-left' ? 'bottom-left' : 'top-left';

    // Try to embed a Devanagari-capable font; fallback to Helvetica
    let font;
    const fontCandidates = [
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'),
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari.ttf'),
    ];
    const devanagariFontPath = fontCandidates.find((p) => fs.existsSync(p));
    if (devanagariFontPath) {
      if (!fontkitAvailable) {
        throw new Error('Devanagari font found but fontkit is not installed. Run npm i @pdf-lib/fontkit and try again.');
      }
      const customFontBytes = fs.readFileSync(devanagariFontPath);
      font = await pdfDoc.embedFont(customFontBytes as any, { subset: true });
    } else {
      // If there is Hindi text and no Devanagari font, fail fast with a helpful message
      const containsHindi = Object.values(data ?? {}).some((v) => /[\u0900-\u097F]/.test(String(v)));
      if (containsHindi) {
        throw new Error('Hindi text detected but no Devanagari TTF font found. Place a font like public/fonts/NotoSansDevanagari-Regular.ttf.');
      }
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Define field mappings according to template type
    type FieldDef = {
      field: string;
      valueKeys: string[];
      x: number;
      y: number;
      maxW?: number;
      size?: number;
      color?: { r: number; g: number; b: number };
      isDate?: boolean;
      formatAmount?: boolean;
    };

    let fieldDefinitions: FieldDef[] = [];

    if (type === 'dhundhotsav' || type === 'dhundhotsav-application') {
      // Calibrated single-page official template for Dhundhotsav (Saf_dhundh_form.pdf)
      // Coordinate System: top-left (y represents distance from top of page, pageHeight = 841.89)
      fieldDefinitions = [
        // ==========================================
        // SECTION 1: "बाल-गोपाल ढूंढोत्सव सहायता योजना आवेदन" (Upper Section)
        // ==========================================
        // Line 1: क्रमांक : NGO/26/ [Offline No only]  एजेन्ट कोड [Worker Offline only]  सीनियर कोड [Senior Offline only]  दिनांक [Date]
        { field: 'क्रमांक', valueKeys: ['offlineFormNumber', 'ऑफलाइन_फॉर्म_नं', 'offline_form_number', 'offlineFormNo', 'सदस्यता_क्रमांक'], x: 120, y: 195.6, maxW: 38, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'एजेन्ट_कोड', valueKeys: ['workerOfflineFormNumber', 'worker_offline_form_number', 'agentOfflineFormNumber', 'agent_offline_form_number', 'karyakartaOfflineFormNumber', 'workerOfflineFormNo', 'agentOfflineFormNo', 'कार्यकर्ता_कोड'], x: 205, y: 195.6, maxW: 85, size: 9.5, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'सीनियर_कोड', valueKeys: ['seniorOfflineFormNumber', 'senior_offline_form_number', 'seniorAgentOfflineFormNumber', 'senior_agent_offline_form_number', 'seniorOfflineFormNo', 'senior_offline_form_no', 'सीनियर_कोड'], x: 345, y: 195.6, maxW: 60, size: 9.5, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'दिनांक', valueKeys: ['applicationDate', 'आवेदन_दिनांक', 'date', 'created_at', 'application_date'], x: 440, y: 195.6, maxW: 110, size: 9.5, isDate: true },

        // Line 2: नाम [Applicant Name]
        { field: 'नाम', valueKeys: ['applicantName', 'आवेदक_का_नाम', 'name', 'applicant_name'], x: 60, y: 223.3, maxW: 390, size: 10 },

        // Line 3: पिता/पति का नाम [Father/Husband Name]
        { field: 'पिता_का_नाम', valueKeys: ['fatherName', 'पिता_का_नाम', 'father_husband_name', 'father_name', 'husbandName', 'husband_name'], x: 120, y: 251.1, maxW: 330, size: 10 },

        // Line 4: जन्म दिनांक [DOB]  लिंग [Gender]  शिक्षा [Education]
        { field: 'जन्म_दिनांक', valueKeys: ['dateOfBirth', 'जन्म_तिथि', 'dob', 'date_of_birth'], x: 92, y: 278.8, maxW: 75, size: 9.5, isDate: true },
        { field: 'लिंग', valueKeys: ['gender', 'लिंग'], x: 198, y: 278.8, maxW: 62, size: 9.5 },
        { field: 'शिक्षा', valueKeys: ['education', 'शिक्षा', 'qualification'], x: 295, y: 278.8, maxW: 155, size: 9.5 },

        // Line 5: आवेदन के आधार नं. [Aadhaar Number]
        { field: 'आधार_संख्या', valueKeys: ['aadharNumber', 'आधार_संख्या', 'aadhar_no', 'aadhaar', 'aadhar_number', 'aadhaarNumber'], x: 130, y: 306.5, maxW: 320, size: 10 },

        // Line 6: पता [Address]
        { field: 'पता', valueKeys: ['address', 'पता', 'full_address', 'fullAddress'], x: 60, y: 334.2, maxW: 390, size: 9.5 },

        // Line 7: जिला [District]  राज्य [State]  मो. नं. [Mobile]
        { field: 'जिला', valueKeys: ['district', 'जिला'], x: 65, y: 361.9, maxW: 92, size: 9.5 },
        { field: 'राज्य', valueKeys: ['state', 'राज्य'], x: 190, y: 361.9, maxW: 105, size: 9.5 },
        { field: 'मोबाइल', valueKeys: ['mobile', 'मोबाइल', 'phone', 'mobileNumber'], x: 332, y: 361.9, maxW: 220, size: 9.5 },

        // Line 8: नॉमिनी का नाम [Nominee Name]  सम्बन्ध [Nominee Relation]
        { field: 'नामिनी_का_नाम', valueKeys: ['nomineeName', 'नामिनी_का_नाम', 'nominee_name'], x: 108, y: 389.7, maxW: 185, size: 10 },
        { field: 'नामिनी_का_सम्बन्ध', valueKeys: ['nomineeRelation', 'नामिनी_का_सम्बन्ध', 'nominee_relation'], x: 338, y: 389.7, maxW: 210, size: 10 },

        // Line 9: नॉमिनी का आधार नं. [Nominee Aadhaar]  मो. [Nominee Mobile]  कार्यकर्ता नाम [Worker Name]
        { field: 'नामिनी_का_आधार', valueKeys: ['nomineeAadhar', 'nomineeAadhaar', 'नामिनी_का_आधार', 'nominee_aadhar', 'nominee_aadhaar', 'nomineeAadharNumber', 'nomineeAadhaarNumber', 'nominee_aadhar_number', 'nominee_aadhaar_number', 'nomineeAdhar', 'nominee_adhar', 'nomineeAadharNo', 'nomineeAadhaarNo'], x: 130, y: 417.4, maxW: 120, size: 9.5 },
        { field: 'नामिनी_का_मोबाइल', valueKeys: ['nomineeMobile', 'नामिनी_का_मोबाइल', 'nominee_mobile', 'nomineePhone', 'nominee_phone', 'nomineeMobileNumber', 'nominee_mobile_number', 'nomineeContact', 'nominee_contact'], x: 275, y: 417.4, maxW: 125, size: 9.5 },
        { field: 'कार्यकर्ता_नाम', valueKeys: ['workerName', 'कार्यकर्ता_का_नाम', 'worker_name', 'agentName', 'agent_name', 'कार्यकर्ता_नाम'], x: 470, y: 417.4, maxW: 85, size: 9.5 },

        // Line 10: राशि [Registration Fee = ₹5,100]  नकद/चैक/डी.डी./यूटीआर नं. [Payment Ref]  सीनियर कार्यकर्ता नाम [Senior Worker Name]
        { field: 'राशि', valueKeys: ['amount', 'राशि', 'totalAmount', 'total_amount', 'fee', 'paymentAmount', 'payment_amount', 'membershipFee', 'registrationFee'], x: 62, y: 445.1, maxW: 55, size: 9.5, formatAmount: true },
        { field: 'भुगतान_विवरण', valueKeys: ['paymentModeRef', 'भुगतान_विवरण', 'paymentRef', 'payment_mode', 'paymentMode', 'utr_no', 'utrNo'], x: 245, y: 445.1, maxW: 120, size: 9.5 },
        { field: 'सीनियर_कार्यकर्ता_नाम', valueKeys: ['seniorName', 'सीनियर_कार्यकर्ता_का_नाम', 'senior_name', 'seniorWorkerName', 'senior_worker_name', 'seniorAgentName', 'senior_agent_name', 'सीनियर_कार्यकर्ता_नाम'], x: 465, y: 445.1, maxW: 90, size: 9.5 },

        // ==========================================
        // SECTION 2: "शपथ-पत्र" (Lower Section)
        // ==========================================
        // मैं [Name]  पुत्र/पुत्री/पत्नी श्रीमान् [Father/Husband]  उम्र [Age]  गोत्र [Gotra]
        { field: 'शपथ_नाम', valueKeys: ['applicantName', 'आवेदक_का_नाम', 'name', 'applicant_name', 'शपथ_नाम'], x: 48, y: 579.5, maxW: 132, size: 9.5 },
        { field: 'शपथ_पिता_का_नाम', valueKeys: ['fatherName', 'पिता_का_नाम', 'father_husband_name', 'father_name', 'husbandName', 'husband_name', 'शपथ_पिता_का_नाम'], x: 280, y: 579.5, maxW: 115, size: 9.5 },
        { field: 'शपथ_उम्र', valueKeys: ['ageText', 'age', 'उम्र', 'शपथ_उम्र'], x: 422, y: 579.5, maxW: 55, size: 9.5 },
        { field: 'शपथ_गोत्र', valueKeys: ['gotra', 'गोत्र', 'gotraName', 'gotra_name', 'शपथ_गोत्र'], x: 502, y: 579.5, maxW: 62, size: 9.5 },

        // निवासी [Address]
        { field: 'शपथ_पता', valueKeys: ['residenceAddress', 'address', 'पता', 'full_address', 'fullAddress', 'शपथ_पता'], x: 70, y: 613.7, maxW: 112, size: 9.0 },
      ];
    } else if (type === 'general-application') {
      // Calibrated single-page official template with 2 distinct sections
      // Coordinate System: top-left (y represents distance from top of page, pageHeight = 841.89)
      // Display Rule: In the printed "क्रमांक : NGO/26/" field, render ONLY offlineFormNumber (never system formNumber)
      fieldDefinitions = [
        // ==========================================
        // SECTION 1: "आवेदन–फॉर्म" (Top Section)
        // ==========================================
        // Line 1: क्रमांक : NGO/26/ [Offline No only]      दिनांक [Date]
        { field: 'क्रमांक', valueKeys: ['offlineFormNumber', 'ऑफलाइन_फॉर्म_नं', 'offline_form_number', 'offlineFormNo', 'सदस्यता_क्रमांक'], x: 125, y: 193.1, maxW: 100, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'दिनांक', valueKeys: ['applicationDate', 'आवेदन_दिनांक', 'date', 'created_at', 'application_date'], x: 445, y: 193.1, maxW: 105, size: 9.5, isDate: true },

        // Line 2: नाम [Applicant Name]
        { field: 'नाम', valueKeys: ['applicantName', 'आवेदक_का_नाम', 'name', 'applicant_name'], x: 62, y: 220.8, maxW: 390, size: 10 },

        // Line 3: पिता/पति का नाम [Father/Husband Name]
        { field: 'पिता_का_नाम', valueKeys: ['fatherName', 'पिता_का_नाम', 'father_husband_name', 'father_name', 'husbandName', 'husband_name'], x: 122, y: 248.6, maxW: 330, size: 10 },

        // Line 4: जन्म दिनांक [DOB]  लिंग [Gender]  शिक्षा [Education]
        { field: 'जन्म_दिनांक', valueKeys: ['dateOfBirth', 'जन्म_तिथि', 'dob', 'date_of_birth'], x: 92, y: 276.3, maxW: 75, size: 9.5, isDate: true },
        { field: 'लिंग', valueKeys: ['gender', 'लिंग'], x: 198, y: 276.3, maxW: 62, size: 9.5 },
        { field: 'शिक्षा', valueKeys: ['education', 'शिक्षा', 'qualification'], x: 295, y: 276.3, maxW: 155, size: 9.5 },

        // Line 5: आवेदन के आधार नं. [Aadhaar Number]
        { field: 'आधार_संख्या', valueKeys: ['aadharNumber', 'आधार_संख्या', 'aadhar_no', 'aadhaar', 'aadhar_number', 'aadhaarNumber'], x: 130, y: 304.0, maxW: 320, size: 10 },

        // Line 6: पता [Address]
        { field: 'पता', valueKeys: ['address', 'पता', 'full_address', 'fullAddress'], x: 58, y: 331.7, maxW: 390, size: 9.5 },

        // Line 7: जिला [District]  राज्य [State]  मो. नं. [Mobile]
        { field: 'जिला', valueKeys: ['district', 'जिला'], x: 65, y: 359.5, maxW: 92, size: 9.5 },
        { field: 'राज्य', valueKeys: ['state', 'राज्य'], x: 190, y: 359.5, maxW: 105, size: 9.5 },
        { field: 'मोबाइल', valueKeys: ['mobile', 'मोबाइल', 'phone', 'mobileNumber'], x: 332, y: 359.5, maxW: 215, size: 9.5 },

        // Line 8: नॉमिनी का नाम [Nominee Name]  सम्बन्ध [Nominee Relation]
        { field: 'नामिनी_का_नाम', valueKeys: ['nomineeName', 'नामिनी_का_नाम', 'nominee_name'], x: 108, y: 387.2, maxW: 185, size: 10 },
        { field: 'नामिनी_का_सम्बन्ध', valueKeys: ['nomineeRelation', 'नामिनी_का_सम्बन्ध', 'nominee_relation'], x: 338, y: 387.2, maxW: 210, size: 10 },

        // Line 9: नॉमिनी का आधार नं. [Nominee Aadhaar]  मो. [Nominee Mobile]  कार्यकर्ता कोड [Worker Offline Form No]
        { field: 'नामिनी_का_आधार', valueKeys: ['nomineeAadhar', 'nomineeAadhaar', 'नामिनी_का_आधार', 'nominee_aadhar', 'nominee_aadhaar', 'nomineeAadharNumber', 'nomineeAadhaarNumber', 'nominee_aadhar_number', 'nominee_aadhaar_number', 'nomineeAdhar', 'nominee_adhar', 'nomineeAadharNo', 'nomineeAadhaarNo'], x: 130, y: 414.9, maxW: 120, size: 9.5 },
        { field: 'नामिनी_का_मोबाइल', valueKeys: ['nomineeMobile', 'नामिनी_का_मोबाइल', 'nominee_mobile', 'nomineePhone', 'nominee_phone', 'nomineeMobileNumber', 'nominee_mobile_number', 'nomineeContact', 'nominee_contact'], x: 275, y: 414.9, maxW: 125, size: 9.5 },
        { field: 'कार्यकर्ता_कोड', valueKeys: ['workerOfflineFormNumber', 'worker_offline_form_number', 'agentOfflineFormNumber', 'agent_offline_form_number', 'karyakartaOfflineFormNumber', 'workerOfflineFormNo', 'agentOfflineFormNo', 'कार्यकर्ता_कोड'], x: 472, y: 414.9, maxW: 75, size: 9.5 },

        // Line 10: राशि [Amount]  नकद/चैक/डी.डी./यूटीआर नं. [Payment Ref]  सीनियर कोड [Senior Offline Form No]
        { field: 'राशि', valueKeys: ['amount', 'राशि', 'totalAmount', 'total_amount', 'fee', 'paymentAmount', 'payment_amount', 'membershipFee'], x: 60, y: 442.6, maxW: 90, size: 9.5, formatAmount: true },
        { field: 'भुगतान_विवरण', valueKeys: ['paymentModeRef', 'भुगतान_विवरण', 'paymentRef', 'payment_mode', 'paymentMode', 'utr_no', 'utrNo'], x: 285, y: 442.6, maxW: 120, size: 9.5 },
        { field: 'सीनियर_कोड', valueKeys: ['seniorOfflineFormNumber', 'senior_offline_form_number', 'seniorAgentOfflineFormNumber', 'senior_agent_offline_form_number', 'seniorOfflineFormNo', 'senior_offline_form_no', 'सीनियर_कोड'], x: 472, y: 442.6, maxW: 75, size: 9.5 },

        // ==========================================
        // SECTION 2: "सदस्यता फार्म रसीद" (Bottom Section)
        // ==========================================
        // Line R1: क्रमांक : NGO/26/ [Offline No only]      दिनांक [Date]
        { field: 'रसीद_क्रमांक', valueKeys: ['offlineFormNumber', 'ऑफलाइन_फॉर्म_नं', 'offline_form_number', 'offlineFormNo', 'सदस्यता_क्रमांक'], x: 125, y: 660.6, maxW: 100, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
        { field: 'रसीद_दिनांक', valueKeys: ['applicationDate', 'आवेदन_दिनांक', 'date', 'created_at', 'application_date'], x: 472, y: 660.6, maxW: 80, size: 9.5, isDate: true },

        // Line R2: नाम [Applicant Name]      पिता/पति का नाम [Father/Husband Name]
        { field: 'रसीद_नाम', valueKeys: ['applicantName', 'आवेदक_का_नाम', 'name', 'applicant_name'], x: 58, y: 682.4, maxW: 180, size: 10 },
        { field: 'रसीद_पिता_का_नाम', valueKeys: ['fatherName', 'पिता_का_नाम', 'father_husband_name', 'father_name', 'husbandName', 'husband_name'], x: 330, y: 682.4, maxW: 218, size: 10 },

        // Line R3: पता [Address]
        { field: 'रसीद_पता', valueKeys: ['address', 'पता', 'full_address', 'fullAddress'], x: 58, y: 704.3, maxW: 490, size: 9.5 },

        // Line R4: मो. [Mobile]      नकद/चैक/डीडी [Payment Mode/Ref]
        { field: 'रसीद_मोबाइल', valueKeys: ['mobile', 'मोबाइल', 'phone', 'mobileNumber'], x: 55, y: 726.2, maxW: 172, size: 9.5 },
        { field: 'रसीद_भुगतान_विवरण', valueKeys: ['paymentModeRef', 'भुगतान_विवरण', 'paymentRef', 'payment_mode', 'paymentMode', 'utr_no', 'utrNo'], x: 308, y: 726.2, maxW: 240, size: 9.5 },

        // Line R5: बाबत राशि [Amount Text]
        { field: 'रसीद_राशि', valueKeys: ['amount', 'राशि', 'totalAmount', 'total_amount', 'fee', 'paymentAmount', 'payment_amount', 'membershipFee'], x: 88, y: 748.1, maxW: 142, size: 9.5, formatAmount: true },

        // Line R6: रु [Amount in Box]
        { field: 'रसीद_राशि_बॉक्स', valueKeys: ['amount', 'राशि', 'totalAmount', 'total_amount', 'fee', 'paymentAmount', 'payment_amount', 'membershipFee'], x: 115, y: 790.9, maxW: 120, size: 11, color: { r: 0, g: 0.15, b: 0.6 }, formatAmount: true },
      ];
    } else {
      // Legacy / fallback mappings
      fieldDefinitions = [
        { field: 'सदस्यता_क्रमांक', valueKeys: ['सदस्यता_क्रमांक'], x: 80, y: 185, size: 12 },
        { field: 'आवेदन_दिनांक', valueKeys: ['आवेदन_दिनांक'], x: 490, y: 185, size: 12, isDate: true },
        { field: 'आवेदक_का_नाम', valueKeys: ['आवेदक_का_नाम'], x: 90, y: 240, size: 12 },
        { field: 'पिता_का_नाम', valueKeys: ['पिता_का_नाम'], x: 315, y: 240, size: 12 },
        { field: 'माता_का_नाम', valueKeys: ['माता_का_नाम'], x: 120, y: 270, size: 12 },
        { field: 'जन्म_तिथि', valueKeys: ['जन्म_तिथि'], x: 325, y: 270, size: 12, isDate: true },
        { field: 'गोत्र', valueKeys: ['गोत्र'], x: 80, y: 300, size: 12 },
        { field: 'उम्र', valueKeys: ['उम्र'], x: 250, y: 300, size: 12 },
        { field: 'मोबाइल', valueKeys: ['मोबाइल'], x: 370, y: 300, size: 12 },
        { field: 'आधार_संख्या', valueKeys: ['आधार_संख्या'], x: 110, y: 330, size: 12 },
        { field: 'पता', valueKeys: ['पता'], x: 80, y: 360, size: 12 },
        { field: 'पिन', valueKeys: ['पिन'], x: 80, y: 385, size: 12 },
        { field: 'तहसील', valueKeys: ['तहसील'], x: 220, y: 385, size: 12 },
        { field: 'जिला', valueKeys: ['जिला'], x: 350, y: 385, size: 12 },
        { field: 'राज्य', valueKeys: ['राज्य'], x: 470, y: 385, size: 12 },
        { field: 'नामिनी_का_नाम', valueKeys: ['नामिनी_का_नाम'], x: 120, y: 415, size: 12 },
        { field: 'नामिनी_का_सम्बन्ध', valueKeys: ['नामिनी_का_सम्बन्ध'], x: 390, y: 415, size: 12 },
        { field: 'कार्यकर्ता_का_नाम', valueKeys: ['कार्यकर्ता_का_नाम'], x: 130, y: 450, size: 12 },
        { field: 'कार्यकर्ता_का_मोबाइल', valueKeys: ['कार्यकर्ता_का_मोबाइल'], x: 340, y: 450, size: 12 },
        { field: 'शपथ_नाम', valueKeys: ['शपथ_नाम'], x: 90, y: 630, size: 12 },
        { field: 'शपथ_पिता_का_नाम', valueKeys: ['शपथ_पिता_का_नाम'], x: 300, y: 630, size: 12 },
        { field: 'शपथ_गोत्र', valueKeys: ['शपथ_गोत्र'], x: 60, y: 660, size: 12 },
        { field: 'शपथ_पता', valueKeys: ['शपथ_पता'], x: 225, y: 660, size: 12 },
      ];
    }

    // Optional debug grid
    if (debugMode) {
      const gridStep = 25;
      const majorStep = 100;
      for (let x = 0; x <= pageWidth; x += gridStep) {
        firstPage.drawLine({
          start: { x, y: 0 },
          end: { x, y: pageHeight },
          thickness: x % majorStep === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
      for (let y = 0; y <= pageHeight; y += gridStep) {
        firstPage.drawLine({
          start: { x: 0, y },
          end: { x: pageWidth, y },
          thickness: y % majorStep === 0 ? 0.8 : 0.2,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
      for (let x = 0; x <= pageWidth; x += majorStep) {
        firstPage.drawText(String(x), { x: x + 2, y: 4, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
      for (let y = 0; y <= pageHeight; y += majorStep) {
        firstPage.drawText(String(y), { x: 2, y: y + 2, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      }
    }

    const valueOffsetX = typeof reqValueOffsetX === 'number' ? reqValueOffsetX : 0;
    const valueOffsetY = typeof reqValueOffsetY === 'number' ? reqValueOffsetY : 0;

    for (const def of fieldDefinitions) {
      let val: any = undefined;
      for (const key of def.valueKeys) {
        if (data && data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') {
          val = data[key];
          break;
        }
      }

      if (val === undefined || val === null || String(val).trim() === '') {
        continue;
      }

      let textValue = String(val).trim();

      if (
        (type === 'general-application' || type === 'dhundhotsav' || type === 'dhundhotsav-application') &&
        (def.field === 'कार्यकर्ता_कोड' || def.field === 'सीनियर_कोड' || def.field === 'एजेन्ट_कोड')
      ) {
        // Strict business rule: Only offline form numbers allowed in worker and senior code fields.
        // Never print EMP-xxx, ADMIN, N/A, null, undefined, or UUIDs.
        if (
          /^EMP-\d+/i.test(textValue) ||
          textValue.toUpperCase() === 'ADMIN' ||
          textValue.toUpperCase() === 'SUPER ADMIN' ||
          textValue.toUpperCase() === 'N/A' ||
          textValue.toLowerCase() === 'null' ||
          textValue.toLowerCase() === 'undefined' ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(textValue)
        ) {
          continue;
        }
      }

      // Format date
      if (def.isDate) {
        textValue = formatDateToDDMMYYYY(textValue);
      }

      // Offline form number is rendered directly as value after "NGO/26/" (e.g. 99999)

      // Format amount
      if (def.formatAmount) {
        if (textValue && !textValue.endsWith('/-') && !isNaN(Number(textValue.replace(/,/g, '')))) {
          textValue = `${textValue}/-`;
        }
      }

      const baseX = def.x + valueOffsetX + globalOffsetX;
      const baseY = def.y + valueOffsetY + globalOffsetY;
      const drawX = baseX;
      const drawY = coordinateSystem === 'top-left' ? pageHeight - baseY : baseY;
      let fontSize = def.size || 9.5;

      // Auto-scale font size if text exceeds max width
      if (def.maxW && (font as any).widthOfTextAtSize) {
        try {
          const textWidth = (font as any).widthOfTextAtSize(textValue, fontSize);
          if (textWidth > def.maxW) {
            fontSize = Math.max(6.0, fontSize * (def.maxW / textWidth));
          }
        } catch {
          // Fallback if widthOfTextAtSize fails
        }
      }

      const textColor = def.color
        ? rgb(def.color.r, def.color.g, def.color.b)
        : rgb(0.1, 0.1, 0.1);

      if (debugMode) {
        firstPage.drawRectangle({ x: drawX - 1, y: drawY - 1, width: 2, height: 2, color: rgb(1, 0, 0) });
      }

      firstPage.drawText(textValue, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: textColor,
      });
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );

    // Generate appropriate filename based on gender and type
    let filename = 'filled_form.pdf';
    if (type === 'dhundhotsav' || type === 'dhundhotsav-application') {
      const formNumber = (data as any)?.offlineFormNumber || (data as any)?.formNumber || 'filled';
      filename = `dhundhotsav_application_form_${formNumber}.pdf`;
    } else if (type === 'general-application') {
      const gender = data?.gender || data?.लिंग;
      const formNumber = (data as any)?.सदस्यता_क्रमांक || (data as any)?.formNumber || 'filled';
      if (gender === 'Female' || gender === 'महिला') {
        filename = `balika_application_form_${formNumber}.pdf`;
      } else if (gender === 'Male' || gender === 'पुरुष') {
        filename = `boys_application_form_${formNumber}.pdf`;
      } else {
        filename = `general_application_form_${formNumber}.pdf`;
      }
    } else {
      filename = `balika_avedan_form_${(data as any)?.सदस्यता_क्रमांक || 'filled'}.pdf`;
    }

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
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
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