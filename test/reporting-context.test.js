import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStarterReportingContextProvider } from '../src/reporting-context.js';

describe('starter reporting context provider', () => {
  it('returns base context with query catalog metadata', async () => {
    const provider = createStarterReportingContextProvider();
    const context = await provider.getBaseContext();

    assert.equal(context.source, 'reporting-starter-example');
    assert.ok(context.queries.some((query) => query.name === 'initiatives'));
    assert.ok(context.queries.some((query) => query.name === 'initiativesSummary'));
    assert.ok(context.queries.some((query) => query.name === 'roadmapVisual'));
    assert.ok(context.queries.some((query) => query.name === 'workItemsSummary'));
    assert.ok(
      context.queries.find((query) => query.name === 'initiatives')?.fields?.includes('name')
    );
  });

  it('returns semantic grounding for aliases, examples, and hints', async () => {
    const provider = createStarterReportingContextProvider();
    const semantic = await provider.getSemanticContext();

    assert.ok(Array.isArray(semantic.queryAliases));
    assert.ok(
      semantic.queryAliases.some(
        (entry) => entry.queryName === 'initiatives' && entry.alias === 'initiative list'
      )
    );
    assert.ok(
      semantic.fieldAliases.some(
        (entry) =>
          entry.queryName === 'initiatives' &&
          entry.fieldKey === 'completionPercent' &&
          entry.alias === '% complete'
      )
    );
    assert.ok(semantic.examples.some((entry) => entry.title === 'Executive command center'));
    assert.ok(
      semantic.clarificationHints.some((entry) => entry.hint.includes('6 curated reports'))
    );
  });
});
