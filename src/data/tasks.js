/**
 * Generated tasks (100). Ids t-1..t-100.
 * One task per milestone; referentially consistent with milestones and projects.
 */

import { getMilestones } from './milestones.js';

const TASK_NAME_STEMS = [
  'Requirements review',
  'Implementation',
  'QA and testing',
  'Documentation',
  'Stakeholder sign-off',
  'Deployment prep',
  'Security review',
  'Performance tuning',
];

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'DEFERRED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function buildDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function buildTasks() {
  const milestones = getMilestones();
  const tasks = [];
  for (let i = 1; i <= 100; i++) {
    const milestoneIndex = (i - 1) % milestones.length;
    const milestone = milestones[milestoneIndex];
    const stem = TASK_NAME_STEMS[(i - 1) % TASK_NAME_STEMS.length];
    const name =
      i <= TASK_NAME_STEMS.length ? stem : `${stem} ${Math.ceil(i / TASK_NAME_STEMS.length)}`;
    const status = STATUSES[i % 4];
    const dueMonth = 4 + (i % 9);
    const dueYear = 2026;
    const dueDate = buildDate(dueYear, dueMonth, 1 + (i % 28));
    const percentComplete = status === 'DONE' ? 100 : status === 'NOT_STARTED' ? 0 : 25 + (i % 4) * 25;
    tasks.push({
      id: `t-${i}`,
      name,
      milestoneId: milestone.id,
      projectId: milestone.projectId,
      projectName: milestone.projectName,
      status,
      owner: milestone.owner,
      dueDate,
      percentComplete,
      priority: PRIORITIES[i % 4],
    });
  }
  return tasks;
}

let cached = null;
export function getTasks() {
  if (!cached) cached = buildTasks();
  return cached;
}
