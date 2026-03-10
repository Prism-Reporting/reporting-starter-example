import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContractEnforcedDataProvider } from '@reporting/core';
import { createPortfolioDataProvider } from '../src/data-provider.js';
import { getQueryCatalog } from '../src/query-catalog.js';
import { getProjects } from '../src/data/projects.js';
import { getMilestones } from '../src/data/milestones.js';
import { getTasks } from '../src/data/tasks.js';
import { getRisks } from '../src/data/risks.js';

/** Rows results are always returned in the explicit query envelope. */
function getRows(result) {
  assert.equal(result?.kind, 'rows');
  return result?.data ?? [];
}

describe('portfolio data provider', () => {
  it('returns 100 projects from the data layer', async () => {
    const projects = getProjects();
    assert.equal(projects.length, 100);
    assert.equal(projects[0].id, 'p-1');
    assert.equal(projects[99].id, 'p-100');
  });

  it('maps 2026-Q2 to the Mar-May business quarter for projects', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 100 });
    const rows = getRows(
      await provider.runQuery({
        name: 'projects',
        params: { quarter: '2026-Q2' },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 100 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.ok(row.endDate >= '2026-03-01' && row.endDate <= '2026-05-31');
    });
  });

  it('paginates projects using page and pageSize with explicit date bounds', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 3 });
    const result = await provider.runQuery({
      name: 'projects',
      params: {
        endFrom: '2026-05-01',
        endTo: '2026-06-30',
      },
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 3 },
    });
    const rows = getRows(result);

    assert.equal(rows.length, 3);
    assert.equal(result.pagination?.pageSize, 3);
    assert.ok(result.pagination?.totalCount >= 3, 'totalCount is total matching rows');
    const sorted = [...rows].sort((a, b) => a.endDate.localeCompare(b.endDate));
    assert.deepEqual(rows.map((r) => r.endDate), sorted.map((r) => r.endDate));
  });

  it('filters projects by status and budgetStatus', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = getRows(
      await provider.runQuery({
        name: 'projects',
        params: {
          status: 'AT_RISK',
          budgetStatus: 'OVER_BUDGET',
        },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    rows.forEach((row) => {
      assert.equal(row.status, 'AT_RISK');
      assert.equal(row.budgetStatus, 'OVER_BUDGET');
    });
  });

  it('returns derived budget fields for projects so catalog and runtime stay aligned', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 1 });
    const [row] = getRows(
      await provider.runQuery({
        name: 'projects',
        params: {
          search: 'Customer Portal',
        },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 1 },
      })
    );

    assert.ok(row);
    assert.equal(typeof row.budgetVariance, 'number');
    assert.ok(['ON_BUDGET', 'OVER_BUDGET'].includes(row.budgetStatus));
  });

  it('maps 2026-Q2 to the Mar-May business quarter for milestones', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 50 });
    const rows = getRows(
      await provider.runQuery({
        name: 'milestones',
        params: { quarter: '2026-Q2' },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 50 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.ok(row.targetDate >= '2026-03-01' && row.targetDate <= '2026-05-31');
    });
  });

  it('filters milestones by project and target date range', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const milestones = getMilestones();
    const projectId = milestones[0].projectId;
    const targetFrom = '2026-03-01';
    const targetTo = '2026-06-30';
    const rows = getRows(
      await provider.runQuery({
        name: 'milestones',
        params: {
          projectId,
          targetFrom,
          targetTo,
        },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    assert.ok(Array.isArray(rows));
    rows.forEach((row) => {
      assert.equal(row.projectId, projectId);
      assert.ok(row.targetDate >= targetFrom && row.targetDate <= targetTo);
    });
  });

  it('filters milestones by grouped project name search', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const milestones = getMilestones();
    const projectName = milestones[0].projectName;
    const projectSearch = projectName.slice(0, 'Customer Portal'.length).toLowerCase();
    const rows = getRows(
      await provider.runQuery({
        name: 'milestones',
        params: {
          projectName: projectSearch,
        },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.ok(row.projectName.toLowerCase().includes(projectSearch));
    });
  });

  it('returns only display-friendly primitive milestone fields', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 1 });
    const [row] = getRows(
      await provider.runQuery({
        name: 'milestones',
        params: { projectId: 'p-1' },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 1 },
      })
    );

    assert.ok(row);
    assert.equal(typeof row.projectName, 'string');
    assert.equal(typeof row.name, 'string');
    assert.equal(typeof row.owner, 'string');
    assert.equal(typeof row.percentComplete, 'number');
    assert.ok(row.completedDate === '' || typeof row.completedDate === 'string');
  });

  it('returns 100 tasks and filters by projectId and status', async () => {
    const tasks = getTasks();
    assert.equal(tasks.length, 100);
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 10 });
    const rows = getRows(
      await provider.runQuery({
        name: 'tasks',
        params: { projectId: 'p-1', status: tasks[0].status },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 10 },
      })
    );
    assert.ok(Array.isArray(rows));
    rows.forEach((row) => {
      assert.equal(row.projectId, 'p-1');
      assert.equal(row.status, tasks[0].status);
      assert.ok(row.milestoneId);
      assert.ok(row.dueDate);
      assert.ok(row.priority);
    });
  });

  it('returns 100 risks and filters by projectId and raisedFrom/raisedTo', async () => {
    const risks = getRisks();
    assert.equal(risks.length, 100);
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 10 });
    const rows = getRows(
      await provider.runQuery({
        name: 'risks',
        params: { projectId: 'p-1', raisedFrom: '2025-01-01', raisedTo: '2026-12-31' },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 10 },
      })
    );
    assert.ok(Array.isArray(rows));
    rows.forEach((row) => {
      assert.equal(row.projectId, 'p-1');
      assert.ok(row.title);
      assert.ok(row.severity);
      assert.ok(row.raisedDate);
    });
  });

  it('returns an unpaginated full dataset for visual queries', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 5 });
    const rows = getRows(await provider.runQuery({
      name: 'projectsVisual',
      params: { status: 'AT_RISK' },
      execution: { deliveryMode: 'fullVisual', maxRows: 1000 },
    }));

    assert.ok(rows.length > 5);
    rows.forEach((row) => {
      assert.equal(row.status, 'AT_RISK');
    });
  });


  it('infers catalog fields and params from the framework-defined query contracts', () => {
    const { queries } = getQueryCatalog();
    const projectsSummary = queries.find((query) => query.name === 'projectsSummary');

    assert.deepEqual(projectsSummary.fields, ['period', 'count', 'trendPercentComplete']);
    assert.ok(projectsSummary.params.includes('status'));
    assert.ok(projectsSummary.fieldShape);
    assert.ok(projectsSummary.paramShape);
  });

  it('rejects provider rows that violate the framework-defined query contract', async () => {
    const provider = createContractEnforcedDataProvider(getQueryCatalog().queries, {
      async runQuery() {
        return {
          kind: 'rows',
          data: [{ period: 'overall', count: '100', trendPercentComplete: 42 }],
        };
      },
    });

    await assert.rejects(
      () => provider.runQuery({ name: 'projectsSummary', params: {}, execution: { deliveryMode: 'summary' } }),
      /expected "number"/
    );
  });
  it('returns KPI summary rows for task counts and trends', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 5 });
    const rows = getRows(await provider.runQuery({
      name: 'tasksSummary',
      params: { projectId: 'p-1' },
      execution: { deliveryMode: 'summary' },
    }));

    assert.ok(rows.length >= 1);
    assert.equal(typeof rows[0].count, 'number');
    assert.equal(rows[0].count >= 1, true);
    assert.equal(typeof rows[0].trendPercentComplete, 'number');
  });

  it('returns progress summary rows for milestone KPI trends', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 5 });
    const rows = getRows(await provider.runQuery({
      name: 'milestonesProgressSummary',
      params: { targetFrom: '2026-03-01', targetTo: '2026-06-30' },
      execution: { deliveryMode: 'summary' },
    }));

    assert.ok(rows.length >= 1);
    assert.equal(typeof rows[0].avgPercentComplete, 'number');
    assert.equal(typeof rows[0].trendPercentComplete, 'number');
  });

  it('returns limitExceeded metadata for oversized visual queries', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 5 });
    const result = await provider.runQuery({
      name: 'projectsVisual',
      params: {},
      execution: { deliveryMode: 'fullVisual', maxRows: 10 },
    });

    assert.equal(result.kind, 'limitExceeded');
    assert.equal(result.limit, 10);
    assert.equal(typeof result.totalCount, 'number');
  });

  it('returns an empty array for unknown queries', async () => {
    const provider = createPortfolioDataProvider();
    const rows = getRows(await provider.runQuery({ name: 'unknown-query', params: {} }));
    assert.deepEqual(rows, []);
  });
});
