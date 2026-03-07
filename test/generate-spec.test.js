import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDashboardSpec } from "../src/agent/build-dashboard.js";

describe("buildDashboardSpec", () => {
  it("builds a valid portfolio report with injected OpenAI and MCP dependencies", async () => {
    let capturedCatalog = null;

    const spec = {
      id: "projects-at-risk-generated",
      title: "Projects At Risk",
      layout: "singleColumn",
      dataSources: {
        projects: {
          name: "projects",
          query: "projects",
          params: {
            endFrom: "2026-03-01",
            endTo: "2026-05-31",
            status: "AT_RISK",
          },
        },
      },
      filters: [],
      widgets: [
        {
          type: "table",
          id: "projects-table",
          title: "Projects",
          dataSource: "projects",
          config: {
            columns: [
              { key: "name", label: "Project" },
              { key: "owner", label: "Owner" },
              { key: "status", label: "Status" },
            ],
          },
        },
      ],
    };

    const result = await buildDashboardSpec(
      { prompt: "show projects at risk in 2026-Q2" },
      {
        openai: {
          responses: {
            async create() {
              return {
                output_text: JSON.stringify(spec),
              };
            },
          },
        },
        model: "fake-model",
        withReportingMcpClient: async (queryCatalog, fn) => {
          capturedCatalog = queryCatalog;
          return fn({}, "/tmp/reporting-mcp.js");
        },
        readTextResource: async () => "resource",
        callJsonTool: async (_client, toolName, args = {}) => {
          if (toolName === "list_available_queries") {
            return { queries: ["projects", "milestones"] };
          }
          if (toolName === "describe_query") {
            return {
              name: args.name,
              fields:
                args.name === "projects"
                  ? ["id", "name", "owner", "status", "endDate"]
                  : ["id", "projectName", "name", "owner", "status", "targetDate"],
            };
          }
          if (toolName === "validate_report_spec") {
            return { valid: true, diagnostics: [] };
          }
          throw new Error(`Unexpected tool: ${toolName}`);
        },
      }
    );

    assert.equal(result.spec.id, "projects-at-risk-generated");
    assert.equal(result.validationMeta.attempts, 1);
    assert.equal(result.validationMeta.model, "fake-model");
    assert.equal(capturedCatalog.queries.length, 2);
    assert.deepEqual(
      capturedCatalog.queries.map((query) => query.name),
      ["projects", "milestones"]
    );
  });

  it("tells the model to translate quarter requests into explicit date params", async () => {
    let capturedPrompt = "";

    await buildDashboardSpec(
      { prompt: "show Q2 projects" },
      {
        openai: {
          responses: {
            async create(payload) {
              capturedPrompt = payload.input[1].content[0].text;
              return {
                output_text: JSON.stringify({
                  id: "q2-projects",
                  title: "Q2 Projects",
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
                  filters: [],
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
                }),
              };
            },
          },
        },
        model: "fake-model",
        withReportingMcpClient: async (queryCatalog, fn) => fn(queryCatalog, "/tmp/reporting-mcp.js"),
        readTextResource: async () => "resource",
        callJsonTool: async (_client, toolName, args = {}) => {
          if (toolName === "list_available_queries") {
            return { queries: ["projects", "milestones"] };
          }
          if (toolName === "describe_query") {
            return { name: args.name, fields: ["id", "name", "endDate", "targetDate"] };
          }
          if (toolName === "validate_report_spec") {
            return { valid: true, diagnostics: [] };
          }
          throw new Error(`Unexpected tool: ${toolName}`);
        },
      }
    );

    assert.match(capturedPrompt, /Q2 = Mar 1 to May 31/);
    assert.match(capturedPrompt, /endFrom\/endTo/);
    assert.match(capturedPrompt, /targetFrom\/targetTo/);
  });
});
