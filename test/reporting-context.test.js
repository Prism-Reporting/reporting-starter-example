import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStarterReportingContextProvider } from '../src/reporting-context.js';

describe('starter reporting context provider', () => {
  it('returns base context with query catalog metadata', async () => {
    const provider = createStarterReportingContextProvider();
    const context = await provider.getBaseContext();

    assert.equal(context.source, 'reporting-starter-example');
    assert.deepEqual(
      context.queries.map((query) => query.name),
      ['projects', 'milestones']
    );
    assert.ok(context.queries.find((query) => query.name === 'projects')?.fields?.includes('name'));
  });

  it('returns semantic grounding for aliases, examples, and hints', async () => {
    const provider = createStarterReportingContextProvider();
    const semantic = await provider.getSemanticContext();

    assert.ok(Array.isArray(semantic.queryAliases));
    assert.ok(
      semantic.queryAliases.some(
        (entry) => entry.queryName === 'projects' && entry.alias === 'project list'
      )
    );
    assert.ok(
      semantic.fieldAliases.some(
        (entry) =>
          entry.queryName === 'projects' &&
          entry.fieldKey === 'percentComplete' &&
          entry.alias === '% complete'
      )
    );
    assert.ok(
      semantic.examples.some((entry) => entry.title === 'Simple project report')
    );
    assert.ok(
      semantic.clarificationHints.some((entry) => entry.hint.includes('"_count"'))
    );
  });
});
