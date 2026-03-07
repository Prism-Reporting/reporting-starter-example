import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveReport } from "@reporting/core";
import { KpiView, ResolvedQueryInspector } from "@reporting/react-ui";

describe("resolved query metadata", () => {
  it("captures merged query params from data source defaults and active filters", async () => {
    const spec = {
      id: "projects-report",
      title: "Projects",
      layout: "singleColumn",
      dataSources: {
        projects: {
          name: "projects",
          query: "projects",
          params: {
            endFrom: "2026-03-01",
            endTo: "2026-05-31",
          },
        },
      },
      filters: [
        {
          type: "select",
          id: "status",
          label: "Status",
          dataSource: "projects",
          paramKey: "status",
          options: [{ value: "AT_RISK", label: "At Risk" }],
        },
      ],
      widgets: [
        {
          type: "table",
          id: "projects-table",
          dataSource: "projects",
          config: {
            columns: [{ key: "name", label: "Project" }],
          },
        },
      ],
    };

    const resolved = await resolveReport(
      spec,
      {
        async runQuery() {
          return [{ name: "Compliance Automation" }];
        },
      },
      { status: "AT_RISK" }
    );

    assert.deepEqual(resolved.queries, [
      {
        dataSource: "projects",
        query: "projects",
        params: {
          endFrom: "2026-03-01",
          endTo: "2026-05-31",
          status: "AT_RISK",
        },
      },
    ]);
  });

  it("renders a compact inspector for the applied query params", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResolvedQueryInspector, {
        queries: [
          {
            dataSource: "projects",
            query: "projects",
            params: {
              endFrom: "2026-03-01",
              endTo: "2026-05-31",
              status: "AT_RISK",
            },
          },
        ],
      })
    );

    assert.match(html, /Query info/);
    assert.match(html, /projects/);
    assert.match(html, /endFrom/);
    assert.match(html, /2026-05-31/);
    assert.match(html, /AT_RISK/);
  });

  it("renders widget-level query info next to the component title", () => {
    const html = renderToStaticMarkup(
      React.createElement(KpiView, {
        title: "Projects",
        data: {
          value: 3,
          label: "At-risk projects",
        },
        queryInfo: {
          dataSource: "projects",
          query: "projects",
          params: {
            endFrom: "2026-03-01",
            endTo: "2026-05-31",
            status: "AT_RISK",
          },
        },
      })
    );

    assert.match(html, /Projects/);
    assert.match(html, /Query/);
    assert.match(html, /projects/);
    assert.match(html, /AT_RISK/);
  });
});
