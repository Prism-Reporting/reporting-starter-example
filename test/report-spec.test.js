import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReport, validateReportSpec } from '@prism-reporting/core';
import { createPortfolioDataProvider } from '../src/data-provider.js';
import { starterReports } from '../src/report-spec.js';
import { getValidationContext } from '../src/agent/build-dashboard.js';

describe('starter report specs', () => {
  it('validate and dry-run successfully', async () => {
    const validationContext = await getValidationContext();

    assert.equal(starterReports.length, 6);

    for (const report of starterReports) {
      const validation = validateReportSpec(report.spec, validationContext);
      assert.equal(
        validation.valid,
        true,
        `${report.id} should validate: ${validation.errors?.join('; ')}`
      );

      const resolved = await resolveReport(report.spec, createPortfolioDataProvider());
      assert.equal(
        resolved.queries?.some((query) => query.limitExceeded),
        false,
        `${report.id} should dry-run without limitExceeded`
      );
    }
  });

  it('covers the newer showcase widget types', () => {
    const widgetTypes = new Set(
      starterReports.flatMap((report) => report.spec.widgets.map((widget) => widget.type))
    );

    assert.ok(widgetTypes.has('spiralChart'));
    assert.ok(widgetTypes.has('bubbleChart'));
    assert.ok(widgetTypes.has('timelineView'));
    assert.ok(widgetTypes.has('ganttChart'));
  });

  it('continues covering advanced table, layout, and scoping patterns', () => {
    const allSpecs = starterReports.map((report) => report.spec);
    const allWidgets = allSpecs.flatMap((report) => report.widgets);
    const tables = allWidgets.filter((widget) => widget.type === 'table');
    const cardViews = allWidgets.filter((widget) => widget.type === 'cardView');

    assert.ok(allSpecs.some((report) => Array.isArray(report.tabs) && report.tabs.length > 0));
    assert.ok(
      allSpecs.some((report) => Array.isArray(report.sections) && report.sections.length > 0)
    );
    assert.ok(allSpecs.some((report) => Array.isArray(report.groups) && report.groups.length > 0));
    assert.ok(
      allSpecs.some((report) => Array.isArray(report.presets) && report.presets.length > 0)
    );
    assert.ok(
      tables.some((widget) => widget.config?.groupAggregations?.length && widget.config?.drillDown)
    );
    assert.ok(tables.some((widget) => widget.config?.summary?.length));
    assert.ok(tables.some((widget) => widget.config?.conditionalFormatting?.length));
    assert.ok(cardViews.some((widget) => widget.config?.conditionalFormatting?.length));
  });

  it('includes raw KPI aggregation examples', () => {
    const aggregatedKpis = starterReports.flatMap((report) =>
      report.spec.widgets.filter((widget) => widget.type === 'kpi' && widget.config?.aggregation)
    );

    assert.ok(aggregatedKpis.length >= 2);
    assert.ok(aggregatedKpis.some((widget) => widget.config.aggregation.op === 'sum'));
    assert.ok(aggregatedKpis.some((widget) => widget.config.aggregation.op === 'avg'));
  });
});
