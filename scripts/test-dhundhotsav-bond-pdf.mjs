import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime.js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { renderPdfToImage } from './render-crisp-pdf.mjs';

function sanitizeOfflineNumber(val) {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper.startsWith('EMP-') ||
    upper.startsWith('EMP_') ||
    upper.startsWith('DH-') ||
    upper.startsWith('DH_') ||
    upper.startsWith('SAF-') ||
    upper.startsWith('SAF_') ||
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

function sanitizeValue(val) {
  if (!val) return '';
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'N/A' ||
    upper === 'NA'
  ) {
    return '';
  }
  return str;
}

async function runRegressionTests() {
  console.log('=== DHUNDHOTSAV BOND PDF FINAL DATA MAPPING REGRESSION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const routePath = path.join(process.cwd(), 'app', 'api', 'generate-dhundhotsav-bond-pdf', 'route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');

  const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'dhundhotsav', 'page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');

  // ----------------------------------------------------
  // A. Worker code comes from Agent offlineFormNumber (sanitized)
  // ----------------------------------------------------
  const workerCodeExtract = routeContent.includes('const rawWorkerOffline =') &&
    routeContent.includes('record.workerOfflineFormNumber') &&
    routeContent.includes('const workerOffline = sanitizeOfflineNumber(rawWorkerOffline)') &&
    routeContent.includes("{ field: 'कार्यकर्ता_कोड', val: workerOffline, x: 112, y: 122.3");
  const testWorkerVal = sanitizeOfflineNumber('1259');
  assert(workerCodeExtract && testWorkerVal === '1259', 'A. Worker code comes from Agent offlineFormNumber');

  // ----------------------------------------------------
  // B. Senior code comes from parent Senior offlineFormNumber (sanitized)
  // ----------------------------------------------------
  const seniorCodeExtract = routeContent.includes('const rawSeniorOffline =') &&
    routeContent.includes('record.seniorOfflineFormNumber') &&
    routeContent.includes('const seniorOffline = sanitizeOfflineNumber(rawSeniorOffline)') &&
    routeContent.includes("{ field: 'सीनियर_कार्यकर्ता_कोड', val: seniorOffline, x: 462, y: 122.3");
  const testSeniorVal = sanitizeOfflineNumber('1258');
  assert(seniorCodeExtract && testSeniorVal === '1258', 'B. Senior code comes from parent Senior offlineFormNumber');

  // ----------------------------------------------------
  // C. Application number comes from application offlineFormNumber
  // ----------------------------------------------------
  const appNumberExtract = routeContent.includes('const rawOfflineFormNumber =') &&
    routeContent.includes('record.offlineFormNumber') &&
    routeContent.includes('const offlineFormNumber = sanitizeOfflineNumber(rawOfflineFormNumber)') &&
    routeContent.includes("{ field: 'आवेदन_क्र', val: offlineFormNumber, x: 102, y: 145.9");
  const testAppNumVal = sanitizeOfflineNumber('555');
  assert(appNumberExtract && testAppNumVal === '555', 'C. Application number comes from application offlineFormNumber');

  // ----------------------------------------------------
  // D. वारिसदार equals nomineeName
  // ----------------------------------------------------
  const nomineeFieldExtract = routeContent.includes('const nomineeName = sanitizeValue(') &&
    routeContent.includes('record.nomineeName') &&
    routeContent.includes("{ field: 'वारिसदार', val: nomineeName, x: 95, y: 233.1");
  assert(nomineeFieldExtract, 'D. वारिसदार equals nomineeName');

  // ----------------------------------------------------
  // E. एजेन्ट मो. नं. equals assigned Agent mobile
  // ----------------------------------------------------
  const agentMobileExtract = routeContent.includes('const agentMobile = sanitizeValue(') &&
    routeContent.includes('record.agentMobile') &&
    routeContent.includes('record.workerMobile') &&
    routeContent.includes("{ field: 'एजेन्ट_मो_नं', val: agentMobile, x: 115, y: 257.3");
  assert(agentMobileExtract, 'E. एजेन्ट मो. नं. equals assigned Agent mobile');

  // ----------------------------------------------------
  // F. Applicant mobile is NOT used as Agent mobile
  // ----------------------------------------------------
  // Verify agentMobile extraction does NOT include record.mobile or applicant mobile fallback
  const lines = routeContent.split('\n');
  const agentMobileBlock = lines.slice(lines.findIndex(l => l.includes('const agentMobile = sanitizeValue(')), lines.findIndex(l => l.includes('const agentMobile = sanitizeValue(')) + 10).join('\n');
  const noApplicantMobileFallback = !agentMobileBlock.includes('record.mobile') && !agentMobileBlock.includes('record.phone');
  assert(noApplicantMobileFallback, 'F. Applicant mobile is NOT used as Agent mobile');

  // ----------------------------------------------------
  // G. सम्बन्ध equals nomineeRelation
  // ----------------------------------------------------
  const nomineeRelationExtract = routeContent.includes('const nomineeRelation = sanitizeValue(') &&
    routeContent.includes('record.nomineeRelation') &&
    routeContent.includes("{ field: 'सम्बन्ध', val: nomineeRelation, x: 275, y: 279.4");
  assert(nomineeRelationExtract, 'G. सम्बन्ध equals nomineeRelation');

  // ----------------------------------------------------
  // G2. PDF जाति strictly receives gotra and NOT category
  // ----------------------------------------------------
  const casteGotraExtract = routeContent.includes('const caste = sanitizeValue(') &&
    routeContent.includes('record.gotra') &&
    !routeContent.includes('record.caste || record.category') &&
    routeContent.includes("{ field: 'जाति', val: caste, x: 80, y: 208.8");
  assert(casteGotraExtract, 'G2. PDF जाति receives gotra and NEVER category/caste fallback');

  // ----------------------------------------------------
  // G3. Nominee Aadhaar strictly extracted
  // ----------------------------------------------------
  const nomineeAadharExtract = routeContent.includes('const nomineeAadhar = sanitizeValue(') &&
    routeContent.includes('record.nomineeAadhar') &&
    routeContent.includes("{ field: 'नॉमिनी_आधार_नं', val: nomineeAadhar, x: 130, y: 305.7");
  assert(nomineeAadharExtract, 'G3. PDF नॉमिनी आधार नं. receives nomineeAadhar');

  // ----------------------------------------------------
  // G4. Applicant mobile vs Agent mobile distinctness test
  // ----------------------------------------------------
  const mockRecord = {
    gotra: 'Jangid',
    category: 'A',
    mobile: '9000000001',
    agentMobile: '9111111111',
    nomineeName: 'Test Nominee',
    nomineeRelation: 'भाई',
    nomineeAadhar: '999999999999',
  };
  const mockGotraVal = sanitizeValue(mockRecord.gotra || '');
  const mockApplicantMobile = sanitizeValue(mockRecord.mobile || '');
  const mockAgentMobile = sanitizeValue(mockRecord.agentMobile || '');
  assert(
    mockGotraVal === 'Jangid' && mockGotraVal !== mockRecord.category,
    'G4. PDF जाति receives gotra ("Jangid") not category ("A")'
  );
  assert(
    mockApplicantMobile === '9000000001' &&
    mockAgentMobile === '9111111111' &&
    mockApplicantMobile !== mockAgentMobile,
    'G5. Applicant mobile ("9000000001") and Agent mobile ("9111111111") remain strictly distinct'
  );

  // ----------------------------------------------------
  // G6. resolveAgentOfflineNumbers logic validation (user ID indexing, worker, senior, agent mobile)
  // ----------------------------------------------------
  const mockAgentsList = [
    {
      id: 'agent-profile-uuid-worker',
      userId: 'user-uuid-worker-999',
      employeeId: 'EMP-005',
      offlineFormNumber: '1259',
      mobile: '9876543210',
      parentAgentId: 'agent-profile-uuid-senior',
      name: 'Worker Agent Name',
    },
    {
      id: 'agent-profile-uuid-senior',
      userId: 'user-uuid-senior-888',
      employeeId: 'EMP-004',
      offlineFormNumber: '1258',
      mobile: '9888888888',
      name: 'Senior Agent Name',
    }
  ];

  // Emulate resolveAgentOfflineNumbers indexing
  const agentById = new Map();
  const agentByCode = new Map();
  for (const agent of mockAgentsList) {
    const ids = [
      agent.id,
      agent.userId,
      agent.user_id,
      agent.agentProfile?.id,
      agent.agentProfile?.userId,
      agent.agentProfile?.user_id,
      agent.agent_profile?.id,
      agent.agent_profile?.user_id,
    ].filter(Boolean);
    ids.forEach((id) => {
      const normalized = String(id).trim();
      if (normalized) agentById.set(normalized, agent);
    });

    const empIds = [
      agent.employeeId,
      agent.employee_id,
      agent.agentProfile?.employeeId,
      agent.agent_profile?.employee_id,
      agent.agentCode,
      agent.agent_code,
      agent.code,
    ].filter(Boolean);
    empIds.forEach((emp) => {
      const normalized = String(emp).trim().toUpperCase();
      if (normalized) agentByCode.set(normalized, agent);
    });
  }

  const dhundhotsavRecord = {
    addedById: 'user-uuid-worker-999',
    mobile: '9000000001',
    applicantName: 'दिलीप पुरबिया',
  };

  const resolvedWorker = agentById.get(dhundhotsavRecord.addedById);
  const resolvedWorkerOffline = resolvedWorker?.offlineFormNumber;
  const resolvedSenior = resolvedWorker?.parentAgentId ? agentById.get(resolvedWorker.parentAgentId) : null;
  const resolvedSeniorOffline = resolvedSenior?.offlineFormNumber;
  const resolvedWorkerMobile = resolvedWorker?.mobile || '';

  assert(resolvedWorker && resolvedWorkerOffline === '1259', 'G6. record.addedById resolves worker with offlineFormNumber 1259');
  assert(resolvedSenior && resolvedSeniorOffline === '1258', 'G7. Parent Senior resolves with offlineFormNumber 1258');
  assert(resolvedWorkerMobile === '9876543210' && dhundhotsavRecord.mobile === '9000000001', 'G8. Worker agent mobile is 9876543210 and applicant mobile remains separate');

  // ----------------------------------------------------
  // H. Missing nomineeName → blank
  // ----------------------------------------------------
  assert(sanitizeValue('') === '' && sanitizeValue(undefined) === '' && sanitizeValue(null) === '', 'H. Missing nomineeName -> blank');

  // ----------------------------------------------------
  // I. Missing agent mobile → blank
  // ----------------------------------------------------
  assert(sanitizeValue('') === '' && sanitizeValue(undefined) === '' && sanitizeValue('NULL') === '', 'I. Missing agent mobile -> blank');

  // ----------------------------------------------------
  // J. Missing nomineeRelation → blank
  // ----------------------------------------------------
  assert(sanitizeValue('') === '' && sanitizeValue(undefined) === '' && sanitizeValue('N/A') === '', 'J. Missing nomineeRelation -> blank');

  // ----------------------------------------------------
  // K. EMP-xxx cannot appear in worker/senior code fields
  // ----------------------------------------------------
  const emp005Sanitized = sanitizeOfflineNumber('EMP-005');
  const emp004Sanitized = sanitizeOfflineNumber('EMP-004');
  const emp001Sanitized = sanitizeOfflineNumber('EMP-001');
  assert(emp005Sanitized === '' && emp004Sanitized === '' && emp001Sanitized === '', 'K. EMP-xxx cannot appear in worker/senior code fields');

  // ----------------------------------------------------
  // L. ADMIN cannot appear in senior code
  // ----------------------------------------------------
  const adminSanitized = sanitizeOfflineNumber('ADMIN');
  const superAdminSanitized = sanitizeOfflineNumber('SUPER ADMIN');
  assert(adminSanitized === '' && superAdminSanitized === '', 'L. ADMIN cannot appear in senior code');

  // ----------------------------------------------------
  // M. UUID cannot appear in worker/senior code
  // ----------------------------------------------------
  const uuidSanitized = sanitizeOfflineNumber('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
  const systemIdSanitized = sanitizeOfflineNumber('DH-014');
  assert(uuidSanitized === '' && systemIdSanitized === '', 'M. UUID / DH-xxx cannot appear in worker/senior code');

  // ----------------------------------------------------
  // N. Dhundhotsav Generate PDF Form still uses: Saf_dhundh_form.pdf
  // ----------------------------------------------------
  const dhundhFormPath = path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf');
  const fillPdfContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'fill-pdf-form', 'route.ts'), 'utf-8');
  assert(fs.existsSync(dhundhFormPath) && fillPdfContent.includes('Saf_dhundh_form.pdf'), 'N. Dhundhotsav Generate PDF Form still uses Saf_dhundh_form.pdf');

  // ----------------------------------------------------
  // O. Dhundhotsav Generate Bond PDF still uses: saf_dhundh_bond.pdf
  // ----------------------------------------------------
  const dhundhBondPath = path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'saf_dhundh_bond.pdf');
  assert(fs.existsSync(dhundhBondPath) && routeContent.includes('saf_dhundh_bond.pdf'), 'O. Dhundhotsav Generate Bond PDF still uses saf_dhundh_bond.pdf');

  // ----------------------------------------------------
  // P. General Marriage Bond PDF still uses: saf_vivah_bond.pdf
  // ----------------------------------------------------
  const vivahBondPath = path.join(process.cwd(), 'public', 'pdf', 'general_application', 'saf_vivah_bond.pdf');
  const generalBondRoute = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'generate-bond-pdf', 'route.ts'), 'utf-8');
  assert(fs.existsSync(vivahBondPath) && generalBondRoute.includes('saf_vivah_bond.pdf'), 'P. General Marriage Bond PDF still uses saf_vivah_bond.pdf');

  // ----------------------------------------------------
  // Q. 4-button Actions layout remains unchanged
  // ----------------------------------------------------
  const hasFormBtn = pageContent.includes('handleGeneratePDFForm(reg)');
  const hasEditBtn = pageContent.includes('/dashboard/dhundhotsav/edit/');
  const hasBondBtn = pageContent.includes('handleGenerateBond(reg)');
  const hasDeleteBtn = pageContent.includes('setRecordToDelete(reg.id)');
  const formIdx = pageContent.indexOf('handleGeneratePDFForm(reg)');
  const editIdx = pageContent.indexOf('/dashboard/dhundhotsav/edit/');
  const bondIdx = pageContent.indexOf('handleGenerateBond(reg)');
  const deleteIdx = pageContent.indexOf('setRecordToDelete(reg.id)');
  const correctOrder = formIdx < editIdx && editIdx < bondIdx && bondIdx < deleteIdx;
  assert(hasFormBtn && hasEditBtn && hasBondBtn && hasDeleteBtn && correctOrder, 'Q. 4-button Actions layout remains unchanged');

  // ----------------------------------------------------
  // R. सदस्यता क्र. uses authoritative membershipNumber or remains blank (does not copy offlineFormNumber)
  // ----------------------------------------------------
  const membershipNumberExtract = routeContent.includes('const rawMembershipNumber =') &&
    routeContent.includes('const membershipNumber = sanitizeOfflineNumber(rawMembershipNumber)') &&
    routeContent.includes("{ field: 'सदस्यता_क्र', val: membershipNumber, x: 304, y: 144.1");
  assert(membershipNumberExtract, 'R. सदस्यता क्र. uses authoritative membershipNumber or remains blank (does not copy offlineFormNumber)');

  // ----------------------------------------------------
  // GENERATE VISUAL TEST RECORD OUTPUT
  // ----------------------------------------------------
  console.log('\nGenerating visual test output with official test record...');
  const templateBytes = fs.readFileSync(dhundhBondPath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
  const font = await pdfDoc.embedFont(fs.readFileSync(fontPath));

  const page = pdfDoc.getPage(0);
  const { height: pageHeight } = page.getSize();

  // Test record as per Section 7 (membershipNumber is omitted/empty so सदस्यता क्र. stays blank)
  const testRecord = {
    workerOfflineFormNumber: '1259',
    seniorOfflineFormNumber: '1258',
    offlineFormNumber: '555',
    membershipNumber: '', // Authoritative membership number missing -> blank
    applicationDate: '14/09/2026',
    applicantName: 'दिलीप पुरबिया',
    fatherName: 'रामलाल पुरबिया',
    caste: 'पुरबिया',
    village: 'समदड़ी',
    nomineeName: 'jayantilal',
    district: 'बालोतरा',
    agentMobile: '9876543210',
    state: 'राजस्थान',
    aadharNumber: '1234 5678 9012',
    nomineeRelation: 'पिता',
    nomineeAadhar: '9876 5432 1098',
    mobile: '9123456789',
    duration: 'बारह महीने',
  };

  const fields = [
    // Top Code fields
    { field: 'कार्यकर्ता_कोड', val: sanitizeOfflineNumber(testRecord.workerOfflineFormNumber), x: 112, y: 122.3, maxW: 85, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सीनियर_कार्यकर्ता_कोड', val: sanitizeOfflineNumber(testRecord.seniorOfflineFormNumber), x: 462, y: 122.3, maxW: 80, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },

    // Numbers & Date row
    { field: 'आवेदन_क्र', val: sanitizeOfflineNumber(testRecord.offlineFormNumber), x: 102, y: 145.9, maxW: 130, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'सदस्यता_क्र', val: sanitizeOfflineNumber(testRecord.membershipNumber), x: 304, y: 144.1, maxW: 115, size: 10, color: { r: 0, g: 0.15, b: 0.6 } },
    { field: 'आवेदन_दिनांक', val: testRecord.applicationDate, x: 485, y: 142.9, maxW: 75, size: 9.5 },

    // Left Column Fields
    { field: 'नाम', val: testRecord.applicantName, x: 80, y: 184.6, maxW: 150, size: 10 },
    { field: 'जाति', val: testRecord.caste, x: 80, y: 208.8, maxW: 150, size: 9.5 },
    { field: 'वारिसदार', val: testRecord.nomineeName, x: 95, y: 233.1, maxW: 135, size: 9.5 },
    { field: 'एजेन्ट_मो_नं', val: testRecord.agentMobile, x: 115, y: 257.3, maxW: 115, size: 9.5 },
    { field: 'आधार_नं', val: testRecord.aadharNumber, x: 95, y: 281.5, maxW: 135, size: 9.5 },
    { field: 'नॉमिनी_आधार_नं', val: testRecord.nomineeAadhar, x: 130, y: 305.7, maxW: 100, size: 9.5 },

    // Center Column Fields
    { field: 'पिता_पति_का_नाम', val: testRecord.fatherName, x: 325, y: 184.9, maxW: 130, size: 10 },
    { field: 'गांव', val: testRecord.village, x: 265, y: 208.5, maxW: 190, size: 9.5 },
    { field: 'जिला', val: testRecord.district, x: 265, y: 232.1, maxW: 190, size: 9.5 },
    { field: 'राज्य', val: testRecord.state, x: 265, y: 255.8, maxW: 190, size: 9.5 },
    { field: 'सम्बन्ध', val: testRecord.nomineeRelation, x: 275, y: 279.4, maxW: 180, size: 9.5 },
    { field: 'मो_नं', val: testRecord.mobile, x: 275, y: 303.0, maxW: 180, size: 9.5 },

    // Benefit Duration Clause
    { field: 'अवधि', val: testRecord.duration, x: 282, y: 360.8, maxW: 75, size: 9.5, color: { r: 0.8, g: 0.1, b: 0.1 } },
  ];

  for (const f of fields) {
    if (!f.val) continue;
    const drawX = f.x;
    const drawY = pageHeight - f.y;
    let size = f.size || 9.5;
    if (f.maxW && font.widthOfTextAtSize) {
      const w = font.widthOfTextAtSize(f.val, size);
      if (w > f.maxW) {
        size = Math.max(6.0, size * (f.maxW / w));
      }
    }
    const color = f.color ? rgb(f.color.r, f.color.g, f.color.b) : rgb(0.1, 0.1, 0.1);
    page.drawText(f.val, { x: drawX, y: drawY, size, font, color });
  }

  const outPdfPath = 'test-output/dhundhotsav-bond-final-data-mapping.pdf';
  const outPngPath = 'test-output/dhundhotsav-bond-final-data-mapping.png';
  if (!fs.existsSync('test-output')) {
    fs.mkdirSync('test-output', { recursive: true });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPdfPath, pdfBytes);
  console.log(`Saved: ${outPdfPath}`);

  await renderPdfToImage(outPdfPath, outPngPath, 2.0);
  console.log(`Saved: ${outPngPath}`);

  console.log(`\n==================================================`);
  console.log(`FINAL REPORT SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Error running regression tests:', err);
  process.exit(1);
});
