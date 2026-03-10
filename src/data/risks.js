/**
 * Generated risks (100). Ids r-1..r-100.
 * One risk per project (spread across projects); referentially consistent with projects.
 */

import { getProjects } from './projects.js';

const RISK_TITLE_STEMS = [
  'Resource availability',
  'Scope creep',
  'Vendor delivery',
  'Regulatory change',
  'Technical debt',
  'Integration delay',
  'Security finding',
  'Budget overrun',
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'MITIGATING', 'MITIGATED', 'CLOSED'];

function buildDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildRisks() {
  const projects = getProjects();
  const risks = [];
  for (let i = 1; i <= 100; i++) {
    const projectIndex = (i - 1) % projects.length;
    const project = projects[projectIndex];
    const stem = RISK_TITLE_STEMS[(i - 1) % RISK_TITLE_STEMS.length];
    const title =
      i <= RISK_TITLE_STEMS.length ? stem : `${stem} ${Math.ceil(i / RISK_TITLE_STEMS.length)}`;
    const status = STATUSES[i % 4];
    const raisedMonth = 1 + (i % 12);
    const raisedYear = 2025 + Math.floor(i / 50);
    const raisedDate = buildDate(raisedYear, raisedMonth, 1 + (i % 20));
    const mitigatedDate =
      status === 'MITIGATED' || status === 'CLOSED'
        ? buildDate(raisedYear, raisedMonth + 1, 1 + (i % 15))
        : '';
    risks.push({
      id: `r-${i}`,
      projectId: project.id,
      projectName: project.name,
      title,
      severity: SEVERITIES[i % 4],
      status,
      owner: project.owner,
      raisedDate,
      mitigatedDate,
    });
  }
  return risks;
}

let cached = null;
export function getRisks() {
  if (!cached) cached = buildRisks();
  return cached;
}
