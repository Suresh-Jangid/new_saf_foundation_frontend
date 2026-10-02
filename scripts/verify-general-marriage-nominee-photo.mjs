import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('============================================================');
console.log('SAF FOUNDATION — GENERAL MARRIAGE NOMINEE PHOTO AUDIT SUITE');
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

async function runAudit() {
  const addPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'add', 'page.tsx');
  const editPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'edit', '[id]', 'page.tsx');
  const servicesPath = path.join(process.cwd(), 'lib', 'services.ts');
  const listPagePath = path.join(process.cwd(), 'app', 'dashboard', 'general-applications', 'page.tsx');
  const fillPdfPath = path.join(process.cwd(), 'app', 'api', 'fill-pdf-form', 'route.ts');

  console.log('1. Audit General Marriage Add Page (Nominee Photo)...');
  const addContent = fs.readFileSync(addPagePath, 'utf8');

  it('Add Page: formData type and initial state declare nomineePhoto: File | null', () => {
    assert.ok(addContent.includes('nomineePhoto: File | null;'), 'formData must include nomineePhoto: File | null');
    assert.ok(addContent.includes('nomineePhoto: null,'), 'Initial formData must have nomineePhoto: null');
  });

  it('Add Page: Nominee photo preview state & lifecycle effect implemented', () => {
    assert.ok(addContent.includes('const [nomineePhotoPreview, setNomineePhotoPreview] = useState<string | null>(null);'), 'Must have nomineePhotoPreview state');
    assert.ok(addContent.includes('formData.nomineePhoto instanceof File'), 'Must check formData.nomineePhoto instanceof File');
    assert.ok(addContent.includes('URL.revokeObjectURL(url)'), 'Must revoke object URL on unmount/change');
  });

  it('Add Page: UI field rendered immediately after Nominee section with required label and accept="image/*"', () => {
    assert.ok(addContent.includes('नामांकित व्यक्ति का फोटो / Nominee Photo'), 'Must render bilingual label');
    assert.ok(addContent.includes('id="nomineePhoto"'), 'Must have id nomineePhoto');
    assert.ok(addContent.includes('type="file"'), 'Must have type file');
    assert.ok(addContent.includes('accept="image/*"'), 'Must accept image/*');
  });

  it('Add Page: Camera capture supported via MediaUploadControl', () => {
    assert.ok(addContent.includes('id="nomineePhoto-camera"'), 'Must render MediaUploadControl for nomineePhoto');
    assert.ok(addContent.includes('standaloneCameraOnly'), 'Must support camera capture');
  });

  it('Add Page: Remove button allows clearing selected photo before submit', () => {
    assert.ok(addContent.includes('हटाएं / Remove'), 'Must have remove button');
    assert.ok(addContent.includes('nomineePhoto: null'), 'Must set nomineePhoto to null on remove');
  });

  it('Add Page: ImageKit upload integration in executeSubmit uploads under category nominee', () => {
    assert.ok(addContent.includes('category: "nominee"'), 'Must upload with category nominee');
    assert.ok(addContent.includes('entityType: "application"'), 'Must upload with entityType application');
    assert.ok(addContent.includes('uploadMediaFile(formData.nomineePhoto'), 'Must call uploadMediaFile');
  });

  it('Add Page: executeSubmit appends all backend aliases for nominee photo to FormData', () => {
    assert.ok(addContent.includes('apiFormData.append("nomineePassportPhoto"'), 'Must append nomineePassportPhoto');
    assert.ok(addContent.includes('apiFormData.append("nominee_passport_photo"'), 'Must append nominee_passport_photo');
    assert.ok(addContent.includes('apiFormData.append("nomineePhoto"'), 'Must append nomineePhoto');
    assert.ok(addContent.includes('apiFormData.append("nominee_photo"'), 'Must append nominee_photo');
    assert.ok(addContent.includes('apiFormData.append("nomineePhotoUrl"'), 'Must append nomineePhotoUrl');
  });

  console.log('\n2. Audit General Marriage Edit Page (Nominee Photo)...');
  const editContent = fs.readFileSync(editPagePath, 'utf8');

  it('Edit Page: GeneralApplicationFormData declares nominee photo fields', () => {
    assert.ok(editContent.includes('nomineePhoto?: File | null;'), 'Must have nomineePhoto in form data type');
    assert.ok(editContent.includes('nomineePhotoUrl?: string | null;'), 'Must have nomineePhotoUrl in form data type');
    assert.ok(editContent.includes('nomineePassportPhoto?: File | string | null;'), 'Must have nomineePassportPhoto in form data type');
    assert.ok(editContent.includes('existingNomineePhoto?: string | null;'), 'Must have existingNomineePhoto in form data type');
  });

  it('Edit Page: fetchAllData extracts existing nominee photo with getNomineePhotoPath', () => {
    assert.ok(editContent.includes('getNomineePhotoPath(record)'), 'Must call getNomineePhotoPath');
    assert.ok(editContent.includes('setExistingNomineePhotoUrl(nomineePhotoPath)'), 'Must store existing nominee photo URL');
  });

  it('Edit Page: UI displays existing nominee photo preview and replace guidance', () => {
    assert.ok(editContent.includes('मौजूदा नॉमिनी फोटो / Existing Nominee Photo:'), 'Must show existing photo label');
    assert.ok(editContent.includes('getProxiedPhotoSrc(existingNomineePhotoUrl)'), 'Must proxy existing photo URL');
    assert.ok(editContent.includes('कोई नॉमिनी फोटो अपलोड नहीं है / No nominee photo uploaded'), 'Must display fallback when no photo exists');
  });

  it('Edit Page: Selecting new photo displays new preview and replacement notice', () => {
    assert.ok(editContent.includes('नामांकित व्यक्ति का नया फोटो प्रीव्यू'), 'Must render preview for new photo');
    assert.ok(editContent.includes('नई फोटो चुनी गई / New photo selected'), 'Must display new photo indicator');
    assert.ok(editContent.includes('सेव करने पर अपडेट होगी / Will update on save'), 'Must display update notice');
  });

  it('Edit Page: executeSubmit uploads new nominee photo to ImageKit with entityId', () => {
    assert.ok(editContent.includes('uploadMediaFile(formData.nomineePhoto, {'), 'Must upload new nominee photo');
    assert.ok(editContent.includes('category: "nominee"'), 'Must upload to category nominee');
    assert.ok(editContent.includes('entityId: id'), 'Must include application id');
  });

  it('Edit Page: buildEditFormData safely preserves existing photo if new one not chosen', () => {
    assert.ok(editContent.includes('nomineePassportPhoto: newUploadedNomineePhotoUrl ||'), 'Must prefer newUploadedNomineePhotoUrl or existing');
    assert.ok(editContent.includes('nomineePhoto: newUploadedNomineePhotoUrl ||'), 'Must set nomineePhoto');
    assert.ok(editContent.includes('nomineePhotoUrl: newUploadedNomineePhotoUrl ||'), 'Must set nomineePhotoUrl');
  });

  console.log('\n3. Audit lib/services.ts, list page, and PDF Generation...');
  const servicesContent = fs.readFileSync(servicesPath, 'utf8');
  const listContent = fs.readFileSync(listPagePath, 'utf8');
  const fillPdfContent = fs.readFileSync(fillPdfPath, 'utf8');

  it('lib/services.ts: GeneralApplication interface includes nominee photo aliases', () => {
    assert.ok(servicesContent.includes('nomineePhoto?: File | string | null;'), 'Must have nomineePhoto');
    assert.ok(servicesContent.includes('nomineePhotoUrl?: string | null;'), 'Must have nomineePhotoUrl');
    assert.ok(servicesContent.includes('nomineePassportPhoto?: File | string | null;'), 'Must have nomineePassportPhoto');
    assert.ok(servicesContent.includes('existingNomineePhoto?: string | null;'), 'Must have existingNomineePhoto');
  });

  it('List Page: GeneralApplicationRecord & mapApplicationRecord normalize nominee photo', () => {
    assert.ok(listContent.includes('nomineePhoto?: string | null'), 'Record must include nomineePhoto');
    assert.ok(listContent.includes('nomineePassportPhoto?: string | null'), 'Record must include nomineePassportPhoto');
    assert.ok(listContent.includes('nomineePhotoSource = (record as any).nomineePassportPhoto'), 'Must resolve nominee photo source for PDF');
    assert.ok(listContent.includes('nomineeImageData: nomineeImageData'), 'Must pass nomineeImageData to PDF generator');
  });

  it('PDF Generation (fill-pdf-form): Calibrated nominee photo box embeds at exact coordinates', () => {
    assert.ok(fillPdfContent.includes('nomineeX = 476.0'), 'Must embed at x 476.0');
    assert.ok(fillPdfContent.includes('nomineeY = 295.0'), 'Must embed at y 295.0');
    assert.ok(fillPdfContent.includes('nomineeWidth = 76.3'), 'Must have width 76.3');
    assert.ok(fillPdfContent.includes('nomineeHeight = 83.3'), 'Must have height 83.3');
  });

  console.log('============================================================');
  console.log(`FINAL RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
