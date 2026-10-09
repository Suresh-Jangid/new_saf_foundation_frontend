/**
 * SAF FOUNDATION — STRICT CONTRIBUTION GROUP SEPARATION (FRONTEND)
 *
 * Four distinct groups:
 * 1. GM-300: General Marriage records with authoritative ₹300 installment.
 * 2. GM-1000: General Marriage records with authoritative ₹1000 installment.
 * 3. MAYRA-300: Mayra records with authoritative ₹300 installment.
 * 4. MAYRA-1000: Mayra records with authoritative ₹1000 installment.
 *
 * Strict Contribution Rules:
 * Contributions are allowed only when BOTH conditions match:
 * 1. Source and recipient belong to the same module.
 * 2. Source and recipient belong to the same installment group.
 */

export type ContributionModule = 'general_marriage' | 'mayra';

export type ContributionGroup = 'GM-300' | 'GM-1000' | 'MAYRA-300' | 'MAYRA-1000';

export function resolveGeneralMarriageGroup(installmentAmount: unknown): 'GM-300' | 'GM-1000' | null {
  if (installmentAmount === null || installmentAmount === undefined) return null;
  const numeric = typeof installmentAmount === 'number'
    ? installmentAmount
    : Number(String(installmentAmount).trim());
  if (numeric === 300) return 'GM-300';
  if (numeric === 1000) return 'GM-1000';
  return null;
}

export function resolveMayraGroup(mayraInstallment: unknown): 'MAYRA-300' | 'MAYRA-1000' | null {
  if (mayraInstallment === null || mayraInstallment === undefined) return null;
  const numeric = typeof mayraInstallment === 'number'
    ? mayraInstallment
    : Number(String(mayraInstallment).trim());
  if (numeric === 300) return 'MAYRA-300';
  if (numeric === 1000) return 'MAYRA-1000';
  return null;
}

export function getExpectedInstallmentAmount(group: ContributionGroup): number {
  switch (group) {
    case 'GM-300':
    case 'MAYRA-300':
      return 300;
    case 'GM-1000':
    case 'MAYRA-1000':
      return 1000;
  }
}

export function getGroupBadgeColor(group: ContributionGroup | null | string): string {
  switch (group) {
    case 'GM-300':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'GM-1000':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'MAYRA-300':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'MAYRA-1000':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-amber-100 text-amber-800 border-amber-300';
  }
}

export function getGroupLabel(group: ContributionGroup | null | string): string {
  switch (group) {
    case 'GM-300':
      return 'Group GM-300 (₹300)';
    case 'GM-1000':
      return 'Group GM-1000 (₹1000)';
    case 'MAYRA-300':
      return 'Group MAYRA-300 (₹300)';
    case 'MAYRA-1000':
      return 'Group MAYRA-1000 (₹1000)';
    default:
      return 'Ambiguous Group (Review Required)';
  }
}

export function validateContributionMatchClient(params: {
  sourceModule: ContributionModule;
  recipientModule: ContributionModule;
  sourceGroup: ContributionGroup | null;
  recipientGroup: ContributionGroup | null;
}): { valid: boolean; error?: string } {
  if (params.sourceModule !== params.recipientModule) {
    return {
      valid: false,
      error: `Cross-module contribution blocked: ${params.sourceModule} cannot contribute to ${params.recipientModule}.`,
    };
  }
  if (!params.sourceGroup) {
    return {
      valid: false,
      error: 'Ineligible source: Record does not have an authoritative ₹300 or ₹1000 installment group.',
    };
  }
  if (!params.recipientGroup) {
    return {
      valid: false,
      error: 'Ineligible recipient: Record does not have an authoritative ₹300 or ₹1000 installment group.',
    };
  }
  if (params.sourceGroup !== params.recipientGroup) {
    return {
      valid: false,
      error: `Strict group mismatch: Source is in ${params.sourceGroup} but recipient is in ${params.recipientGroup}. Cross-installment contributions are strictly blocked.`,
    };
  }
  return { valid: true };
}
