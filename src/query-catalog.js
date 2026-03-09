/**
 * Query catalog — the one place to add your queries.
 *
 * This file is the single source of truth for "what queries exist" and their metadata.
 * Add or edit entries here; ensure the data provider (data-provider.js) implements runQuery
 * for each query name.
 *
 * Contract. Each entry must have:
 * - name (string): canonical query name; must match the data layer (runQuery) and ReportSpec dataSources.query.
 * Optional:
 * - description (string): what the query returns.
 * - fields (string[]): field keys returned by the query (for validation and UI).
 * - params (string[]): parameter names the query accepts (e.g. status, endFrom, endTo).
 * - notes (string): hints for implementers or agent grounding.
 *
 * Query names in this catalog must match the names handled by the data provider (runQuery).
 */
export function getQueryCatalog() {
  return {
    queries: [
      {
        name: 'projects',
        description:
          'List portfolio projects for executive reporting. Returns one row per project with status, owner, quarter, percentComplete, budgetPlanned, budgetActual, budgetVariance, budgetStatus, timelineStatus, startDate, endDate, and executiveSummary.',
        fields: [
          'id',
          'name',
          'owner',
          'status',
          'quarter',
          'percentComplete',
          'budgetPlanned',
          'budgetActual',
          'budgetVariance',
          'budgetStatus',
          'timelineStatus',
          'startDate',
          'endDate',
          'executiveSummary',
        ],
        params: [
          'quarter',
          'endFrom',
          'endTo',
          'status',
          'owner',
          'timelineStatus',
          'budgetStatus',
          'search',
          'page',
          'pageSize',
        ],
        notes:
          'Use this query for portfolio-level tables and project counts. Filter projects by endDate. The portfolio example uses a business quarter calendar where 2026-Q2 means 2026-03-01 through 2026-05-31. Prefer explicit endFrom/endTo params in generated specs; quarter can be used as a shorthand alias.',
      },
      {
        name: 'milestones',
        description:
          'List project milestones for executive reporting. Returns one row per milestone with projectName, owner, status, quarter, targetDate, completedDate, percentComplete, and summary.',
        fields: [
          'id',
          'projectId',
          'projectName',
          'name',
          'owner',
          'status',
          'quarter',
          'targetDate',
          'completedDate',
          'percentComplete',
          'summary',
        ],
        params: [
          'quarter',
          'status',
          'owner',
          'projectId',
          'search',
          'targetFrom',
          'targetTo',
          'page',
          'pageSize',
        ],
        notes:
          'Use groupByKey: projectName when the user asks for milestones grouped by project. completedDate is blank for in-flight milestones. Filter milestones by targetDate. The portfolio example uses a business quarter calendar where 2026-Q2 means 2026-03-01 through 2026-05-31. Prefer explicit targetFrom/targetTo params in generated specs; quarter can be used as a shorthand alias.',
      },
    ],
  };
}
