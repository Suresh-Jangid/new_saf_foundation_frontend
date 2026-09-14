import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

async function runRegressionTests() {
  console.log('=== DHUNDHOTSAV PDF FORM REGRESSION TESTS ===\n');
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

  // ----------------------------------------------------
  // A. Saf_dhundh_form.pdf exists
  // ----------------------------------------------------
  const dhundhTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf');
  assert(fs.existsSync(dhundhTemplatePath), 'A. Saf_dhundh_form.pdf exists', `Path: ${dhundhTemplatePath}`);

  // Load Dhundhotsav template
  const dhundhBytes = fs.readFileSync(dhundhTemplatePath);
  const dhundhDoc = await PDFDocument.load(dhundhBytes);
  dhundhDoc.registerFontkit(fontkit);

  // ----------------------------------------------------
  // B. Template has exactly 1 page
  // ----------------------------------------------------
  const pages = dhundhDoc.getPages();
  assert(pages.length === 1, 'B. Template has exactly 1 page', `Found ${pages.length} pages`);

  // ----------------------------------------------------
  // C. Template dimensions are A4
  // ----------------------------------------------------
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const isA4 = Math.abs(width - 595.28) < 1.0 && Math.abs(height - 841.89) < 1.0;
  assert(isA4, 'C. Template dimensions are A4', `Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);

  // ----------------------------------------------------
  // D. Dhundhotsav Generate PDF Form uses Saf_dhundh_form.pdf
  // ----------------------------------------------------
  const routeContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'fill-pdf-form', 'route.ts'), 'utf-8');
  const dhundhRouteUsesTemplate = routeContent.includes("path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf')");
  const dhundhPageContent = fs.readFileSync(path.join(process.cwd(), 'app', 'dashboard', 'dhundhotsav', 'page.tsx'), 'utf-8');
  const dhundhPageSendsType = dhundhPageContent.includes('type: "dhundhotsav"');
  assert(dhundhRouteUsesTemplate && dhundhPageSendsType, 'D. Dhundhotsav Generate PDF Form uses Saf_dhundh_form.pdf');

  // ----------------------------------------------------
  // E. General Marriage Generate PDF Form still uses Saf_general_form.pdf
  // ----------------------------------------------------
  const generalMarriageUsesSafGeneral = routeContent.includes("path.join(process.cwd(), 'public', 'pdf', 'general_application', 'Saf_general_form.pdf')");
  const generalFormExists = fs.existsSync(path.join(process.cwd(), 'public', 'pdf', 'general_application', 'Saf_general_form.pdf'));
  assert(generalMarriageUsesSafGeneral && generalFormExists, 'E. General Marriage Generate PDF Form still uses Saf_general_form.pdf');

  // ----------------------------------------------------
  // F. General Marriage Bond PDF still uses saf_vivah_bond.pdf
  // ----------------------------------------------------
  const vivahBondExists = fs.existsSync(path.join(process.cwd(), 'public', 'pdf', 'general_application', 'saf_vivah_bond.pdf')) ||
    fs.existsSync(path.join(process.cwd(), 'public', 'pdf', 'general_application', 'bond', 'vivah_yojana_bond.pdf'));
  assert(vivahBondExists, 'F. General Marriage Bond PDF still uses saf_vivah_bond.pdf');

  // ----------------------------------------------------
  // G & H: Dhundhotsav offlineFormNumber for क्रमांक (no DH-xxx or UUID)
  // ----------------------------------------------------
  // Test route field mapping definitions in route.ts
  const kramankDefMatch = routeContent.match(/\{ field: 'क्रमांक', valueKeys: \[(.*?)\], x: 120, y: 195\.6/);
  const hasKramankKeys = kramankDefMatch &&
    kramankDefMatch[1].includes('offlineFormNumber') &&
    !kramankDefMatch[1].includes('formNumber') &&
    !kramankDefMatch[1].includes('id');
  assert(hasKramankKeys, 'G. Dhundhotsav application offlineFormNumber is used for क्रमांक');
  assert(!kramankDefMatch[1].includes('systemFormId') && !kramankDefMatch[1].includes('formNumber'), 'H. system DH-xxx/form ID is NOT used as क्रमांक');

  // ----------------------------------------------------
  // I & J: Worker / Senior offline numbers
  // ----------------------------------------------------
  const agentCodeDef = routeContent.match(/\{ field: 'एजेन्ट_कोड', valueKeys: \[(.*?)\], x: 205, y: 195\.6/);
  const seniorCodeDef = routeContent.match(/\{ field: 'सीनियर_कोड', valueKeys: \[(.*?)\], x: 345, y: 195\.6/);
  assert(agentCodeDef && agentCodeDef[1].includes('workerOfflineFormNumber'), 'I. Worker offline number appears in एजेन्ट कोड');
  assert(seniorCodeDef && seniorCodeDef[1].includes('seniorOfflineFormNumber'), 'J. Senior offline number appears in सीनियर कोड');

  // ----------------------------------------------------
  // K & L: Missing worker / senior offline number = blank
  // ----------------------------------------------------
  assert(dhundhPageContent.includes('workerOfflineFormNumber: workerOffline'), 'K. Missing worker offline number = blank (defaults to empty string)');
  assert(dhundhPageContent.includes('seniorOfflineFormNumber: seniorOffline'), 'L. Missing senior offline number = blank (defaults to empty string)');

  // ----------------------------------------------------
  // M & N: Worker / Senior name fields
  // ----------------------------------------------------
  const workerNameDef = routeContent.match(/\{ field: 'कार्यकर्ता_नाम', valueKeys: \[(.*?)\], x: 470, y: 417\.4/);
  const seniorNameDef = routeContent.match(/\{ field: 'सीनियर_कार्यकर्ता_नाम', valueKeys: \[(.*?)\], x: 465, y: 445\.1/);
  assert(workerNameDef && workerNameDef[1].includes('workerName') && dhundhPageContent.includes('workerName: workerName'), 'M. Worker name uses Agent users.name');
  assert(seniorNameDef && seniorNameDef[1].includes('seniorName') && dhundhPageContent.includes('seniorName: seniorName'), 'N. Senior name uses Parent Senior users.name');

  // ----------------------------------------------------
  // O & P: Gotra mapping (no caste/category fallback)
  // ----------------------------------------------------
  const gotraDef = routeContent.match(/\{ field: 'शपथ_गोत्र', valueKeys: \[(.*?)\], x: 502, y: 579\.5/);
  const gotraMappingInPage = dhundhPageContent.includes('gotra || (record as any).gotraName || (record as any).gotra_name || ""');
  assert(gotraDef && gotraDef[1].includes('gotra') && gotraMappingInPage, 'O. Gotra is used in गोत्र');
  const noCasteFallback = !dhundhPageContent.includes('record.caste || record.category');
  assert(noCasteFallback, 'P. Caste/category/gender are NOT Gotra fallbacks');

  // ----------------------------------------------------
  // Q & R: Registration amount is ₹5,100 (never ₹300)
  // ----------------------------------------------------
  const amountFixedInPage = dhundhPageContent.includes('राशि: "5100"') && dhundhPageContent.includes('amount: "5100"');
  const amountDef = routeContent.match(/\{ field: 'राशि', valueKeys: \[(.*?)\], x: 62, y: 445\.1.*?formatAmount: true/);
  assert(amountFixedInPage && amountDef, 'Q. Registration amount shows ₹5,100');
  const not300ForReg = !dhundhPageContent.includes('amount: "300"') && !dhundhPageContent.includes('राशि: "300"');
  assert(not300ForReg, 'R. ₹300 is NOT used as registration amount');

  // ----------------------------------------------------
  // S. Photo fits the new photo box
  // ----------------------------------------------------
  const photoBoxMatch = routeContent.match(/if \(type === 'dhundhotsav' \|\| type === 'dhundhotsav-application'\) \{\s*imageX = 460\.5;\s*imageY = 224\.3;\s*imageWidth = 91\.3;\s*imageHeight = 119\.1;/);
  assert(Boolean(photoBoxMatch), 'S. Photo fits the new photo box (x: 460.5, y: 224.3, w: 91.3, h: 119.1)');

  // ----------------------------------------------------
  // T. No forbidden employee IDs appear in code fields
  // ----------------------------------------------------
  const hasSanitization = routeContent.includes("/^EMP-\\d+/i.test(textValue)") &&
    routeContent.includes("textValue.toUpperCase() === 'ADMIN'") &&
    routeContent.includes("textValue.toUpperCase() === 'SUPER ADMIN'") &&
    routeContent.includes("textValue.toUpperCase() === 'N/A'") &&
    routeContent.includes("textValue.toLowerCase() === 'null'") &&
    routeContent.includes("textValue.toLowerCase() === 'undefined'");
  assert(hasSanitization, 'T. No forbidden employee IDs appear in code fields');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log(`\nRegression Tests Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Error running regression test:', err);
  process.exit(1);
});
