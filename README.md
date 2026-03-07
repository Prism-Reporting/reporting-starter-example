# Reporting Portfolio Example

Mocked example app for [@reporting/core](https://github.com/Prism-Reporting/reporting) and [@reporting/react-ui](https://github.com/Prism-Reporting/reporting). It demonstrates the reporting integration with an imaginary project-portfolio scenario instead of a vendor API, so the data model stays rich enough for realistic demos while remaining easy to understand.

The app models an executive team reviewing the quarter across projects and milestones. It ships with starter dashboards and keeps the same prompt-to-spec flow as the Workfront example, but grounds the agent on a simpler query catalog.

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

## Queries

The mocked data provider publishes two queries:

- `projects` for initiative-level reporting
- `milestones` for delivery checkpoint reporting

Both queries support lightweight filtering and pagination through `POST /api/runQuery`.

## Prompt-driven report generation

`POST /api/generateSpec` uses a server-side OpenAI client and the reporting MCP server to:

1. read the reporting DSL guide and schema
2. read the local query catalog
3. draft a `ReportSpec`
4. validate and retry if necessary

To enable prompt generation, copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The app still works without it for the curated starter dashboards.

## Prerequisites

- Node.js >= 18
- The sibling `reporting` repo checked out and buildable

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

This builds the sibling `reporting` packages and the local Vite client bundle.

## Run

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

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
