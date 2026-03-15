import 'dotenv/config';
import express from 'express';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from 'ai';
import { createPortfolioDataProvider } from './src/data-provider.js';
import { getQueryCatalog } from './src/query-catalog.js';
import { chatStream } from './src/agent/build-dashboard.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

/** Chat route timeout (ms). */
const CHAT_ROUTE_TIMEOUT_MS = 5 * 60 * 1000;

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

function formatDataStreamPart(code, value) {
  return `${code}:${JSON.stringify(value)}\n`;
}

function createUiMessageChunkToDataStream() {
  const pendingToolCalls = new Map();
  const encoder = new TextEncoder();

  return new TransformStream({
    transform(part, controller) {
      switch (part.type) {
        case 'start':
          if (part.messageId) {
            controller.enqueue(
              encoder.encode(formatDataStreamPart('f', { messageId: part.messageId }))
            );
          }
          break;
        case 'start-step':
          if (part.messageId) {
            controller.enqueue(
              encoder.encode(formatDataStreamPart('f', { messageId: part.messageId }))
            );
          }
          break;
        case 'text-delta':
          controller.enqueue(encoder.encode(formatDataStreamPart('0', part.delta ?? '')));
          break;
        case 'reasoning-delta':
          controller.enqueue(encoder.encode(formatDataStreamPart('g', part.delta ?? '')));
          break;
        case 'tool-input-start':
          pendingToolCalls.set(part.toolCallId, { toolName: part.toolName, text: '' });
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('b', {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
              })
            )
          );
          break;
        case 'tool-input-delta': {
          const pending = pendingToolCalls.get(part.toolCallId);
          if (pending) pending.text += part.inputTextDelta ?? '';
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('c', {
                toolCallId: part.toolCallId,
                argsTextDelta: part.inputTextDelta ?? '',
              })
            )
          );
          break;
        }
        case 'tool-input-available':
          pendingToolCalls.delete(part.toolCallId);
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('9', {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.input ?? {},
              })
            )
          );
          break;
        case 'tool-input-error':
          pendingToolCalls.delete(part.toolCallId);
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('9', {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args:
                  part.input && typeof part.input === 'object' && !Array.isArray(part.input)
                    ? part.input
                    : {},
              })
            )
          );
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('a', {
                toolCallId: part.toolCallId,
                result: { error: part.errorText ?? 'Tool input error' },
              })
            )
          );
          break;
        case 'tool-output-available':
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('a', {
                toolCallId: part.toolCallId,
                result: part.output,
              })
            )
          );
          break;
        case 'tool-output-error':
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('a', {
                toolCallId: part.toolCallId,
                result: { error: part.errorText ?? 'Tool output error' },
              })
            )
          );
          break;
        case 'finish-step':
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('e', {
                finishReason: part.finishReason ?? 'unknown',
                isContinued: false,
              })
            )
          );
          break;
        case 'finish':
          for (const [toolCallId, pending] of pendingToolCalls) {
            const { value: args } = parsePartialJson(pending.text);
            controller.enqueue(
              encoder.encode(
                formatDataStreamPart('9', {
                  toolCallId,
                  toolName: pending.toolName,
                  args: args && typeof args === 'object' && !Array.isArray(args) ? args : {},
                })
              )
            );
          }
          pendingToolCalls.clear();
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('d', {
                finishReason: part.finishReason ?? 'stop',
              })
            )
          );
          break;
        case 'error':
          controller.enqueue(
            encoder.encode(formatDataStreamPart('3', part.errorText ?? 'Stream error'))
          );
          break;
        default:
          break;
      }
    },
  });
}

async function persistAssistantMessageFromStream(stream, onFinish) {
  let latestMessage = null;

  try {
    const uiChunkStream = parseJsonEventStream({
      stream,
      schema: uiMessageChunkSchema,
    }).pipeThrough(
      new TransformStream({
        async transform(chunk, controller) {
          if (!chunk.success) {
            throw chunk.error;
          }
          controller.enqueue(chunk.value);
        },
      })
    );

    for await (const message of readUIMessageStream({ stream: uiChunkStream })) {
      latestMessage = message;
    }

    if (latestMessage && onFinish) {
      onFinish(latestMessage);
    }
  } catch (err) {
    console.error('persist assistant message:', err);
  }
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
      const prompt = typeof body.message === 'string' ? body.message.trim() : '';
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

      if (!response.body) {
        throw new Error('Chat response body is empty');
      }

      const [clientStream, persistenceStream] = response.body.tee();
      void persistAssistantMessageFromStream(persistenceStream, onFinish);

      const transformed = parseJsonEventStream({
        stream: clientStream,
        schema: uiMessageChunkSchema,
      })
        .pipeThrough(
          new TransformStream({
            async transform(chunk, controller) {
              if (!chunk.success) {
                throw chunk.error;
              }
              controller.enqueue(chunk.value);
            },
          })
        )
        .pipeThrough(createUiMessageChunkToDataStream());

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
        console.error('Chat stream error while adapting UI message stream to data protocol:', err);
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
