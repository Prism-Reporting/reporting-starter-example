# Starter Example Alignment — Requirements

**Goal:** Tailor the reporting-starter-example so a developer can **relatively easily connect a simple agent to generate reports over their own simple dataset** using user prompts. No premium features; OSS path only. This doc is for review and then spawning sub-agents to implement.

---

## 1. Single “connect your data” surface

### 1.1 One place for query definitions

- **Current:** Query catalog lives in `src/query-catalog.js` as `getPortfolioQueryCatalog()`.
- **Requirement:** Keep a single module that defines “what queries exist and what fields/params they have,” but make the contract explicit and the naming generic for a starter.
  - Export a **single function** that returns `{ queries: QueryEntry[] }` (e.g. `getQueryCatalog()`).
  - Document the **query catalog contract** (name, description, fields, params, optional notes) in that file or an adjacent README/section.
  - File may still be named `query-catalog.js` or `src/config/query-catalog.js`; avoid “portfolio” in the public API name so the starter reads as “your catalog.”

### 1.2 One place for data implementation

- **Current:** `src/data-provider.js` implements `runQuery({ name, params })` with in-memory portfolio data.
- **Requirement:** Keep a single data layer that the server’s `POST /api/runQuery` uses.
  - Document that **adding your dataset** = implement or replace the logic that resolves `name` + `params` to rows (e.g. in `data-provider.js` or a wrapper).
  - Ensure the **query names** returned by the catalog match the **names** handled in the data layer (document this contract).
  - No premium or RAG; just “catalog describes queries, data provider executes them.”

### 1.3 One place for starter context

- **Current:** The starter relies on passing raw host context into MCP transport setup.
- **Requirement:** Replace the idea of ad hoc transport-level host context with a **starter reporting context provider**.
  - Add one simple module such as `src/reporting-context.js`.
  - That module should be the single place that defines what the agent and MCP know about the dataset beyond raw query execution.
  - For the OSS starter, that provider should be **simple and local**, with:
    - required **base context**: query catalog
    - optional **semantic context**: notes, aliases, examples, clarification hints
  - Keep this contract simple enough that a developer with a small dataset can edit one place and understand what the agent is grounded on.
  - Do **not** require premium features, retrieval pipelines, or hosted services in the starter.

### 1.4 Starter reporting context contract

- **Requirement:** The starter should align to the shared reporting context architecture we want for OSS and premium.
  - Treat reporting context as two layers:
    - **Base context** for deterministic validation/runtime behavior
    - **Semantic context** for better AI understanding
  - For the starter, the base context should come directly from the local query catalog.
  - The semantic context should stay lightweight and optional.
- **Suggested shape for implementation alignment:**

```js
{
  base: {
    source: "reporting-starter-example",
    tenantId: undefined,
    queries: [
      {
        name: "projects",
        description: "...",
        fields: ["id", "name"],
        params: ["status", "owner"],
        notes: "..."
      }
    ]
  },
  semantic: {
    queryAliases: [],
    fieldAliases: [],
    examples: [],
    clarificationHints: []
  }
}
```

- **Important constraint:** Semantic context should help the agent understand the dataset, but **must not** silently redefine validation rules. Validation should still be driven by base query metadata.

---

## 2. Agent wiring and MCP

### 2.1 Agent uses the single reporting context

- **Current:** `build-dashboard.js` imports `getPortfolioQueryCatalog` and uses it for validation context and host context.
- **Requirement:** Agent must use the **same** starter reporting context as the rest of the app.
  - Replace direct “host context blob” construction with a local `reportingContextProvider`.
  - Replace `getPortfolioQueryCatalog` with the new single export (e.g. `getQueryCatalog()` from `query-catalog.js`) inside that provider.
  - Ensure query metadata and any starter-specific notes/examples come from the same source for both agent wiring and MCP exposure.
  - The agent should learn about the dataset through the standard reporting context surface and MCP tools/resources, not by constructing an ad hoc raw context blob for transport.

### 2.2 Agent grounding behavior

- **Requirement:** The agent integration should use the reporting context in two different ways:
  - **Base context** should power deterministic validation inputs.
  - **Semantic context** should power lightweight grounding for generation, such as examples or notes in the system prompt or via MCP resources/tools.
- The starter should not implement retrieval or ranking systems, but it should prove the architecture by allowing optional examples/notes to be surfaced to the model from the provider.

### 2.3 MCP server dependency

- **Current:** Server imports MCP from a sibling path: `../reporting/packages/mcp-server/dist/http.js`. Build runs `npm run build --prefix ../reporting`.
- **Requirement:** Choose one of the following and implement consistently:
  - **Option A (recommended for monorepo):** Add `@prism-reporting/mcp-server` (or equivalent) as a **package dependency** in `package.json` so the starter works when the reporting repo is linked or published; remove hardcoded `../reporting/...` path from server.
  - **Option B:** If the MCP server stays in the sibling repo, document in README that the starter must be run from the monorepo and list the exact `npm run build` and run order.
- In both cases, **document** how to run the app (including MCP) so “connect your dataset” does not require guessing.

### 2.4 Context provider and env

- **Current:** Context is built inline in app code and tied to transport setup.
- **Requirement:** The starter should configure reporting context on the server/runtime side through a **reporting context provider**, not by pushing raw JSON through a custom transport header.
  - For the default starter setup, MCP should run in-process and read from the local starter context provider.
  - Allow `REPORTING_MCP_URL` (and optionally a small env set) to override MCP location for advanced setups.
  - If a remote MCP flow is documented, describe it in terms of a future **context bootstrap/token/reference** approach, not a raw context header contract.
  - Document in README that for the default setup, no extra context service is needed beyond the local starter provider and `OPENAI_API_KEY` for chat.

### 2.5 Local-first integration rule

- **Requirement:** The starter should model the recommended default architecture:
  - local app code creates a reporting context provider
  - the local server passes that provider into the reporting MCP/runtime layer
  - the agent and MCP both consume that same provider-backed context
- This is the reference integration path for simple OSS systems.

---

## 3. Naming and framing

### 3.1 “Starter” and “your dataset”

- **Requirement:** User-facing copy (README, UI labels, comments) should frame this as a **starter example** for connecting **your simple dataset** and generating reports from prompts.
  - README: Lead with “connect your data and prompt-to-report” and “no premium; OSS only.”
  - In-code comments: Where something is “the one place to add your queries/data,” say so explicitly.
  - UI: Title/description can stay “Portfolio Reporting Example” as the demo scenario, but README should state that the portfolio is an example dataset and that replacing it is done via the query catalog + data provider.

### 3.2 Internal naming

- **Requirement:** Prefer neutral names for the integration points used by sub-agents and docs:
  - “Query catalog” (not “portfolio catalog”) in docs and public API.
  - “Reporting context provider” for the module that supplies starter grounding.
  - “Base context” and “semantic context” where we need to distinguish validation metadata from AI-only hints.
  - “Data provider” or “runQuery” in docs.
  - “Report spec” / “ReportSpec” unchanged.
  - Optional: rename `getPortfolioQueryCatalog` → `getQueryCatalog` and keep portfolio data as the default **content** of that catalog.

---

## 4. Documentation

### 4.1 README

- **Requirement:** Add or expand a short section **“Connecting your own dataset”** (or “Adding your data”):
  1. Define queries in the query catalog (file and shape).
  2. Implement or adjust the data layer so `runQuery(name, params)` returns data for those names.
  3. Optionally add starter context notes/examples if the dataset needs lightweight grounding help.
  4. Restart (or run) the app; the agent and UI use the same context, catalog, and data.
- Mention that no premium features are used; the agent uses the built-in MCP and the local reporting context provider.

### 4.2 Environment

- **Requirement:** Document required env (e.g. `OPENAI_API_KEY`) and optional env (e.g. `REPORTING_MCP_URL`, `OPENAI_MODEL`) in README. If `.env.example` exists, keep it in sync; if not, add a minimal one (e.g. `OPENAI_API_KEY=`).

---

## 5. Tests

### 5.1 Catalog and agent

- **Requirement:** Tests that depend on the query catalog, starter context, or agent should use the same single starter context API (e.g. `getQueryCatalog()` plus any local context-provider export). Update any references from `getPortfolioQueryCatalog` to the new export.
- **Requirement:** Keep existing tests passing; no removal of coverage unless a path is removed. Prefer tests that assert “starter context + catalog + runQuery contract” so that “connect your data” changes remain safe.

### 5.2 Context-provider behavior

- **Requirement:** Add or update tests that prove:
  - base context is derived from the starter query catalog
  - semantic context is optional and can be omitted without breaking generation/validation
  - the agent and MCP consume the same starter context source
  - validation behavior still follows base query metadata, not semantic hints

---

## 6. Scope boundaries (out of scope for this pass)

- **No premium features:** No RAG, no semantic layer, no hosted intelligence.
- **Exception:** The starter may include a tiny local semantic context example layer, but only as static hints/examples in code. No retrieval, ranking, storage, or hosted features.
- **No Workfront-specific logic:** Starter stays generic (simple catalog + runQuery).
- **No change to ReportSpec/DSL contract:** Validation and MCP tools stay as-is.
- **No UI redesign:** Only copy/naming and any minimal changes needed for “starter” framing.
- **No custom transport header contract:** This pass should move the starter requirements away from relying on `x-reporting-host-context` style integration.

---

## 7. Suggested implementation order (for sub-agents)

1. **Starter context contract** — Define the local reporting context provider shape for the starter; document what is required vs optional.
2. **Query catalog contract and rename** — Single export (e.g. `getQueryCatalog()`), update all imports and references (agent, server, tests). Document the catalog shape in the file or a short comment block.
3. **Data provider contract** — Document `runQuery(name, params)` and that names must match the catalog; add a short comment or README line.
4. **Agent integration** — Make the agent consume the local reporting context provider for both validation grounding and optional semantic grounding.
5. **MCP dependency and server** — Resolve MCP import (package vs monorepo path) and wire the starter context provider into the local runtime/MCP setup.
6. **README and .env.example** — “Connecting your own dataset,” env vars, local context provider, and “no premium” note.
7. **UI/README copy** — “Starter” and “your dataset” framing where appropriate; optional rename of `getPortfolioQueryCatalog` to `getQueryCatalog` if not done in step 2.
8. **Tests** — Switch to single starter context API; run full test suite and fix any breakage.

---

## 8. Required changes in `/reporting` packages

These are the upstream framework/package changes the starter will depend on. They should be treated as explicit implementation work, not implied behavior.

### 8.1 `packages/mcp-server`

- Replace raw `x-reporting-host-context` transport parsing as the preferred integration mechanism.
- Add support for constructing the MCP server/session manager with a **reporting context provider**.
- The MCP layer should obtain context from that provider for:
  - query catalog resource generation
  - `list_available_queries`
  - `describe_query`
  - validation defaults for `validate_report_spec`
- Keep local/in-process provider injection as the primary OSS path.
- If remote support remains, design it around a future **context reference/bootstrap/token** flow, not raw header payloads.

### 8.2 Shared context types/contracts

- Add or expose shared types/interfaces for:
  - base reporting context
  - semantic reporting context
  - reporting context provider
- These types should be usable by both the MCP package and application code.
- Prefer a shared package location or a clearly reusable export rather than duplicating the shapes in the starter.

### 8.3 `packages/mcp-server` resources/tools

- Ensure the MCP package can expose context-derived resources/tools from the provider-backed context model.
- At minimum, built-in tools/resources should continue to support:
  - DSL/schema guidance
  - query catalog access
  - validation
- Optional semantic context should be exposable in a safe way for agent grounding, but should not mutate validation rules.

### 8.4 Agent-facing helper surface in `/reporting`

- Consider adding a small helper in the framework for turning reporting context into agent grounding text or resource content.
- The starter should not invent a one-off semantic prompt format if the framework can provide a reusable helper.
- This helper can remain minimal for now, but the architecture should anticipate both OSS and premium context providers.

### 8.5 Backward compatibility and migration

- If `x-reporting-host-context` currently exists in the package, decide whether to:
  - deprecate it temporarily for migration, or
  - remove it in this change if no compatibility promise is needed
- Document the intended migration path for examples and future integrators.

---

## 9. Acceptance criteria (summary)

- A developer can add or change queries in **one place** (query catalog), implement data in **one place** (data provider / runQuery), and optionally add lightweight grounding in **one place** (starter context provider) to get prompt-driven report generation without touching premium or RAG code.
- The app runs with clear instructions (README + env) and uses a single, explicit starter reporting context for both the agent and MCP.
- The starter demonstrates the provider-based architecture we want to preserve for OSS, self-hosted advanced integrations, and premium offerings.
- The required framework work in `/reporting` packages is identified clearly enough that sub-agents can split starter changes from upstream package changes.
- All existing tests pass; naming and docs align with “starter example for your simple dataset, OSS only.”
