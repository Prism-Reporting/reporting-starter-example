import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDynamicSystemMessage,
  buildModelMessages,
  buildSystemPrompt,
  getValidationContext,
} from '../src/agent/build-dashboard.js';
import { executiveCommandCenterSpec } from '../src/report-spec.js';

describe('starter agent grounding', () => {
  it('builds validation context from provider-backed base metadata', async () => {
    const context = await getValidationContext();

    assert.ok(context.availableQueries.includes('initiatives'));
    assert.ok(context.availableQueries.includes('initiativesSummary'));
    assert.ok(context.availableQueries.includes('roadmapVisual'));
    assert.ok(context.availableQueries.includes('workItemsSummary'));
    assert.ok(context.availableQueries.includes('risksSummary'));
    assert.ok(context.availableFields.initiatives.includes('name'));
    assert.ok(context.availableFields.initiatives.includes('score'));
    assert.ok(context.availableFields.initiativesSummary.includes('count'));
    assert.equal(context.availableFields.initiatives.includes('_count'), false);
  });

  it('keeps the static system prompt focused on the DSL guide and dataset context', async () => {
    const systemPrompt = await buildSystemPrompt({
      prompt: 'Simplify this to one KPI and one initiative table.',
      currentSpec: executiveCommandCenterSpec,
      messages: [{ role: 'user', content: 'Keep only executive metrics.' }],
    });

    assert.match(systemPrompt, /Report DSL guide:/);
    assert.match(systemPrompt, /Authoring rules/);
    assert.match(systemPrompt, /Dataset query cards:/);
    assert.match(systemPrompt, /- initiatives:/);
    assert.match(systemPrompt, /- roadmapItems:/);
    assert.match(systemPrompt, /Field aliases:/);
    assert.match(
      systemPrompt,
      /Use delivery\.mode = "paginatedList" for tables and browse-style card views/
    );
    assert.match(systemPrompt, /Conditional formatting is supported in the Report DSL/);
    assert.match(systemPrompt, /Table widgets support config\.conditionalFormatting/);
    assert.match(systemPrompt, /Do not claim conditional formatting is unsupported/);
    assert.doesNotMatch(systemPrompt, /validate_report_spec/);
    assert.match(systemPrompt, /call `apply_report_dls` with the complete report spec/i);
    assert.doesNotMatch(systemPrompt, /Simplify this to one KPI/);
    assert.doesNotMatch(systemPrompt, /Title: Executive Command Center/);
  });

  it('builds a dynamic system message for the active report', () => {
    const dynamicSystemMessage = buildDynamicSystemMessage({
      currentSpec: executiveCommandCenterSpec,
    });

    assert.match(dynamicSystemMessage, /currently viewing the report described below/i);
    assert.match(dynamicSystemMessage, /Title: Executive Command Center/);
    assert.match(dynamicSystemMessage, /initiativesVisual/);
    assert.match(dynamicSystemMessage, /Aggregate: sum\(spendActual\)/);
  });

  it('orders model messages as history, dynamic system context, then the newest user prompt', () => {
    const modelMessages = buildModelMessages({
      prompt: 'Simplify this to one KPI and one initiative table.',
      currentSpec: executiveCommandCenterSpec,
      messages: [
        { role: 'user', content: 'Keep only executive metrics.' },
        { role: 'assistant', content: 'I can do that.' },
        { role: 'user', content: 'Simplify this to one KPI and one initiative table.' },
      ],
    });

    assert.deepEqual(
      modelMessages.map((message) => message.role),
      ['user', 'assistant', 'system', 'user']
    );
    assert.equal(
      modelMessages.at(-1)?.content,
      'Simplify this to one KPI and one initiative table.'
    );
    assert.match(modelMessages.at(-2)?.content ?? '', /Executive Command Center/);
  });
});
