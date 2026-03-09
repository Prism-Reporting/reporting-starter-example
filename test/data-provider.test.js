import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioDataProvider } from '../src/data-provider.js';

describe('portfolio data provider', () => {
  it('maps 2026-Q2 to the Mar-May business quarter for projects', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = await provider.runQuery({
      name: 'projects',
      params: { quarter: '2026-Q2' },
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Revenue Forecasting Workspace');
    assert.equal(rows[0].endDate, '2026-05-18');
  });

  it('paginates projects using page and pageSize with explicit date bounds', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 3 });
    const rows = await provider.runQuery({
      name: 'projects',
      params: {
        endFrom: '2026-05-01',
        endTo: '2026-06-30',
      },
    });

    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.name),
      ['Revenue Forecasting Workspace', 'Field Service Mobile App', 'Customer Portal Refresh']
    );
  });

  it('filters projects by risk, budget, and search text', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = await provider.runQuery({
      name: 'projects',
      params: {
        endFrom: '2026-06-01',
        endTo: '2026-06-30',
        status: 'AT_RISK',
        budgetStatus: 'OVER_BUDGET',
        search: 'audit',
      },
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Compliance Automation');
    assert.equal(rows[0].owner, 'Zoe Martin');
    assert.equal(rows[0].budgetStatus, 'OVER_BUDGET');
  });

  it('returns derived budget fields for projects so catalog and runtime stay aligned', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 1 });
    const [row] = await provider.runQuery({
      name: 'projects',
      params: {
        search: 'Customer Portal Refresh',
      },
    });

    assert.equal(row.name, 'Customer Portal Refresh');
    assert.equal(row.budgetVariance, -19000);
    assert.equal(row.budgetStatus, 'ON_BUDGET');
  });

  it('maps 2026-Q2 to the Mar-May business quarter for milestones', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 50 });
    const rows = await provider.runQuery({
      name: 'milestones',
      params: { quarter: '2026-Q2' },
    });

    assert(rows.some((row) => row.name === 'Forecast model sign-off'));
    assert(rows.every((row) => row.targetDate >= '2026-03-01' && row.targetDate <= '2026-05-31'));
    assert(!rows.some((row) => row.name === 'Executive compliance review'));
  });

  it('filters milestones by project and target date range', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = await provider.runQuery({
      name: 'milestones',
      params: {
        projectId: 'p-101',
        targetFrom: '2026-05-01',
        targetTo: '2026-06-10',
      },
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.name),
      ['Integration test wave 1', 'Finance cutover rehearsal']
    );
  });

  it('returns only display-friendly primitive milestone fields', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 1 });
    const [row] = await provider.runQuery({
      name: 'milestones',
      params: { projectId: 'p-100' },
    });

    assert.equal(typeof row.projectName, 'string');
    assert.equal(typeof row.name, 'string');
    assert.equal(typeof row.owner, 'string');
    assert.equal(typeof row.percentComplete, 'number');
    assert.equal(row.completedDate, '2026-04-01');
  });

  it('returns an empty array for unknown queries', async () => {
    const provider = createPortfolioDataProvider();
    const rows = await provider.runQuery({ name: 'unknown-query', params: {} });
    assert.deepEqual(rows, []);
  });
});
