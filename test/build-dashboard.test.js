import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDynamicSystemMessage,
  buildModelMessages,
  buildSystemPrompt,
  getValidationContext,
} from '../src/agent/build-dashboard.js';
import { portfolioQuarterlyOverviewSpec } from '../src/report-spec.js';

describe('starter agent grounding', () => {
  it('builds validation context from provider-backed base metadata', async () => {
    const context = await getValidationContext();

    assert.ok(context.availableQueries.includes('projects'));
    assert.ok(context.availableQueries.includes('projectsSummary'));
    assert.ok(context.availableQueries.includes('projectsVisual'));
    assert.ok(context.availableQueries.includes('milestonesProgressSummary'));
    assert.ok(context.availableFields.projects.includes('name'));
    assert.ok(context.availableFields.projectsSummary.includes('count'));
    assert.ok(context.availableFields.projects.includes('budgetVariance'));
    assert.equal(context.availableFields.projects.includes('_count'), false);
  });

  it('keeps the static system prompt focused on the DSL guide and dataset context', async () => {
    const systemPrompt = await buildSystemPrompt({
      prompt:
        'Simplify this to one KPI and one project table with owner, status, % complete, and end date.',
      currentSpec: portfolioQuarterlyOverviewSpec,
      messages: [{ role: 'user', content: 'Keep only project-level data.' }],
    });

    assert.match(systemPrompt, /Report DSL guide:/);
    assert.match(systemPrompt, /Authoring rules/);
    assert.match(systemPrompt, /Dataset query cards:/);
    assert.match(systemPrompt, /- tasks:/);
    assert.match(systemPrompt, /Field aliases:/);
    assert.match(systemPrompt, /Prefer summary queries for totals and aggregate KPIs/);
    assert.doesNotMatch(systemPrompt, /validate_report_spec/);
    assert.match(systemPrompt, /call `apply_report_dls` with the complete report spec/i);
    assert.doesNotMatch(systemPrompt, /Keep only project-level data\./);
    assert.doesNotMatch(systemPrompt, /Simplify this to one KPI/);
    assert.doesNotMatch(systemPrompt, /Title: Portfolio Quarterly Overview/);
  });

  it('builds a dynamic system message for the active report', () => {
    const dynamicSystemMessage = buildDynamicSystemMessage({
      currentSpec: portfolioQuarterlyOverviewSpec,
    });

    assert.match(dynamicSystemMessage, /currently viewing the report described below/i);
    assert.match(dynamicSystemMessage, /Title: Portfolio Quarterly Overview/);
    assert.match(dynamicSystemMessage, /projectsSummary/);
    assert.match(dynamicSystemMessage, /Value: count/);
  });

  it('orders model messages as history, dynamic system context, then the newest user prompt', () => {
    const modelMessages = buildModelMessages({
      prompt:
        'Simplify this to one KPI and one project table with owner, status, % complete, and end date.',
      currentSpec: portfolioQuarterlyOverviewSpec,
      messages: [
        { role: 'user', content: 'Keep only project-level data.' },
        { role: 'assistant', content: 'I can do that.' },
        {
          role: 'user',
          content:
            'Simplify this to one KPI and one project table with owner, status, % complete, and end date.',
        },
      ],
    });

    assert.deepEqual(
      modelMessages.map((message) => message.role),
      ['user', 'assistant', 'system', 'user']
    );
    assert.equal(modelMessages.at(-1)?.content, modelMessages.at(-1)?.content?.trim());
    assert.equal(
      modelMessages.at(-1)?.content,
      'Simplify this to one KPI and one project table with owner, status, % complete, and end date.'
    );
    assert.match(modelMessages.at(-2)?.content ?? '', /Portfolio Quarterly Overview/);
  });
});
