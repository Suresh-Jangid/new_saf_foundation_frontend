import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { renderPdfToImage } from './render-crisp-pdf.mjs';

console.log('============================================================');
console.log('SAF FOUNDATION — GENERAL MARRIAGE OFFICIAL PDF TEST SUITE');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

async function runTests() {
  const templatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'Saf_general_form.pdf');
  const fallbackTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'general_application_form.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

  console.log('1. Template & Asset Checks...');
  it('Official template exists at public/pdf/general_application/Saf_general_form.pdf', () => {
    assert.ok(fs.existsSync(templatePath), 'Saf_general_form.pdf must exist');
  });

  it('Standard fallback exists at public/pdf/general_application/general_application_form.pdf', () => {
    assert.ok(fs.existsSync(fallbackTemplatePath), 'general_application_form.pdf must exist');
  });

  it('NotoSansDevanagari font exists', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari font must exist');
  });

  console.log('\n2. Frontend Source Code Audit...');
  const pageContent = fs.readFileSync('app/dashboard/general-applications/page.tsx', 'utf8');
  const routeContent = fs.readFileSync('app/api/fill-pdf-form/route.ts', 'utf8');

  it('fill-pdf-form route targets Saf_general_form.pdf in candidateTemplates', () => {
    assert.ok(routeContent.includes('Saf_general_form.pdf'), 'Must include Saf_general_form.pdf in candidates');
  });

  it('GeneralApplicationsPage maps offlineFormNumber and all fields in mapToHindiFields', () => {
    assert.ok(pageContent.includes('offlineFormNumber'), 'Must extract offlineFormNumber');
    assert.ok(pageContent.includes('नामिनी_का_आधार:'), 'Must map nomineeAadhar');
    assert.ok(pageContent.includes('नामिनी_का_मोबाइल:'), 'Must map nomineeMobile');
    assert.ok(pageContent.includes('कार्यकर्ता_कोड:'), 'Must map workerCode');
    assert.ok(pageContent.includes('राशि:'), 'Must map amount / totalAmount');
    assert.ok(pageContent.includes('भुगतान_विवरण:'), 'Must map paymentModeRef');
    assert.ok(pageContent.includes('सीनियर_कोड:'), 'Must map seniorCode');
  });

  it('GeneralApplicationsPage and route do NOT map raw database UUIDs or ObjectIDs to workerCode', () => {
    assert.ok(!routeContent.includes("'addedby_id'"), 'Route valueKeys must not include addedby_id');
    assert.ok(!routeContent.includes("'addedById'"), 'Route valueKeys must not include addedById');
    assert.ok(!routeContent.includes("'selectedAgentId'"), 'Route valueKeys must not include selectedAgentId');
    
    // Extract mapToHindiFields block from pageContent
    const mapMatch = pageContent.match(/const mapToHindiFields = [\s\S]*?\n  \};/);
    assert.ok(mapMatch, 'mapToHindiFields must be defined');
    const mapBlock = mapMatch[0];
    assert.ok(!mapBlock.includes('addedby_id'), 'mapToHindiFields must not use addedby_id for worker code');
    assert.ok(!mapBlock.includes('addedById'), 'mapToHindiFields must not use addedById for worker code');
    assert.ok(!mapBlock.includes('selectedAgentId'), 'mapToHindiFields must not use selectedAgentId for worker code');
  });

  it('fill-pdf-form route supports comprehensive valueKeys for all required fields', () => {
    assert.ok(routeContent.includes("'offlineFormNumber'"), 'route must include offlineFormNumber');
    assert.ok(routeContent.includes("'nomineeAadhar'"), 'route must include nomineeAadhar');
    assert.ok(routeContent.includes("'nomineeMobile'"), 'route must include nomineeMobile');
    assert.ok(routeContent.includes("'workerCode'"), 'route must include workerCode');
    assert.ok(routeContent.includes("'totalAmount'"), 'route must include totalAmount');
    assert.ok(routeContent.includes("'paymentModeRef'"), 'route must include paymentModeRef');
    assert.ok(routeContent.includes("'seniorCode'"), 'route must include seniorCode');
  });

  it('fill-pdf-form route implements maxW auto-scaling for long text safety', () => {
    assert.ok(routeContent.includes('widthOfTextAtSize'), 'route must check text width');
    assert.ok(routeContent.includes('maxW'), 'route must implement maxW auto scaling');
  });

  console.log('\n3. Dual Number & Multi-Scenario PDF Generation Verification...');
  const existingPdfBytes = fs.readFileSync(templatePath);
  const fontBytes = fs.readFileSync(fontPath);

  // Define 4 test cases
  const testCases = [
    {
      id: 'case_1_normal_complete',
      desc: 'Case 1: Normal Complete Record (Dual Number M-021 + 1269)',
      data: {
        formNumber: 'M-021',
        offlineFormNumber: '1269',
        applicationDate: '2026-09-12',
        applicantName: 'सुनीता पुरबिया',
        fatherName: 'रमेश पुरबिया',
        dateOfBirth: '1998-05-15',
        aadharNumber: '8904 5678 9012',
        gender: 'Female',
        education: 'स्नातक (B.A.)',
        mobile: '9876543210',
        address: 'वार्ड नं. 4, समदड़ी, जिला - बालोतरा (राज.)',
        district: 'बालोतरा',
        state: 'राजस्थान',
        nomineeName: 'महेन्द्र पुरबिया',
        nomineeRelation: 'भाई',
        nomineeAadhar: '1234 5678 9012',
        nomineeMobile: '9876543211',
        workerCode: 'AG-104',
        amount: '25000',
        paymentModeRef: 'UPI / UTR: 423984729834',
        seniorCode: 'SNR-005',
      },
    },
    {
      id: 'case_2_historical_no_offline',
      desc: 'Case 2: Historical Record with No Offline Number (SAF-104)',
      data: {
        formNumber: 'SAF-104',
        offlineFormNumber: null,
        applicationDate: '2026-08-20',
        applicantName: 'विकास चौधरी',
        fatherName: 'सुरेश चौधरी',
        dateOfBirth: '1995-10-12',
        aadharNumber: '4567 8901 2345',
        gender: 'Male',
        education: '12वीं पास',
        mobile: '9414012345',
        address: 'गांव - सिवाना, तहसील - समदड़ी, जिला - बालोतरा (राज.)',
        district: 'बालोतरा',
        state: 'राजस्थान',
        nomineeName: 'कौशल्या देवी',
        nomineeRelation: 'माता',
        nomineeAadhar: '6789 0123 4567',
        nomineeMobile: '9414054321',
        workerCode: 'AG-018',
        amount: '21000',
        paymentModeRef: 'Cash / नकद',
        seniorCode: 'SNR-002',
      },
    },
    {
      id: 'case_3_long_text',
      desc: 'Case 3: Long Text (Long Name & Extended Multi-Line Address)',
      data: {
        formNumber: 'M-099',
        offlineFormNumber: '54321',
        applicationDate: '2026-09-01',
        applicantName: 'श्रीमती पद्मावती देवी कुमारी पुरबिया धर्मपत्नी श्री कल्याणमल जी',
        fatherName: 'श्री कल्याणमल जी पुरबिया निवासी सिवाना समदड़ी',
        dateOfBirth: '1990-01-01',
        aadharNumber: '9999 8888 7777',
        gender: 'Female',
        education: 'परास्नातक (M.A. Hindi Literature)',
        mobile: '9829012345',
        address: 'मकान संख्या 142/B, मुख्य बाजार के पीछे, रेलवे स्टेशन रोड, समदड़ी, जिला - बालोतरा, राजस्थान - 344021',
        district: 'बालोतरा',
        state: 'राजस्थान',
        nomineeName: 'कल्याणमल पुरबिया',
        nomineeRelation: 'पति',
        nomineeAadhar: '1111 2222 3333',
        nomineeMobile: '9829099999',
        workerCode: 'AG-999',
        amount: '51000',
        paymentModeRef: 'NEFT/RTGS: PUNB00987654321',
        seniorCode: 'SNR-999',
      },
    },
    {
      id: 'case_4_missing_optional',
      desc: 'Case 4: Missing Optional Nominee and Payment Ref Fields',
      data: {
        formNumber: 'M-101',
        offlineFormNumber: '2001',
        applicationDate: '2026-09-10',
        applicantName: 'राकेश कुमार',
        fatherName: 'हनुमान राम',
        dateOfBirth: '2000-03-25',
        aadharNumber: '7777 6666 5555',
        gender: 'Male',
        education: '10वीं',
        mobile: '9123456780',
        address: 'समदड़ी',
        district: 'बालोतरा',
        state: 'राजस्थान',
        nomineeName: '',
        nomineeRelation: '',
        nomineeAadhar: '',
        nomineeMobile: '',
        workerCode: '',
        amount: '25000',
        paymentModeRef: '',
        seniorCode: '',
      },
    },
  ];

  async function generateAndVerify(scenario) {
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes, { subset: false });
    const page = pdfDoc.getPages()[0];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const drawBounded = (text, x, y_bl, size = 10, maxW, color = rgb(0.1, 0.1, 0.1)) => {
      if (!text) return;
      const str = String(text).trim();
      if (!str) return;
      let s = size;
      if (maxW && font.widthOfTextAtSize) {
        const w = font.widthOfTextAtSize(str, size);
        if (w > maxW) {
          s = Math.max(6.0, size * (maxW / w));
        }
      }
      page.drawText(str, {
        x,
        y: y_bl,
        size: s,
        font,
        color,
      });
    };

    const formatDate = (val) => {
      if (!val) return '';
      const parts = String(val).split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return String(val);
    };

    const d = scenario.data;

    // UPPER SECTION
    // Line 1: क्रमांक : NGO/26/ [System No]  [Offline No]      दिनांक [Date]
    drawBounded(d.formNumber, 125, 646.3, 10, 90, rgb(0, 0.15, 0.6));
    if (d.offlineFormNumber) {
      drawBounded(d.offlineFormNumber, 250, 646.3, 10, 175, rgb(0, 0.15, 0.6));
    }
    drawBounded(formatDate(d.applicationDate), 445, 646.3, 9.5, 105);

    // Line 2: नाम [Applicant Name]
    drawBounded(d.applicantName, 62, 618.6, 10, 390);

    // Line 3: पिता/पति का नाम [Father/Husband Name]
    drawBounded(d.fatherName, 122, 590.8, 10, 330);

    // Line 4: जन्म दिनांक [DOB]  लिंग [Gender]  शिक्षा [Education]
    drawBounded(formatDate(d.dateOfBirth), 92, 563.1, 9.5, 75);
    drawBounded(d.gender === 'Female' ? 'महिला' : d.gender === 'Male' ? 'पुरुष' : d.gender, 198, 563.1, 9.5, 62);
    drawBounded(d.education, 295, 563.1, 9.5, 155);

    // Line 5: आवेदन के आधार नं. [Aadhaar Number]
    drawBounded(d.aadharNumber, 130, 535.4, 10, 320);

    // Line 6: पता [Address]
    drawBounded(d.address, 58, 507.7, 9.5, 390);

    // Line 7: जिला [District]  राज्य [State]  मो. नं. [Mobile]
    drawBounded(d.district, 65, 479.9, 9.5, 92);
    drawBounded(d.state, 190, 479.9, 9.5, 105);
    drawBounded(d.mobile, 332, 479.9, 9.5, 215);

    // Line 8: नॉमिनी का नाम [Nominee Name]  सम्बन्ध [Nominee Relation]
    drawBounded(d.nomineeName, 108, 452.2, 10, 185);
    drawBounded(d.nomineeRelation, 338, 452.2, 10, 210);

    // Line 9: नॉमिनी का आधार नं. [Nominee Aadhaar]  मो. [Nominee Mobile]  कार्यकर्ता कोड [Worker Code]
    drawBounded(d.nomineeAadhar, 130, 424.5, 9.5, 120);
    drawBounded(d.nomineeMobile, 275, 424.5, 9.5, 125);
    drawBounded(d.workerCode, 472, 424.5, 9.5, 75);

    // Line 10: राशि [Amount]  नकद/चैक/डी.डी./यूटीआर नं. [Payment Ref]  सीनियर कोड [Senior Code]
    const amtStr = d.amount ? `${d.amount}/-` : '';
    drawBounded(amtStr, 60, 396.8, 9.5, 90);
    drawBounded(d.paymentModeRef, 285, 396.8, 9.5, 120);
    drawBounded(d.seniorCode, 472, 396.8, 9.5, 75);

    // LOWER RECEIPT
    // Line R1: क्रमांक : NGO/26/ [System No]  [Offline No]      दिनांक [Date]
    drawBounded(d.formNumber, 125, 178.8, 10, 90, rgb(0, 0.15, 0.6));
    if (d.offlineFormNumber) {
      drawBounded(d.offlineFormNumber, 240, 178.8, 10, 190, rgb(0, 0.15, 0.6));
    }
    drawBounded(formatDate(d.applicationDate), 472, 178.8, 9.5, 80);

    // Line R2: नाम [Applicant Name]      पिता/पति का नाम [Father/Husband Name]
    drawBounded(d.applicantName, 58, 157.0, 10, 180);
    drawBounded(d.fatherName, 330, 157.0, 10, 218);

    // Line R3: पता [Address]
    drawBounded(d.address, 58, 135.1, 9.5, 490);

    // Line R4: मो. [Mobile]      नकद/चैक/डीडी [Payment Mode/Ref]
    drawBounded(d.mobile, 55, 113.2, 9.5, 172);
    drawBounded(d.paymentModeRef, 308, 113.2, 9.5, 240);

    // Line R5: बाबत राशि [Amount Text]
    drawBounded(amtStr, 88, 91.3, 9.5, 142);

    // Line R6: रु [Amount in Box]
    drawBounded(amtStr, 115, 51.0, 11, 120, rgb(0, 0.15, 0.6));

    const outPdf = path.resolve('test-output', `${scenario.id}.pdf`);
    const outPng = path.resolve('test-output', `${scenario.id}.png`);
    const bytes = await pdfDoc.save();
    fs.writeFileSync(outPdf, bytes);
    await renderPdfToImage(outPdf, outPng, 2.0);

    it(`${scenario.desc} generated valid 1-page PDF (${(bytes.length / 1024).toFixed(1)} KB)`, () => {
      assert.strictEqual(pdfDoc.getPageCount(), 1);
      assert.ok(bytes.length > 400000);
      assert.ok(fs.existsSync(outPng));
    });
  }

  for (const sc of testCases) {
    await generateAndVerify(sc);
  }

  console.log('\n============================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
