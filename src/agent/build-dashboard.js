import { createOpenAI } from '@ai-sdk/openai';
import { streamText, stepCountIs, tool, jsonSchema } from 'ai';
import {
  formatReportSpecForPrompt,
  resolveReport,
  validateReportSpec,
} from '@reporting/core';
import { getReportGenerationRules } from '@reporting/mcp-server/contract';
import { createPortfolioDataProvider } from '../data-provider.js';
import { createStarterReportingContextProvider } from '../reporting-context.js';
import { getQueryCatalog } from '../query-catalog.js';
import { starterReports } from '../report-spec.js';

const reportingContextProvider = createStarterReportingContextProvider();
const STARTER_REPORT_LABELS = starterReports.map((r) => r.label).join(', ');
const AVAILABLE_QUERY_NAMES = getQueryCatalog().queries.map((query) => query.name);
const AVAILABLE_QUERIES = AVAILABLE_QUERY_NAMES.join(', ');
const SYNTHETIC_COUNT_VALUE_KEY = '_count';

function getMessageText(message) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part) => part?.type === 'text')
      .map((part) => part.text ?? '')
      .join('\n');
  }
  return '';
}

function buildValidationContextFromBaseContext(baseContext) {
  const queries = baseContext?.queries ?? [];
  return {
    availableQueries: queries.map((q) => q.name),
    availableFields: Object.fromEntries(
      queries.filter((q) => q.fields?.length).map((q) => [q.name, q.fields ?? []])
    ),
  };
}

/** Build validation context from provider-backed base metadata. */
export async function getValidationContext() {
  const baseContext = await reportingContextProvider.getBaseContext();
  return buildValidationContextFromBaseContext(baseContext);
}

function formatReportingContextForPrompt(baseContext, semanticContext) {
  const lines = [];
  const queries = Array.isArray(baseContext?.queries) ? baseContext.queries : [];

  if (queries.length > 0) {
    lines.push('Dataset query cards:');
    for (const query of queries) {
      lines.push(`- ${query.name}: ${query.description ?? 'No description available.'}`);
      if (Array.isArray(query.fields) && query.fields.length > 0) {
        lines.push(`  Fields: ${query.fields.join(', ')}`);
      }
      if (Array.isArray(query.params) && query.params.length > 0) {
        lines.push(`  Params: ${query.params.join(', ')}`);
        lines.push(
          '  (Filter paramKey must be one of these Params, e.g. paramKey: "status" for status filter, not "projectStatus".)'
        );
      }
      if (query.notes) {
        lines.push(`  Notes: ${query.notes}`);
      }
    }
  }

  if (Array.isArray(semanticContext?.queryAliases) && semanticContext.queryAliases.length > 0) {
    lines.push('', 'Query aliases:');
    for (const alias of semanticContext.queryAliases) {
      lines.push(`- "${alias.alias}" -> ${alias.queryName}`);
    }
  }

  if (Array.isArray(semanticContext?.fieldAliases) && semanticContext.fieldAliases.length > 0) {
    lines.push('', 'Field aliases:');
    for (const alias of semanticContext.fieldAliases) {
      const scope = alias.queryName ? `${alias.queryName}.` : '';
      lines.push(`- "${alias.alias}" -> ${scope}${alias.fieldKey}`);
    }
  }

  if (Array.isArray(semanticContext?.examples) && semanticContext.examples.length > 0) {
    lines.push('', 'Examples:');
    for (const example of semanticContext.examples) {
      lines.push(
        `- "${example.prompt ?? example.title ?? 'Example'}": ${example.description ?? example.title ?? ''}`
      );
    }
  }

  if (
    Array.isArray(semanticContext?.clarificationHints) &&
    semanticContext.clarificationHints.length > 0
  ) {
    lines.push('', 'Hints:');
    for (const hint of semanticContext.clarificationHints) {
      lines.push(`- ${hint.hint}`);
    }
  }

  lines.push(
    '',
    'KPI rules:',
    '- Prefer summary queries for totals and aggregate KPIs. When a summary query exposes a business count field such as "count", use that field.',
    `- Use "${SYNTHETIC_COUNT_VALUE_KEY}" only when you intentionally want the number of rows present in the resolved data source output, not a business total.`
  );

  return lines.join('\n').trim();
}

function formatValidationError(errors, diagnostics) {
  const errBlock =
    Array.isArray(errors) && errors.length > 0
      ? `Errors:\n${errors.map((e) => `- ${e}`).join('\n')}`
      : '';
  const diagBlock =
    Array.isArray(diagnostics) && diagnostics.length > 0
      ? `\nDiagnostics:\n${diagnostics.map((d) => `- ${d.path || '$'} [${d.code || 'error'}]: ${d.message}${d.suggestion ? ` (${d.suggestion})` : ''}`).join('\n')}`
      : '';
  return [errBlock, diagBlock].filter(Boolean).join('\n') || 'Validation failed.';
}

function buildDryRunErrors(resolvedReport) {
  return (resolvedReport?.queries ?? [])
    .filter((query) => query.limitExceeded)
    .map((query) => {
      const message =
        query.limitExceeded?.message ?? 'Query exceeded the supported row limit.';
      return `Widget "${query.widgetId ?? 'unknown'}" dry-run failed for dataSource "${query.dataSource}" (${query.query}): ${message}`;
    });
}

/** Vercel AI-compliant tool: replace the current report in the UI with the given report DSL. */
const apply_report_dls = tool({
  description:
    'Replace the current report in the UI with a new report spec. Call this with a single argument: an object with a "dls" key whose value is the full report spec. Never call with empty {}. Always pass the complete report DSL. The spec is validated and dry-run against the real data provider before applying; if invalid you will receive { applied: false, error: "..." } and MUST fix the spec and call again until you get { applied: true }.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      dls: {
        type: 'object',
        description: 'Full report spec (same shape as current report).',
      },
    },
    required: ['dls'],
  }),
  execute: async ({ dls }) => {
    if (dls == null || typeof dls !== 'object' || Array.isArray(dls)) {
      return {
        applied: false,
        error: formatValidationError(
          ['Missing or invalid dls: must be a report spec object.'],
          []
        ),
      };
    }

    const context = await getValidationContext();
    const validation = validateReportSpec(dls, context);
    if (!validation.valid) {
      return {
        applied: false,
        error: formatValidationError(
          validation.errors ?? [],
          validation.diagnostics ?? []
        ),
      };
    }

    try {
      const resolved = await resolveReport(dls, createPortfolioDataProvider());
      const dryRunErrors = buildDryRunErrors(resolved);
      if (dryRunErrors.length > 0) {
        return {
          applied: false,
          error: formatValidationError(dryRunErrors, []),
        };
      }
    } catch (error) {
      return {
        applied: false,
        error: formatValidationError(
          [error instanceof Error ? error.message : String(error)],
          []
        ),
      };
    }

    return { applied: true };
  },
});

const DEFAULT_MODEL = 'gpt-4o-mini';
const SYSTEM_BASE =
  'You are a helpful assistant. The user is chatting in an app that shows a live report.';
const SYSTEM_DATASET_INTRO =
  `This app has 10 starter reports: ${STARTER_REPORT_LABELS}. Available dataset queries (${AVAILABLE_QUERY_NAMES.length}): ${AVAILABLE_QUERIES}. Use only these query names in dataSources and filters. Every dataSource must declare delivery.mode: use "paginatedList" for tables, "fullVisual" for charts, and "summary" for KPI/aggregate sources.`;

export async function buildSystemPrompt({
  prompt: _prompt,
  messages: _messages = [],
  currentSpec: _currentSpec = null,
  validationErrorText: _validationErrorText = '',
} = {}) {
  const [baseContext, semanticContext] = await Promise.all([
    reportingContextProvider.getBaseContext(),
    typeof reportingContextProvider.getSemanticContext === 'function'
      ? reportingContextProvider.getSemanticContext()
      : Promise.resolve(null),
  ]);

  const guideBlock = getReportGenerationRules({
    queries: baseContext?.queries ?? [],
    submissionToolName: 'apply_report_dls',
    submissionToolDescription:
      'That tool validates and dry-runs the spec before the live report is updated.',
    inlineGuide: true,
  });
  const contextBlock = formatReportingContextForPrompt(baseContext, semanticContext);

  return `${SYSTEM_BASE}

${SYSTEM_DATASET_INTRO}

The full Report DSL authoring guide and the full dataset context are included below. Use only canonical query names, params, and field keys from that context, even when the user speaks in aliases or business language.

When the user asks to create, change, simplify, or redesign a report, call apply_report_dls with a complete report spec: pass an object with a "dls" key containing the full report object. Never call apply_report_dls with an empty object or without the dls payload.

If apply_report_dls returns an error, repair the spec using the DSL guide and canonical dataset metadata, then retry. Do not ask the user for field names if the dataset context below already covers the request.

Report DSL guide:

${guideBlock}

${contextBlock ? `\n${contextBlock}\n` : ''}`.trim();
}

function toModelMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  return messages.map((m) => {
    const role = m.role ?? 'user';
    const content =
      typeof m.content === 'string' ? m.content : getMessageText(m);
    return { role, content: String(content ?? '') };
  });
}

export function buildDynamicSystemMessage({
  currentSpec = null,
  validationErrorText = '',
} = {}) {
  const hasSpec =
    currentSpec != null &&
    typeof currentSpec === 'object' &&
    !Array.isArray(currentSpec);
  const reportSpecBlock = hasSpec ? formatReportSpecForPrompt(currentSpec) : '';
  const blocks = [];

  if (validationErrorText) {
    blocks.push(
      `Validation feedback from the latest apply_report_dls attempt:\n${validationErrorText}`
    );
  }

  if (reportSpecBlock) {
    blocks.push(
      'The user is currently viewing the report described below. Use this when they ask about the current report or want to modify it.',
      reportSpecBlock
    );
  }

  return blocks.join('\n\n').trim();
}

export function buildModelMessages({
  prompt,
  messages = [],
  currentSpec = null,
  validationErrorText = '',
}) {
  const text = prompt?.trim();
  const history = toModelMessages(Array.isArray(messages) ? messages : []);
  const hasTrailingPrompt =
    text &&
    history.length > 0 &&
    history[history.length - 1]?.role === 'user' &&
    history[history.length - 1]?.content?.trim() === text;
  const conversationHistory = hasTrailingPrompt ? history.slice(0, -1) : history;
  const dynamicSystemMessage = buildDynamicSystemMessage({
    currentSpec,
    validationErrorText,
  });
  const modelMessages = [...conversationHistory];

  if (dynamicSystemMessage) {
    modelMessages.push({ role: 'system', content: dynamicSystemMessage });
  }

  if (text) {
    modelMessages.push({ role: 'user', content: text });
  }

  return modelMessages;
}

/**
 * Stream chat with apply_report_dls tool. When the model calls apply_report_dls, the client
 * replaces the current report with the given dls. Returns a Response suitable for piping to the client.
 * @param {{ prompt: string, messages?: Array, currentSpec?: object }} options
 * @param {{ agentModel?: object, model?: string }} overrides
 * @returns {Promise<Response>}
 */
export async function chatStream({ prompt, messages = [], currentSpec = null }, overrides = {}) {
  const text = prompt?.trim();
  if (!text) throw new Error('prompt is required');
  if (!overrides.agentModel && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model =
    overrides.agentModel ??
    createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(
      overrides.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL
    );

  const system = await buildSystemPrompt();
  const modelMessages = buildModelMessages({
    prompt: text,
    messages,
    currentSpec,
  });

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    tools: { apply_report_dls },
    // Allow up to 25 steps so the model can retry apply_report_dls after validation errors.
    // Default is stopWhen: stepCountIs(1), which would stop after the first tool result.
    stopWhen: stepCountIs(25),
  });

  return result.toUIMessageStreamResponse();
}
