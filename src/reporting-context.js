/**
 * Starter reporting context — the one place to add optional grounding for your dataset.
 *
 * Defines what the agent and MCP know about the dataset beyond raw query execution.
 *
 * Contract (aligned with reporting MCP / @prism-reporting/core when used):
 *
 * Required:
 * - getBaseContext(input?) -> Promise<BaseContext>
 *   BaseContext: { source?: string, tenantId?: string, queries: QueryCatalogEntry[] }
 *   Each QueryCatalogEntry: { name, description?, fields?, params?, notes? }
 *
 * Optional:
 * - getSemanticContext(input?) -> Promise<SemanticContext | null>
 *   SemanticContext: { queryAliases?, fieldAliases?, examples?, clarificationHints? }
 *   Used for lightweight grounding (examples, notes). Must not redefine validation rules;
 *   validation is driven by base query metadata only.
 */

import { getQueryCatalog } from './query-catalog.js';

const SOURCE = 'reporting-starter-example';

export function createStarterReportingContextProvider() {
  return {
    async getBaseContext() {
      const { queries } = getQueryCatalog();
      return {
        source: SOURCE,
        tenantId: undefined,
        queries,
      };
    },

    async getSemanticContext() {
      return {
        queryAliases: [
          { queryName: 'initiatives', alias: 'initiative list' },
          { queryName: 'initiatives', alias: 'program portfolio' },
          { queryName: 'roadmapItems', alias: 'delivery roadmap' },
          { queryName: 'roadmapItems', alias: 'schedule detail' },
          { queryName: 'workItems', alias: 'operations backlog' },
          { queryName: 'risks', alias: 'risk register' },
        ],
        fieldAliases: [
          { queryName: 'initiatives', fieldKey: 'name', alias: 'initiative name' },
          { queryName: 'initiatives', fieldKey: 'completionPercent', alias: '% complete' },
          { queryName: 'initiatives', fieldKey: 'completionPercent', alias: 'progress' },
          { queryName: 'initiatives', fieldKey: 'health', alias: 'program health' },
          { queryName: 'initiatives', fieldKey: 'score', alias: 'signal score' },
          { queryName: 'initiatives', fieldKey: 'forecastValue', alias: 'value' },
          { queryName: 'roadmapItems', fieldKey: 'milestoneDate', alias: 'milestone' },
          { queryName: 'roadmapItems', fieldKey: 'workstream', alias: 'lane' },
          { queryName: 'roadmapItems', fieldKey: 'dependencyRisk', alias: 'dependency score' },
          { queryName: 'workItems', fieldKey: 'readiness', alias: 'delivery readiness' },
          { queryName: 'workItems', fieldKey: 'blockedPoints', alias: 'blocked effort' },
          { queryName: 'risks', fieldKey: 'exposure', alias: 'risk exposure' },
          { queryName: 'risks', fieldKey: 'reviewDate', alias: 'next review' },
        ],
        examples: [
          {
            prompt: 'Build an executive portfolio report',
            title: 'Executive command center',
            description:
              'Use initiativesSummary for count and health KPIs, initiatives for detailed cards, and initiativesVisual or risksVisual for charts.',
          },
          {
            prompt: 'Show me a delivery timeline for Operations Core',
            title: 'Timeline studio',
            description:
              'Use roadmapVisual with timelineView or ganttChart and filter by program plus explicit start/end window params.',
          },
          {
            prompt: 'Create an operations deep dive with grouped tables',
            title: 'Operations deep dive',
            description:
              'Use workItemsVisual for grouped raw tables with groupAggregations and roadmapVisual for summary tables.',
          },
          {
            prompt: 'Review risks and readiness together',
            title: 'Risk and readiness review',
            description:
              'Use risksSummary for KPI totals, risksVisual for categorical charts, and workItemsVisual/workItemsSummary for readiness funnel and operational KPIs.',
          },
        ],
        clarificationHints: [
          {
            hint: 'This starter now has 6 curated reports: Executive Command Center, Delivery Timeline Studio, Portfolio Signal Map, Operations Deep Dive, Risk And Readiness Review, and Program Narrative Board.',
          },
          {
            hint: 'Use delivery.mode = "paginatedList" for browsing tables and card views, "fullVisual" for charts, timelineView, ganttChart, and raw KPI aggregation, and "summary" for backend KPI rows.',
          },
          {
            hint: 'Prefer summary queries when they already expose the business metric you need. Use fullVisual data only when you truly need raw rows for charting or aggregation inside the DSL.',
          },
          {
            hint: 'For initiatives, the key executive fields are portfolio, program, owner, phase, status, health, spendActual, forecastValue, confidence, score, completionPercent, startDate, endDate, and summary.',
          },
          {
            hint: 'For timeline and gantt examples, use roadmapVisual with startDate and endDate. milestoneDate is useful for trend charts and roadmap milestone tables.',
          },
          {
            hint: 'For advanced operations tables, workItemsVisual supports grouping by workstream and summarizing blockedPoints, completionPercent, and row counts.',
          },
          {
            hint: 'Use scoreFrom/scoreTo for initiative signal ranges and exposureFrom/exposureTo for risk exposure ranges. Filter keys must exactly match the query params from the catalog.',
          },
        ],
      };
    },
  };
}
