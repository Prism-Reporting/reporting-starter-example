import { defineQueryCatalog } from '@reporting/core';

const commonProjectFieldShape = {
  id: { type: 'string' },
  name: { type: 'string' },
  owner: { type: 'string' },
  status: { type: 'string' },
  quarter: { type: 'string' },
  percentComplete: { type: 'number' },
  budgetPlanned: { type: 'number' },
  budgetActual: { type: 'number' },
  budgetVariance: { type: 'number' },
  budgetStatus: { type: 'string' },
  timelineStatus: { type: 'string' },
  startDate: { type: 'date' },
  endDate: { type: 'date' },
  executiveSummary: { type: 'string' },
};

const commonProjectParamShape = {
  quarter: { type: 'string', optional: true },
  endFrom: { type: 'date', optional: true },
  endTo: { type: 'date', optional: true },
  status: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  timelineStatus: { type: 'string', optional: true },
  budgetStatus: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
};

const commonMilestoneFieldShape = {
  id: { type: 'string' },
  projectId: { type: 'string' },
  projectName: { type: 'string' },
  name: { type: 'string' },
  owner: { type: 'string' },
  status: { type: 'string' },
  quarter: { type: 'string' },
  targetDate: { type: 'date' },
  completedDate: { type: 'string' },
  percentComplete: { type: 'number' },
  summary: { type: 'string' },
};

const commonMilestoneParamShape = {
  quarter: { type: 'string', optional: true },
  status: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  projectId: { type: 'string', optional: true },
  projectName: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  targetFrom: { type: 'date', optional: true },
  targetTo: { type: 'date', optional: true },
};

const commonTaskFieldShape = {
  id: { type: 'string' },
  name: { type: 'string' },
  milestoneId: { type: 'string' },
  projectId: { type: 'string' },
  projectName: { type: 'string' },
  status: { type: 'string' },
  owner: { type: 'string' },
  dueDate: { type: 'date' },
  percentComplete: { type: 'number' },
  priority: { type: 'string' },
};

const commonTaskParamShape = {
  status: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  projectId: { type: 'string', optional: true },
  milestoneId: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  dueFrom: { type: 'date', optional: true },
  dueTo: { type: 'date', optional: true },
};

const commonRiskFieldShape = {
  id: { type: 'string' },
  projectId: { type: 'string' },
  projectName: { type: 'string' },
  title: { type: 'string' },
  severity: { type: 'string' },
  status: { type: 'string' },
  owner: { type: 'string' },
  raisedDate: { type: 'date' },
  mitigatedDate: { type: 'string' },
};

const commonRiskParamShape = {
  status: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  projectId: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  raisedFrom: { type: 'date', optional: true },
  raisedTo: { type: 'date', optional: true },
};

const countSummaryFieldShape = {
  period: { type: 'string' },
  count: { type: 'number' },
  trendPercentComplete: { type: 'number' },
};

const averageProgressSummaryFieldShape = {
  period: { type: 'string' },
  avgPercentComplete: { type: 'number' },
  trendPercentComplete: { type: 'number' },
};

const queryCatalog = defineQueryCatalog([
  {
    name: 'projects',
    description:
      'List portfolio projects for executive reporting. Returns one row per project with status, owner, quarter, percentComplete, budgetPlanned, budgetActual, budgetVariance, budgetStatus, timelineStatus, startDate, endDate, and executiveSummary.',
    fieldShape: commonProjectFieldShape,
    paramShape: commonProjectParamShape,
    notes:
      'Use this query for portfolio-level tables. Filter projects by endDate. In report specs set delivery.mode = "paginatedList" for table/list use. The portfolio example uses a business quarter calendar where 2026-Q2 means 2026-03-01 through 2026-05-31. Prefer explicit endFrom/endTo params in generated specs; quarter can be used as a shorthand alias.',
  },
  {
    name: 'projectsVisual',
    description:
      'Full filtered project dataset for charts and other non-table visualizations. Returns the same project-level rows as projects without pagination.',
    fieldShape: commonProjectFieldShape,
    paramShape: commonProjectParamShape,
    notes:
      'Use this query for charts and KPI widgets that aggregate raw project rows in the report DSL. It provides the full filtered project dataset without table pagination. In report specs set delivery.mode = "fullVisual".',
  },
  {
    name: 'projectsSummary',
    description:
      'Project KPI summary. Returns summary rows with count and optional trend metadata for filtered projects.',
    fieldShape: countSummaryFieldShape,
    paramShape: commonProjectParamShape,
    notes:
      'Use this query for project KPI widgets that should stay in sync with project filters. In report specs set delivery.mode = "summary". For the business total, use KPI valueKey "count"; reserved valueKey "_count" means the number of summary rows, not the business count field.',
  },
  {
    name: 'milestones',
    description:
      'List project milestones for executive reporting. Returns one row per milestone with projectName, owner, status, quarter, targetDate, completedDate, percentComplete, and summary.',
    fieldShape: commonMilestoneFieldShape,
    paramShape: commonMilestoneParamShape,
    notes:
      'Use groupByKey: projectName when the user asks for milestones grouped by project. completedDate is blank for in-flight milestones. Filter milestones by targetDate. In report specs set delivery.mode = "paginatedList" for milestone tables. The portfolio example uses a business quarter calendar where 2026-Q2 means 2026-03-01 through 2026-05-31. Prefer explicit targetFrom/targetTo params in generated specs; quarter can be used as a shorthand alias.',
  },
  {
    name: 'milestonesVisual',
    description:
      'Full filtered milestone dataset for charts and other non-table visualizations. Returns the same milestone rows as milestones without pagination.',
    fieldShape: commonMilestoneFieldShape,
    paramShape: commonMilestoneParamShape,
    notes:
      'Use this query for milestone charts and KPI widgets that aggregate raw milestone rows in the report DSL. It provides the full filtered result set without table pagination. In report specs set delivery.mode = "fullVisual".',
  },
  {
    name: 'milestonesSummary',
    description:
      'Milestone KPI summary. Returns summary rows with count and optional trend metadata for filtered milestones.',
    fieldShape: countSummaryFieldShape,
    paramShape: commonMilestoneParamShape,
    notes:
      'Use this query for milestone count KPIs when milestone tables are paginated. In report specs set delivery.mode = "summary".',
  },
  {
    name: 'milestonesProgressSummary',
    description:
      'Milestone progress KPI summary. Returns an overall average percent complete plus a monthly trend for filtered milestones.',
    fieldShape: averageProgressSummaryFieldShape,
    paramShape: commonMilestoneParamShape,
    notes:
      'Use this query for milestone progress KPIs with sparkline trends. In report specs set delivery.mode = "summary".',
  },
  {
    name: 'tasks',
    description:
      'List delivery tasks linked to milestones and projects. Returns one row per task with id, name, milestoneId, projectId, projectName, status, owner, dueDate, percentComplete, and priority.',
    fieldShape: commonTaskFieldShape,
    paramShape: commonTaskParamShape,
    notes:
      'Use for task lists and delivery tracking. Filter by dueDate with dueFrom/dueTo. In report specs set delivery.mode = "paginatedList" for tables. Tasks are linked to milestones (milestoneId) and projects (projectId, projectName).',
  },
  {
    name: 'tasksSummary',
    description:
      'Task KPI summary. Returns summary rows with count plus a monthly percent-complete trend for filtered tasks.',
    fieldShape: countSummaryFieldShape,
    paramShape: commonTaskParamShape,
    notes:
      'Use this query for task KPI widgets when task tables are paginated. In report specs set delivery.mode = "summary".',
  },
  {
    name: 'risks',
    description:
      'List project risks. Returns one row per risk with id, projectId, projectName, title, severity, status, owner, raisedDate, and mitigatedDate.',
    fieldShape: commonRiskFieldShape,
    paramShape: commonRiskParamShape,
    notes:
      'Use for risk registers and project risk views. Filter by raisedDate with raisedFrom/raisedTo. In report specs set delivery.mode = "paginatedList" for tables. mitigatedDate is blank for open or in-progress risks.',
  },
  {
    name: 'risksSummary',
    description:
      'Risk KPI summary. Returns summary rows with count and optional trend metadata for filtered risks.',
    fieldShape: countSummaryFieldShape,
    paramShape: commonRiskParamShape,
    notes:
      'Use this query for risk KPIs when risk tables are paginated. In report specs set delivery.mode = "summary".',
  },
]);

export function getQueryCatalog() {
  return queryCatalog;
}
