import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOpenAI } from '@ai-sdk/openai';
import { formatReportSpecForPrompt } from '@prism-reporting/core';
import { createAiSdkReportingAgent, generateReportAgentSkill } from '@prism-reporting/agent-kit';
import { createPortfolioDataProvider } from '../data-provider.js';
import { createStarterReportingContextProvider } from '../reporting-context.js';
import { starterReports } from '../report-spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_SKILLS_ROOT = path.resolve(__dirname, '../../.generated/agent-skills');
const reportingContextProvider = createStarterReportingContextProvider();
const dataProvider = createPortfolioDataProvider();
const DEFAULT_MODEL = 'gpt-4o-mini';

const STARTER_REPORT_LABELS = starterReports.map((report) => report.label).join(', ');
const runtimeNotes = [
  `This app has ${starterReports.length} starter reports: ${STARTER_REPORT_LABELS}.`,
  'Use only canonical query names, field keys, and params from the reporting context.',
  'Prefer metadata inspection before previewing rows.',
  'For report changes grounded in live data, preview the chosen query before calling apply_report_spec.',
];

let agentPromise = null;

async function ensureGeneratedSkill() {
  await mkdir(GENERATED_SKILLS_ROOT, { recursive: true });
  return generateReportAgentSkill({
    outputDir: GENERATED_SKILLS_ROOT,
    toolNames: {
      listAvailableQueries: 'list_available_queries',
      describeQuery: 'describe_query',
      previewQuery: 'preview_query',
      applyReportSpec: 'apply_report_spec',
    },
  });
}

async function getAgent() {
  if (!agentPromise) {
    agentPromise = (async () => {
      const { skillFile } = await ensureGeneratedSkill();
      return createAiSdkReportingAgent({
        contextProvider: reportingContextProvider,
        dataProvider,
        skillPaths: [skillFile],
        runtimeNotes,
        submissionToolName: 'apply_report_spec',
        submissionToolDescription:
          'That tool validates and dry-runs the spec before the live report is updated.',
      });
    })();
  }

  return agentPromise;
}

/** Build validation context from provider-backed base metadata. */
export async function getValidationContext() {
  const agent = await getAgent();
  return agent.runtime.getValidationContext();
}

export async function buildSystemPrompt({ currentSpec = null, validationErrorText = '' } = {}) {
  const agent = await getAgent();
  return agent.runtime.buildSystemPrompt({
    currentSpec,
    validationErrorText,
  });
}

export function buildDynamicSystemMessage({ currentSpec = null, validationErrorText = '' } = {}) {
  const blocks = [];
  if (validationErrorText) {
    blocks.push(
      `Validation feedback from the latest apply_report_spec attempt:\n${validationErrorText}`
    );
  }
  if (currentSpec && typeof currentSpec === 'object' && !Array.isArray(currentSpec)) {
    blocks.push(
      'The user is currently viewing the report described below. Use this when they ask about the current report or want to modify it.',
      formatReportSpecForPrompt(currentSpec)
    );
  }
  return blocks.join('\n\n');
}

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

export function buildModelMessages({
  prompt,
  messages = [],
  currentSpec = null,
  validationErrorText = '',
}) {
  const text = prompt?.trim() ?? '';
  const history = (Array.isArray(messages) ? messages : []).map((message) => ({
    role: message.role ?? 'user',
    content: String(getMessageText(message) ?? ''),
  }));
  const hasTrailingPrompt =
    history.length > 0 &&
    history[history.length - 1]?.role === 'user' &&
    history[history.length - 1]?.content.trim() === text;
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
 * Stream chat with the generated report skill and local reporting tools.
 * When the model calls apply_report_spec, the client replaces the current report with the given spec.
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
  const agent = await getAgent();

  return agent.streamResponse({
    model,
    prompt: text,
    messages,
    currentSpec,
  });
}
