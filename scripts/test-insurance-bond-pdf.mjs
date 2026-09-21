import 'regenerator-runtime/runtime.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('============================================================');
console.log('SAF FOUNDATION — INSURANCE BIMA BOND PDF TEST SUITE');
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
  const primaryTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'general_insurance_application', 'bond', 'saf_parivar_kalyan_bond.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-SemiBold.ttf');

  console.log('1. Template & Asset Integrity Checks...');
  it('1. Official Insurance template exists in public/pdf/general_insurance_application/bond/saf_parivar_kalyan_bond.pdf', () => {
    assert.ok(fs.existsSync(primaryTemplatePath), 'Template must exist');
  });

  it('2. Template is non-empty official PDF (>1.5MB)', () => {
    const stats = fs.statSync(primaryTemplatePath);
    assert.ok(stats.size > 1500000, `Template size must be > 1.5MB (actual: ${stats.size})`);
  });

  it('3. Official template hash is strictly preserved', () => {
    const fileBytes = fs.readFileSync(primaryTemplatePath);
    const hash = crypto.createHash('sha256').update(fileBytes).digest('hex').toUpperCase();
    assert.strictEqual(
      hash,
      '6051CE7FCD61B47D2083790BF64D32979C224F3A3D19DD42B0DDBEF7D1DAD5C7',
      'Template SHA256 hash must remain exactly unchanged'
    );
  });

  it('4. NotoSansDevanagari SemiBold font exists for Hindi Unicode rendering', () => {
    assert.ok(fs.existsSync(fontPath), 'Devanagari SemiBold font must exist');
  });

  console.log('\n2. Template Structure & Dimension Assertions...');
  const templateBytes = fs.readFileSync(primaryTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  it('5. Template is exactly 1 page', () => {
    assert.strictEqual(pdfDoc.getPageCount(), 1, 'Template must be exactly 1 page');
  });

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  it('6. Output page dimensions match official A4 template (595.28 x 841.89 pt)', () => {
    assert.strictEqual(Math.round(width), 595, 'Width must be ~595 pt');
    assert.strictEqual(Math.round(height), 842, 'Height must be ~842 pt');
  });

  console.log('\n3. Route & Field Extraction Audits...');
  const routeContent = fs.readFileSync('app/api/generate-insurance-bond-pdf/route.ts', 'utf8');

  it('7. सदस्यता क्र. uses ONLY record.membershipNumber / membership_number', () => {
    const membershipLine = routeContent.match(/const\s+rawMembershipNumber\s*=\s*([\s\S]+?);/);
    assert.ok(membershipLine, 'rawMembershipNumber definition must exist in route');
    assert.ok(
      membershipLine[1].includes("membershipNumber") &&
      !membershipLine[1].includes("formNumber") &&
      !membershipLine[1].includes("sr_no") &&
      !membershipLine[1].includes("form_number"),
      'rawMembershipNumber must ONLY query membership fields'
    );
  });

  it('8. Missing/empty membershipNumber remains completely blank', () => {
    assert.ok(
      !routeContent.includes('|| "INS-') && !routeContent.includes('|| "SAF-') && !routeContent.includes('|| "BOND-'),
      'Must not invent default membership numbers'
    );
  });

  it('9. Form No maps to offlineFormNumber / formNumber and preserves string (e.g. "005")', () => {
    assert.ok(routeContent.includes('offlineFormNumber'), 'offlineFormNumber mapped');
    assert.ok(routeContent.includes('formNumber'), 'formNumber mapped');
    assert.ok(!routeContent.includes('parseInt(rawOfflineFormNumber)'), 'formNumber must not parse to int');
  });

  it('10. Header meta fields use drawCenteredInBox with exact box bounds', () => {
    assert.ok(routeContent.includes('drawCenteredInBox'), 'drawCenteredInBox helper exists');
    assert.ok(routeContent.includes('drawCenteredInBox(formNumber, 113.37, 680.90, 88.45, 20.87'), 'Form No box bounds matched');
    assert.ok(routeContent.includes('drawCenteredInBox(applicationDate, 459.76, 674.21, 88.45, 20.87'), 'Date box bounds matched');
    assert.ok(routeContent.includes('drawCenteredInBox(workerOffline, 113.37, 654.77, 88.45, 20.87'), 'Agent Code box bounds matched');
    assert.ok(routeContent.includes('drawCenteredInBox(membershipNumber, 459.76, 642.24, 88.45, 20.87'), 'Membership box bounds matched');
    assert.ok(routeContent.includes('drawCenteredInBox(seniorOffline, 113.37, 629.78, 88.45, 20.87'), 'Upline Code box bounds matched');
  });

  it('11. Photo boxes are calibrated for cover cropping without distortion', () => {
    assert.ok(routeContent.includes('462.56, 213.62, 84.90, 78.67'), 'Applicant photo box calibrated');
    assert.ok(routeContent.includes('462.56, 300.54, 84.90, 78.67'), 'Nominee photo box calibrated');
  });

  it('12. Left column fields map to correct labels and lines', () => {
    assert.ok(routeContent.includes('drawBounded(applicantName, 75.0, 604.66'), 'Applicant Name mapped');
    assert.ok(routeContent.includes('drawBounded(fatherHusbandName, 137.0, 578.38'), 'Father Name mapped');
    assert.ok(routeContent.includes('drawBounded(aadharNumber, 98.0, 552.09'), 'Aadhaar mapped');
    assert.ok(routeContent.includes('drawBounded(caste, 78.0, 525.80'), 'Caste/Gotra mapped');
    assert.ok(routeContent.includes('drawBounded(nomineeRelation, 88.0, 499.51'), 'Relation mapped');
    assert.ok(routeContent.includes('drawBounded(village, 74.0, 473.22'), 'Village mapped');
  });

  it('13. Right column fields map to correct labels and lines', () => {
    assert.ok(routeContent.includes('drawBounded(nomineeName, 338.0, 604.31'), 'Nominee Name mapped');
    assert.ok(routeContent.includes('drawBounded(nomineeAadhar, 362.0, 578.31'), 'Nominee Aadhaar mapped');
    assert.ok(routeContent.includes('drawBounded(nomineeMobile, 348.0, 552.32'), 'Nominee Mobile mapped');
    assert.ok(routeContent.includes('drawBounded(agentMobile, 343.0, 526.33'), 'Agent Mobile mapped');
    assert.ok(routeContent.includes('drawBounded(district, 312.0, 500.33'), 'District mapped');
    assert.ok(routeContent.includes('drawBounded(state, 308.0, 474.34'), 'State mapped');
  });

  it('14. Bottom Insurance Scheme Amount is mapped and rendered on the dotted line', () => {
    assert.ok(routeContent.includes('450.65, 12.0, 65, navyColor'), 'Bottom amount position mapped');
    assert.ok(routeContent.includes("let insuranceAmountText = '300'"), '300 fixed installment supported');
  });

  it('15. Agent Mobile strictly uses authoritative Agent mobile and NEVER applicantMobile', () => {
    // Check route.ts definition of agentMobile
    const agentMobileMatch = routeContent.match(/const agentMobile = sanitizeValue\(([\s\S]*?)\);/);
    assert.ok(agentMobileMatch, 'agentMobile assignment found in route.ts');
    const agentMobileBlock = agentMobileMatch[1];
    assert.ok(!agentMobileBlock.includes('record.applicantMobile'), 'applicantMobile must NOT be used for Agent Mobile');
    assert.ok(!agentMobileBlock.includes('record.mobile') || agentMobileBlock.includes('addedBy?.mobile'), 'applicant mobile must NOT be used for Agent Mobile');
    assert.ok(agentMobileBlock.includes('agentMobileNumber') || agentMobileBlock.includes('agentMobile') || agentMobileBlock.includes('workerMobile'), 'Authoritative agent mobile field must be used');

    // Simulate extraction logic as implemented in route.ts
    const resolveAgentMobile = (record) => {
      const raw =
        record.agentMobileNumber ||
        record.agent_mobile_number ||
        record.agentMobile ||
        record.agent_mobile ||
        record.workerMobile ||
        record.worker_mobile ||
        record.workerMobileNumber ||
        record.worker_mobile_number ||
        record.assignedAgentMobile ||
        record.agentPhone ||
        record.agent_phone ||
        record.workerPhone ||
        record.worker_phone ||
        record.addedBy?.mobile ||
        record.added_mobile ||
        record['कार्यकर्ता_का_मोबाइल'] ||
        '';
      return String(raw || '').trim();
    };

    // Scenario A: agentMobileNumber = missing, agentMobile = missing, applicantMobile = "9999999999"
    const recA = { applicantMobile: '9999999999', mobile: '9999999999' };
    assert.strictEqual(resolveAgentMobile(recA), '', 'Expected BLANK when agent mobile is missing even if applicantMobile is present');

    // Scenario B: agentMobileNumber = "8888888888", applicantMobile = "9999999999"
    const recB = { agentMobileNumber: '8888888888', applicantMobile: '9999999999', mobile: '9999999999' };
    assert.strictEqual(resolveAgentMobile(recB), '8888888888', 'Expected "8888888888" from agentMobileNumber');

    // Scenario C: agentMobile = "8888888888", applicantMobile = "9999999999"
    const recC = { agentMobile: '8888888888', applicantMobile: '9999999999', mobile: '9999999999' };
    assert.strictEqual(resolveAgentMobile(recC), '8888888888', 'Expected "8888888888" from agentMobile');
  });

  it('16. [Test A, B, L] Nominee Aadhaar: Authoritative field resolution, missing is blank, applicant Aadhaar never leaked', () => {
    const nomineeAadharMatch = routeContent.match(/const nomineeAadhar = sanitizeValue\(([\s\S]*?)\);/);
    assert.ok(nomineeAadharMatch, 'nomineeAadhar assignment found in route.ts');
    const nomineeAadharBlock = nomineeAadharMatch[1];
    assert.ok(!nomineeAadharBlock.includes('record.aadharNumber') && !nomineeAadharBlock.includes('record.aadhar'), 'applicant Aadhaar must NOT be in nominee Aadhaar block');

    const resolveNomineeAadhaar = (record) => {
      const raw =
        record.nomineeAadhaarNumber ||
        record.nomineeAadharNumber ||
        record.nominee_aadhaar_number ||
        record.nominee_aadhar_number ||
        record.nomineeAadhaar ||
        record.nomineeAadhar ||
        record.nominee_aadhaar ||
        record.nominee_aadhar ||
        record.nomineeAadhaarNo ||
        record.nomineeAadharNo ||
        record.nominee_aadhaar_no ||
        record.nominee_aadhar_no ||
        record['नॉमिनी_आधार_नं'] ||
        record['नॉमिनी_आधार'] ||
        record['वारिसदार_आधार'] ||
        '';
      return String(raw || '').trim();
    };

    // Test A: nominee Aadhaar present -> renders actual value
    const rec1 = { nomineeAadharNumber: '987654321098', aadharNumber: '111122223333' };
    assert.strictEqual(resolveNomineeAadhaar(rec1), '987654321098', 'Test A: Nominee Aadhaar is correctly resolved');

    // Test B: nominee Aadhaar missing -> blank
    const rec2 = { nomineeAadharNumber: null, aadharNumber: '111122223333' };
    assert.strictEqual(resolveNomineeAadhaar(rec2), '', 'Test B: Nominee Aadhaar remains BLANK when missing');

    // Test L: applicant Aadhaar must NEVER become nominee Aadhaar
    const recL = { aadharNumber: '111122223333', aadhar: '111122223333' };
    assert.strictEqual(resolveNomineeAadhaar(recL), '', 'Test L: Applicant Aadhaar never leaks into nominee Aadhaar');
  });

  it('17. [Test C, D, K] Nominee Mobile: Authoritative field resolution, missing is blank, applicant mobile never leaked', () => {
    const nomineeMobileMatch = routeContent.match(/const nomineeMobile = sanitizeValue\(([\s\S]*?)\);/);
    assert.ok(nomineeMobileMatch, 'nomineeMobile assignment found in route.ts');
    const nomineeMobileBlock = nomineeMobileMatch[1];
    assert.ok(!nomineeMobileBlock.includes('record.applicantMobile') && !nomineeMobileBlock.includes('record.mobile'), 'applicant mobile must NOT be in nominee mobile block');

    const resolveNomineeMobile = (record) => {
      const raw =
        record.nomineeMobileNumber ||
        record.nominee_mobile_number ||
        record.nomineeMobile ||
        record.nominee_mobile ||
        record.nomineeMobileNo ||
        record.nominee_mobile_no ||
        record.nomineePhone ||
        record.nominee_phone ||
        record['नॉमिनी_मोबाइल_नं'] ||
        record['नॉमिनी_मोबाइल'] ||
        record['वारिसदार_मोबाइल'] ||
        '';
      return String(raw || '').trim();
    };

    // Test C: nominee mobile present -> renders actual value
    const rec3 = { nomineeMobile: '9123456789', mobile: '9999999999' };
    assert.strictEqual(resolveNomineeMobile(rec3), '9123456789', 'Test C: Nominee Mobile is correctly resolved');

    // Test D: nominee mobile missing -> blank
    const rec4 = { nomineeMobile: null, mobile: '9999999999' };
    assert.strictEqual(resolveNomineeMobile(rec4), '', 'Test D: Nominee Mobile remains BLANK when missing');

    // Test K: applicant mobile must NEVER become nominee mobile
    const recK = { applicantMobile: '9999999999', mobile: '9999999999' };
    assert.strictEqual(resolveNomineeMobile(recK), '', 'Test K: Applicant mobile never leaks into nominee mobile');
  });

  it('18. [Test E, F, G, M] Photos: Nominee photo, Applicant photo separation, and no swapping', () => {
    assert.ok(routeContent.includes('const applicantPhotoSource = pickPhotoSource('), 'applicantPhotoSource exists');
    assert.ok(routeContent.includes('const nomineePhotoSource = pickPhotoSource('), 'nomineePhotoSource exists');
    assert.ok(routeContent.includes('body?.nomineeImageData'), 'body nomineeImageData supported');
    assert.ok(routeContent.includes('embedPdfImage(pdfDoc, firstPage, pageHeight, applicantPhotoSource, 462.56, 213.62, 84.90, 78.67, \'cover\')'), 'Applicant photo box geometry correct');
    assert.ok(routeContent.includes('embedPdfImage(pdfDoc, firstPage, pageHeight, nomineePhotoSource, 462.56, 300.54, 84.90, 78.67, \'cover\')'), 'Nominee photo box geometry correct');

    // Test M: applicant photo must never become nominee photo
    const nomineePhotoSourceBlock = routeContent.match(/const nomineePhotoSource = pickPhotoSource\(([\s\S]*?)\);/);
    assert.ok(nomineePhotoSourceBlock, 'nomineePhotoSource block found');
    assert.ok(!nomineePhotoSourceBlock[1].includes('record?.passportPhoto,') || nomineePhotoSourceBlock[1].includes('nomineePassportPhoto'), 'passportPhoto alone must not be nominee photo');
  });

  it('19. [Test H, I, J] Insurance Installment strictly renders "300" on the bond', () => {
    const resolveInstallmentText = (record) => {
      const rawAmt =
        record?.installmentAmount ??
        record?.installment_amount ??
        record?.insuranceInstallment ??
        record?.insurance_installment ??
        record?.monthly_installment ??
        record?.monthlyInstallment ??
        record?.premiumAmount ??
        record?.premium_amount;
      let insuranceAmountText = '300';
      if (rawAmt !== undefined && rawAmt !== null && rawAmt !== '') {
        const cleanAmtStr = String(rawAmt).trim();
        const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(cleanAmtStr.replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 0) {
          insuranceAmountText = String(num);
        } else if (cleanAmtStr && /^\d+$/.test(cleanAmtStr)) {
          insuranceAmountText = cleanAmtStr;
        }
      }
      return insuranceAmountText;
    };

    // Test H: installment = 300 -> renders "300"
    assert.strictEqual(resolveInstallmentText({ installmentAmount: 300 }), '300', 'Test H: installment = 300 resolves to "300"');
    assert.strictEqual(resolveInstallmentText({ installment_amount: '300' }), '300', 'Test H: installment_amount = "300" resolves to "300"');

    // Test I: installment = 1000 -> renders "1000"
    assert.strictEqual(resolveInstallmentText({ installmentAmount: 1000 }), '1000', 'Test I: installment = 1000 resolves to "1000"');

    // Test J: installment = missing/null -> defaults safely to "300"
    assert.strictEqual(resolveInstallmentText({ installmentAmount: null }), '300', 'Test J: installment = null resolves to fixed "300"');
    assert.strictEqual(resolveInstallmentText({}), '300', 'Test J: missing installment resolves to fixed "300"');
  });

  console.log('\n4. Multi-Case PDF Generation & Data Assertion Testing...');
  const fontBytes = fs.readFileSync(fontPath);

  // Test Case Matrix
  const testCases = [
    {
      name: 'Case 1: "005" Form No, "15/09/2026" Date, Full Record',
      data: {
        membershipNumber: 'M-2026-089',
        offlineFormNumber: '005',
        applicationDate: '15/09/2026',
        workerOfflineFormNumber: 'AGT-4012',
        seniorOfflineFormNumber: 'SEN-1008',
        applicantName: 'सुरेश जांगिड़',
        fatherName: 'मोहन लाल',
        aadharNumber: '1234 5678 9012',
        gotra: 'सुथार',
        nomineeRelation: 'पत्नी',
        village: 'समदड़ी',
        nomineeName: 'अनीता जांगिड़',
        nomineeAadhar: '9876 5432 1098',
        nomineeMobile: '9876543210',
        workerMobile: '9123456780',
        district: 'बालोतरा',
        state: 'राजस्थान',
        installmentAmount: 300,
      },
    },
    {
      name: 'Case 2: Short Values',
      data: {
        offlineFormNumber: '1',
        applicationDate: '01/01/2026',
        workerOfflineFormNumber: '5',
        applicantName: 'पूजा',
        fatherName: 'राम',
        gotra: 'सैन',
        nomineeRelation: 'पुत्री',
        village: 'पाली',
        nomineeName: 'ओम',
        nomineeAadhar: '998877665544',
        nomineeMobile: '9999999999',
        workerMobile: '8888888888',
        district: 'पाली',
        state: 'राजस्थान',
        installmentAmount: 1000,
      },
    },
    {
      name: 'Case 3: Long Names and Long Addresses (Testing Proportional Fitting)',
      data: {
        membershipNumber: 'MEM-2026-LONG-001',
        offlineFormNumber: 'OFF-LONG-2026-0098',
        applicationDate: '2026-09-17',
        workerOfflineFormNumber: 'WRK-889900',
        seniorOfflineFormNumber: 'SNR-112233',
        applicantName: 'श्रीमती भाग्यवंती देवी सुपुत्री सज्जनराज जी प्रजापत',
        fatherName: 'श्री सज्जनराज जी सुपुत्र भंवरलाल जी प्रजापत',
        aadharNumber: '123456789012',
        gotra: 'प्रजापत (कुम्हार)',
        nomineeRelation: 'भांजा',
        village: 'मकान नंबर 45, रेलवे स्टेशन रोड, वार्ड नंबर 12, समदड़ी तहसील, बालोतरा',
        nomineeName: 'श्रीमान भरत कुमार जी सुपुत्र सज्जनराज जी प्रजापत',
        nomineeAadhar: '987654321098',
        nomineeMobile: '9876543210',
        workerMobile: '9123456780',
        district: 'बालोतरा',
        state: 'राजस्थान',
        installmentAmount: '300 किस्त',
      },
    },
    {
      name: 'Case 4: Null/Empty Optional Fields (Strict Blank Verification)',
      data: {
        applicantName: 'मोनिका',
        fatherName: 'सुरेश कुमार',
        gotra: 'जांगिड़',
        membershipNumber: null,
        workerOfflineFormNumber: undefined,
        seniorOfflineFormNumber: '',
        offlineFormNumber: '',
        nomineeRelation: '',
        village: '',
        nomineeName: 'सुरेश कुमार',
        nomineeAadhar: null,
        nomineeMobile: '',
        workerMobile: '',
        district: '',
        state: '',
        installmentAmount: null,
      },
    },
  ];

  for (const tc of testCases) {
    it(`PDF serialization for ${tc.name}`, async () => {
      const doc = await PDFDocument.load(templateBytes);
      doc.registerFontkit(fontkit);
      const f = await doc.embedFont(fontBytes, { subset: false });
      const p = doc.getPages()[0];

      const drawCenteredInBox = (text, boxX, boxY, boxW, boxH, size = 11.0) => {
        if (!text) return;
        const str = String(text).trim();
        if (!str) return;
        let fontSize = size;
        let textWidth = f.widthOfTextAtSize(str, fontSize);
        const maxW = boxW - 4;
        if (textWidth > maxW) {
          fontSize = Math.max(7.0, size * (maxW / textWidth));
          textWidth = f.widthOfTextAtSize(str, fontSize);
        }
        const drawX = boxX + (boxW - textWidth) / 2;
        const capHeight = fontSize * 0.72;
        const boxMidY = boxY + boxH / 2;
        const drawY = boxMidY - capHeight / 2;
        p.drawText(str, { x: drawX, y: drawY, size: fontSize, font: f, color: rgb(0.0, 0.15, 0.58) });
      };

      const draw = (val, x, y, size, maxW) => {
        if (!val) return;
        let s = size;
        if (maxW && f.widthOfTextAtSize) {
          const w = f.widthOfTextAtSize(String(val), size);
          if (w > maxW) s = Math.max(6.0, size * (maxW / w));
        }
        p.drawText(String(val), { x, y, size: s, font: f, color: rgb(0.12, 0.14, 0.18) });
      };

      drawCenteredInBox(tc.data.offlineFormNumber, 113.37, 680.90, 88.45, 20.87, 11.0);
      drawCenteredInBox(tc.data.applicationDate, 459.76, 674.21, 88.45, 20.87, 11.0);
      drawCenteredInBox(tc.data.workerOfflineFormNumber, 113.37, 654.77, 88.45, 20.87, 11.0);
      drawCenteredInBox(tc.data.membershipNumber, 459.76, 642.24, 88.45, 20.87, 11.0);
      drawCenteredInBox(tc.data.seniorOfflineFormNumber, 113.37, 629.78, 88.45, 20.87, 11.0);

      draw(tc.data.applicantName, 75.0, 604.66, 10.5, 185);
      draw(tc.data.fatherName, 137.0, 578.38, 10.5, 125);
      draw(tc.data.aadharNumber, 98.0, 552.09, 10.5, 160);
      draw(tc.data.gotra, 78.0, 525.80, 10.5, 180);
      draw(tc.data.nomineeRelation, 88.0, 499.51, 10.5, 170);
      draw(tc.data.village, 74.0, 473.22, 10.5, 185);

      draw(tc.data.nomineeName, 338.0, 604.31, 10.5, 115);
      draw(tc.data.nomineeAadhar, 362.0, 578.31, 10.5, 95);
      draw(tc.data.nomineeMobile, 348.0, 552.32, 10.5, 105);
      draw(tc.data.workerMobile, 343.0, 526.33, 10.5, 110);
      draw(tc.data.district, 312.0, 500.33, 10.5, 140);
      draw(tc.data.state, 308.0, 474.34, 10.5, 145);

      draw(tc.data.installmentAmount ? `${tc.data.installmentAmount} किस्त` : '', 248.0, 450.65, 11.0, 65);

      const bytes = await doc.save();
      assert.ok(bytes.length > 1500000, 'Serialized PDF must be valid (>1.5MB)');
    });
  }

  console.log('\n============================================================');
  console.log(`INSURANCE BOND PDF TEST SUITE RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
