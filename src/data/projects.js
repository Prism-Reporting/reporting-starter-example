/**
 * Generated portfolio projects (100). Ids p-1..p-100.
 * Used by data-provider and by milestones/risks/tasks for referential consistency.
 */

const OWNERS = ['Ava Patel', 'Marcus Reed', 'Nina Alvarez', 'Liam Chen', 'Zoe Martin'];
const STATUSES = ['ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETE'];
const TIMELINE_STATUSES = ['ON_TRACK', 'SLIPPING', 'LATE'];
const QUARTERS = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

const PROJECT_NAME_STEMS = [
  'Customer Portal Refresh',
  'ERP Migration',
  'Field Service Mobile App',
  'Pricing Intelligence Rollout',
  'Compliance Automation',
  'Revenue Forecasting Workspace',
  'Partner API Expansion',
  'Marketing Data Lake',
  'Supply Chain Visibility',
  'HR Self-Service Platform',
  'Invoice Processing Automation',
  'Customer 360 Dashboard',
  'Legacy Decommissioning',
  'Cloud Security Hardening',
  'Data Governance Framework',
  'Vendor Portal Integration',
  'Expense Management Overhaul',
  'Contract Lifecycle System',
  'Incident Response Platform',
  'Analytics Workspace',
];

function buildDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildProjects() {
  const projects = [];
  for (let i = 1; i <= 100; i++) {
    const stem = PROJECT_NAME_STEMS[(i - 1) % PROJECT_NAME_STEMS.length];
    const name =
      i <= PROJECT_NAME_STEMS.length ? stem : `${stem} ${Math.ceil(i / PROJECT_NAME_STEMS.length)}`;
    const quarter = QUARTERS[(i - 1) % QUARTERS.length];
    const startMonth = 1 + ((i - 1) % 12);
    const startYear = 2025 + Math.floor((i - 1) / 48);
    const durationDays = 90 + (i % 120);
    const startDate = buildDate(startYear, startMonth, 1 + (i % 28));
    const endDateObj = new Date(Date.UTC(startYear, startMonth - 1, 1 + (i % 28) + durationDays));
    const endDate = buildDate(
      endDateObj.getUTCFullYear(),
      endDateObj.getUTCMonth() + 1,
      endDateObj.getUTCDate()
    );
    const percentComplete = [0, 25, 50, 75, 100][i % 5];
    const status = percentComplete === 100 ? 'COMPLETE' : STATUSES[i % 3];
    const budgetPlanned = 200000 + (i % 80) * 10000;
    const budgetActual = budgetPlanned + (i % 5 === 0 ? (i % 3) * 20000 : -(i % 7) * 5000);
    projects.push({
      id: `p-${i}`,
      name: i <= PROJECT_NAME_STEMS.length ? PROJECT_NAME_STEMS[i - 1] : `${stem} ${Math.ceil(i / PROJECT_NAME_STEMS.length)}`,
      owner: OWNERS[i % OWNERS.length],
      status,
      quarter,
      percentComplete,
      budgetPlanned,
      budgetActual,
      timelineStatus: percentComplete === 100 ? 'ON_TRACK' : TIMELINE_STATUSES[i % 3],
      startDate,
      endDate,
      executiveSummary: `Project ${i} summary: delivery and budget status for ${name}.`,
    });
  }
  return projects;
}

let cached = null;
export function getProjects() {
  if (!cached) cached = buildProjects();
  return cached;
}
