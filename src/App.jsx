import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { ReportRenderer, defaultRegistry } from '@prism-reporting/react-ui';
import { executiveCommandCenterSpec, starterReports } from './report-spec.js';

const TOOL_LABELS = {
  list_available_queries: 'Query catalog',
  describe_query: 'Query metadata',
  preview_query: 'Query preview',
  apply_report_spec: 'Report builder',
};

function createDataProvider() {
  return {
    async runQuery(request) {
      const res = await fetch('/api/runQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
  };
}

function useStableChatId() {
  const [chatId] = useState(() => crypto.randomUUID());
  return chatId;
}

function getUiToolParts(message) {
  return (message?.parts ?? []).filter((part) => {
    if (!part || typeof part.type !== 'string') return false;
    return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
  });
}

function getToolActivities(message) {
  if (Array.isArray(message?.toolInvocations) && message.toolInvocations.length > 0) {
    return message.toolInvocations.map((invocation) => ({
      toolCallId: invocation.toolCallId,
      toolName: invocation.toolName ?? 'tool',
      state: invocation.state ?? 'call',
      input: invocation.args ?? invocation.input ?? {},
      output: invocation.result,
      errorText:
        invocation.result &&
        typeof invocation.result === 'object' &&
        !Array.isArray(invocation.result)
          ? (invocation.result.error ?? null)
          : null,
    }));
  }

  return getUiToolParts(message).map((part) => ({
    toolCallId: part.toolCallId,
    toolName:
      part?.type === 'dynamic-tool' ? (part.toolName ?? 'tool') : part.type.replace(/^tool-/, ''),
    state: part.state ?? 'input-streaming',
    input: part.input ?? part.rawInput ?? {},
    output: part.output,
    errorText: part.errorText ?? null,
  }));
}

function getToolLabel(activity) {
  const toolName = activity.toolName ?? 'tool';
  return TOOL_LABELS[toolName] ?? toolName.replaceAll('_', ' ');
}

function getToolStatusLabel(activity) {
  switch (activity?.state) {
    case 'partial-call':
    case 'input-streaming':
      return 'Preparing';
    case 'call':
    case 'input-available':
      return 'Running';
    case 'result':
      return activity?.errorText ? 'Error' : 'Done';
    case 'output-available':
      return 'Done';
    case 'output-error':
      return 'Error';
    default:
      return 'Working';
  }
}

function getToolSummary(activity) {
  const toolName = activity.toolName ?? 'tool';
  const input = activity?.input ?? {};

  if (toolName === 'list_available_queries') {
    return 'Inspecting the available reporting queries.';
  }
  if (toolName === 'describe_query') {
    return input?.name
      ? `Inspecting the "${input.name}" query schema.`
      : 'Inspecting query metadata.';
  }
  if (toolName === 'preview_query') {
    return input?.name
      ? `Running "${input.name}" before drafting the report.`
      : 'Running a query preview before drafting the report.';
  }
  if (toolName === 'apply_report_spec') {
    return 'Validating and applying the next report spec.';
  }

  return `Running ${getToolLabel(activity)}.`;
}

function getToolResultSummary(activity) {
  if (
    activity?.state !== 'result' &&
    activity?.state !== 'output-available' &&
    activity?.state !== 'output-error'
  ) {
    return null;
  }

  const toolName = activity.toolName ?? 'tool';
  const output = activity?.output;

  if (activity?.errorText) {
    return activity.errorText;
  }

  if (activity?.state === 'output-error') {
    return activity?.errorText ?? 'Tool execution failed.';
  }

  if (toolName === 'list_available_queries') {
    const count = Array.isArray(output?.queries) ? output.queries.length : null;
    return count != null ? `Loaded ${count} published quer${count === 1 ? 'y' : 'ies'}.` : null;
  }

  if (toolName === 'describe_query') {
    if (output?.found && output?.query?.name) {
      return `Loaded canonical fields and params for "${output.query.name}".`;
    }
    return output?.found === false ? 'The requested query was not found in the catalog.' : null;
  }

  if (toolName === 'preview_query') {
    if (output?.ok === false) {
      return output?.error ?? 'The query preview could not run.';
    }
    if (output?.ok === true) {
      const previewCount = Array.isArray(output?.rows) ? output.rows.length : 0;
      const total = typeof output?.totalCount === 'number' ? output.totalCount : null;
      return total != null
        ? `Preview returned ${previewCount} row${previewCount === 1 ? '' : 's'} of ${total}.`
        : `Preview returned ${previewCount} row${previewCount === 1 ? '' : 's'}.`;
    }
  }

  if (toolName === 'apply_report_spec') {
    if (output?.applied === true) return 'Live report updated.';
    if (output?.applied === false) return output?.error ?? 'The report spec failed validation.';
  }

  return null;
}

export default function App() {
  const dataProvider = useMemo(() => createDataProvider(), []);
  const [currentSpec, setCurrentSpec] = useState(executiveCommandCenterSpec);
  const [reportViewMode, setReportViewMode] = useState('rendered');
  const [input, setInput] = useState('');
  const [streamError, setStreamError] = useState(null);
  const clearHistoryNextRef = useRef(false);
  const chatId = useStableChatId();

  const lastAppliedToolCallIdRef = useRef(null);

  const chat = useChat({
    api: '/api/chat',
    streamProtocol: 'data',
    onError(error) {
      console.error('Chat stream error:', error);
      setStreamError(error instanceof Error ? error.message : String(error));
    },
    async onResponse(response) {
      if (!response.ok) {
        console.error('Chat request failed:', response.status, response.statusText);
      }
    },
  });

  // Apply report spec when the server returns a successful apply_report_spec result (tool is executed on server).
  useEffect(() => {
    const messages = chat.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== 'assistant') continue;

      for (const part of getToolActivities(msg)) {
        if (
          part.toolName === 'apply_report_spec' &&
          (part.state === 'result' || part.state === 'output-available') &&
          part.output?.applied === true
        ) {
          if (part.toolCallId === lastAppliedToolCallIdRef.current) return;
          const spec = part.input?.spec;
          if (spec != null && typeof spec === 'object' && !Array.isArray(spec)) {
            lastAppliedToolCallIdRef.current = part.toolCallId;
            setCurrentSpec(spec);
          }
          return;
        }
      }
    }
  }, [chat.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    setStreamError(null);
    const clearHistory = clearHistoryNextRef.current;
    if (clearHistory) clearHistoryNextRef.current = false;
    chat.append(
      { role: 'user', content: text },
      { body: { id: chatId, message: text, clearHistory, currentSpec } }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.form?.requestSubmit();
    }
  };

  const handleSelectStarter = (report) => {
    setCurrentSpec(report.spec);
    setInput('');
    chat.setMessages?.([]);
    clearHistoryNextRef.current = true;
  };

  const loading = chat.status === 'streaming' || chat.status === 'submitted';
  const displayError = streamError ?? chat.error?.message ?? null;

  return (
    <div className="portfolio-app-shell antialiased">
      <header className="portfolio-app-header">
        <div className="portfolio-app-header-inner gap-4">
          <div>
            <h1 className="m-0 text-[22px] font-semibold tracking-tight text-slate-950">
              Program Reporting Showcase
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              A richer portfolio and program dataset showcasing modern reporting DSL patterns:
              timelines, signal maps, advanced tables, risk reviews, and narrative boards. Use it as
              a starter for connecting your own dataset through the query catalog and data provider.
            </p>
          </div>

          <div className="portfolio-report-picker">
            <span className="text-sm text-slate-600 mr-2">
              {starterReports.find((r) => r.spec.id === currentSpec?.id)?.label ??
                currentSpec?.title ??
                'Report'}
            </span>
            <label htmlFor="portfolio-report-select" className="sr-only">
              Select report
            </label>
            <select
              id="portfolio-report-select"
              value={starterReports.find((r) => r.spec.id === currentSpec?.id)?.id ?? ''}
              onChange={(e) => {
                const report = starterReports.find((r) => r.id === e.target.value);
                if (report) handleSelectStarter(report);
              }}
              className="portfolio-report-select text-sm font-medium text-slate-700 border border-slate-300 rounded-md px-3 py-1.5 bg-white"
            >
              {starterReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="portfolio-app-main">
        <section className="portfolio-chat-panel">
          <div className="portfolio-chat-panel-header">
            <div>
              <h2 className="portfolio-section-title">Chat</h2>
              <p className="portfolio-helper-text">Chat with the assistant.</p>
            </div>
          </div>

          <div className="portfolio-chat-history">
            {chat.messages?.map((message) => {
              const toolParts = getToolActivities(message);
              return (
                <article
                  key={message.id}
                  className={`portfolio-chat-message portfolio-chat-message-${message.role}`}
                >
                  <div className="portfolio-chat-message-meta">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="portfolio-chat-message-body">
                    {message.parts?.length ? (
                      <>
                        {message.parts.map((part, i) =>
                          part.type === 'text' ? (
                            <p key={`${message.id}-${i}`}>{part.text}</p>
                          ) : null
                        )}
                        {toolParts.length > 0 ? (
                          <div className="portfolio-chat-tool-list">
                            {toolParts.map((part) => {
                              const resultSummary = getToolResultSummary(part);
                              return (
                                <section
                                  key={part.toolCallId}
                                  className={`portfolio-chat-tool portfolio-chat-tool-state-${part.state ?? 'working'}`}
                                >
                                  <div className="portfolio-chat-tool-header">
                                    <span className="portfolio-chat-tool-name">
                                      {getToolLabel(part)}
                                    </span>
                                    <span className="portfolio-chat-tool-state">
                                      {getToolStatusLabel(part)}
                                    </span>
                                  </div>
                                  <p className="portfolio-chat-tool-summary">
                                    {getToolSummary(part)}
                                  </p>
                                  {resultSummary ? (
                                    <p className="portfolio-chat-tool-result">{resultSummary}</p>
                                  ) : null}
                                </section>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {message.content != null && (
                          <p>{typeof message.content === 'string' ? message.content : ''}</p>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}

            {loading ? (
              <article className="portfolio-chat-message portfolio-chat-message-assistant">
                <div className="portfolio-chat-message-meta">Assistant</div>
                <p className="portfolio-chat-message-body">Replying…</p>
              </article>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="portfolio-chat-composer">
            <label className="portfolio-composer-label" htmlFor="portfolio-chat-input">
              Message
            </label>
            <textarea
              id="portfolio-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              disabled={loading}
              className="portfolio-prompt-input shadow-sm"
              rows={4}
            />
            <div className="portfolio-chat-composer-footer">
              {displayError ? (
                <p className="portfolio-error-text">{displayError}</p>
              ) : (
                <p className="portfolio-helper-text">Send a message to the assistant.</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="portfolio-prompt-button inline-flex items-center justify-center shadow-sm"
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </section>

        <section className="portfolio-report-panel">
          <div className="portfolio-report-panel-header">
            <div>
              <h2 className="portfolio-section-title">Live Report</h2>
              <p className="portfolio-helper-text">
                Switch between the rendered report and the raw DSL to see how the example is built.
              </p>
            </div>
            <div className="portfolio-view-toggle" role="tablist" aria-label="Report view mode">
              <button
                type="button"
                role="tab"
                aria-selected={reportViewMode === 'rendered'}
                className={`portfolio-view-toggle-button${
                  reportViewMode === 'rendered' ? ' is-active' : ''
                }`}
                onClick={() => setReportViewMode('rendered')}
              >
                Rendered report
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={reportViewMode === 'dsl'}
                className={`portfolio-view-toggle-button${
                  reportViewMode === 'dsl' ? ' is-active' : ''
                }`}
                onClick={() => setReportViewMode('dsl')}
              >
                DSL only
              </button>
            </div>
          </div>
          {reportViewMode === 'dsl' ? (
            <div className="portfolio-dsl-panel">
              <pre className="portfolio-dsl-code">{JSON.stringify(currentSpec, null, 2)}</pre>
            </div>
          ) : (
            <ReportRenderer
              spec={currentSpec}
              dataProvider={dataProvider}
              registry={defaultRegistry}
            />
          )}
        </section>
      </main>
    </div>
  );
}
