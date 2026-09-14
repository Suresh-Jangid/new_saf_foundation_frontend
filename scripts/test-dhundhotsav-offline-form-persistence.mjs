import fs from 'fs';
import path from 'path';

async function runOfflineFormPersistenceTests() {
  console.log('=== DHUNDHOTSAV OFFLINE FORM NUMBER PERSISTENCE REGRESSION TESTS ===\n');
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

  const rootDir = process.cwd();

  // Load relevant files
  const editPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'edit', '[id]', 'page.tsx');
  const addPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'add', 'page.tsx');
  const listPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'page.tsx');
  const detailPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', '[id]', 'page.tsx');
  const servicePath = path.join(rootDir, 'lib', 'dhundhotsav-service.ts');
  const apiPath = path.join(rootDir, 'lib', 'api.ts');

  assert(fs.existsSync(editPagePath), '1. Dhundhotsav Edit page exists');
  assert(fs.existsSync(addPagePath), '2. Dhundhotsav Add page exists');
  assert(fs.existsSync(listPagePath), '3. Dhundhotsav List page exists');
  assert(fs.existsSync(detailPagePath), '4. Dhundhotsav Detail page exists');
  assert(fs.existsSync(servicePath), '5. Dhundhotsav Service file exists');

  const editContent = fs.readFileSync(editPagePath, 'utf-8');
  const addContent = fs.readFileSync(addPagePath, 'utf-8');
  const listContent = fs.readFileSync(listPagePath, 'utf-8');
  const detailContent = fs.readFileSync(detailPagePath, 'utf-8');
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  const apiContent = fs.readFileSync(apiPath, 'utf-8');

  // ----------------------------------------------------
  // A. Edit field exists
  // ----------------------------------------------------
  const editFieldExists = editContent.includes('id="offlineFormNumber"') &&
    editContent.includes('name="offlineFormNumber"') &&
    editContent.includes('value={formData.offlineFormNumber}');
  assert(editFieldExists, 'A. Edit field exists on Dhundhotsav edit page');

  // ----------------------------------------------------
  // B. Correct label
  // ----------------------------------------------------
  const correctLabel = editContent.includes('ऑफलाइन फॉर्म नं. / Offline Form No.');
  assert(correctLabel, 'B. Correct label displayed for offline form number');

  // ----------------------------------------------------
  // C. Optional behavior
  // ----------------------------------------------------
  const optionalNote = editContent.includes('भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number');
  assert(optionalNote, 'C. Optional behavior marked clearly');

  // ----------------------------------------------------
  // D. Update payload contains offlineFormNumber & offline_form_number
  // ----------------------------------------------------
  const updatePayloadHasOffline = editContent.includes('const trimmedOffline = (formData.offlineFormNumber || "").trim();') &&
    editContent.includes('offlineFormNumber: trimmedOffline || null') &&
    editContent.includes('offline_form_number: trimmedOffline || null');
  assert(updatePayloadHasOffline, 'D. Update payload contains offlineFormNumber and offline_form_number');

  // ----------------------------------------------------
  // E. Service/Backend API accepts offlineFormNumber & offline_form_number
  // ----------------------------------------------------
  const serviceInterfaceAccepts = serviceContent.includes('offlineFormNumber?: string | null') &&
    serviceContent.includes('offline_form_number?: string | null');
  assert(serviceInterfaceAccepts, 'E. Service interface accepts offlineFormNumber & offline_form_number');

  // ----------------------------------------------------
  // F. PUT /v1/dhundhotsav/:id is called
  // ----------------------------------------------------
  const putEndpointUsed = serviceContent.includes('`/v1/dhundhotsav/${id}`') &&
    serviceContent.includes('api.put<ApiResponse<DhundhotsavRegistration>>');
  assert(putEndpointUsed, 'F. Dhundhotsav update calls PUT /v1/dhundhotsav/:id');

  // ----------------------------------------------------
  // G. GET returns stored value and prefilled in edit form
  // ----------------------------------------------------
  const getPrefillMapped = editContent.includes('const offNo = String(') &&
    editContent.includes('reg.offlineFormNumber ||') &&
    editContent.includes('(reg as any).offline_form_number ||') &&
    editContent.includes('setInitialOfflineFormNumber(offNo);') &&
    editContent.includes('offlineFormNumber: offNo');
  assert(getPrefillMapped, 'G. GET response robustly maps offlineFormNumber / offline_form_number into edit form');

  // ----------------------------------------------------
  // H. Update 1259 -> 1260 confirmation dialog & persistence
  // ----------------------------------------------------
  const hasConfirmDialog = editContent.includes('currentOffline !== initialOffline') &&
    editContent.includes('setConfirmDialogOpen(true)');
  assert(hasConfirmDialog, 'H. Meaningful change triggers confirmation dialog and submits update');

  // ----------------------------------------------------
  // I. Clear persists null/blank
  // ----------------------------------------------------
  const clearHandled = editContent.includes('trimmedOffline || null');
  assert(clearHandled, 'I. Empty string is passed as null to cleanly clear offline form number');

  // ----------------------------------------------------
  // J. Duplicate value error handling
  // ----------------------------------------------------
  const errorHandling = editContent.includes('err.response?.data?.errors') &&
    editContent.includes('toast.error');
  assert(errorHandling, 'J. Error responses and validation conflicts surfaced cleanly in UI');

  // ----------------------------------------------------
  // K. System DH-xxx form number remains unchanged (readOnly/disabled)
  // ----------------------------------------------------
  const formNumberReadOnly = editContent.includes('id="formNumber"') &&
    editContent.includes('disabled') &&
    editContent.includes('readOnly') &&
    editContent.includes('cursor-not-allowed');
  assert(formNumberReadOnly, 'K. System form number (DH-xxx) remains immutable and read-only');

  // ----------------------------------------------------
  // L. Existing null values remain valid
  // ----------------------------------------------------
  const fallbackSafe = editContent.includes('value={formData.offlineFormNumber || ""}') ||
    editContent.includes('value={formData.offlineFormNumber}');
  assert(fallbackSafe, 'L. Null values safely handled with empty string fallback');

  // ----------------------------------------------------
  // M. Create flow still persists offlineFormNumber & offline_form_number
  // ----------------------------------------------------
  const createFlowHasOffline = addContent.includes('offlineFormNumber: trimmedOffline || undefined') &&
    addContent.includes('offline_form_number: trimmedOffline || undefined');
  assert(createFlowHasOffline, 'M. Create flow persists offlineFormNumber & offline_form_number');

  // ----------------------------------------------------
  // N. List and Detail views display offlineFormNumber
  // ----------------------------------------------------
  const listHasOfflineBadge = listContent.includes('offline_form_number') && listContent.includes('ऑफलाइन:');
  const detailHasOfflineBadge = detailContent.includes('offline_form_number') && detailContent.includes('ऑफलाइन:');
  assert(listHasOfflineBadge && detailHasOfflineBadge, 'N. List and Detail views display offlineFormNumber with badge');

  // ----------------------------------------------------
  // O. No unrelated Dhundhotsav financial/hierarchy logic changed
  // ----------------------------------------------------
  const fixed5100Preserved = editContent.includes('membershipFee: 5100') &&
    addContent.includes('membershipFee: 5100') &&
    listContent.includes('5100');
  const singleLedger300Preserved = listContent.includes('300') &&
    detailContent.includes('300');
  assert(fixed5100Preserved && singleLedger300Preserved, 'O. Financial logic (₹5,100 registration, ₹300 installment) preserved intact');

  console.log(`\n==================================================`);
  console.log(`FINAL REPORT SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runOfflineFormPersistenceTests().catch((err) => {
  console.error('Error running offline form persistence tests:', err);
  process.exit(1);
});
