import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText, stepCountIs, tool, jsonSchema } from 'ai';
import { formatReportSpecForPrompt, validateReportSpec } from '@reporting/core';
import { createStarterReportingContextProvider } from '../reporting-context.js';

const reportingContextProvider = createStarterReportingContextProvider();
const SYNTHETIC_COUNT_VALUE_KEY = '_count';
const MAX_RELEVANT_QUERIES = 4;
const MAX_RELEVANT_EXAMPLES = 3;
const MAX_RELEVANT_HINTS = 4;
const MAX_RELEVANT_ALIASES = 8;

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

function normalizeText(value) {
  return String(value ?? '').toLowerCase();
}

function tokenizeText(value) {
  const matches = normalizeText(value).match(/[a-z0-9_]+/g) ?? [];
  return Array.from(new Set(matches.filter((token) => token.length >= 3)));
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

function scoreText(text, normalizedCorpus, corpusTokens) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return 0;

  let score = 0;
  if (normalizedCorpus.includes(normalized)) {
    score += Math.max(4, normalized.split(/\s+/).length * 2);
  }

  const itemTokens = tokenizeText(normalized);
  for (const token of itemTokens) {
    if (corpusTokens.has(token)) score += 1;
  }
  return score;
}

function buildContextCorpus({ prompt, messages, currentSpec, validationErrorText }) {
  const parts = [prompt, validationErrorText];
  for (const message of messages ?? []) {
    parts.push(getMessageText(message));
  }
  if (currentSpec != null && typeof currentSpec === 'object' && !Array.isArray(currentSpec)) {
    parts.push(formatReportSpecForPrompt(currentSpec));
  }
  return parts.filter(Boolean).join('\n').trim();
}

export function selectRelevantReportingContext({
  prompt,
  messages = [],
  currentSpec = null,
  baseContext,
  semanticContext,
  validationErrorText = '',
}) {
  const normalizedCorpus = buildContextCorpus({
    prompt,
    messages,
    currentSpec,
    validationErrorText,
  }).toLowerCase();
  const corpusTokens = new Set(tokenizeText(normalizedCorpus));
  const queryAliases = Array.isArray(semanticContext?.queryAliases)
    ? semanticContext.queryAliases
    : [];
  const fieldAliases = Array.isArray(semanticContext?.fieldAliases)
    ? semanticContext.fieldAliases
    : [];
  const examples = Array.isArray(semanticContext?.examples) ? semanticContext.examples : [];
  const clarificationHints = Array.isArray(semanticContext?.clarificationHints)
    ? semanticContext.clarificationHints
    : [];

  const rankedQueries = (baseContext?.queries ?? [])
    .map((query) => {
      const aliases = queryAliases.filter((alias) => alias.queryName === query.name);
      const score =
        scoreText(query.name, normalizedCorpus, corpusTokens) * 5 +
        scoreText(query.description, normalizedCorpus, corpusTokens) * 2 +
        scoreText(query.notes, normalizedCorpus, corpusTokens) +
        (query.fields ?? []).reduce(
          (total, field) => total + scoreText(field, normalizedCorpus, corpusTokens),
          0
        ) +
        (query.params ?? []).reduce(
          (total, param) => total + scoreText(param, normalizedCorpus, corpusTokens),
          0
        ) +
        aliases.reduce(
          (total, alias) => total + scoreText(alias.alias, normalizedCorpus, corpusTokens) * 4,
          0
        );
      return { query, score };
    })
    .sort((a, b) => b.score - a.score || a.query.name.localeCompare(b.query.name));

  const selectedQueries =
    rankedQueries.length <= MAX_RELEVANT_QUERIES
      ? rankedQueries.map((entry) => entry.query)
      : rankedQueries
          .filter((entry) => entry.score > 0)
          .slice(0, MAX_RELEVANT_QUERIES)
          .map((entry) => entry.query);
  const fallbackQueries =
    selectedQueries.length > 0
      ? selectedQueries
      : rankedQueries.slice(0, MAX_RELEVANT_QUERIES).map((entry) => entry.query);
  const relevantQueryNames = new Set(fallbackQueries.map((query) => query.name));
  const includeAllRelevantAliases = (baseContext?.queries ?? []).length <= MAX_RELEVANT_QUERIES;

  const rankedQueryAliases = queryAliases
    .filter((alias) => relevantQueryNames.has(alias.queryName))
    .sort(
      (a, b) =>
        scoreText(b.alias, normalizedCorpus, corpusTokens) -
          scoreText(a.alias, normalizedCorpus, corpusTokens) ||
        a.alias.localeCompare(b.alias)
    );
  const selectedQueryAliases =
    includeAllRelevantAliases || rankedQueryAliases.length <= MAX_RELEVANT_ALIASES * 2
      ? rankedQueryAliases
      : rankedQueryAliases.slice(0, MAX_RELEVANT_ALIASES);

  const rankedFieldAliases = fieldAliases
    .filter((alias) => !alias.queryName || relevantQueryNames.has(alias.queryName))
    .sort((a, b) => {
      const aScore =
        scoreText(a.alias, normalizedCorpus, corpusTokens) * 3 +
        scoreText(a.fieldKey, normalizedCorpus, corpusTokens);
      const bScore =
        scoreText(b.alias, normalizedCorpus, corpusTokens) * 3 +
        scoreText(b.fieldKey, normalizedCorpus, corpusTokens);
      return bScore - aScore || a.alias.localeCompare(b.alias);
    });
  const selectedFieldAliases =
    includeAllRelevantAliases || rankedFieldAliases.length <= MAX_RELEVANT_ALIASES * 2
      ? rankedFieldAliases
      : rankedFieldAliases.slice(0, MAX_RELEVANT_ALIASES);

  const selectedExamples = examples
    .map((example) => ({
      example,
      score:
        scoreText(example.prompt, normalizedCorpus, corpusTokens) * 4 +
        scoreText(example.title, normalizedCorpus, corpusTokens) * 2 +
        scoreText(example.description, normalizedCorpus, corpusTokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELEVANT_EXAMPLES)
    .map((entry) => entry.example);

  const selectedHints = clarificationHints
    .map((hint) => ({
      hint,
      score: scoreText(hint.hint, normalizedCorpus, corpusTokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELEVANT_HINTS)
    .map((entry) => entry.hint);

  return {
    selectedQueries: fallbackQueries,
    semanticContext: {
      queryAliases: selectedQueryAliases,
      fieldAliases: selectedFieldAliases,
      examples: selectedExamples,
      clarificationHints: selectedHints,
    },
  };
}

function formatSelectedContextForPrompt({ selectedQueries, semanticContext }) {
  const lines = [];

  if (Array.isArray(selectedQueries) && selectedQueries.length > 0) {
    lines.push('Dataset query cards:');
    for (const query of selectedQueries) {
      lines.push(`- ${query.name}: ${query.description ?? 'No description available.'}`);
      if (Array.isArray(query.fields) && query.fields.length > 0) {
        lines.push(`  Fields: ${query.fields.join(', ')}`);
      }
      if (Array.isArray(query.params) && query.params.length > 0) {
        lines.push(`  Params: ${query.params.join(', ')}`);
        lines.push(`  (Filter paramKey must be one of these Params, e.g. paramKey: "status" for status filter, not "projectStatus".)`);
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
    `KPI rule: use "${SYNTHETIC_COUNT_VALUE_KEY}" only as a KPI valueKey when the user wants the total number of rows returned by a query.`
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

/** Vercel AI–compliant tool: replace the current report in the UI with the given report DSL. */
const apply_report_dls = tool({
  description:
    'Replace the current report in the UI with a new report spec. You MUST call this with a single argument: an object with a "dls" key whose value is the full report spec (object with title, dataSources, filters, widgets). Never call with empty {}. Always pass the complete report DSL so the UI can render it. The spec is validated before applying; if invalid you will receive { applied: false, error: "..." } and MUST fix the spec and call again until you get { applied: true }.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      dls: {
        type: 'object',
        description:
          'Full report spec object. Must include at least title, dataSources (array), filters (array), widgets (array). Same shape as the current report.',
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
    return { applied: true };
  },
});

const DEFAULT_MODEL = 'gpt-4o-mini';
const SYSTEM_BASE =
  'You are a helpful assistant. The user is chatting in an app that shows a live report.';

export async function buildSystemPrompt({
  prompt,
  messages = [],
  currentSpec = null,
  validationErrorText = '',
}) {
  const [baseContext, semanticContext] = await Promise.all([
    reportingContextProvider.getBaseContext(),
    typeof reportingContextProvider.getSemanticContext === 'function'
      ? reportingContextProvider.getSemanticContext()
      : Promise.resolve(null),
  ]);

  const hasSpec =
    currentSpec != null &&
    typeof currentSpec === 'object' &&
    !Array.isArray(currentSpec);
  const reportSpecBlock = hasSpec ? formatReportSpecForPrompt(currentSpec) : '';
  const selectedContext = selectRelevantReportingContext({
    prompt,
    messages,
    currentSpec,
    baseContext,
    semanticContext,
    validationErrorText,
  });
  const contextBlock = formatSelectedContextForPrompt(selectedContext);

  return `${SYSTEM_BASE}

Use only canonical query names, params, and field keys from the dataset context below. Prefer those canonical keys even when the user speaks in aliases or business language.

When the user asks to change, simplify, or redesign the report, you MUST call the apply_report_dls tool with a complete report spec: pass an object with a "dls" key containing the full report object (title, dataSources, filters, widgets). Never call apply_report_dls with an empty object or without the dls payload.

If validation fails, repair the spec using the canonical query metadata and retry. Do not ask the user for field names if the dataset context below already covers the request.

${hasSpec ? 'The user is currently viewing the report described below. Use this when they ask about the current report or want to modify it.\n' : ''}${
    contextBlock ? `\n${contextBlock}\n` : ''
  }${reportSpecBlock ? `\n${reportSpecBlock}` : ''}`.trim();
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

  const modelMessages = toModelMessages(Array.isArray(messages) ? messages : []);
  const system = await buildSystemPrompt({ prompt: text, messages, currentSpec });

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

/**
 * Simple chat: no tools, no streaming. Returns assistant text only. Used by tests.
 * @param {{ prompt: string, messages?: Array, currentSpec?: object }} options
 * @param {{ agentModel?: object, model?: string }} overrides
 * @returns {Promise<{ assistantMessage: string }>}
 */
export async function chat({ prompt, messages = [], currentSpec = null }, overrides = {}) {
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

  let modelMessages = toModelMessages(messages);
  if (!modelMessages.length) modelMessages = [{ role: 'user', content: text }];
  const system = await buildSystemPrompt({ prompt: text, messages, currentSpec });

  const result = await generateText({
    model,
    system,
    messages: modelMessages,
  });

  return {
    assistantMessage: (result.text && result.text.trim()) || '',
  };
}
