import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReport, validateReportSpec } from '@reporting/core';
import { createPortfolioDataProvider } from '../src/data-provider.js';
import { starterReports } from '../src/report-spec.js';
import { getValidationContext } from '../src/agent/build-dashboard.js';

describe('starter report specs', () => {
  it('validate and dry-run successfully', async () => {
    const validationContext = await getValidationContext();

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

  it('include starter coverage for the newly supported chart widgets', () => {
    const widgetTypes = new Set(
      starterReports.flatMap((report) => report.spec.widgets.map((widget) => widget.type))
    );

    assert.ok(widgetTypes.has('cardView'));
    assert.ok(widgetTypes.has('areaChart'));
    assert.ok(widgetTypes.has('pieChart'));
    assert.ok(widgetTypes.has('doughnutChart'));
    assert.ok(widgetTypes.has('funnelChart'));
    assert.ok(widgetTypes.has('scatterChart'));
  });

  it('include starter coverage for KPI aggregation examples', () => {
    const aggregatedKpis = starterReports.flatMap((report) =>
      report.spec.widgets.filter(
        (widget) => widget.type === 'kpi' && widget.config?.aggregation
      )
    );

    assert.ok(aggregatedKpis.length >= 3);
    assert.ok(
      aggregatedKpis.some((widget) => widget.config.aggregation.op === 'sum')
    );
    assert.ok(
      aggregatedKpis.some((widget) => widget.config.aggregation.op === 'avg')
    );
    assert.ok(
      aggregatedKpis.some((widget) => widget.config.aggregation.op === 'count')
    );
  });
});
