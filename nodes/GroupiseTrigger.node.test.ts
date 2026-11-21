import { createHmac } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { WEBHOOK_HEADERS } from '../verification.js';
import { GroupiseTrigger } from './GroupiseTrigger.node.js';

const secret = '<webhook-secret-placeholder>';
const envelope = {
  id: '019a0000-0000-7000-8000-000000000001',
  type: 'message.received' as const,
  version: 1,
  occurred_at: '2026-03-10T09:00:00Z',
  data: {
    chat_id: '019a0000-0000-7000-8000-000000000002',
  },
};
const rawBody = JSON.stringify(envelope);

describe('GroupiseTrigger', () => {
  it('emits a verified envelope without exposing verification material', async () => {
    const replayState: IDataObject = {};
    const result = await runWebhook({
      rawBody,
      headers: signedHeaders(rawBody),
      replayState,
    });

    expect(result.webhookResponse).toEqual({ status: 202 });
    const json = result.workflowData?.[0]?.[0]?.json;
    expect(json).toMatchObject({
      id: envelope.id,
      event_id: envelope.id,
      delivery_id: 'delivery-1',
      type: 'message.received',
    });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain('sha256=');
  });

  it('rejects a tampered delivery without emitting workflow data', async () => {
    const result = await runWebhook({
      rawBody: '{"id":"event-1","type":"message.sent"}',
      headers: signedHeaders(rawBody),
      replayState: {},
    });

    expect(result.webhookResponse).toEqual({ status: 401 });
    expect(result.workflowData).toBeUndefined();
  });

  it('rejects a replayed delivery', async () => {
    const replayState: IDataObject = {};
    const headers = signedHeaders(rawBody);

    await runWebhook({ rawBody, headers, replayState });
    const replay = await runWebhook({ rawBody, headers, replayState });

    expect(replay.webhookResponse).toEqual({ status: 401 });
    expect(replay.workflowData).toBeUndefined();
  });
});

async function runWebhook(options: {
  rawBody: string;
  headers: IncomingHttpHeaders;
  replayState: IDataObject;
}) {
  const node = new GroupiseTrigger();
  const webhook = node.webhook;
  if (webhook === undefined) {
    throw new Error('GroupiseTrigger is missing its webhook handler');
  }

  const context = {
    getCredentials: async () => ({ secret, replayWindowSeconds: 300 }),
    getHeaderData: () => options.headers,
    getRequestObject: () => ({ rawBody: options.rawBody }),
    getWorkflowStaticData: () => options.replayState,
  } as unknown as IWebhookFunctions;

  return webhook.call(context);
}

function signedHeaders(body: string): IncomingHttpHeaders {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return {
    [WEBHOOK_HEADERS.eventId]: envelope.id,
    [WEBHOOK_HEADERS.deliveryId]: 'delivery-1',
    [WEBHOOK_HEADERS.timestamp]: timestamp,
    [WEBHOOK_HEADERS.signature]: `sha256=${digest}`,
  };
}
