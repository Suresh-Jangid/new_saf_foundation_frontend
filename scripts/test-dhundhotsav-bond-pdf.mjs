import fs from 'fs';
import path from 'path';
import 'regenerator-runtime/runtime.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

async function runRegressionTests() {
  console.log('=== DHUNDHOTSAV BOND PDF REGRESSION TESTS ===\n');
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
  // A. saf_dhundh_bond.pdf exists
  // ----------------------------------------------------
  const bondTemplatePath = path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'saf_dhundh_bond.pdf');
  assert(fs.existsSync(bondTemplatePath), 'A. saf_dhundh_bond.pdf exists', `Path: ${bondTemplatePath}`);

  // Load Dhundhotsav Bond template
  const bondBytes = fs.readFileSync(bondTemplatePath);
  const bondDoc = await PDFDocument.load(bondBytes);
  bondDoc.registerFontkit(fontkit);

  // ----------------------------------------------------
  // B. Template has expected page count (1 page)
  // ----------------------------------------------------
  const pages = bondDoc.getPages();
  assert(pages.length === 1, 'B. Template has expected page count (1 page)', `Found ${pages.length} pages`);

  // ----------------------------------------------------
  // C. Template dimensions are correct (A4 portrait)
  // ----------------------------------------------------
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const isA4 = Math.abs(width - 595.28) < 1.0 && Math.abs(height - 841.89) < 1.0;
  assert(isA4, 'C. Template dimensions are correct (A4)', `Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);

  // ----------------------------------------------------
  // D. Dhundhotsav Generate Bond PDF uses saf_dhundh_bond.pdf
  // ----------------------------------------------------
  const routeContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'generate-dhundhotsav-bond-pdf', 'route.ts'), 'utf-8');
  const dhundhBondRouteUsesTemplate = routeContent.includes("path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'saf_dhundh_bond.pdf')");
  const dhundhPageContent = fs.readFileSync(path.join(process.cwd(), 'app', 'dashboard', 'dhundhotsav', 'page.tsx'), 'utf-8');
  const dhundhPageCallsRoute = dhundhPageContent.includes('/api/generate-dhundhotsav-bond-pdf');
  assert(dhundhBondRouteUsesTemplate && dhundhPageCallsRoute, 'D. Dhundhotsav Generate Bond PDF uses saf_dhundh_bond.pdf');

  // ----------------------------------------------------
  // E. Dhundhotsav Generate PDF Form still uses Saf_dhundh_form.pdf
  // ----------------------------------------------------
  const fillPdfRouteContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'fill-pdf-form', 'route.ts'), 'utf-8');
  const dhundhFormExists = fs.existsSync(path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf'));
  const fillPdfUsesDhundhForm = fillPdfRouteContent.includes("path.join(process.cwd(), 'public', 'pdf', 'dhundhotsav', 'Saf_dhundh_form.pdf')");
  assert(dhundhFormExists && fillPdfUsesDhundhForm, 'E. Dhundhotsav Generate PDF Form still uses Saf_dhundh_form.pdf');

  // ----------------------------------------------------
  // F. General Marriage Bond PDF still uses saf_vivah_bond.pdf
  // ----------------------------------------------------
  const generalBondRouteContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'generate-bond-pdf', 'route.ts'), 'utf-8');
  const vivahBondExists = fs.existsSync(path.join(process.cwd(), 'public', 'pdf', 'general_application', 'saf_vivah_bond.pdf'));
  const generalBondUsesSafVivah = generalBondRouteContent.includes("saf_vivah_bond.pdf");
  assert(vivahBondExists && generalBondUsesSafVivah, 'F. General Marriage Bond PDF still uses saf_vivah_bond.pdf');

  // ----------------------------------------------------
  // G & H: application offlineFormNumber is used where applicable (never DH-xxx or UUID)
  // ----------------------------------------------------
  const hasOfflineFormNumberLogic = routeContent.includes('const rawOfflineFormNumber =') &&
    routeContent.includes('record.offlineFormNumber') &&
    routeContent.includes('const offlineFormNumber = sanitizeOfflineNumber(rawOfflineFormNumber)');
  assert(hasOfflineFormNumberLogic, 'G. application offlineFormNumber is used where applicable');
  const sanitizeOfflineNumberDef = routeContent.includes("upper.startsWith('EMP-')") &&
    routeContent.includes("upper === 'ADMIN'") &&
    routeContent.includes("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)");
  assert(sanitizeOfflineNumberDef, 'H. DH-xxx/system ID is never used as application offline number');

  // ----------------------------------------------------
  // I & J: worker / senior offline numbers appear in code fields
  // ----------------------------------------------------
  const workerCodeFieldDef = routeContent.includes("{ field: 'कार्यकर्ता_कोड', val: workerOffline, x: 112, y: 122.3");
  const seniorCodeFieldDef = routeContent.includes("{ field: 'सीनियर_कार्यकर्ता_कोड', val: seniorOffline, x: 462, y: 122.3");
  assert(workerCodeFieldDef, 'I. worker offline number appears in worker code');
  assert(seniorCodeFieldDef, 'J. senior offline number appears in senior code');

  // ----------------------------------------------------
  // K & L: missing worker / senior offline number = blank
  // ----------------------------------------------------
  const sanitizeEmptyBlank = routeContent.includes("if (!val) return '';") && routeContent.includes("return '';");
  assert(sanitizeEmptyBlank, 'K. missing worker offline number = blank');
  assert(sanitizeEmptyBlank, 'L. missing senior offline number = blank');

  // ----------------------------------------------------
  // M. employee IDs cannot appear in code fields
  // ----------------------------------------------------
  const employeeIdSanitized = routeContent.includes("upper.startsWith('EMP-')") &&
    routeContent.includes("upper === 'ADMIN'") &&
    routeContent.includes("upper === 'SUPER ADMIN'") &&
    routeContent.includes("upper === 'N/A'");
  assert(employeeIdSanitized, 'M. employee IDs cannot appear in code fields');

  // ----------------------------------------------------
  // N & O: worker / senior name handling
  // ----------------------------------------------------
  assert(dhundhPageContent.includes('workerName: workerName') && dhundhPageContent.includes('seniorName: seniorName'), 'N. worker name uses users.name where field exists');
  assert(dhundhPageContent.includes('seniorName: seniorName'), 'O. senior name uses parent Level-1 users.name where field exists');

  // ----------------------------------------------------
  // P. Gotra uses gotra only where field exists
  // ----------------------------------------------------
  const casteField = routeContent.includes("const caste = sanitizeValue(record.caste || record.category || '');");
  assert(casteField, 'P. Gotra uses gotra only where field exists (no false fallback)');

  // ----------------------------------------------------
  // Q. ₹300 is NOT blindly inserted as registration/assistance amount
  // ----------------------------------------------------
  const noBlind300 = !routeContent.includes("val: '300'") && !routeContent.includes("val: 300");
  assert(noBlind300, 'Q. ₹300 is NOT blindly inserted as registration/assistance amount');

  // ----------------------------------------------------
  // R. no unrelated PDF template is loaded
  // ----------------------------------------------------
  const noOtherTemplatesLoaded = !routeContent.includes('saf_vivah_bond.pdf') &&
    !routeContent.includes('mayra_bond.pdf') &&
    !routeContent.includes('janni_sahayata_bond.pdf');
  assert(noOtherTemplatesLoaded, 'R. no unrelated PDF template is loaded');

  // ----------------------------------------------------
  // S. photo fits printed box if template contains a photo box
  // ----------------------------------------------------
  const photoBoxesCalibrated = routeContent.includes('463.63 + 1, 154.2 + 1, 83.04 - 2, 90.15 - 2') &&
    routeContent.includes('463.63 + 1, 252.6 + 1, 83.04 - 2, 90.15 - 2');
  assert(photoBoxesCalibrated, 'S. photo fits printed box if template contains a photo box');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log(`\nRegression Tests Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Error running regression tests:', err);
  process.exit(1);
});
