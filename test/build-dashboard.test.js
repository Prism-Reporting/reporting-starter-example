import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSystemPrompt,
  getValidationContext,
  selectRelevantReportingContext,
} from '../src/agent/build-dashboard.js';
import { createStarterReportingContextProvider } from '../src/reporting-context.js';
import { portfolioQuarterlyOverviewSpec } from '../src/report-spec.js';

describe('starter agent grounding', () => {
  it('builds validation context from provider-backed base metadata', async () => {
    const context = await getValidationContext();

    assert.deepEqual(context.availableQueries, ['projects', 'milestones']);
    assert.ok(context.availableFields.projects.includes('name'));
    assert.ok(context.availableFields.projects.includes('budgetVariance'));
    assert.equal(context.availableFields.projects.includes('_count'), false);
  });

  it('selects relevant aliases for a simple project report request', async () => {
    const provider = createStarterReportingContextProvider();
    const baseContext = await provider.getBaseContext();
    const semanticContext = await provider.getSemanticContext();

    const selection = selectRelevantReportingContext({
      prompt:
        'Create a simple project report with total projects, project name, owner, status, % complete, and end date.',
      baseContext,
      semanticContext,
      currentSpec: portfolioQuarterlyOverviewSpec,
    });

    assert.ok(selection.selectedQueries.some((query) => query.name === 'projects'));
    assert.ok(
      selection.semanticContext.fieldAliases.some(
        (alias) => alias.queryName === 'projects' && alias.fieldKey === 'name'
      )
    );
    assert.ok(
      selection.semanticContext.fieldAliases.some(
        (alias) =>
          alias.queryName === 'projects' && alias.fieldKey === 'percentComplete'
      )
    );
  });

  it('includes compact grounding and current report details in the system prompt', async () => {
    const systemPrompt = await buildSystemPrompt({
      prompt:
        'Simplify this to one KPI and one project table with owner, status, % complete, and end date.',
      currentSpec: portfolioQuarterlyOverviewSpec,
      messages: [{ role: 'user', content: 'Keep only project-level data.' }],
    });

    assert.match(systemPrompt, /Dataset query cards:/);
    assert.match(systemPrompt, /Field aliases:/);
    assert.match(systemPrompt, /KPI rule: use "_count" only as a KPI valueKey/);
    assert.match(systemPrompt, /Title: Portfolio Quarterly Overview/);
    assert.match(systemPrompt, /project name/);
  });
});
