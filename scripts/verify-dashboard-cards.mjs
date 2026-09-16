import fs from 'fs';
import path from 'path';

console.log('============================================================');
console.log('SAF FOUNDATION — DASHBOARD EXPANSION VERIFICATION');
console.log('============================================================');

const dashboardPath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Expected cards that must be present
const expectedCardIds = [
  'applicant_registration',
  'recent_applications',
  'financial_help',
  'marriage_congratulations',
  'disability_cycle_distribution',
  'agent_registration',
  'security_application',
  'balika_loan_application',
  'marriage_sewing_machine_distribution',
  'salakar_pension_yojana',
  'sewing_machine_camp',
  'suraksha_bima_yojana',
  'mayra_registration',
  'mayra_congratulations',
  'janni_delivery',
  'janni_congress_payment',
  'aawas_home',
  'lado_bahin',
  'dhundhotsav',
  'shubh_laxmi',
  'epin_management',
  'agent_commission',
  'agent_commission_report',
  'bulk_marriage_emi',
  'bulk_suraksha_bima_emi',
  'bulk_mayra_emi',
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

// 1. Verify Card Representation
console.log('\n1. Checking Card IDs in Dashboard...');
for (const id of expectedCardIds) {
  assert(dashboardContent.includes(`id: "${id}"`), `Dashboard defines card: ${id}`);
}

// 2. Verify Routes Exist
console.log('\n2. Checking Target Routes on Filesystem...');
const expectedRoutes = [
  { id: 'applicant_registration', route: 'app/dashboard/general-applications/page.tsx' },
  { id: 'financial_help', route: 'app/dashboard/financal-help/page.tsx' },
  { id: 'marriage_congratulations', route: 'app/dashboard/marriage-congratulations/page.tsx' },
  { id: 'disability_cycle_distribution', route: 'app/dashboard/disability-cycle/page.tsx' },
  { id: 'agent_registration', route: 'app/dashboard/agent-registration/page.tsx' },
  { id: 'security_application', route: 'app/dashboard/general-applications-insurance/page.tsx' },
  { id: 'balika_loan_application', route: 'app/dashboard/loan-application/page.tsx' },
  { id: 'marriage_sewing_machine_distribution', route: 'app/dashboard/marriage-congratulations/sewing-machine-distribution/page.tsx' },
  { id: 'salakar_pension_yojana', route: 'app/dashboard/pension-yojana/page.tsx' },
  { id: 'sewing_machine_camp', route: 'app/dashboard/sewing-machine/page.tsx' },
  { id: 'suraksha_bima_yojana', route: 'app/dashboard/suraksha-bima-yojana/page.tsx' },
  { id: 'mayra_registration', route: 'app/dashboard/mayra-registration/page.tsx' },
  { id: 'mayra_congratulations', route: 'app/dashboard/mayra-congratulations/page.tsx' },
  { id: 'janni_delivery', route: 'app/dashboard/janni-delivery/page.tsx' },
  { id: 'janni_congress_payment', route: 'app/dashboard/janni-delivery/congress-payment/page.tsx' },
  { id: 'aawas_home', route: 'app/dashboard/aawas/page.tsx' },
  { id: 'lado_bahin', route: 'app/dashboard/lado-bahin/page.tsx' },
  { id: 'dhundhotsav', route: 'app/dashboard/dhundhotsav/page.tsx' },
  { id: 'shubh_laxmi', route: 'app/dashboard/shubh-laxmi/page.tsx' },
  { id: 'epin_management', route: 'app/dashboard/epin-management/page.tsx' },
  { id: 'agent_commission', route: 'app/dashboard/agent-commission/page.tsx' },
  { id: 'agent_commission_report', route: 'app/dashboard/agent-commission-report/page.tsx' },
  { id: 'bulk_marriage_emi', route: 'app/dashboard/bulk-marriage-emi/page.tsx' },
  { id: 'bulk_suraksha_bima_emi', route: 'app/dashboard/bulk-suraksha-bima-emi/page.tsx' },
  { id: 'bulk_mayra_emi', route: 'app/dashboard/bulk-mayra-emi/page.tsx' },
  { id: 'payment_management', route: 'app/dashboard/payment-management/page.tsx' },
];

for (const item of expectedRoutes) {
  const fullPath = path.join(process.cwd(), item.route);
  assert(fs.existsSync(fullPath), `Target page exists for ${item.id}: ${item.route}`);
}

// 3. Verify Code Patterns
console.log('\n3. Verifying Code Level Implementations...');
assert(dashboardContent.includes('Promise.allSettled'), 'Uses Promise.allSettled for concurrent stats fetching');
assert(dashboardContent.includes('canViewCard'), 'Implements role & permission filter canViewCard');
assert(dashboardContent.includes('<Link key={idx} href={card.route}'), 'Wraps clickable cards in Next.js Link');
assert(dashboardContent.includes('grid gap-6 md:grid-cols-2 lg:grid-cols-4'), 'Preserves responsive grid layout');
assert(dashboardContent.includes('DhundhotsavService.getAllRegistrations'), 'Fetches live Dhundhotsav counts');
assert(dashboardContent.includes('JanniDeliveryService.getAllRegistrations'), 'Fetches live Janni Delivery counts');
assert(dashboardContent.includes('LadoBahinService.getAllRegistrations'), 'Fetches live Lado Bahin counts');
assert(dashboardContent.includes('ShubhLaxmiService.getAllRegistrations'), 'Fetches live Shubh Laxmi counts');
assert(dashboardContent.includes('AawasService.getAllRegistrations'), 'Fetches live Aawas counts');
assert(dashboardContent.includes('EpinService.getInventory'), 'Fetches live E-PIN counts');

console.log('============================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
