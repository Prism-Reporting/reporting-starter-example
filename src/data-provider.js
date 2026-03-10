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
import { getProjects } from './data/projects.js';
import { getMilestones } from './data/milestones.js';
import { getTasks } from './data/tasks.js';
import { getRisks } from './data/risks.js';

function withBudgetFields(project) {
  const budgetVariance = project.budgetActual - project.budgetPlanned;
  return {
    ...project,
    budgetVariance,
    budgetStatus: budgetVariance > 0 ? 'OVER_BUDGET' : 'ON_BUDGET',
  };
}

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

function matchesFieldSearch(value, searchValue) {
  if (!searchValue) return true;
  const query = String(searchValue).trim().toLowerCase();
  if (!query) return true;
  return String(value ?? '').toLowerCase().includes(query);
}

/** Parse param as single value or comma-separated list (multiSelect sends "val1,val2"). */
function parseMultiParam(value) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return value.length ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  return s.split(',').map((v) => v.trim()).filter(Boolean);
}

function matchesMultiParam(rowValue, paramValue) {
  const allowed = parseMultiParam(paramValue);
  if (!allowed || allowed.length === 0) return true;
  const row = rowValue == null ? '' : String(rowValue);
  return allowed.includes(row);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildDateString(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getBusinessQuarterRange(value) {
  const match = String(value ?? '').match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;

  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const starts = [
    { yearOffset: -1, month: 11 }, // Q1 = Dec-Feb
    { yearOffset: 0, month: 2 }, // Q2 = Mar-May
    { yearOffset: 0, month: 5 }, // Q3 = Jun-Aug
    { yearOffset: 0, month: 8 }, // Q4 = Sep-Nov
  ];
  const start = starts[quarter - 1];
  const startYear = year + start.yearOffset;
  const endMonth = (start.month + 2) % 12;
  const endYear = start.month + 2 >= 12 ? startYear + 1 : startYear;

  return {
    from: buildDateString(startYear, start.month, 1),
    to: buildDateString(endYear, endMonth, daysInMonth(endYear, endMonth)),
  };
}

function isWithinDate(dateValue, from, to) {
  if (!dateValue) return false;
  if (from && String(dateValue) < String(from)) return false;
  if (to && String(dateValue) > String(to)) return false;
  return true;
}

function slicePage(rows, page, pageSize) {
  if (!pageSize) return rows;
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
  return {
    kind: 'rows',
    data: rows,
    totalCount,
  };
}

function paginateRowsWithMeta(rows, execution = {}, fallbackPage = 1, fallbackPageSize = 20) {
  const { page, pageSize } = resolvePaging(execution, fallbackPage, fallbackPageSize);
  const totalCount = rows.length;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) || 1 : 1;
  const data = slicePage(rows, page, pageSize);
  return {
    kind: 'rows',
    data,
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
  if (rows.length > limit) {
    return buildLimitExceededResult(rows.length, limit);
  }
  return buildRowsResult(rows, rows.length);
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function averageNumeric(rows, key) {
  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildTrendRows(rows, dateKey, valueKey) {
  const buckets = new Map();

  for (const row of rows) {
    const dateValue = String(row[dateKey] ?? '');
    const value = Number(row[valueKey]);
    if (!dateValue || !Number.isFinite(value)) continue;

    const period = dateValue.slice(0, 7);
    const bucket = buckets.get(period) ?? { total: 0, count: 0 };
    bucket.total += value;
    bucket.count += 1;
    buckets.set(period, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-10)
    .map(([period, bucket]) => ({
      period,
      trendPercentComplete: roundToTwo(bucket.total / bucket.count),
    }));
}

function buildCountSummaryRows(rows, trendRows = []) {
  const count = rows.length;
  const firstTrendValue = trendRows[0]?.trendPercentComplete ?? 0;
  return [
    { period: 'overall', count, trendPercentComplete: firstTrendValue },
    ...trendRows.map((trend) => ({
      period: trend.period,
      count,
      trendPercentComplete: trend.trendPercentComplete,
    })),
  ];
}

function buildAverageProgressSummaryRows(rows, dateKey) {
  const avgPercentComplete = averageNumeric(rows, 'percentComplete');
  const trendRows = buildTrendRows(rows, dateKey, 'percentComplete');
  const firstTrendValue = trendRows[0]?.trendPercentComplete ?? avgPercentComplete;
  return [
    {
      period: 'overall',
      avgPercentComplete,
      trendPercentComplete: firstTrendValue,
    },
    ...trendRows.map((trend) => ({
      period: trend.period,
      avgPercentComplete,
      trendPercentComplete: trend.trendPercentComplete,
    })),
  ];
}

function withProjectDateParams(params = {}) {
  const quarterRange = getBusinessQuarterRange(params.quarter);
  return {
    ...params,
    endFrom: params.endFrom ?? quarterRange?.from,
    endTo: params.endTo ?? quarterRange?.to,
  };
}

function withMilestoneDateParams(params = {}) {
  const quarterRange = getBusinessQuarterRange(params.quarter);
  return {
    ...params,
    targetFrom: params.targetFrom ?? quarterRange?.from,
    targetTo: params.targetTo ?? quarterRange?.to,
  };
}

function filterProjects(params = {}) {
  const effectiveParams = withProjectDateParams(params);

  return getProjects().map(withBudgetFields)
    .filter((project) => matchesMultiParam(project.status, params.status))
    .filter((project) => matchesMultiParam(project.owner, params.owner))
    .filter((project) => matchesMultiParam(project.timelineStatus, params.timelineStatus))
    .filter((project) => matchesMultiParam(project.budgetStatus, params.budgetStatus))
    .filter((project) =>
      matchesSearch(project, params.search, ['name', 'owner', 'executiveSummary'])
    )
    .filter((project) => {
      if (!effectiveParams.endFrom && !effectiveParams.endTo) return true;
      return isWithinDate(project.endDate, effectiveParams.endFrom, effectiveParams.endTo);
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function filterMilestones(params = {}) {
  const effectiveParams = withMilestoneDateParams(params);

  return getMilestones().filter((milestone) => matchesMultiParam(milestone.status, params.status))
    .filter((milestone) => matchesMultiParam(milestone.owner, params.owner))
    .filter((milestone) => !params.projectId || milestone.projectId === params.projectId)
    .filter((milestone) => matchesFieldSearch(milestone.projectName, params.projectName))
    .filter((milestone) =>
      matchesSearch(milestone, params.search, ['projectName', 'name', 'owner', 'summary'])
    )
    .filter((milestone) => {
      if (!effectiveParams.targetFrom && !effectiveParams.targetTo) return true;
      return isWithinDate(
        milestone.targetDate,
        effectiveParams.targetFrom,
        effectiveParams.targetTo
      );
    })
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

function filterTasks(params = {}) {
  return getTasks()
    .filter((task) => matchesMultiParam(task.status, params.status))
    .filter((task) => matchesMultiParam(task.owner, params.owner))
    .filter((task) => !params.projectId || task.projectId === params.projectId)
    .filter((task) => !params.milestoneId || task.milestoneId === params.milestoneId)
    .filter((task) =>
      matchesSearch(task, params.search, ['name', 'projectName', 'owner'])
    )
    .filter((task) => {
      if (!params.dueFrom && !params.dueTo) return true;
      return isWithinDate(task.dueDate, params.dueFrom, params.dueTo);
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function filterRisks(params = {}) {
  return getRisks()
    .filter((risk) => matchesMultiParam(risk.status, params.status))
    .filter((risk) => matchesMultiParam(risk.owner, params.owner))
    .filter((risk) => !params.projectId || risk.projectId === params.projectId)
    .filter((risk) =>
      matchesSearch(risk, params.search, ['title', 'projectName', 'owner'])
    )
    .filter((risk) => {
      if (!params.raisedFrom && !params.raisedTo) return true;
      return isWithinDate(risk.raisedDate, params.raisedFrom, params.raisedTo);
    })
    .sort((a, b) => a.raisedDate.localeCompare(b.raisedDate));
}

export function createPortfolioDataProvider({ page = 1, pageSize = 20 } = {}) {
  const baseProvider = {
    async runQuery({ name, params = {}, execution = undefined }) {
      if (name === 'projects') {
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(filterProjects(params), execution, page, pageSize)
          : buildRowsResult(filterProjects(params));
      }
      if (name === 'projectsVisual') {
        return buildFullVisualResult(filterProjects(params), execution);
      }
      if (name === 'projectsSummary') {
        return buildRowsResult(buildCountSummaryRows(filterProjects(params)));
      }
      if (name === 'milestones') {
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(filterMilestones(params), execution, page, pageSize)
          : buildRowsResult(filterMilestones(params));
      }
      if (name === 'milestonesVisual') {
        return buildFullVisualResult(filterMilestones(params), execution);
      }
      if (name === 'milestonesSummary') {
        return buildRowsResult(buildCountSummaryRows(filterMilestones(params)));
      }
      if (name === 'milestonesProgressSummary') {
        return buildRowsResult(buildAverageProgressSummaryRows(filterMilestones(params), 'targetDate'));
      }
      if (name === 'tasks') {
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(filterTasks(params), execution, page, pageSize)
          : buildRowsResult(filterTasks(params));
      }
      if (name === 'tasksSummary') {
        const rows = filterTasks(params);
        return buildRowsResult(
          buildCountSummaryRows(
            rows,
            buildTrendRows(rows, 'dueDate', 'percentComplete')
          )
        );
      }
      if (name === 'risks') {
        return execution?.deliveryMode === 'paginatedList'
          ? paginateRowsWithMeta(filterRisks(params), execution, page, pageSize)
          : buildRowsResult(filterRisks(params));
      }
      if (name === 'risksSummary') {
        return buildRowsResult(buildCountSummaryRows(filterRisks(params)));
      }
      return buildRowsResult([]);
    },
  };

  return createContractEnforcedDataProvider(getQueryCatalog().queries, baseProvider);
}
