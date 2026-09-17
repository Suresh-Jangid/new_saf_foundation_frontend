import fs from 'fs';
import path from 'path';

console.log('============================================================');
console.log('SAF FOUNDATION — DASHBOARD 20 CARDS EXACT VERIFICATION');
console.log('============================================================');

const dashboardPath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// The exact 20 cards in exact required order
const expectedCardsInOrder = [
  { id: 'epin_management', title: 'ई-पिन प्रबंधन / E-PIN Management', route: 'app/dashboard/epin-management/page.tsx' },
  { id: 'applicant_registration', title: 'सामान्य आवेदन / General Marriage Applications', route: 'app/dashboard/general-applications/page.tsx' },
  { id: 'recent_applications', title: 'हाल के आवेदन / Recent Applications', route: 'app/dashboard/general-applications/page.tsx' },
  { id: 'marriage_congratulations', title: 'विवाह बधाई / General Marriage Congratulations Payment', route: 'app/dashboard/marriage-congratulations/page.tsx' },
  { id: 'security_application', title: 'सुरक्षा बीमा हेतु सामान्य आवेदन / Insurance Bima Application', route: 'app/dashboard/general-applications-insurance/page.tsx' },
  { id: 'suraksha_bima_yojana', title: 'सुरक्षा बीमा योजना / Insurance Bima Payment', route: 'app/dashboard/suraksha-bima-yojana/page.tsx' },
  { id: 'mayra_registration', title: 'मायरा फॉर्म आवेदन पत्र / Mayra General Application', route: 'app/dashboard/mayra-registration/page.tsx' },
  { id: 'mayra_congratulations', title: 'मायरा बधाई पत्र / Mayra Congratulation Payment', route: 'app/dashboard/mayra-congratulations/page.tsx' },
  { id: 'janni_delivery', title: 'जननी प्रसूति पंजीकरण / Janni Delivery Registration', route: 'app/dashboard/janni-delivery/page.tsx' },
  { id: 'janni_congress_payment', title: 'जननी प्रसूति बधाई पत्र / Janni Congress Payment', route: 'app/dashboard/janni-delivery/congress-payment/page.tsx' },
  { id: 'aawas_home', title: 'आवास योजना पंजीकरण / Aawas (Home) Registration', route: 'app/dashboard/aawas/page.tsx' },
  { id: 'lado_bahin', title: 'लाडो बहिन पंजीकरण / Lado Bahin Registration', route: 'app/dashboard/lado-bahin/page.tsx' },
  { id: 'dhundhotsav', title: 'ढूंढोत्सव पंजीकरण / Dhundhotsav Registration', route: 'app/dashboard/dhundhotsav/page.tsx' },
  { id: 'shubh_laxmi', title: 'शुभलक्ष्मी पंजीकरण / ShubhLaxmi Registration', route: 'app/dashboard/shubh-laxmi/page.tsx' },
  { id: 'agent_registration', title: 'एजेंट आवेदन / Agent Registration', route: 'app/dashboard/agent-registration/page.tsx' },
  { id: 'agent_commission', title: 'एजेंट कमिशन भुगतान / Agent Commission Payment', route: 'app/dashboard/agent-commission/page.tsx' },
  { id: 'agent_commission_report', title: 'एजेंट कमिशन रिपोर्ट / Agent Commission Report', route: 'app/dashboard/agent-commission-report/page.tsx' },
  { id: 'bulk_marriage_emi', title: 'बल्क विवाह ईएमआई / Bulk Marriage EMI', route: 'app/dashboard/bulk-marriage-emi/page.tsx' },
  { id: 'bulk_suraksha_bima_emi', title: 'बल्क सुरक्षा बीमा ईएमआई / Bulk Insurance Bima EMI', route: 'app/dashboard/bulk-suraksha-bima-emi/page.tsx' },
  { id: 'bulk_mayra_emi', title: 'बल्क मायरा ईएमआई / Bulk Mayra EMI', route: 'app/dashboard/bulk-mayra-emi/page.tsx' },
];

const disallowedCardIds = [
  'financial_help',
  'disability_cycle_distribution',
  'balika_loan_application',
  'marriage_sewing_machine_distribution',
  'salakar_pension_yojana',
  'sewing_machine_camp',
  'payment_management',
];

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Verify Exactly 20 Cards in getAllCards
console.log('\n1. Checking Card IDs in Dashboard...');
const idMatches = [...dashboardContent.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);

assert(idMatches.length === 20, `Dashboard defines exactly 20 cards (found ${idMatches.length})`);

for (let i = 0; i < expectedCardsInOrder.length; i++) {
  const expected = expectedCardsInOrder[i];
  const actual = idMatches[i];
  assert(actual === expected.id, `Card #${i + 1} matches: ${expected.id} (actual: ${actual})`);
}

// 2. Verify Disallowed Cards are Excluded from Dashboard
console.log('\n2. Verifying Excluded Cards are NOT in Dashboard...');
for (const disallowedId of disallowedCardIds) {
  assert(!idMatches.includes(disallowedId), `Card '${disallowedId}' is cleanly removed from Dashboard`);
}

// 3. Verify Target Routes on Filesystem
console.log('\n3. Checking Target Routes on Filesystem...');
for (const item of expectedCardsInOrder) {
  const fullPath = path.join(process.cwd(), item.route);
  assert(fs.existsSync(fullPath), `Target page exists for ${item.id}: ${item.route}`);
}

// 4. Verify Code Patterns
console.log('\n4. Verifying Code Level Implementations...');
assert(dashboardContent.includes('Promise.allSettled'), 'Uses Promise.allSettled for concurrent stats fetching');
assert(dashboardContent.includes('canViewCard'), 'Implements role & permission filter canViewCard');
assert(dashboardContent.includes('<Link key={idx} href={card.route}'), 'Wraps clickable cards in Next.js Link');
assert(dashboardContent.includes('grid gap-6 md:grid-cols-2 lg:grid-cols-4'), 'Preserves responsive grid layout');

console.log('============================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
