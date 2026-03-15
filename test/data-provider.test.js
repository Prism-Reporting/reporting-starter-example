import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContractEnforcedDataProvider } from '@reporting/core';
import { createPortfolioDataProvider } from '../src/data-provider.js';
import { getQueryCatalog } from '../src/query-catalog.js';
import { getInitiatives } from '../src/data/initiatives.js';
import { getRoadmapItems } from '../src/data/roadmap-items.js';
import { getWorkItems } from '../src/data/work-items.js';
import { getRisks } from '../src/data/risks.js';

function getRows(result) {
  assert.equal(result?.kind, 'rows');
  return result?.data ?? [];
}

describe('portfolio data provider', () => {
  it('returns the hand-authored initiative dataset', () => {
    const rows = getInitiatives();
    assert.equal(rows.length, 8);
    assert.equal(rows[0].id, 'init-aurora');
    assert.equal(rows.at(-1)?.id, 'init-harbor');
  });

  it('filters initiatives by portfolio, health, and score window', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = getRows(
      await provider.runQuery({
        name: 'initiatives',
        params: {
          portfolio: 'Growth',
          health: 'GREEN,AMBER',
          scoreFrom: 80,
          scoreTo: 95,
        },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.equal(row.portfolio, 'Growth');
      assert.ok(['GREEN', 'AMBER'].includes(row.health));
      assert.ok(row.score >= 80 && row.score <= 95);
    });
  });

  it('paginates initiatives with totalCount metadata', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 3 });
    const result = await provider.runQuery({
      name: 'initiatives',
      params: {},
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 3 },
    });

    const rows = getRows(result);
    assert.equal(rows.length, 3);
    assert.equal(result.pagination?.pageSize, 3);
    assert.equal(typeof result.pagination?.totalCount, 'number');
  });

  it('returns roadmap items that are ready for timeline and gantt views', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = getRows(
      await provider.runQuery({
        name: 'roadmapVisual',
        params: { program: 'Operations Core', startFrom: '2026-01-01', startTo: '2026-05-31' },
        execution: { deliveryMode: 'fullVisual', maxRows: 200 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.equal(row.program, 'Operations Core');
      assert.ok(row.startDate >= '2026-01-01' && row.startDate <= '2026-05-31');
      assert.ok(row.endDate >= row.startDate);
    });
  });

  it('filters work items by readiness and target window', async () => {
    const provider = createPortfolioDataProvider({ page: 1, pageSize: 20 });
    const rows = getRows(
      await provider.runQuery({
        name: 'workItems',
        params: { readiness: 'BLOCKED', targetFrom: '2026-04-01', targetTo: '2026-05-31' },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.equal(row.readiness, 'BLOCKED');
      assert.ok(row.targetDate >= '2026-04-01' && row.targetDate <= '2026-05-31');
    });
  });

  it('returns summary rows for work item KPIs', async () => {
    const provider = createPortfolioDataProvider();
    const rows = getRows(
      await provider.runQuery({
        name: 'workItemsSummary',
        params: { portfolio: 'Platform' },
        execution: { deliveryMode: 'summary' },
      })
    );

    assert.ok(rows.length >= 1);
    assert.equal(typeof rows[0].count, 'number');
    assert.equal(typeof rows[0].readyCount, 'number');
    assert.equal(typeof rows[0].blockedPointsTotal, 'number');
    assert.equal(typeof rows[0].trendPercentComplete, 'number');
  });

  it('filters risks by severity and exposure range', async () => {
    const provider = createPortfolioDataProvider();
    const rows = getRows(
      await provider.runQuery({
        name: 'risks',
        params: { severity: 'CRITICAL,HIGH', exposureFrom: 70, exposureTo: 100 },
        execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 20 },
      })
    );

    assert.ok(rows.length >= 1);
    rows.forEach((row) => {
      assert.ok(['CRITICAL', 'HIGH'].includes(row.severity));
      assert.ok(row.exposure >= 70 && row.exposure <= 100);
    });
  });

  it('returns summary rows for risk KPIs', async () => {
    const provider = createPortfolioDataProvider();
    const rows = getRows(
      await provider.runQuery({
        name: 'risksSummary',
        params: { portfolio: 'Trust' },
        execution: { deliveryMode: 'summary' },
      })
    );

    assert.ok(rows.length >= 1);
    assert.equal(typeof rows[0].openExposure, 'number');
    assert.equal(typeof rows[0].criticalCount, 'number');
    assert.equal(typeof rows[0].trendExposure, 'number');
  });

  it('returns limitExceeded metadata for oversized full visuals', async () => {
    const provider = createPortfolioDataProvider();
    const result = await provider.runQuery({
      name: 'roadmapVisual',
      params: {},
      execution: { deliveryMode: 'fullVisual', maxRows: 5 },
    });

    assert.equal(result.kind, 'limitExceeded');
    assert.equal(result.limit, 5);
    assert.equal(typeof result.totalCount, 'number');
  });

  it('infers catalog fields and params from the query contracts', () => {
    const { queries } = getQueryCatalog();
    const initiativeSummary = queries.find((query) => query.name === 'initiativesSummary');

    assert.deepEqual(initiativeSummary.fields, [
      'period',
      'count',
      'spendActualTotal',
      'forecastValueTotal',
      'avgCompletionPercent',
      'avgConfidence',
      'trendScore',
    ]);
    assert.ok(initiativeSummary.params.includes('scoreFrom'));
    assert.ok(initiativeSummary.fieldShape);
    assert.ok(initiativeSummary.paramShape);
  });

  it('rejects provider rows that violate the query contract', async () => {
    const provider = createContractEnforcedDataProvider(getQueryCatalog().queries, {
      async runQuery() {
        return {
          kind: 'rows',
          data: [
            {
              period: 'overall',
              count: '8',
              spendActualTotal: 1,
              forecastValueTotal: 1,
              avgCompletionPercent: 1,
              avgConfidence: 1,
              trendScore: 1,
            },
          ],
        };
      },
    });

    await assert.rejects(
      () =>
        provider.runQuery({
          name: 'initiativesSummary',
          params: {},
          execution: { deliveryMode: 'summary' },
        }),
      /expected "number"/
    );
  });

  it('keeps the source datasets internally consistent', () => {
    assert.equal(
      getRoadmapItems().every((row) => row.initiativeId && row.startDate && row.endDate),
      true
    );
    assert.equal(
      getWorkItems().every((row) => row.roadmapItemId && row.targetDate),
      true
    );
    assert.equal(
      getRisks().every((row) => row.initiativeId && typeof row.exposure === 'number'),
      true
    );
  });

  it('returns an empty array for unknown queries', async () => {
    const provider = createPortfolioDataProvider();
    const rows = getRows(await provider.runQuery({ name: 'unknown-query', params: {} }));
    assert.deepEqual(rows, []);
  });
});
