const text = (value) => typeof value === 'string' && value.trim().length > 0;

export function assessHandoff(report) {
  const blockers = [];
  if (!report || typeof report !== 'object') {
    return {
      state: 'blocked',
      blockers: ['Missing report.'],
      externalActionsAuthorized: false,
    };
  }
  for (const key of ['goal', 'sourceHead', 'targetHead', 'candidateHead']) {
    if (!text(report[key])) blockers.push(`Missing ${key}.`);
  }
  for (const key of ['remoteFresh', 'sourceRechecked', 'creditPreserved']) {
    if (report[key] !== true) blockers.push(`Unverified ${key}.`);
  }
  const items = Array.isArray(report.items) ? report.items : [];
  if (!items.length) blockers.push('Missing intent ledger.');
  const ids = new Set();
  for (const item of items) {
    if (!item || !text(item.id) || ids.has(item.id)) {
      blockers.push('Missing or duplicate behavior ID.');
      continue;
    }
    ids.add(item.id);
    if (!['absorbed', 'superseded', 'implemented'].includes(item.disposition))
      blockers.push(`Unresolved behavior: ${item.id}.`);
    if (!text(item.evidence) || item.targetHead !== report.targetHead)
      blockers.push(`Stale or missing absorption evidence: ${item.id}.`);
    if (
      item.disposition === 'implemented' &&
      item.candidateHead !== report.candidateHead
    )
      blockers.push(`Stale implementation: ${item.id}.`);
  }
  const checks = Array.isArray(report.checks) ? report.checks : [];
  if (!checks.length) blockers.push('Missing candidate verification.');
  if (
    !checks.some(
      (check) =>
        check?.result === 'passed' &&
        check.head === report.candidateHead &&
        text(check.command) &&
        text(check.evidence),
    )
  ) {
    blockers.push('No passing candidate verification.');
  }
  for (const check of checks) {
    if (
      !check ||
      !text(check.command) ||
      !text(check.evidence) ||
      check.head !== report.candidateHead
    ) {
      blockers.push('Stale or missing verification evidence.');
      continue;
    }
    if (
      check.result !== 'passed' &&
      !(check.result === 'not-applicable' && text(check.reason))
    )
      blockers.push(`Verification incomplete: ${check.command}.`);
  }
  return {
    state: blockers.length ? 'blocked' : 'local-complete',
    blockers,
    externalActionsAuthorized: false,
  };
}
