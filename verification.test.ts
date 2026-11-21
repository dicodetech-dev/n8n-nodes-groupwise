import { createHmac } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { GroupiseNodeError, type GroupiseErrorCode } from './errors.js';
import {
  DEFAULT_REPLAY_WINDOW_SECONDS,
  WEBHOOK_HEADERS,
  verifyWebhookRequest,
} from './verification.js';

const secret = '<webhook-secret-placeholder>';
const rawBody = '{"id":"event-1","type":"message.received"}';

describe('verifyWebhookRequest', () => {
  it('accepts a correctly signed delivery and records replay state', () => {
    const replayState: IDataObject = {};
    const result = verifyWebhookRequest({
      secret,
      rawBody,
      headers: signedHeaders(rawBody, '1000'),
      replayState,
      nowSeconds: 1000,
    });

    expect(result).toEqual({
      eventId: 'event-1',
      deliveryId: 'delivery-1',
      timestampSeconds: 1000,
    });
    expect(replayState.groupiseWebhookReplay).toEqual({ 'event-1|delivery-1': 1000 });
    expect(DEFAULT_REPLAY_WINDOW_SECONDS).toBe(300);
  });

  it('rejects a signature computed over a different body', () => {
    expectCode(
      () =>
        verifyWebhookRequest({
          secret,
          rawBody: '{"id":"event-1","type":"message.sent"}',
          headers: signedHeaders(rawBody, '1000'),
          replayState: {},
          nowSeconds: 1000,
        }),
      'invalid_signature',
    );
  });

  it('rejects a stale timestamp', () => {
    expectCode(
      () =>
        verifyWebhookRequest({
          secret,
          rawBody,
          headers: signedHeaders(rawBody, '1000'),
          replayState: {},
          nowSeconds: 2000,
          replayWindowSeconds: 300,
        }),
      'stale_timestamp',
    );
  });

  it('rejects a repeated event and delivery pair', () => {
    const replayState: IDataObject = {};
    const options = {
      secret,
      rawBody,
      headers: signedHeaders(rawBody, '1000'),
      replayState,
      nowSeconds: 1000,
    };

    verifyWebhookRequest(options);
    expectCode(() => verifyWebhookRequest(options), 'replay');
  });

  it('rejects missing headers', () => {
    expectCode(
      () =>
        verifyWebhookRequest({
          secret,
          rawBody,
          headers: {},
          replayState: {},
          nowSeconds: 1000,
        }),
      'missing_headers',
    );
  });
});

function signedHeaders(body: string, timestamp: string): IncomingHttpHeaders {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return {
    [WEBHOOK_HEADERS.eventId]: 'event-1',
    [WEBHOOK_HEADERS.deliveryId]: 'delivery-1',
    [WEBHOOK_HEADERS.timestamp]: timestamp,
    [WEBHOOK_HEADERS.signature]: `sha256=${digest}`,
  };
}

function expectCode(run: () => void, code: GroupiseErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(GroupiseNodeError);
    expect((error as GroupiseNodeError).code).toBe(code);
    return;
  }
  throw new Error(`Expected GroupiseNodeError with code ${code}`);
}
