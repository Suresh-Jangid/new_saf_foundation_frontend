# API Audit Log

Generated: 2026-06-28T16:07:58.997Z

## Summary

| Metric | Count |
|--------|-------|
| **Total Backend APIs** | 112 |
| **Tested APIs** | 112 |
| **Working APIs** | 110 |
| **Failed APIs** | 2 |
| **Success Rate** | 98.2% |

## Configuration

- Backend URL: `http://localhost:5000/api`
- Frontend URL: `http://localhost:3000`
- Auth: Yes (login token obtained)

## Newly Added Frontend API Definitions (require PHP backend implementation)

| apicall | Purpose |
|---------|---------|
| getFinancialHelpInstallments | List payment installments for financial help records |
| addFinancialHelpInstallment | Add payment installment for financial help |

## Possibly Missing / Unreachable Backend APIs

_None detected (or backend unreachable)_

## Failed Endpoints (all)

| apicall | method | status | message |
|---------|--------|--------|----------|
| createApplication | POST | 200 | totalAmount is required |
| addMarriageCongrats | POST | 200 | date is required |

## Working Endpoints

- `login` (POST, 200ms: 460ms)
- `agentLogin` (POST, 200ms: 2061ms)
- `logout` (POST, 200ms: 6ms)
- `register` (POST, 200ms: 820ms)
- `getDashboardCounts` (POST, 200ms: 3540ms)
- `getAgents` (GET, 200ms: 1601ms)
- `addAgent` (POST, 200ms: 8482ms)
- `editAgent` (POST, 200ms: 2296ms)
- `deleteAgent` (POST, 200ms: 3213ms)
- `getAgentPermissions` (POST, 200ms: 917ms)
- `setAgentPermissions` (POST, 200ms: 1136ms)
- `getAllBulkData` (POST, 200ms: 397ms)
- `addAgentPaymentForDetails` (POST, 200ms: 400ms)
- `getAgentPaymentsForDetails` (POST, 200ms: 425ms)
- `getApplications` (GET, 200ms: 1831ms)
- `updateApplication` (POST, 200ms: 1605ms)
- `deleteApplication` (POST, 200ms: 1192ms)
- `updateApplicationActiveStatus` (POST, 200ms: 906ms)
- `getApplicationInstallments` (POST, 200ms: 883ms)
- `addApplicationInstallment` (POST, 200ms: 408ms)
- `getPreviousApplicationsMembers` (POST, 200ms: 3555ms)
- `createInsuranceApplication` (POST, 200ms: 1862ms)
- `getInsuranceApplication` (GET, 200ms: 1342ms)
- `editInsuranceApplication` (POST, 200ms: 791ms)
- `deleteInsuranceApplication` (POST, 200ms: 394ms)
- `updateInsuranceApplicationActiveStatus` (POST, 200ms: 770ms)
- `getApplicationInsuranceInstallments` (POST, 200ms: 767ms)
- `addApplicationInsuranceInstallment` (POST, 200ms: 370ms)
- `addLoanApplication` (POST, 200ms: 28ms)
- `getLoanApplications` (GET, 200ms: 847ms)
- `editLoanApplication` (POST, 200ms: 782ms)
- `deleteLoanApplication` (POST, 200ms: 805ms)
- `getLoanApplicationInstallments` (POST, 200ms: 789ms)
- `addLoanApplicationInstallment` (POST, 200ms: 411ms)
- `addFinancialHelp` (POST, 200ms: 10ms)
- `getFinancialHelps` (GET, 200ms: 746ms)
- `editFinancialHelp` (POST, 200ms: 833ms)
- `deleteFinancialHelp` (POST, 200ms: 879ms)
- `getFinancialHelpInstallments` (POST, 200ms: 768ms)
- `addFinancialHelpInstallment` (POST, 200ms: 447ms)
- `addDisabilityCycle` (POST, 200ms: 12ms)
- `getDisabilityCycles` (GET, 200ms: 804ms)
- `editDisabilityCycle` (POST, 200ms: 777ms)
- `deleteDisabilityCycle` (POST, 200ms: 863ms)
- `getMarriageCongrats` (GET, 200ms: 1740ms)
- `getMarriageCongratulations` (POST, 200ms: 2256ms)
- `editMarriageCongrats` (POST, 200ms: 816ms)
- `deleteMarriageCongrats` (POST, 200ms: 1576ms)
- `getMarriageCongratulationsPayment` (POST, 200ms: 1510ms)
- `createMarriageCongratulationsPayment` (POST, 200ms: 772ms)
- `getMarriageDetailsByNumber` (POST, 200ms: 746ms)
- `addMarriageSewing` (POST, 200ms: 371ms)
- `getMarriageSewing` (GET, 200ms: 769ms)
- `editMarriageSewing` (POST, 200ms: 784ms)
- `deleteMarriageSewing` (POST, 200ms: 958ms)
- `createmayra_Application` (POST, 200ms: 1626ms)
- `getmayra_application` (GET, 200ms: 746ms)
- `updatemayra_Application` (POST, 200ms: 1137ms)
- `deletemayra_Application` (POST, 200ms: 373ms)
- `updateMayraApplicationActiveStatus` (POST, 200ms: 816ms)
- `addMayraCongrats` (POST, 200ms: 823ms)
- `getMayraCongrats` (GET, 200ms: 812ms)
- `editMayraCongrats` (POST, 200ms: 1153ms)
- `deleteMayraCongrats` (POST, 200ms: 851ms)
- `updateMayraCongratulationsStatus` (POST, 200ms: 770ms)
- `getMayraCongratulations` (POST, 200ms: 1562ms)
- `addMayraInstallment` (POST, 200ms: 408ms)
- `getMayraInstallments` (POST, 200ms: 809ms)
- `updateMayraInstallment` (POST, 200ms: 758ms)
- `deleteMayraInstallment` (POST, 200ms: 919ms)
- `getMayraCongratulationsPayment` (POST, 200ms: 754ms)
- `createMayraCongratulationsPayment` (POST, 200ms: 821ms)
- `deleteMayraCongratulationsPayment` (POST, 200ms: 753ms)
- `updateMayraCongratulationsPayment` (POST, 200ms: 777ms)
- `getMayraDetailsByNumber` (POST, 200ms: 756ms)
- `getMayraBeforeDate` (POST, 200ms: 389ms)
- `updateMayraStatus` (POST, 200ms: 1181ms)
- `getMayraPreviousMembers` (POST, 200ms: 457ms)
- `getMayraBulkData` (POST, 200ms: 804ms)
- `getMayraUserData` (POST, 200ms: 5ms)
- `updateMayraPdfStatus` (POST, 200ms: 4ms)
- `getUserData` (POST, 200ms: 452ms)
- `updatePaymentStatus` (POST, 200ms: 5ms)
- `updatePdfStatus` (POST, 200ms: 6ms)
- `addPensionYojana` (POST, 200ms: 11ms)
- `getPensionYojanas` (GET, 200ms: 805ms)
- `editPensionYojana` (POST, 200ms: 783ms)
- `deletePensionYojana` (POST, 200ms: 759ms)
- `getPensionYojanaPayments` (POST, 200ms: 382ms)
- `addPensionYojanaPayment` (POST, 200ms: 393ms)
- `addSewingCamp` (POST, 200ms: 20ms)
- `getSewingCamp` (GET, 200ms: 829ms)
- `editSewingCamp` (POST, 200ms: 822ms)
- `deleteSewingCamp` (POST, 200ms: 808ms)
- `addSurakshaBima` (POST, 200ms: 907ms)
- `getSurakshaBimaList` (GET, 200ms: 853ms)
- `getSurakshaBima` (GET, 200ms: 852ms)
- `getSurakshaBimaData` (POST, 200ms: 756ms)
- `editSurakshaBima` (POST, 200ms: 807ms)
- `deleteSurakshaBima` (POST, 200ms: 392ms)
- `getPreviousSurakshaBimaMembers` (POST, 200ms: 1548ms)
- `getSurakshaBimaPaymentById` (POST, 200ms: 801ms)
- `createSurakshaBimaPayment` (POST, 200ms: 1739ms)
- `getInsuranceBulkData` (POST, 200ms: 815ms)
- `updateBimaPaymentStatus` (POST, 200ms: 5ms)
- `updateInsurancePdfStatus` (POST, 200ms: 7ms)
- `addPayment` (POST, 200ms: 15ms)
- `getPaymentList` (POST, 200ms: 747ms)
- `editPayment` (POST, 200ms: 970ms)
- `deletePayment` (POST, 200ms: 822ms)

## Next.js API Routes (sample)

| Route | Method | Status |
|-------|--------|--------|
| /api/proxy-image | GET | exists |
| /api/fireconnect | POST | skipped |
| /api/razorpay/create-order | POST | skipped |
| /api/razorpay/verify-payment | POST | skipped |
| /api/whatsapp-test | GET | exists |
| /api/fill-pdf-form | POST | skipped |
| /api/generate-agent-pdf | POST | skipped |
| /api/generate-insurance-pdf | POST | skipped |
| /api/generate-mayra-pdf | POST | skipped |
| /api/generate-pension-pdf | POST | skipped |

## Route Coverage Notes

- **Finance Help Payment** pages now use `getFinancialHelps`, `getFinancialHelpInstallments`, `addFinancialHelpInstallment` (was localStorage mock data)
- **74 dashboard pages** mapped to 112 backend apicall endpoints + 31 Next.js PDF/utility routes
- Endpoints marked `skipWrite` in audit are read-tested or use dummy IDs to avoid data mutation

## How to Re-run

```bash
# Local backend
node scripts/api-audit.mjs --base-url http://127.0.0.1:5000/api --frontend http://localhost:3002

# With auth
API_TEST_MOBILE=your_mobile API_TEST_PASSWORD=your_pass node scripts/api-audit.mjs
```
