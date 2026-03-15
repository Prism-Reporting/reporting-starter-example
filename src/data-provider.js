/**
 * Data provider — the one place to add your data.
 *
 * Resolves query name + params to rows for the server’s POST /api/runQuery.
 * To connect your own dataset: implement or replace the logic in this file that resolves
 * `name` + `params` to rows. Query names must match the query catalog (query-catalog.js);
 * the catalog defines what queries exist and what fields/params they have, and the data
 * layer must handle those same names.
 */

import { createContractEnforcedDataProvider } from '@reporting/core';
import { getQueryCatalog } from './query-catalog.js';
import { getInitiatives } from './data/initiatives.js';
import { getRoadmapItems } from './data/roadmap-items.js';
import { getWorkItems } from './data/work-items.js';
import { getRisks } from './data/risks.js';

function matchesSearch(row, value, keys) {
  if (!value) return true;
  const query = String(value).trim().toLowerCase();
  if (!query) return true;
  return keys.some((key) =>
    String(row[key] ?? '')
      .toLowerCase()
      .includes(query)
  );
}

function parseMultiParam(value) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return value.length ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesMultiParam(rowValue, paramValue) {
  const allowed = parseMultiParam(paramValue);
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(String(rowValue ?? ''));
}

function matchesDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;
  if (from && String(value) < String(from)) return false;
  if (to && String(value) > String(to)) return false;
  return true;
}

function matchesNumberRange(value, from, to) {
  if (from == null && to == null) return true;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  if (from != null && numeric < Number(from)) return false;
  if (to != null && numeric > Number(to)) return false;
  return true;
}

function slicePage(rows, page, pageSize) {
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}

function resolvePaging(execution = {}, fallbackPage = 1, fallbackPageSize = 20) {
  return {
    page: Math.max(1, Number(execution.page) || fallbackPage),
    pageSize: Math.max(1, Number(execution.pageSize) || fallbackPageSize),
  };
}

function buildRowsResult(rows, totalCount = rows.length) {
  return { kind: 'rows', data: rows, totalCount };
}

function paginateRowsWithMeta(rows, execution = {}, fallbackPage = 1, fallbackPageSize = 20) {
  const { page, pageSize } = resolvePaging(execution, fallbackPage, fallbackPageSize);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  return {
    kind: 'rows',
    data: slicePage(rows, page, pageSize),
    totalCount,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

function buildLimitExceededResult(totalCount, limit) {
  return {
    kind: 'limitExceeded',
    totalCount,
    limit,
    message: `This visualization has ${totalCount} rows, which exceeds the maximum supported ${limit} rows. Narrow the filters or switch to an aggregated query.`,
  };
}

function buildFullVisualResult(rows, execution = {}) {
  const limit = Math.max(1, Number(execution.maxRows) || 1000);
  if (rows.length > limit) return buildLimitExceededResult(rows.length, limit);
  return buildRowsResult(rows);
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function sumNumeric(rows, key) {
  return roundToTwo(
    rows.reduce((sum, row) => sum + (Number.isFinite(Number(row[key])) ? Number(row[key]) : 0), 0)
  );
}

function averageNumeric(rows, key) {
  const values = rows.map((row) => Number(row[key])).filter(Number.isFinite);
  if (values.length === 0) return 0;
  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildTrendRows(rows, dateKey, valueBuilder) {
  const buckets = new Map();

  for (const row of rows) {
    const dateValue = String(row[dateKey] ?? '');
    if (!dateValue) continue;
    const period = dateValue.slice(0, 7);
    const bucket = buckets.get(period) ?? [];
    bucket.push(row);
    buckets.set(period, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, bucketRows]) => ({ period, value: roundToTwo(valueBuilder(bucketRows)) }));
}

function buildInitiativeSummaryRows(rows) {
  const overall = {
    period: 'overall',
    count: rows.length,
    spendActualTotal: sumNumeric(rows, 'spendActual'),
    forecastValueTotal: sumNumeric(rows, 'forecastValue'),
    avgCompletionPercent: averageNumeric(rows, 'completionPercent'),
    avgConfidence: averageNumeric(rows, 'confidence'),
    trendScore: averageNumeric(rows, 'score'),
  };
  const trendRows = buildTrendRows(rows, 'endDate', (bucketRows) => averageNumeric(bucketRows, 'score'));

  return [
    overall,
    ...trendRows.map((row) => ({
      period: row.period,
      count: rows.length,
      spendActualTotal: overall.spendActualTotal,
      forecastValueTotal: overall.forecastValueTotal,
      avgCompletionPercent: overall.avgCompletionPercent,
      avgConfidence: overall.avgConfidence,
      trendScore: row.value,
    })),
  ];
}

function buildWorkItemSummaryRows(rows) {
  const overall = {
    period: 'overall',
    count: rows.length,
    readyCount: rows.filter((row) => row.readiness === 'READY').length,
    blockedPointsTotal: sumNumeric(rows, 'blockedPoints'),
    avgCompletionPercent: averageNumeric(rows, 'completionPercent'),
    trendPercentComplete: averageNumeric(rows, 'completionPercent'),
  };
  const trendRows = buildTrendRows(
    rows,
    'targetDate',
    (bucketRows) => averageNumeric(bucketRows, 'completionPercent')
  );

  return [
    overall,
    ...trendRows.map((row) => ({
      period: row.period,
      count: overall.count,
      readyCount: overall.readyCount,
      blockedPointsTotal: overall.blockedPointsTotal,
      avgCompletionPercent: overall.avgCompletionPercent,
      trendPercentComplete: row.value,
    })),
  ];
}

function buildRiskSummaryRows(rows) {
  const openRows = rows.filter((row) => row.status !== 'CLOSED');
  const overall = {
    period: 'overall',
    count: rows.length,
    openExposure: sumNumeric(openRows, 'exposure'),
    criticalCount: rows.filter((row) => row.severity === 'CRITICAL').length,
    trendExposure: averageNumeric(openRows, 'exposure'),
  };
  const trendRows = buildTrendRows(
    rows,
    'raisedDate',
    (bucketRows) => averageNumeric(bucketRows.filter((row) => row.status !== 'CLOSED'), 'exposure')
  );

  return [
    overall,
    ...trendRows.map((row) => ({
      period: row.period,
      count: overall.count,
      openExposure: overall.openExposure,
      criticalCount: overall.criticalCount,
      trendExposure: row.value,
    })),
  ];
}

function filterInitiatives(params = {}) {
  return getInitiatives()
    .filter((row) => matchesMultiParam(row.portfolio, params.portfolio))
    .filter((row) => matchesMultiParam(row.program, params.program))
    .filter((row) => matchesMultiParam(row.owner, params.owner))
    .filter((row) => matchesMultiParam(row.phase, params.phase))
    .filter((row) => matchesMultiParam(row.status, params.status))
    .filter((row) => matchesMultiParam(row.health, params.health))
    .filter((row) =>
      matchesSearch(row, params.search, ['name', 'sponsor', 'strategicTheme', 'summary'])
    )
    .filter((row) => matchesDateRange(row.startDate, params.startFrom, params.startTo))
    .filter((row) => matchesDateRange(row.endDate, params.endFrom, params.endTo))
    .filter((row) => matchesNumberRange(row.score, params.scoreFrom, params.scoreTo))
    .sort((left, right) => left.endDate.localeCompare(right.endDate));
}

function filterRoadmapItems(params = {}) {
  return getRoadmapItems()
    .filter((row) => matchesMultiParam(row.portfolio, params.portfolio))
    .filter((row) => matchesMultiParam(row.program, params.program))
    .filter((row) => matchesMultiParam(row.initiativeId, params.initiativeId))
    .filter((row) => matchesMultiParam(row.owner, params.owner))
    .filter((row) => matchesMultiParam(row.workstream, params.workstream))
    .filter((row) => matchesMultiParam(row.stage, params.stage))
    .filter((row) => matchesMultiParam(row.status, params.status))
    .filter((row) => matchesMultiParam(row.health, params.health))
    .filter((row) =>
      matchesSearch(row, params.search, ['initiativeName', 'name', 'workstream', 'narrative'])
    )
    .filter((row) => matchesDateRange(row.startDate, params.startFrom, params.startTo))
    .filter((row) => matchesDateRange(row.endDate, params.endFrom, params.endTo))
    .filter((row) =>
      matchesNumberRange(row.dependencyRisk, params.dependencyRiskFrom, params.dependencyRiskTo)
    )
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function filterWorkItems(params = {}) {
  return getWorkItems()
    .filter((row) => matchesMultiParam(row.portfolio, params.portfolio))
    .filter((row) => matchesMultiParam(row.initiativeId, params.initiativeId))
    .filter((row) => matchesMultiParam(row.roadmapItemId, params.roadmapItemId))
    .filter((row) => matchesMultiParam(row.owner, params.owner))
    .filter((row) => matchesMultiParam(row.workstream, params.workstream))
    .filter((row) => matchesMultiParam(row.status, params.status))
    .filter((row) => matchesMultiParam(row.readiness, params.readiness))
    .filter((row) => matchesMultiParam(row.priority, params.priority))
    .filter((row) => matchesSearch(row, params.search, ['initiativeName', 'name', 'owner']))
    .filter((row) => matchesDateRange(row.targetDate, params.targetFrom, params.targetTo))
    .sort((left, right) => left.targetDate.localeCompare(right.targetDate));
}

function filterRisks(params = {}) {
  return getRisks()
    .filter((row) => matchesMultiParam(row.portfolio, params.portfolio))
    .filter((row) => matchesMultiParam(row.program, params.program))
    .filter((row) => matchesMultiParam(row.initiativeId, params.initiativeId))
    .filter((row) => matchesMultiParam(row.severity, params.severity))
    .filter((row) => matchesMultiParam(row.status, params.status))
    .filter((row) => matchesMultiParam(row.owner, params.owner))
    .filter((row) => matchesMultiParam(row.category, params.category))
    .filter((row) => matchesSearch(row, params.search, ['initiativeName', 'title', 'category']))
    .filter((row) => matchesNumberRange(row.exposure, params.exposureFrom, params.exposureTo))
    .filter((row) => matchesDateRange(row.raisedDate, params.raisedFrom, params.raisedTo))
    .sort((left, right) => right.exposure - left.exposure);
}

export function createPortfolioDataProvider({ page = 1, pageSize = 20 } = {}) {
  const baseProvider = {
    async runQuery({ name, params = {}, execution = undefined }) {
      if (name === 'initiatives') {
        const rows = filterInitiatives(params);
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(rows, execution, page, pageSize)
          : buildRowsResult(rows);
      }
      if (name === 'initiativesVisual') {
        return buildFullVisualResult(filterInitiatives(params), execution);
      }
      if (name === 'initiativesSummary') {
        return buildRowsResult(buildInitiativeSummaryRows(filterInitiatives(params)));
      }
      if (name === 'roadmapItems') {
        const rows = filterRoadmapItems(params);
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(rows, execution, page, pageSize)
          : buildRowsResult(rows);
      }
      if (name === 'roadmapVisual') {
        return buildFullVisualResult(filterRoadmapItems(params), execution);
      }
      if (name === 'workItems') {
        const rows = filterWorkItems(params);
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(rows, execution, page, pageSize)
          : buildRowsResult(rows);
      }
      if (name === 'workItemsVisual') {
        return buildFullVisualResult(filterWorkItems(params), execution);
      }
      if (name === 'workItemsSummary') {
        return buildRowsResult(buildWorkItemSummaryRows(filterWorkItems(params)));
      }
      if (name === 'risks') {
        const rows = filterRisks(params);
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(rows, execution, page, pageSize)
          : buildRowsResult(rows);
      }
      if (name === 'risksVisual') {
        return buildFullVisualResult(filterRisks(params), execution);
      }
      if (name === 'risksSummary') {
        return buildRowsResult(buildRiskSummaryRows(filterRisks(params)));
      }
      return buildRowsResult([]);
    },
  };

  return createContractEnforcedDataProvider(getQueryCatalog().queries, baseProvider);
}
