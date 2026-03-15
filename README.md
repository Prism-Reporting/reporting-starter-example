# Reporting Starter Example

**Connect your data and generate reports from prompts.** This is a **starter example** for wiring a simple dataset to the reporting platform: define queries, implement the data layer, and optionally add lightweight grounding—no premium features, OSS only.

The app uses a **portfolio and program delivery** dataset as the **example domain**. It includes initiatives, roadmap items, work items, and risks so the starter can showcase timelines, signal maps, advanced tables, and executive narrative views. You can replace it by editing the query catalog, the data provider, and optionally the reporting context—see [Connecting your own dataset](#connecting-your-own-dataset).

Built on [@prism-reporting/core](https://github.com/Prism-Reporting/reporting), [@prism-reporting/react-ui](https://github.com/Prism-Reporting/reporting), and `@prism-reporting/agent-kit`. It demonstrates prompt-to-spec flow with a local reporting context provider, a local query catalog, a generated AgentSkills workflow, and server-side validation plus dry-run execution.

## Why this example exists

- No external credentials are required.
- The business vocabulary is still approachable, but rich enough to demonstrate most of the reporting DSL surface.
- It is the recommended fallback example when explaining the reporting platform to new users.

## Scenario

Northstar Delivery Group is running several initiatives in parallel. An executive opens the app and asks questions like:

- `show me the delivery timeline for Operations Core`
- `compare initiative value against spend and confidence`
- `review critical risks and blocked readiness work`

The app responds with a `ReportSpec` grounded in the published query catalog, then renders the result with the shared reporting UI.

## Connecting your own dataset

This starter uses **no premium features**: the agent uses the local reporting context provider, the local query catalog, the local data provider, and a generated local skill from `@prism-reporting/agent-kit`. To connect your data:

1. **Define queries in the query catalog** — Edit `src/query-catalog.js`. Export a single function (e.g. `getQueryCatalog()`) that returns `{ queries: QueryEntry[] }`. Each entry has `name`, `description`, `fields`, `params`, and optional `notes`. The catalog is the single source of truth for what the agent knows about available queries.

2. **Implement the data layer** — Implement or adjust the logic so `runQuery(name, params)` returns rows for those names. The server’s `POST /api/runQuery` uses this layer. Query names must match the catalog. The main place to implement this is `src/data-provider.js`; see the comment block at the top for the contract.

3. **Optional: starter context and grounding** — If your dataset needs lightweight grounding (aliases, examples, clarification hints), add or edit `src/reporting-context.js`. The starter reporting context provider supplies base context (from the query catalog) and optional semantic context to the agent.

4. **Run the app** — Restart (or run) the app. The agent and UI use the same context, catalog, and data. No extra services are required for the default setup.

## Data layer

To connect your own dataset, implement or replace the logic in `src/data-provider.js` that resolves query `name` and `params` to rows, and ensure query names match the catalog in `src/query-catalog.js`. See the comment block at the top of `src/data-provider.js` for the contract.

## Queries

The mocked data provider publishes initiative, roadmap, work-item, and risk queries, including summary and visual variants where needed. All query execution goes through `POST /api/runQuery`.

## Prompt-driven report generation

`POST /api/chat` uses a server-side OpenAI agent to generate or update reports from natural language. The server generates a local AgentSkills-compatible report skill from `@prism-reporting/agent-kit`, loads it into the runtime, and combines it with the shared reporting DSL guide plus the local reporting context before drafting a `ReportSpec`. Before the UI accepts a spec, the server validates it and dry-runs it against the local data provider. To enable it, copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The app still works without it for the curated starter dashboards.

## Prerequisites

- Node.js >= 18
- The sibling `reporting` repo checked out and buildable (when using the default `file:../reporting/packages/...` layout)

## Environment

Copy `.env.example` to `.env` and set at least:

- **`OPENAI_API_KEY`** (required) — Needed for prompt-driven report generation (`POST /api/chat`). The app still runs without it for curated starter dashboards and direct query calls.

Optional:

- **`OPENAI_MODEL`** — Model for the report-generation agent (default: `gpt-4o-mini`).

## Install

```bash
npm install
```

This installs dependencies and links the reporting packages (including `@prism-reporting/agent-kit`) from the sibling repo when using `file:../reporting/packages/...`.

## Build

```bash
npm run build
```

This builds the sibling `reporting` packages and the local Vite client bundle. Run this at least once so the linked `@prism-reporting/*` packages have a built `dist/`.

## Run

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000). The agent and UI use the same local reporting context provider, query catalog, generated skill, and data provider.

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
