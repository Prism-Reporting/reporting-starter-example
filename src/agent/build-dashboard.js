import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { validateReportSpec } from "@reporting/core";
import { getPortfolioQueryCatalog } from "../query-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MCP_SERVER_PATH = path.resolve(
  __dirname,
  "../../../reporting/packages/mcp-server/dist/index.js"
);
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_ATTEMPTS = 3;
const BUSINESS_QUARTER_GUIDE = [
  "Business quarter calendar for the portfolio example:",
  "- Q1 = Dec 1 to Feb 28/29",
  "- Q2 = Mar 1 to May 31",
  "- Q3 = Jun 1 to Aug 31",
  "- Q4 = Sep 1 to Nov 30",
  "If the user asks for a quarter, translate it into explicit date params.",
  'For projects use endFrom/endTo based on project endDate, for example 2026-Q2 => { "endFrom": "2026-03-01", "endTo": "2026-05-31" }.',
  'For milestones use targetFrom/targetTo based on targetDate, for example 2026-Q2 => { "targetFrom": "2026-03-01", "targetTo": "2026-05-31" }.',
  "Do not rely on a quarter label alone when explicit date params can express the request more clearly.",
].join("\n");

function getReportingMcpServerPath() {
  const configuredPath = process.env.REPORTING_MCP_SERVER_PATH;
  if (!configuredPath) return DEFAULT_MCP_SERVER_PATH;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

function getChildProcessEnv(queryCatalog) {
  return Object.fromEntries(
    Object.entries({
      ...process.env,
      REPORTING_QUERY_CATALOG_JSON: JSON.stringify(queryCatalog),
    }).filter((entry) => typeof entry[1] === "string")
  );
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Model did not return a valid JSON object");
  }
}

async function readTextResource(client, uri) {
  const result = await client.readResource({ uri });
  const textContent = result.contents.find((content) => "text" in content);
  if (!textContent || !("text" in textContent)) {
    throw new Error(`Resource ${uri} did not return text content`);
  }
  return textContent.text;
}

async function callJsonTool(client, name, args = {}) {
  const result = await client.callTool({
    name,
    arguments: args,
  });
  const textContent = result.content.find((content) => content.type === "text");

  if (!textContent) {
    throw new Error(`Tool ${name} did not return text content`);
  }

  return JSON.parse(textContent.text);
}

async function withReportingMcpClient(queryCatalog, fn) {
  const serverPath = getReportingMcpServerPath();
  const transport = new StdioClientTransport({
    command: process.env.REPORTING_MCP_COMMAND || "node",
    args: [serverPath],
    cwd: path.dirname(serverPath),
    env: getChildProcessEnv(queryCatalog),
    stderr: "pipe",
  });
  const client = new Client({
    name: "reporting-portfolio-agent",
    version: "0.1.0",
  });

  if (transport.stderr) {
    transport.stderr.on("data", (chunk) => {
      const message = String(chunk).trim();
      if (message) console.error(`[reporting-mcp] ${message}`);
    });
  }

  await client.connect(transport);

  try {
    return await fn(client, serverPath);
  } finally {
    await client.close();
  }
}

function formatDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
    return "No diagnostics provided.";
  }

  return diagnostics
    .map((diagnostic) =>
      [
        `- path: ${diagnostic.path}`,
        `  code: ${diagnostic.code}`,
        `  message: ${diagnostic.message}`,
        diagnostic.suggestion ? `  suggestion: ${diagnostic.suggestion}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
}

function buildDraftPrompt({
  prompt,
  guide,
  schema,
  basicExample,
  queryCatalog,
  availableQueries,
  queryDetails,
  previousAttempt,
}) {
  const sections = [
    "User request:",
    prompt,
    "",
    "Context:",
    "You are authoring reports for an executive team reviewing a quarter across multiple projects.",
    "Prefer projects and milestones over overly operational detail unless the user asks for it.",
    BUSINESS_QUARTER_GUIDE,
    "",
    "Authoring guide:",
    guide,
    "",
    "JSON schema:",
    schema,
    "",
    "Reference example:",
    basicExample,
    "",
    "Query catalog resource:",
    queryCatalog,
    "",
    "Available queries tool result:",
    JSON.stringify(availableQueries, null, 2),
    "",
    "Query detail tool result:",
    JSON.stringify(queryDetails, null, 2),
  ];

  if (previousAttempt) {
    sections.push(
      "",
      "Your previous draft was invalid. Fix it using these diagnostics.",
      `Previous draft:\n${JSON.stringify(previousAttempt.spec, null, 2)}`,
      `Diagnostics:\n${formatDiagnostics(previousAttempt.validation.diagnostics)}`
    );
  }

  sections.push(
    "",
    "Return only a single JSON object that matches ReportSpec v1.",
    "Do not wrap the JSON in markdown fences.",
    "Do not invent query names or field names outside the published query catalog.",
    "Prefer a small number of filters and widgets that directly answer the request."
  );

  return sections.join("\n");
}

async function draftSpec({
  openai,
  model,
  prompt,
  guide,
  schema,
  basicExample,
  queryCatalog,
  availableQueries,
  queryDetails,
  previousAttempt,
}) {
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a dashboard authoring agent for Prism Reporting. Build a valid ReportSpec JSON object only. Prefer the smallest correct spec that satisfies the user request.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildDraftPrompt({
              prompt,
              guide,
              schema,
              basicExample,
              queryCatalog,
              availableQueries,
              queryDetails,
              previousAttempt,
            }),
          },
        ],
      },
    ],
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error("OpenAI did not return any text output");
  }

  return extractJsonObject(outputText);
}

export async function buildDashboardSpec({ prompt }, overrides = {}) {
  const queryCatalog = overrides.queryCatalog ?? getPortfolioQueryCatalog();
  const model = overrides.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const apiKey = overrides.apiKey ?? process.env.OPENAI_API_KEY;
  const openai =
    overrides.openai ??
    (apiKey
      ? new OpenAI({ apiKey })
      : null);

  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const runWithMcpClient = overrides.withReportingMcpClient ?? withReportingMcpClient;
  const readResource = overrides.readTextResource ?? readTextResource;
  const callTool = overrides.callJsonTool ?? callJsonTool;

  return runWithMcpClient(queryCatalog, async (client, serverPath) => {
    const [guide, schema, basicExample, queryCatalogResource] = await Promise.all([
      readResource(client, "report-spec://v1/guide"),
      readResource(client, "report-spec://v1/schema"),
      readResource(client, "report-spec://v1/examples/basic"),
      readResource(client, "report-spec://v1/query-catalog"),
    ]);

    const availableQueries = await callTool(client, "list_available_queries");
    const queryDetails = await Promise.all(
      queryCatalog.queries.map((query) => callTool(client, "describe_query", { name: query.name }))
    );

    let previousAttempt = null;
    let finalValidation = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const spec = await draftSpec({
        openai,
        model,
        prompt,
        guide,
        schema,
        basicExample,
        queryCatalog: queryCatalogResource,
        availableQueries,
        queryDetails,
        previousAttempt,
      });

      const validation = await callTool(client, "validate_report_spec", { spec });
      finalValidation = validation;

      if (validation.valid) {
        const localValidation = validateReportSpec(spec, {
          availableQueries: queryCatalog.queries.map((query) => query.name),
          availableFields: Object.fromEntries(
            queryCatalog.queries.map((query) => [query.name, query.fields ?? []])
          ),
        });

        if (!localValidation.valid) {
          throw new Error(
            `Spec passed MCP validation but failed local validation: ${localValidation.errors.join("; ")}`
          );
        }

        return {
          spec,
          validationMeta: {
            attempts: attempt,
            model,
            mcpServerPath: serverPath,
            validation,
          },
        };
      }

      previousAttempt = { spec, validation };
    }

    throw new Error(
      `Unable to generate a valid report spec after ${MAX_ATTEMPTS} attempts: ${formatDiagnostics(
        finalValidation?.diagnostics
      )}`
    );
  });
}
