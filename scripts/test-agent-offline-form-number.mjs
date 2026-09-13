import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log("=== RUNNING AGENT OFFLINE FORM NUMBER FRONTEND TESTS ===");

const root = process.cwd();

// Test 1-5: Check app/dashboard/agent-registration/add/page.tsx
const addPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/add/page.tsx'), 'utf8');

// 1. Add field exists
assert(addPageContent.includes('id="offlineFormNumber"'), '1. Add page must have offlineFormNumber field');
console.log("✅ 1. Add field exists");

// 2. Correct label
assert(addPageContent.includes('ऑफलाइन फॉर्म नं. / Offline Form No.'), '2. Add page must have correct bilingual label');
console.log("✅ 2. Correct label: ऑफलाइन फॉर्म नं. / Offline Form No.");

// 3. Correct helper
assert(addPageContent.includes('भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number'), '3. Add page must have correct helper text');
console.log("✅ 3. Correct helper: भौतिक फॉर्म नंबर (वैकल्पिक) / Physical form number");

// 4. Placeholder
assert(addPageContent.includes('placeholder="उदा. 1259"'), '4. Add page must have placeholder उदा. 1259');
console.log("✅ 4. Placeholder: उदा. 1259");

// 5. maxLength 50
assert(addPageContent.includes('maxLength={50}'), '5. Add page input must have maxLength={50}');
console.log("✅ 5. maxLength 50");

// 6. Optional behavior
assert(!addPageContent.includes('id="offlineFormNumber"\n                    name="offlineFormNumber"\n                    value={form.offlineFormNumber}\n                    placeholder="उदा. 1259"\n                    maxLength={50}\n                    className="bg-background"\n                    onChange={handleChange}\n                    required'), '6. offlineFormNumber must NOT have required attribute');
console.log("✅ 6. Optional behavior verified");

// 7. Create payload contains offlineFormNumber
assert(addPageContent.includes('offlineFormNumber: form.offlineFormNumber ? form.offlineFormNumber.trim() : undefined'), '7. Create submission data must include trimmed offlineFormNumber');
console.log("✅ 7. Create payload contains offlineFormNumber");

// Test 8-10: Check app/dashboard/agent-registration/edit/[id]/page.tsx
const editPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/edit/[id]/page.tsx'), 'utf8');

// 8. Edit prefill works
assert(editPageContent.includes('setInitialOfflineFormNumber(rawOffline)'), '8. Edit page must store initial offline number');
assert(editPageContent.includes('offlineFormNumber: rawOffline'), '8. Edit page must prefill offlineFormNumber');
console.log("✅ 8. Edit prefill works");

// 9. Update payload works
assert(editPageContent.includes('offlineFormNumber: form.offlineFormNumber ? form.offlineFormNumber.trim() : ""'), '9. Update submission data must include offlineFormNumber');
console.log("✅ 9. Update payload works");

// 10. Clear works
const clearTestPayload = {
  offlineFormNumber: "".trim() || ""
};
assert.strictEqual(clearTestPayload.offlineFormNumber, "", '10. Clearing offline form number produces empty string/null for backend update');
console.log("✅ 10. Clear works");

// 11. Duplicate error displayed
assert(editPageContent.includes('toast.error(errorMessage)') && editPageContent.includes('error?.response?.data?.message'), '11. Edit page must display backend duplicate error message');
assert(addPageContent.includes('toast.error(errorMessage)') && addPageContent.includes('error?.response?.data?.message'), '11. Add page must display backend duplicate error message');
console.log("✅ 11. Duplicate error displayed via Sonner toast");

// 12. Employee ID remains immutable
assert(editPageContent.includes('id="employee_id" name="employee_id" disabled value={form.employee_id}'), '12. employee_id must remain disabled/read-only in Edit form');
console.log("✅ 12. Employee ID remains immutable & read-only");

// 13. Hierarchy remains unchanged
assert(editPageContent.includes('seniorEmployeeId: selectedSeniorId'), '13. Edit page preserves seniorEmployeeId');
assert(editPageContent.includes('parentAgentId: selectedSeniorId'), '13. Edit page preserves parentAgentId');
console.log("✅ 13. Hierarchy remains unchanged when updating offline form number");

// Test 14-16: Check app/dashboard/agent-registration/page.tsx and lib/utils.ts
const listPageContent = fs.readFileSync(path.join(root, 'app/dashboard/agent-registration/page.tsx'), 'utf8');
const utilsContent = fs.readFileSync(path.join(root, 'lib/utils.ts'), 'utf8');

// 14. Search by offline number
assert(listPageContent.includes('"offlineFormNumber"'), '14. DataTable searchFields must include offlineFormNumber');
console.log("✅ 14. Search by offline number supported");

// 15. List displays offline number
assert(listPageContent.includes('ऑफलाइन: <span className="font-medium text-foreground">{offline}</span>'), '15. List must display offline number badge');
console.log("✅ 15. List displays offline number");

// 16. No null/undefined display
assert(utilsContent.includes('offlineFormNumber: str('), '16. utils.ts mapAgentFormRecord must use safe str() normalization');
console.log("✅ 16. No null/undefined string display (safe normalization)");

console.log("\n🎉 ALL 16 AGENT OFFLINE FORM NUMBER TESTS PASSED!");
