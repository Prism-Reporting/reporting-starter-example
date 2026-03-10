import 'dotenv/config';
import express from 'express';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { createPortfolioDataProvider } from './src/data-provider.js';
import { getQueryCatalog } from './src/query-catalog.js';
import { chatStream } from './src/agent/build-dashboard.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

/** Chat route timeout (ms). */
const CHAT_ROUTE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Data stream wire codes expected by @ai-sdk/react useChat (processDataStream).
 * Converts SSE payloads from ai package (data: {...}) to "code: value\n" lines.
 */
function parsePartialJson(text) {
  if (!text || typeof text !== 'string') return { value: undefined };
  const t = text.trim();
  if (!t) return { value: {} };
  try {
    return { value: JSON.parse(t) };
  } catch {
    return { value: undefined };
  }
}

/**
 * Build assistant message for persistence from accumulated stream state.
 * Shape compatible with convertToModelMessages (role, content, toolInvocations).
 */
function buildAssistantMessageForStore(accumulated) {
  const toolInvocations = Array.from(accumulated.toolCalls.values()).map(
    ({ toolCallId, toolName, args, result }) => ({
      toolCallId,
      toolName,
      args: args ?? {},
      state: 'result',
      result,
    })
  );
  return {
    role: 'assistant',
    content: accumulated.text ?? '',
    toolInvocations: toolInvocations.length ? toolInvocations : undefined,
  };
}

/**
 * Buffer stream parts and send only the final response (no tool-call chunks).
 * Errors are forwarded immediately. useChat receives one batch: text + tool invocations + finish.
 *
 * @param {{ onFinish?: (assistantMessage: object) => void }} options - optional callback when stream finishes (for persisting assistant message)
 */
function sseToDataStreamTransform(options = {}) {
  const onFinish = options.onFinish;
  let buffer = '';
  /** Accumulate argsTextDelta per toolCallId when we don't get tool-input-available with full input */
  const pendingToolCalls = new Map();
  /** Accumulate assistant message for onFinish and for final flush (text + toolCalls) */
  const accumulated = {
    text: '',
    toolCalls: new Map(),
  };

  function processPart(part, controller) {
    const type = part.type;
    // Errors go through immediately; everything else is buffered.
    if (type === 'error' && part.errorText) {
      controller.enqueue(new TextEncoder().encode(`3:${JSON.stringify(part.errorText)}\n`));
      return;
    }
    if (type === 'text-delta' && typeof part.delta === 'string') {
      accumulated.text += part.delta;
      return;
    }
    if (type === 'tool-input-start' && part.toolCallId && part.toolName) {
      pendingToolCalls.set(part.toolCallId, { toolName: part.toolName, text: '' });
      return;
    }
    if (type === 'tool-input-delta' && part.toolCallId) {
      const pending = pendingToolCalls.get(part.toolCallId);
      if (pending) pending.text += part.inputTextDelta ?? '';
      return;
    }
    if (type === 'tool-input-available' && part.toolCallId && part.toolName) {
      const args = part.input ?? {};
      accumulated.toolCalls.set(part.toolCallId, {
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args,
      });
      pendingToolCalls.delete(part.toolCallId);
      return;
    }
    if (type === 'tool-output-available' && part.toolCallId) {
      const existing = accumulated.toolCalls.get(part.toolCallId) ?? {};
      accumulated.toolCalls.set(part.toolCallId, { ...existing, result: part.output });
      return;
    }
    if (type === 'tool-output-error' && part.toolCallId) {
      const errorResult = { applied: false, error: part.errorText ?? 'Tool error' };
      const existing = accumulated.toolCalls.get(part.toolCallId) ?? {};
      accumulated.toolCalls.set(part.toolCallId, { ...existing, result: errorResult });
      return;
    }
    if (type === 'finish') {
      // Resolve any pending tool args from deltas
      for (const [toolCallId, pending] of Array.from(pendingToolCalls)) {
        const { value: args } = parsePartialJson(pending.text);
        if (args != null && typeof args === 'object') {
          accumulated.toolCalls.set(toolCallId, {
            toolCallId,
            toolName: pending.toolName,
            args,
          });
        }
      }
      pendingToolCalls.clear();

      if (onFinish) {
        try {
          onFinish(buildAssistantMessageForStore(accumulated));
        } catch (err) {
          console.error('onFinish (persist assistant message):', err);
        }
      }

      // Send final response only: text, then tool invocations (9 + a), then finish (d).
      const enc = new TextEncoder();
      if (accumulated.text) {
        controller.enqueue(enc.encode(`0:${JSON.stringify(accumulated.text)}\n`));
      }
      for (const [, inv] of accumulated.toolCalls) {
        controller.enqueue(
          enc.encode(`9:${JSON.stringify({ toolCallId: inv.toolCallId, toolName: inv.toolName, args: inv.args ?? {} })}\n`)
        );
        if (inv.result !== undefined) {
          controller.enqueue(
            enc.encode(`a:${JSON.stringify({ toolCallId: inv.toolCallId, result: inv.result })}\n`)
          );
        }
      }
      controller.enqueue(
        enc.encode(`d:${JSON.stringify({ finishReason: part.finishReason ?? 'stop' })}\n`)
      );
    }
  }

  return new TransformStream({
    transform(chunk, controller) {
      buffer += new TextDecoder().decode(chunk);
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') continue;
        try {
          processPart(JSON.parse(payload), controller);
        } catch (_) {
          // ignore parse/conversion errors for unknown part types
        }
      }
    },
    flush(controller) {
      for (const [toolCallId, pending] of pendingToolCalls) {
        const { value: args } = parsePartialJson(pending.text);
        if (args != null && typeof args === 'object') {
          accumulated.toolCalls.set(toolCallId, {
            toolCallId,
            toolName: pending.toolName,
            args,
          });
        }
      }
      pendingToolCalls.clear();
      if (buffer.trim()) {
        const line = buffer.split('\n').find((l) => l.startsWith('data: '));
        if (line) {
          const payload = line.slice(6);
          if (payload !== '[DONE]') {
            try {
              processPart(JSON.parse(payload), controller);
            } catch (_) {}
          }
        }
      }
    },
  });
}

/**
 * Convert AI SDK UIMessage[] to { role, content }[] (spec unused; kept for test compatibility).
 */
export function uiMessagesToConversation(messages, _currentSpec) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  return messages.map((m) => {
    const content =
      typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.parts)
          ? (m.parts.find((p) => p.type === 'text')?.text ?? '')
          : '';
    return { role: m.role ?? 'user', content, spec: undefined };
  });
}

export function getLastUserPrompt(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user') {
      const raw =
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.parts)
            ? (m.parts.find((p) => p.type === 'text')?.text ?? '')
            : '';
      return typeof raw === 'string' ? raw : '';
    }
  }
  return '';
}

/**
 * Create the Express app. Optional getChatStream is used by tests to inject mocks.
 * @param {{ getChatStream?: () => typeof chatStream }} options
 */
export function createApp(options = {}) {
  const getChatStream = options.getChatStream ?? (() => chatStream);
  const app = express();

  /** In-memory conversation history keyed by chat/session id. */
  const conversationStore = new Map();

  app.use(express.json());

  app.post('/api/runQuery', async (req, res) => {
    try {
      const { name, params = {}, execution } = req.body ?? {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Missing or invalid 'name'" });
      }

      const { queries } = getQueryCatalog();
      const catalogQuery = Array.isArray(queries) ? queries.find((q) => q.name === name) : null;
      if (!catalogQuery) {
        return res.status(400).json({
          error: `Unknown query "${name}". Allowed: ${(queries ?? []).map((q) => q.name).join(', ') || 'none'}.`,
        });
      }

      const allowedParams = new Set(Array.isArray(catalogQuery.params) ? catalogQuery.params : []);
      const paramKeys = Object.keys(params);
      const invalidKeys = paramKeys.filter((k) => !allowedParams.has(k));
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          error: `Invalid filter/param key(s) for query "${name}": ${invalidKeys.join(', ')}. Allowed params: ${[...allowedParams].sort().join(', ')}.`,
        });
      }

      if (execution != null && typeof execution !== 'object') {
        return res.status(400).json({ error: "Invalid 'execution' payload." });
      }

      if (
        execution?.deliveryMode !== undefined &&
        !['paginatedList', 'fullVisual', 'summary'].includes(execution.deliveryMode)
      ) {
        return res.status(400).json({
          error: `Invalid execution.deliveryMode "${execution.deliveryMode}". Allowed: paginatedList, fullVisual, summary.`,
        });
      }

      const requestedPage = Math.max(1, Number(execution?.page) || 1);
      const requestedPageSize = Math.min(100, Math.max(1, Number(execution?.pageSize) || 20));
      const dataProvider = createPortfolioDataProvider({
        page: requestedPage,
        pageSize: requestedPageSize,
      });
      const result = await dataProvider.runQuery({
        name,
        params,
        execution:
          execution == null
            ? undefined
            : {
                ...execution,
                ...(execution.deliveryMode === 'paginatedList'
                  ? { page: requestedPage, pageSize: requestedPageSize }
                  : {}),
              },
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * POST /api/chat
   * Body: { id?, message, clearHistory?, currentSpec? }. message is required (current user text).
   * History is stored in memory keyed by id (session/chat id). Streams UI message stream.
   * Response header X-Chat-Id carries the session id for the client.
   */
  app.post('/api/chat', async (req, res) => {
    res.setTimeout(CHAT_ROUTE_TIMEOUT_MS);
    try {
      const body = req.body ?? {};
      const sessionId = typeof body.id === 'string' && body.id.length > 0 ? body.id : randomUUID();
      const currentSpec =
        body.currentSpec !== undefined &&
        body.currentSpec !== null &&
        typeof body.currentSpec === 'object' &&
        !Array.isArray(body.currentSpec)
          ? body.currentSpec
          : null;
      const prompt =
        typeof body.message === 'string' ? body.message.trim() : '';
      if (!prompt) {
        return res.status(400).json({ error: 'No user message found' });
      }

      let history = conversationStore.get(sessionId);
      if (body.clearHistory || !history) {
        history = { messages: [] };
        conversationStore.set(sessionId, history);
      }

      const userMessage = { role: 'user', content: prompt };
      history.messages.push(userMessage);
      conversationStore.set(sessionId, history);

      const messagesForAgent = [...history.messages];

      const response = await getChatStream()(
        { prompt, messages: messagesForAgent, currentSpec },
        {}
      );

      res.setHeader('X-Chat-Id', sessionId);
      res.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'x-chat-id') res.setHeader(key, value);
      });
      const onFinish = (assistantMessage) => {
        const h = conversationStore.get(sessionId);
        if (h?.messages) {
          h.messages.push(assistantMessage);
          conversationStore.set(sessionId, h);
        }
      };
      const transformed = response.body.pipeThrough(
        sseToDataStreamTransform({ onFinish })
      );
      const reader = transformed.getReader();
      const pump = () =>
        reader.read().then(({ done, value }) => {
          if (done) {
            res.end();
            return;
          }
          res.write(Buffer.from(value));
          return pump();
        });
      pump().catch((err) => {
        console.error('Chat stream error:', err);
        if (!res.headersSent) res.status(500).json({ error: String(err) });
        else
          try {
            res.end();
          } catch (_) {}
      });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes('OPENAI_API_KEY') ? 503 : 502;
        res.status(status).json({ error: message });
      }
    }
  });

  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}

const app = createApp();
const isMainModule = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  app.listen(port, () => {
    console.log(`Reporting portfolio example listening on http://localhost:${port}`);
  });
}

export { app };
