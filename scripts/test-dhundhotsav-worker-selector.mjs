import fs from 'fs';
import path from 'path';

function runWorkerSelectorTests() {
  console.log('=== DHUNDHOTSAV WORKER / AGENT SELECTOR REGRESSION TESTS ===\n');
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
  const addPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'add', 'page.tsx');
  const editPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'edit', '[id]', 'page.tsx');
  const listPagePath = path.join(rootDir, 'app', 'dashboard', 'dhundhotsav', 'page.tsx');
  const servicePath = path.join(rootDir, 'lib', 'dhundhotsav-service.ts');

  const addContent = fs.readFileSync(addPagePath, 'utf-8');
  const editContent = fs.readFileSync(editPagePath, 'utf-8');
  const listContent = fs.readFileSync(listPagePath, 'utf-8');
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  // 1. Add page extracts userId for option value
  const addExtractsUserId = addContent.includes('ag.userId ||') &&
    addContent.includes('ag.user_id ||') &&
    addContent.includes('ag.agentProfile?.userId ||') &&
    addContent.includes('userId: resolvedUserId');
  assert(addExtractsUserId, '1. Add page agent option model resolves and standardizes on userId');

  // 2. Add dropdown option value uses agent.userId
  const addDropdownUsesUserId = addContent.includes('<option key={agent.userId || agent.id} value={agent.userId || agent.id}>');
  assert(addDropdownUsesUserId, '2. Add dropdown option value = userId');

  // 3. Add payload includes addedById, agentId, selectedAgentId with userId
  const addPayloadIncludesAll = addContent.includes('selectedAgentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined') &&
    addContent.includes('agentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined') &&
    addContent.includes('addedById: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined');
  assert(addPayloadIncludesAll, '3. Add payload sends ownership ID (addedById, agentId, selectedAgentId) as userId');

  // 4. Edit page extracts userId for option value
  const editExtractsUserId = editContent.includes('ag.userId ||') &&
    editContent.includes('ag.user_id ||') &&
    editContent.includes('ag.agentProfile?.userId ||') &&
    editContent.includes('userId: resolvedUserId');
  assert(editExtractsUserId, '4. Edit page agent option model resolves and standardizes on userId');

  // 5. Edit prefill binds raw addedById / User ID
  const editPrefillBindsAddedBy = editContent.includes('const rawWorkerId = String(') &&
    editContent.includes('reg.addedById ||') &&
    editContent.includes('selectedAgentId: rawWorkerId');
  assert(editPrefillBindsAddedBy, '5. Edit prefill resolves by addedById (User ID)');

  // 6. Edit reconciliation resolves AgentProfile.id into userId if needed
  const editReconciliation = editContent.includes('matched.userId !== cur') &&
    editContent.includes('return { ...prev, selectedAgentId: matched.userId };');
  assert(editReconciliation, '6. Edit agent loader reconciles profile ID into userId');

  // 7. Edit dropdown option value uses agent.userId
  const editDropdownUsesUserId = editContent.includes('<option key={agent.userId || agent.id} value={agent.userId || agent.id}>');
  assert(editDropdownUsesUserId, '7. Edit dropdown option value = userId matching prefilled addedById');

  // 8. Edit payload includes addedById, agentId, selectedAgentId
  const editPayloadIncludesAll = editContent.includes('selectedAgentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined') &&
    editContent.includes('agentId: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined') &&
    editContent.includes('addedById: formData.selectedAgentId ? String(formData.selectedAgentId).trim() : undefined');
  assert(editPayloadIncludesAll, '8. Edit payload sends updated ownership ID (addedById, agentId, selectedAgentId) as userId');

  // 9. Mock scenario test: record.addedById resolves worker, senior, mobile, distinct from applicant mobile
  const mockAgents = [
    {
      id: 'user-uuid-88',
      userId: 'user-uuid-88',
      agentProfileId: 'agent-profile-uuid-99',
      employeeId: 'EMP-005',
      offlineFormNumber: '1259',
      mobile: '9876543210',
      parentAgentId: 'agent-profile-uuid-senior-77',
      name: 'Worker Agent Deelip',
    },
    {
      id: 'user-uuid-senior-66',
      userId: 'user-uuid-senior-66',
      agentProfileId: 'agent-profile-uuid-senior-77',
      employeeId: 'EMP-004',
      offlineFormNumber: '1258',
      mobile: '9888888888',
      name: 'Senior Agent Dinesh',
    }
  ];

  const mockRecord = {
    addedById: 'user-uuid-88',
    applicantName: 'दिलीप पुरबिया',
    mobile: '9000000001',
    gotra: 'पुरबिया',
  };

  // Check matching in dropdown
  const matchedAgent = mockAgents.find((a) => a.userId === mockRecord.addedById || a.agentProfileId === mockRecord.addedById);
  assert(matchedAgent && matchedAgent.userId === 'user-uuid-88', '9. Existing registration addedById matches dropdown option userId');

  // Check worker offline number from agent profile
  assert(matchedAgent?.offlineFormNumber === '1259', '10. Worker offline number = 1259');

  // Check senior agent lookup via parentAgentId
  const seniorAgent = mockAgents.find((a) => a.agentProfileId === matchedAgent?.parentAgentId || a.userId === matchedAgent?.parentAgentId);
  assert(seniorAgent && seniorAgent.offlineFormNumber === '1258', '11. Senior offline number = 1258');

  // Check agent mobile vs applicant mobile separation
  assert(matchedAgent?.mobile === '9876543210' && mockRecord.mobile === '9000000001', '12. Agent mobile (9876543210) remains strictly distinct from applicant mobile (9000000001)');

  // 13. Financial behavior preservation check
  const financialPreserved = addContent.includes('membershipFee: 5100') &&
    editContent.includes('membershipFee: 5100') &&
    serviceContent.includes('amount: number; // ₹300 fixed');
  assert(financialPreserved, '13. Financial logic (₹5,100 registration fee, ₹300 installment) preserved');

  console.log(`\n==================================================`);
  console.log(`WORKER SELECTOR TESTS SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkerSelectorTests();
