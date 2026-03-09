/**
 * Starter reporting context — the one place to add optional grounding for your dataset.
 *
 * Defines what the agent and MCP know about the dataset beyond raw query execution.
 *
 * Contract (aligned with reporting MCP / @reporting/core when used):
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
 *
 * This module implements a simple local provider: base context from the query catalog,
 * optional static semantic context (no RAG, no retrieval).
 */

import { getQueryCatalog } from './query-catalog.js';

const SOURCE = 'reporting-starter-example';

/**
 * Creates the starter reporting context provider. Base context is derived from
 * getQueryCatalog(); semantic context is an optional static object (examples/hints).
 *
 * @returns {{ getBaseContext: (input?: unknown) => Promise<{ source: string, tenantId?: undefined, queries: Array<{ name: string, description?: string, fields?: string[], params?: string[], notes?: string }> }>, getSemanticContext: (input?: unknown) => Promise<{ queryAliases?: unknown[], fieldAliases?: unknown[], examples?: unknown[], clarificationHints?: unknown[] } | null> }}
 */
export function createStarterReportingContextProvider() {
  return {
    async getBaseContext(/* input */) {
      const { queries } = getQueryCatalog();
      return {
        source: SOURCE,
        tenantId: undefined,
        queries,
      };
    },

    async getSemanticContext(/* input */) {
      return getStarterSemanticContext();
    },
  };
}

/**
 * Lightweight static semantic context: examples and hints for the agent.
 * No RAG or retrieval; validation remains driven by base query metadata.
 */
function getStarterSemanticContext() {
  return {
    queryAliases: [
      { queryName: 'projects', alias: 'project list' },
      { queryName: 'projects', alias: 'portfolio projects' },
      { queryName: 'projects', alias: 'project portfolio' },
      { queryName: 'milestones', alias: 'delivery milestones' },
      { queryName: 'milestones', alias: 'project milestones' },
    ],
    fieldAliases: [
      { queryName: 'projects', fieldKey: 'name', alias: 'project' },
      { queryName: 'projects', fieldKey: 'name', alias: 'project name' },
      { queryName: 'projects', fieldKey: 'owner', alias: 'project owner' },
      { queryName: 'projects', fieldKey: 'status', alias: 'project status' },
      { queryName: 'projects', fieldKey: 'percentComplete', alias: '% complete' },
      { queryName: 'projects', fieldKey: 'percentComplete', alias: 'completion' },
      { queryName: 'projects', fieldKey: 'percentComplete', alias: 'progress' },
      { queryName: 'projects', fieldKey: 'timelineStatus', alias: 'timeline' },
      { queryName: 'projects', fieldKey: 'budgetStatus', alias: 'budget health' },
      { queryName: 'projects', fieldKey: 'budgetVariance', alias: 'budget variance' },
      { queryName: 'projects', fieldKey: 'endDate', alias: 'end date' },
      { queryName: 'projects', fieldKey: 'endDate', alias: 'finish date' },
      { queryName: 'projects', fieldKey: 'endDate', alias: 'due date' },
      { queryName: 'milestones', fieldKey: 'projectName', alias: 'project' },
      { queryName: 'milestones', fieldKey: 'projectName', alias: 'project name' },
      { queryName: 'milestones', fieldKey: 'name', alias: 'milestone' },
      { queryName: 'milestones', fieldKey: 'targetDate', alias: 'target date' },
      { queryName: 'milestones', fieldKey: 'targetDate', alias: 'due date' },
      { queryName: 'milestones', fieldKey: 'percentComplete', alias: '% complete' },
    ],
    examples: [
      {
        prompt: 'Create a simple project report',
        title: 'Simple project report',
        description:
          'Use the projects query with a KPI valueKey of _count and a table with name, owner, status, percentComplete, and endDate.',
      },
      {
        prompt: 'Show me projects ending in Q2 2026',
        title: 'Q2 2026 projects',
        description: 'Use projects query with endFrom/endTo or quarter param (e.g. 2026-Q2).',
      },
      {
        prompt: 'Milestones grouped by project',
        title: 'Milestones by project',
        description: 'Use milestones query with groupByKey: projectName.',
      },
      {
        prompt: 'Projects at risk',
        title: 'Projects at risk',
        description: 'Use projects query with params.status = AT_RISK.',
      },
    ],
    clarificationHints: [
      {
        hint: 'Use KPI valueKey "_count" when the user wants the total number of rows returned by a query.',
      },
      {
        hint: 'For project reports, the canonical fields are name, owner, status, percentComplete, timelineStatus, budgetStatus, budgetVariance, startDate, endDate, and executiveSummary.',
      },
      {
        hint: 'Project statuses use ON_TRACK, AT_RISK, BLOCKED, and COMPLETE. Milestone statuses use NOT_STARTED, IN_PROGRESS, AT_RISK, and DONE.',
      },
      {
        hint: 'For date ranges, prefer explicit endFrom/endTo or targetFrom/targetTo; quarter is a shorthand.',
      },
      {
        hint: 'Use groupByKey when the user asks for data grouped by a dimension (e.g. by project).',
      },
      {
        hint: 'In report filters, paramKey must exactly match one of the query Params (e.g. status, owner). Use status not projectStatus for project status; the API only accepts the catalog param names.',
      },
    ],
  };
}
