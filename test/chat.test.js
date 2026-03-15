import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getLastUserPrompt, uiMessagesToConversation, createApp } from '../server.js';

describe('getLastUserPrompt', () => {
  it('returns empty string when messages is not an array', () => {
    assert.equal(getLastUserPrompt(undefined), '');
    assert.equal(getLastUserPrompt(null), '');
  });

  it('returns empty string when messages is empty', () => {
    assert.equal(getLastUserPrompt([]), '');
  });

  it('returns empty string when no user message', () => {
    assert.equal(getLastUserPrompt([{ role: 'assistant', content: 'Hi' }]), '');
  });

  it('returns last user message when content is string', () => {
    assert.equal(
      getLastUserPrompt([
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'Add a KPI' },
      ]),
      'Add a KPI'
    );
  });

  it('returns last user message when content is in parts', () => {
    assert.equal(
      getLastUserPrompt([
        {
          role: 'user',
          parts: [{ type: 'text', text: 'Show the initiative risk review' }],
        },
      ]),
      'Show the initiative risk review'
    );
  });
});

describe('uiMessagesToConversation', () => {
  it('returns empty array when messages is not an array', () => {
    assert.deepEqual(uiMessagesToConversation(undefined, null), []);
    assert.deepEqual(uiMessagesToConversation(null, {}), []);
  });

  it('returns empty array when messages is empty', () => {
    assert.deepEqual(uiMessagesToConversation([], {}), []);
  });

  it('maps messages to role and content with spec undefined', () => {
    const out = uiMessagesToConversation(
      [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Done' }],
        },
      ],
      {}
    );
    assert.equal(out.length, 2);
    assert.equal(out[0].role, 'user');
    assert.equal(out[0].content, 'Hello');
    assert.equal(out[0].spec, undefined);
    assert.equal(out[1].role, 'assistant');
    assert.equal(out[1].content, 'Done');
    assert.equal(out[1].spec, undefined);
  });
});

function createMockStreamResponse() {
  const parts = [
    { type: 'start', messageId: 'test-msg-1' },
    { type: 'text-start', id: 'text-1' },
    { type: 'text-delta', id: 'text-1', delta: 'Some reply.' },
    { type: 'text-end', id: 'text-1' },
    { type: 'finish' },
  ];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
  });
}

describe('POST /api/chat', () => {
  let server;
  let baseUrl;

  before(() => {
    const mockChatStream = () => Promise.resolve(createMockStreamResponse());
    const testApp = createApp({
      getChatStream: () => mockChatStream,
    });
    server = testApp.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    if (server) server.close();
  });

  it('returns 400 when body has no message', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, 'No user message found');
  });

  it('returns 400 when message is empty', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, 'No user message found');
  });

  it('streams 200 with assistant text and finish when message is sent', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert.equal(res.status, 200, 'chat route should return 200');
    assert.ok(res.headers.get('content-type'), 'response should have content-type');
    const text = await res.text();
    assert.ok(text.length > 0, 'stream should not be empty');
    assert.ok(
      text.includes('Some reply.') || text.includes('"Some reply."'),
      'stream should contain assistant text'
    );
    assert.ok(
      text.includes('finish') || text.includes('[DONE]'),
      'stream should contain finish or DONE'
    );
  });

  it('accepts body.message instead of messages and returns X-Chat-Id', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' }),
    });
    assert.equal(res.status, 200);
    const chatId = res.headers.get('X-Chat-Id');
    assert.ok(chatId, 'response should include X-Chat-Id');
    const text = await res.text();
    assert.ok(text.length > 0);
  });

  it('uses same session history when id is sent', async () => {
    const sessionId = 'test-session-' + Date.now();
    const first = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, message: 'First' }),
    });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('X-Chat-Id'), sessionId);
    await first.text();
    const second = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, message: 'Second' }),
    });
    assert.equal(second.status, 200);
    assert.equal(second.headers.get('X-Chat-Id'), sessionId);
    await second.text();
  });
});
