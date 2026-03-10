import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { ReportRenderer, defaultRegistry } from '@reporting/react-ui';
import { showcaseComplexSpec, starterReports } from './report-spec.js';

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

export default function App() {
  const dataProvider = useMemo(() => createDataProvider(), []);
  const [currentSpec, setCurrentSpec] = useState(showcaseComplexSpec);
  const [input, setInput] = useState('');
  const [streamError, setStreamError] = useState(null);
  const clearHistoryNextRef = useRef(false);
  const chatId = useStableChatId();

  const lastAppliedToolCallIdRef = useRef(null);

  const chat = useChat({
    api: '/api/chat',
  });

  // Apply report spec when the server returns a successful apply_report_dls result (tool is executed on server).
  useEffect(() => {
    const messages = chat.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== 'assistant' || !msg.toolInvocations?.length) continue;
      for (const inv of msg.toolInvocations) {
        if (
          inv.toolName === 'apply_report_dls' &&
          inv.state === 'result' &&
          inv.result?.applied === true
        ) {
          if (inv.toolCallId === lastAppliedToolCallIdRef.current) return;
          const spec = inv.args?.dls ?? inv.input?.dls;
          if (spec != null && typeof spec === 'object' && !Array.isArray(spec)) {
            lastAppliedToolCallIdRef.current = inv.toolCallId;
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
  // Server errors are sent as data-stream code 3 and set chat.error by the SDK
  const displayError = streamError ?? chat.error?.message ?? null;

  return (
    <div className="portfolio-app-shell antialiased">
      <header className="portfolio-app-header">
        <div className="portfolio-app-header-inner gap-4">
          <div>
            <h1 className="m-0 text-[22px] font-semibold tracking-tight text-slate-950">
              Portfolio Reporting Example
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Mocked quarterly portfolio data for an executive team reviewing delivery health,
              milestones, budget, and risk. Use this starter to connect your own dataset via the
              query catalog and data provider.
            </p>
          </div>

          <div className="portfolio-report-picker">
            <span className="text-sm text-slate-600 mr-2">
              {starterReports.find((r) => r.spec.id === currentSpec?.id)?.label ?? currentSpec?.title ?? 'Report'}
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
              <p className="portfolio-helper-text">
                Chat with the assistant.
              </p>
            </div>
          </div>

          <div className="portfolio-chat-history">
            {chat.messages?.map((message) => {
              const textParts = message.parts?.filter((p) => p.type === 'text') ?? [];
              const hasReportUpdate =
                message.role === 'assistant' &&
                textParts.length === 0 &&
                message.toolInvocations?.some(
                  (t) => t.toolName === 'apply_report_dls' && t.state === 'result'
                );
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
                        {hasReportUpdate && (
                          <p className="portfolio-helper-text">Report updated.</p>
                        )}
                      </>
                    ) : (
                      <>
                        {message.content != null && (
                          <p>{typeof message.content === 'string' ? message.content : ''}</p>
                        )}
                        {hasReportUpdate && (
                          <p className="portfolio-helper-text">Report updated.</p>
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
                <p className="portfolio-helper-text">
                  Send a message to the assistant.
                </p>
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
            <h2 className="portfolio-section-title">Live Report</h2>
            <p className="portfolio-helper-text">The latest report spec is rendered here.</p>
          </div>
          <ReportRenderer
            spec={currentSpec}
            dataProvider={dataProvider}
            registry={defaultRegistry}
          />
        </section>
      </main>
    </div>
  );
}
