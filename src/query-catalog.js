import { defineQueryCatalog } from '@reporting/core';

const initiativeFieldShape = {
  id: { type: 'string' },
  portfolio: { type: 'string' },
  program: { type: 'string' },
  name: { type: 'string' },
  owner: { type: 'string' },
  sponsor: { type: 'string' },
  phase: { type: 'string' },
  status: { type: 'string' },
  health: { type: 'string' },
  spendPlanned: { type: 'number' },
  spendActual: { type: 'number' },
  forecastValue: { type: 'number' },
  confidence: { type: 'number' },
  score: { type: 'number' },
  completionPercent: { type: 'number' },
  strategicTheme: { type: 'string' },
  startDate: { type: 'date' },
  endDate: { type: 'date' },
  summary: { type: 'string' },
};

const initiativeParamShape = {
  portfolio: { type: 'string', optional: true },
  program: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  phase: { type: 'string', optional: true },
  status: { type: 'string', optional: true },
  health: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  startFrom: { type: 'date', optional: true },
  startTo: { type: 'date', optional: true },
  endFrom: { type: 'date', optional: true },
  endTo: { type: 'date', optional: true },
  scoreFrom: { type: 'number', optional: true },
  scoreTo: { type: 'number', optional: true },
};

const roadmapFieldShape = {
  id: { type: 'string' },
  initiativeId: { type: 'string' },
  initiativeName: { type: 'string' },
  portfolio: { type: 'string' },
  program: { type: 'string' },
  workstream: { type: 'string' },
  stage: { type: 'string' },
  name: { type: 'string' },
  owner: { type: 'string' },
  status: { type: 'string' },
  health: { type: 'string' },
  completionPercent: { type: 'number' },
  dependencyRisk: { type: 'number' },
  startDate: { type: 'date' },
  endDate: { type: 'date' },
  milestoneDate: { type: 'date' },
  narrative: { type: 'string' },
};

const roadmapParamShape = {
  portfolio: { type: 'string', optional: true },
  program: { type: 'string', optional: true },
  initiativeId: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  workstream: { type: 'string', optional: true },
  stage: { type: 'string', optional: true },
  status: { type: 'string', optional: true },
  health: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  startFrom: { type: 'date', optional: true },
  startTo: { type: 'date', optional: true },
  endFrom: { type: 'date', optional: true },
  endTo: { type: 'date', optional: true },
  dependencyRiskFrom: { type: 'number', optional: true },
  dependencyRiskTo: { type: 'number', optional: true },
};

const workItemFieldShape = {
  id: { type: 'string' },
  initiativeId: { type: 'string' },
  initiativeName: { type: 'string' },
  roadmapItemId: { type: 'string' },
  portfolio: { type: 'string' },
  workstream: { type: 'string' },
  name: { type: 'string' },
  owner: { type: 'string' },
  status: { type: 'string' },
  readiness: { type: 'string' },
  priority: { type: 'string' },
  effortPoints: { type: 'number' },
  blockedPoints: { type: 'number' },
  completionPercent: { type: 'number' },
  targetDate: { type: 'date' },
  completedDate: { type: 'string' },
};

const workItemParamShape = {
  portfolio: { type: 'string', optional: true },
  initiativeId: { type: 'string', optional: true },
  roadmapItemId: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  workstream: { type: 'string', optional: true },
  status: { type: 'string', optional: true },
  readiness: { type: 'string', optional: true },
  priority: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  targetFrom: { type: 'date', optional: true },
  targetTo: { type: 'date', optional: true },
};

const riskFieldShape = {
  id: { type: 'string' },
  initiativeId: { type: 'string' },
  initiativeName: { type: 'string' },
  portfolio: { type: 'string' },
  program: { type: 'string' },
  title: { type: 'string' },
  category: { type: 'string' },
  severity: { type: 'string' },
  status: { type: 'string' },
  owner: { type: 'string' },
  exposure: { type: 'number' },
  likelihood: { type: 'number' },
  impact: { type: 'number' },
  mitigationStage: { type: 'string' },
  raisedDate: { type: 'date' },
  reviewDate: { type: 'date' },
};

const riskParamShape = {
  portfolio: { type: 'string', optional: true },
  program: { type: 'string', optional: true },
  initiativeId: { type: 'string', optional: true },
  severity: { type: 'string', optional: true },
  status: { type: 'string', optional: true },
  owner: { type: 'string', optional: true },
  category: { type: 'string', optional: true },
  search: { type: 'string', optional: true },
  exposureFrom: { type: 'number', optional: true },
  exposureTo: { type: 'number', optional: true },
  raisedFrom: { type: 'date', optional: true },
  raisedTo: { type: 'date', optional: true },
};

const initiativeSummaryFieldShape = {
  period: { type: 'string' },
  count: { type: 'number' },
  spendActualTotal: { type: 'number' },
  forecastValueTotal: { type: 'number' },
  avgCompletionPercent: { type: 'number' },
  avgConfidence: { type: 'number' },
  trendScore: { type: 'number' },
};

const workItemSummaryFieldShape = {
  period: { type: 'string' },
  count: { type: 'number' },
  readyCount: { type: 'number' },
  blockedPointsTotal: { type: 'number' },
  avgCompletionPercent: { type: 'number' },
  trendPercentComplete: { type: 'number' },
};

const riskSummaryFieldShape = {
  period: { type: 'string' },
  count: { type: 'number' },
  openExposure: { type: 'number' },
  criticalCount: { type: 'number' },
  trendExposure: { type: 'number' },
};

const queryCatalog = defineQueryCatalog([
  {
    name: 'initiatives',
    description:
      'Browse strategic initiatives across portfolios and programs. Returns one row per initiative with spend, confidence, score, schedule window, health, and executive summary fields.',
    fieldShape: initiativeFieldShape,
    paramShape: initiativeParamShape,
    notes:
      'Use for executive tables and card views. Set delivery.mode = "paginatedList" for browsing. Use scoreFrom/scoreTo for portfolio signal filtering and explicit start/end date params for schedule windows.',
  },
  {
    name: 'initiativesVisual',
    description:
      'Full initiative dataset for charts, timeline-style comparisons, and raw KPI aggregation without pagination.',
    fieldShape: initiativeFieldShape,
    paramShape: initiativeParamShape,
    notes:
      'Use delivery.mode = "fullVisual" for charts and raw KPI aggregation. Prefer this over initiatives when the DSL needs all filtered rows at once.',
  },
  {
    name: 'initiativesSummary',
    description:
      'Initiative KPI summary rows with totals for spend/value and overall portfolio health metrics plus trend data.',
    fieldShape: initiativeSummaryFieldShape,
    paramShape: initiativeParamShape,
    notes:
      'Use delivery.mode = "summary" for initiative KPI widgets. Use valueKey "count", "spendActualTotal", "forecastValueTotal", "avgCompletionPercent", or "avgConfidence" instead of relying on synthetic row counts.',
  },
  {
    name: 'roadmapItems',
    description:
      'Browse roadmap items tied to initiatives, with workstream, stage, health, dependency risk, milestone date, and schedule window fields.',
    fieldShape: roadmapFieldShape,
    paramShape: roadmapParamShape,
    notes:
      'Use for detailed roadmap tables and grouped delivery views with delivery.mode = "paginatedList". Group by initiativeName or workstream when the user wants nested schedule context.',
  },
  {
    name: 'roadmapVisual',
    description:
      'Full roadmap dataset for timelineView, ganttChart, and schedule-oriented visualizations.',
    fieldShape: roadmapFieldShape,
    paramShape: roadmapParamShape,
    notes:
      'Use delivery.mode = "fullVisual" for timelineView, ganttChart, and charts that compare roadmap timing or dependency risk across all matching rows.',
  },
  {
    name: 'workItems',
    description:
      'Browse operational work items with readiness, priority, effort points, blocked points, completion, and due/completed dates.',
    fieldShape: workItemFieldShape,
    paramShape: workItemParamShape,
    notes:
      'Use delivery.mode = "paginatedList" for operations tables. Good for drill-down tables and readiness tracking.',
  },
  {
    name: 'workItemsVisual',
    description:
      'Full work item dataset for readiness/funnel charts and raw KPI aggregations.',
    fieldShape: workItemFieldShape,
    paramShape: workItemParamShape,
    notes:
      'Use delivery.mode = "fullVisual" for pie, funnel, and raw completion/blocker calculations across all filtered work items.',
  },
  {
    name: 'workItemsSummary',
    description:
      'Work item summary rows with count, ready count, blocked points total, average completion, and completion trend.',
    fieldShape: workItemSummaryFieldShape,
    paramShape: workItemParamShape,
    notes:
      'Use delivery.mode = "summary" for operational KPIs that should stay aligned with filtered work item sets.',
  },
  {
    name: 'risks',
    description:
      'Browse initiative risks with severity, exposure, mitigation stage, and review cadence.',
    fieldShape: riskFieldShape,
    paramShape: riskParamShape,
    notes:
      'Use delivery.mode = "paginatedList" for risk registers and investigation tables.',
  },
  {
    name: 'risksVisual',
    description:
      'Full risk dataset for stacked, scatter, and categorical risk visualizations.',
    fieldShape: riskFieldShape,
    paramShape: riskParamShape,
    notes:
      'Use delivery.mode = "fullVisual" for charts that need the complete risk set or scatter-style correlation views.',
  },
  {
    name: 'risksSummary',
    description:
      'Risk KPI summary rows with total count, open exposure, critical count, and exposure trend.',
    fieldShape: riskSummaryFieldShape,
    paramShape: riskParamShape,
    notes:
      'Use delivery.mode = "summary" for risk KPIs. openExposure reflects the exposure total for non-closed risks only.',
  },
]);

export function getQueryCatalog() {
  return queryCatalog;
}
