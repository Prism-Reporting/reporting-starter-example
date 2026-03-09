# Reporting Starter Example

**Connect your data and generate reports from prompts.** This is a **starter example** for wiring a simple dataset to the reporting platform: define queries, implement the data layer, and optionally add lightweight grounding—no premium features, OSS only.

The app uses a **portfolio** (projects and milestones) as the **example dataset**. You can replace it by editing the query catalog, the data provider, and optionally the reporting context—see [Connecting your own dataset](#connecting-your-own-dataset).

Built on [@reporting/core](https://github.com/Prism-Reporting/reporting) and [@reporting/react-ui](https://github.com/Prism-Reporting/reporting). It demonstrates prompt-to-spec flow with a local reporting context provider and the built-in MCP server.

## Why this example exists

- No external credentials are required.
- The business vocabulary is simple: projects, milestones, owners, budgets, timelines, and risk.
- It is the recommended fallback example when explaining the reporting platform to new users.

## Scenario

Northstar Delivery Group is running several initiatives in parallel. An executive opens the app and asks questions like:

- `show projects at risk in 2026-Q2`
- `milestones grouped by project for Ava Patel`
- `portfolio overview for the quarter with blocked work`

The app responds with a `ReportSpec` grounded in the published query catalog, then renders the result with the shared reporting UI.

## Connecting your own dataset

This starter uses **no premium features**: the agent uses the built-in MCP server and the local reporting context provider. To connect your data:

1. **Define queries in the query catalog** — Edit `src/query-catalog.js`. Export a single function (e.g. `getQueryCatalog()`) that returns `{ queries: QueryEntry[] }`. Each entry has `name`, `description`, `fields`, `params`, and optional `notes`. The catalog is the single source of truth for what the agent and MCP know about available queries.

2. **Implement the data layer** — Implement or adjust the logic so `runQuery(name, params)` returns rows for those names. The server’s `POST /api/runQuery` uses this layer. Query names must match the catalog. The main place to implement this is `src/data-provider.js`; see the comment block at the top for the contract.

3. **Optional: starter context and grounding** — If your dataset needs lightweight grounding (aliases, examples, clarification hints), add or edit `src/reporting-context.js`. The starter reporting context provider supplies base context (from the query catalog) and optional semantic context to both the agent and MCP.

4. **Run the app** — Restart (or run) the app. The agent and UI use the same context, catalog, and data. No extra services are required for the default setup.

## Data layer

To connect your own dataset, implement or replace the logic in `src/data-provider.js` that resolves query `name` and `params` to rows, and ensure query names match the catalog in `src/query-catalog.js`. See the comment block at the top of `src/data-provider.js` for the contract.

## Queries

The mocked data provider publishes two queries:

- `projects` for initiative-level reporting
- `milestones` for delivery checkpoint reporting

Both queries support lightweight filtering and pagination through `POST /api/runQuery`.

## Prompt-driven report generation

`POST /api/chat` uses a server-side OpenAI agent and the reporting MCP server to generate or update reports from natural language. The agent reads the reporting DSL guide and schema, the local query catalog, drafts a `ReportSpec`, and validates via MCP. To enable it, copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The app still works without it for the curated starter dashboards.

## Prerequisites

- Node.js >= 18
- The sibling `reporting` repo checked out and buildable (when using the default `file:../reporting/packages/...` layout)

## Environment

Copy `.env.example` to `.env` and set at least:

- **`OPENAI_API_KEY`** (required) — Needed for prompt-driven report generation (`POST /api/chat`). The app still runs without it for curated starter dashboards and direct query calls.

Optional:

- **`OPENAI_MODEL`** — Model for the report-generation agent (default: `gpt-4o-mini`).
- **`REPORTING_MCP_URL`** — Override when using a remote reporting MCP server. Omit for the default in-process MCP.

## Install

```bash
npm install
```

This installs dependencies and links the reporting packages (e.g. `@reporting/mcp-server`) from the sibling repo when using `file:../reporting/packages/...`.

## Build

```bash
npm run build
```

This builds the sibling `reporting` packages (including the MCP server) and the local Vite client bundle. Run this at least once so the linked `@reporting/mcp-server` has a built `dist/`.

## Run

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000). The reporting MCP server runs **in-process**; no separate MCP process is required. The agent and UI use the same local reporting context provider and query catalog.

## Development

```bash
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Tests

```bash
npm test
```

The test suite uses only mocked data and injected dependencies. It does not call OpenAI or any external API.
