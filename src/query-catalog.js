import { defineQueryCatalog } from '@prism-reporting/core';

function field(type, semantic = {}) {
  return {
    type,
    ...(Object.keys(semantic).length > 0 ? { semantic } : {}),
  };
}

function optionalParam(type, semantic = {}) {
  return {
    type,
    optional: true,
    ...(Object.keys(semantic).length > 0 ? { semantic } : {}),
  };
}

const idField = () => field('string', { kind: 'id', filterable: true, sortable: true });
const labelField = (exampleValues = undefined) =>
  field('string', {
    kind: 'label',
    filterable: true,
    sortable: true,
    preferredWidgetRoles: ['label', 'tooltip'],
    ...(exampleValues ? { exampleValues } : {}),
  });
const dimensionField = (exampleValues = undefined) =>
  field('string', {
    kind: 'dimension',
    groupable: true,
    filterable: true,
    sortable: true,
    preferredWidgetRoles: ['category', 'series', 'tooltip'],
    ...(exampleValues ? { exampleValues } : {}),
  });
const measureField = () =>
  field('number', {
    kind: 'measure',
    sortable: true,
    aggregatable: true,
    preferredWidgetRoles: ['value'],
  });
const timeField = () =>
  field('date', {
    kind: 'time',
    filterable: true,
    sortable: true,
    preferredWidgetRoles: ['time', 'category', 'tooltip'],
  });
const timeLikeField = () =>
  field('string', {
    kind: 'time',
    filterable: true,
    sortable: true,
    preferredWidgetRoles: ['time', 'tooltip'],
  });

const multiFilterParam = (mapsToField, exampleValues = undefined) =>
  optionalParam('string', {
    mapsToField,
    mode: 'multi',
    ...(exampleValues ? { exampleValues } : {}),
  });
const exactFilterParam = (mapsToField, exampleValues = undefined) =>
  optionalParam('string', {
    mapsToField,
    mode: 'exact',
    ...(exampleValues ? { exampleValues } : {}),
  });
const searchParam = () => optionalParam('string', { mode: 'search' });
const dateRangeFromParam = (mapsToField) => optionalParam('date', { mapsToField, mode: 'rangeFrom' });
const dateRangeToParam = (mapsToField) => optionalParam('date', { mapsToField, mode: 'rangeTo' });
const numberRangeFromParam = (mapsToField) =>
  optionalParam('number', { mapsToField, mode: 'rangeFrom' });
const numberRangeToParam = (mapsToField) => optionalParam('number', { mapsToField, mode: 'rangeTo' });

const initiativeFieldShape = {
  id: idField(),
  portfolio: dimensionField(),
  program: dimensionField(),
  name: labelField(),
  owner: dimensionField(),
  sponsor: dimensionField(),
  phase: dimensionField(['DISCOVERY', 'MOBILIZING', 'EXECUTION', 'SUSTAIN']),
  status: dimensionField(['ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETE']),
  health: dimensionField(['GREEN', 'AMBER', 'RED']),
  spendPlanned: measureField(),
  spendActual: measureField(),
  forecastValue: measureField(),
  confidence: measureField(),
  score: measureField(),
  completionPercent: measureField(),
  strategicTheme: dimensionField(),
  startDate: timeField(),
  endDate: timeField(),
  summary: labelField(),
};

const initiativeParamShape = {
  portfolio: multiFilterParam('portfolio'),
  program: multiFilterParam('program'),
  owner: multiFilterParam('owner'),
  phase: multiFilterParam('phase', ['DISCOVERY', 'MOBILIZING', 'EXECUTION', 'SUSTAIN']),
  status: multiFilterParam('status', ['ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETE']),
  health: multiFilterParam('health', ['GREEN', 'AMBER', 'RED']),
  search: searchParam(),
  startFrom: dateRangeFromParam('startDate'),
  startTo: dateRangeToParam('startDate'),
  endFrom: dateRangeFromParam('endDate'),
  endTo: dateRangeToParam('endDate'),
  scoreFrom: numberRangeFromParam('score'),
  scoreTo: numberRangeToParam('score'),
};

const roadmapFieldShape = {
  id: idField(),
  initiativeId: idField(),
  initiativeName: labelField(),
  portfolio: dimensionField(),
  program: dimensionField(),
  workstream: dimensionField(),
  stage: dimensionField(),
  name: labelField(),
  owner: dimensionField(),
  status: dimensionField(['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']),
  health: dimensionField(['GREEN', 'AMBER', 'RED']),
  completionPercent: measureField(),
  dependencyRisk: measureField(),
  startDate: timeField(),
  endDate: timeField(),
  milestoneDate: timeField(),
  narrative: labelField(),
};

const roadmapParamShape = {
  portfolio: multiFilterParam('portfolio'),
  program: multiFilterParam('program'),
  initiativeId: exactFilterParam('initiativeId'),
  owner: multiFilterParam('owner'),
  workstream: multiFilterParam('workstream'),
  stage: multiFilterParam('stage'),
  status: multiFilterParam('status', ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']),
  health: multiFilterParam('health', ['GREEN', 'AMBER', 'RED']),
  search: searchParam(),
  startFrom: dateRangeFromParam('startDate'),
  startTo: dateRangeToParam('startDate'),
  endFrom: dateRangeFromParam('endDate'),
  endTo: dateRangeToParam('endDate'),
  dependencyRiskFrom: numberRangeFromParam('dependencyRisk'),
  dependencyRiskTo: numberRangeToParam('dependencyRisk'),
};

const workItemFieldShape = {
  id: idField(),
  initiativeId: idField(),
  initiativeName: labelField(),
  roadmapItemId: idField(),
  portfolio: dimensionField(),
  workstream: dimensionField(),
  name: labelField(),
  owner: dimensionField(),
  status: dimensionField(['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']),
  readiness: dimensionField(['READY', 'WATCH', 'BLOCKED']),
  priority: dimensionField(['MEDIUM', 'HIGH', 'CRITICAL']),
  effortPoints: measureField(),
  blockedPoints: measureField(),
  completionPercent: measureField(),
  targetDate: timeField(),
  completedDate: timeLikeField(),
};

const workItemParamShape = {
  portfolio: multiFilterParam('portfolio'),
  initiativeId: exactFilterParam('initiativeId'),
  roadmapItemId: exactFilterParam('roadmapItemId'),
  owner: multiFilterParam('owner'),
  workstream: multiFilterParam('workstream'),
  status: multiFilterParam('status', ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']),
  readiness: multiFilterParam('readiness', ['READY', 'WATCH', 'BLOCKED']),
  priority: multiFilterParam('priority', ['MEDIUM', 'HIGH', 'CRITICAL']),
  search: searchParam(),
  targetFrom: dateRangeFromParam('targetDate'),
  targetTo: dateRangeToParam('targetDate'),
};

const riskFieldShape = {
  id: idField(),
  initiativeId: idField(),
  initiativeName: labelField(),
  portfolio: dimensionField(),
  program: dimensionField(),
  title: labelField(),
  category: dimensionField(),
  severity: dimensionField(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: dimensionField(['OPEN', 'MITIGATING', 'MONITORING', 'CLOSED']),
  owner: dimensionField(),
  exposure: measureField(),
  likelihood: measureField(),
  impact: measureField(),
  mitigationStage: dimensionField(['PLAN', 'EXECUTE', 'OBSERVE', 'DONE']),
  raisedDate: timeField(),
  reviewDate: timeField(),
};

const riskParamShape = {
  portfolio: multiFilterParam('portfolio'),
  program: multiFilterParam('program'),
  initiativeId: exactFilterParam('initiativeId'),
  severity: multiFilterParam('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: multiFilterParam('status', ['OPEN', 'MITIGATING', 'MONITORING', 'CLOSED']),
  owner: multiFilterParam('owner'),
  category: multiFilterParam('category'),
  search: searchParam(),
  exposureFrom: numberRangeFromParam('exposure'),
  exposureTo: numberRangeToParam('exposure'),
  raisedFrom: dateRangeFromParam('raisedDate'),
  raisedTo: dateRangeToParam('raisedDate'),
};

const initiativeSummaryFieldShape = {
  period: field('string', {
    kind: 'time',
    sortable: true,
    preferredWidgetRoles: ['time', 'category'],
  }),
  count: measureField(),
  spendActualTotal: measureField(),
  forecastValueTotal: measureField(),
  avgCompletionPercent: measureField(),
  avgConfidence: measureField(),
  trendScore: measureField(),
};

const workItemSummaryFieldShape = {
  period: field('string', {
    kind: 'time',
    sortable: true,
    preferredWidgetRoles: ['time', 'category'],
  }),
  count: measureField(),
  readyCount: measureField(),
  blockedPointsTotal: measureField(),
  avgCompletionPercent: measureField(),
  trendPercentComplete: measureField(),
};

const riskSummaryFieldShape = {
  period: field('string', {
    kind: 'time',
    sortable: true,
    preferredWidgetRoles: ['time', 'category'],
  }),
  count: measureField(),
  openExposure: measureField(),
  criticalCount: measureField(),
  trendExposure: measureField(),
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
