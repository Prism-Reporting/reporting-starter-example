import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

describe('POST /api/runQuery', () => {
  let server;
  let baseUrl;

  before(() => {
    return new Promise((resolve) => {
      const app = createApp();
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  async function runQuery(body) {
    const res = await fetch(`${baseUrl}/api/runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  it('returns 400 for invalid filter/param keys', async () => {
    const { status, data } = await runQuery({
      name: 'initiatives',
      params: { initiativeHealth: 'GREEN' },
    });
    assert.equal(status, 400);
    assert.ok(data.error?.includes('Invalid filter/param'));
    assert.ok(data.error?.includes('initiativeHealth'));
    assert.ok(data.error?.includes('Allowed params'));
    assert.ok(data.error?.includes('health'));
  });

  it('returns 400 for unknown query names', async () => {
    const { status, data } = await runQuery({
      name: 'unknown-query',
      params: {},
    });
    assert.equal(status, 400);
    assert.ok(data.error?.includes('Unknown query'));
  });

  it('returns 200 when using allowed params', async () => {
    const { status, data } = await runQuery({
      name: 'initiatives',
      params: { health: 'AMBER' },
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 5 },
    });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.data));
  });

  it('returns pagination metadata for paginated queries', async () => {
    const { status, data } = await runQuery({
      name: 'initiatives',
      params: {},
      execution: { deliveryMode: 'paginatedList', page: 1, pageSize: 5 },
    });
    assert.equal(status, 200);
    assert.equal(data.kind, 'rows');
    assert.ok(Array.isArray(data.data));
    assert.ok(data.pagination);
    assert.equal(typeof data.pagination.page, 'number');
    assert.equal(typeof data.pagination.totalCount, 'number');
  });

  it('returns rows envelopes for summary queries without pagination metadata', async () => {
    const { status, data } = await runQuery({
      name: 'initiativesSummary',
      params: { portfolio: 'Growth' },
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
      name: 'roadmapVisual',
      params: {},
      execution: { deliveryMode: 'fullVisual', maxRows: 5 },
    });

    assert.equal(status, 200);
    assert.equal(data.kind, 'limitExceeded');
    assert.equal(typeof data.totalCount, 'number');
    assert.equal(data.limit, 5);
  });
});
