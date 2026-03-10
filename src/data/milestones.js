/**
 * Generated milestones (100). Ids m-1..m-100.
 * Spread across projects: 1 milestone per project (project 1 -> m-1, project 2 -> m-2, ...).
 * Referentially consistent: every milestone has valid projectId and projectName from projects.
 */

import { getProjects } from './projects.js';

const MILESTONE_NAME_STEMS = [
  'Design sign-off',
  'Beta launch',
  'Integration test',
  'Go-live readiness',
  'Data model freeze',
  'Pilot deployment',
  'Training package',
  'Executive review',
  'Contract approval',
  'Evidence export',
];

function buildDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildMilestones() {
  const projects = getProjects();
  const milestones = [];
  for (let i = 1; i <= 100; i++) {
    const projectIndex = (i - 1) % projects.length;
    const project = projects[projectIndex];
    const stem = MILESTONE_NAME_STEMS[(i - 1) % MILESTONE_NAME_STEMS.length];
    const name = i <= MILESTONE_NAME_STEMS.length ? stem : `${stem} ${Math.ceil(i / MILESTONE_NAME_STEMS.length)}`;
    const statuses = ['DONE', 'IN_PROGRESS', 'AT_RISK', 'NOT_STARTED'];
    const status = statuses[i % 4];
    const targetMonth = 3 + (i % 10);
    const targetYear = 2026;
    const targetDate = buildDate(targetYear, targetMonth, 1 + (i % 25));
    const completedDate =
      status === 'DONE' ? buildDate(targetYear, targetMonth, Math.max(1, (i % 28) - 2)) : '';
    const percentComplete = status === 'DONE' ? 100 : [0, 25, 50, 75][i % 4];
    milestones.push({
      id: `m-${i}`,
      projectId: project.id,
      projectName: project.name,
      name,
      owner: project.owner,
      status,
      quarter: project.quarter,
      targetDate,
      completedDate,
      percentComplete,
      summary: `Milestone ${i} for ${project.name}: ${name}.`,
    });
  }
  return milestones;
}

let cached = null;
export function getMilestones() {
  if (!cached) cached = buildMilestones();
  return cached;
}
