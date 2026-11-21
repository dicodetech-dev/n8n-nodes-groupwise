import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupiseSend } from './GroupiseSend.node.js';

const connectionId = '019a0000-0000-7000-8000-000000000003';
const chatId = '019a0000-0000-7000-8000-000000000002';
const apiToken = '<api-token-placeholder>';
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('GroupiseSend', () => {
  it('sends a validated request with a derived idempotency key', async () => {
    const fetchMock = vi.fn((...args: Parameters<typeof fetch>) => {
      void args;
      return Promise.resolve(
        new Response(JSON.stringify({ data: sentMessage() }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await runSend(
      {
        connectionId,
        chatId,
        body: 'Deployment is at 15:00.',
        replyToWaMessageId: 'WA_MESSAGE_ID',
        clientMessageId: 'client-1',
        idempotencyKey: '',
      },
      { delivery_id: 'delivery-1' },
    );

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://groupise.invalid/api/v1/messages/send');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${apiToken}`);
    expect(headers.get('Idempotency-Key')).toBe('delivery-1');
    expect(JSON.parse(String(init?.body))).toEqual({
      connection_id: connectionId,
      chat_id: chatId,
      body: 'Deployment is at 15:00.',
      reply_to_wa_message_id: 'WA_MESSAGE_ID',
      client_message_id: 'client-1',
    });
    expect(result[0]?.[0]?.json).toMatchObject({
      id: sentMessage().id,
      idempotency_key: 'delivery-1',
    });
  });

  it('rejects invalid parameters before making a request', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      runSend(
        {
          connectionId,
          chatId,
          body: '',
          replyToWaMessageId: '',
          clientMessageId: '',
          idempotencyKey: 'key-1',
        },
        {},
      ),
    ).rejects.toMatchObject({ code: 'invalid_parameters' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

async function runSend(
  parameters: Record<string, string>,
  json: Record<string, unknown>,
): Promise<INodeExecutionData[][]> {
  const node = new GroupiseSend();
  const execute = node.execute;
  if (execute === undefined) {
    throw new Error('GroupiseSend is missing its execute handler');
  }

  const context = {
    getCredentials: async () => ({ baseUrl: 'https://groupise.invalid/api/v1', token: apiToken }),
    getInputData: () => [{ json }],
    getNodeParameter: (name: string, _itemIndex: number, fallbackValue?: unknown) =>
      parameters[name] ?? fallbackValue,
  } as unknown as IExecuteFunctions;

  return execute.call(context);
}

function sentMessage() {
  return {
    id: '019a0000-0000-7000-8000-000000000004',
    connection_id: connectionId,
    chat_id: chatId,
    wa_message_id: null,
    body: 'Deployment is at 15:00.',
    direction: 'outbound' as const,
    source: 'bot' as const,
    status: 'queued' as const,
    sent_at: null,
    created_at: '2026-03-10T09:00:00Z',
  };
}
