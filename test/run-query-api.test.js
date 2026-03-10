import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

describe('POST /api/runQuery', () => {
  /** @type {import('http').Server} */
  let server;
  /** @type {string} */
  let baseUrl;

  before(() => {
    return new Promise((resolve) => {
      const app = createApp();
      server = app.listen(0, () => {
        const a = server.address();
        baseUrl = `http://127.0.0.1:${a.port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  async function runQuery(body) {
    const res = await fetch(`${baseUrl}/api/runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  it('returns 400 for invalid filter/param key (e.g. projectStatus instead of status)', async () => {
    const { status, data } = await runQuery({
      name: 'projects',
      params: { projectStatus: 'AT_RISK' },
    });
    assert.equal(status, 400);
    assert.ok(data.error?.includes('Invalid filter/param'));
    assert.ok(data.error?.includes('projectStatus'));
    assert.ok(data.error?.includes('Allowed params'));
    assert.ok(data.error?.includes('status'));
  });

  it('returns 400 for unknown query name', async () => {
    const { status, data } = await runQuery({
      name: 'unknown-query',
      params: {},
    });
    assert.equal(status, 400);
    assert.ok(data.error?.includes('Unknown query'));
  });

  it('returns 200 when using allowed params', async () => {
    const { status, data } = await runQuery({
      name: 'projects',
      params: { status: 'AT_RISK' },
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 5 },
    });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.data));
  });

  it('returns pagination with totalCount and totalPages for paginated queries', async () => {
    const { status, data } = await runQuery({
      name: 'projects',
      params: {},
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 5 },
    });
    assert.equal(status, 200);
    assert.equal(data.kind, 'rows');
    assert.ok(Array.isArray(data.data));
    assert.ok(data.pagination, 'response includes pagination');
    assert.equal(typeof data.pagination.page, 'number');
    assert.equal(typeof data.pagination.pageSize, 'number');
    assert.equal(typeof data.pagination.totalCount, 'number');
    assert.equal(typeof data.pagination.totalPages, 'number');
    assert.equal(data.pagination.totalPages, Math.ceil(data.pagination.totalCount / data.pagination.pageSize) || 1);
    assert.equal(data.pagination.hasMore, data.pagination.page < data.pagination.totalPages);
  });

  it('returns rows envelopes for summary queries without pagination metadata', async () => {
    const { status, data } = await runQuery({
      name: 'projectsSummary',
      params: { status: 'AT_RISK' },
      execution: { deliveryMode: 'summary' },
    });

    assert.equal(status, 200);
    assert.equal(data.kind, 'rows');
    assert.ok(Array.isArray(data.data));
    assert.equal(typeof data.data[0]?.count, 'number');
    assert.equal(data.pagination, undefined);
  });

  it('returns limitExceeded metadata for oversized full visuals', async () => {
    const { status, data } = await runQuery({
      name: 'projectsVisual',
      params: {},
      execution: { deliveryMode: 'fullVisual', maxRows: 10 },
    });

    assert.equal(status, 200);
    assert.equal(data.kind, 'limitExceeded');
    assert.equal(typeof data.totalCount, 'number');
    assert.equal(data.limit, 10);
  });
});
