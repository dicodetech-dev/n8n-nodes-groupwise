import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { IDataObject } from 'n8n-workflow';
import { GroupiseNodeError } from './errors.js';

export const WEBHOOK_HEADERS = {
  eventId: 'x-groupwise-event-id',
  timestamp: 'x-groupwise-timestamp',
  signature: 'x-groupwise-signature',
  deliveryId: 'x-groupwise-delivery-id',
} as const;

export const DEFAULT_REPLAY_WINDOW_SECONDS = 300;

const SIGNATURE_PREFIX = 'sha256=';
const REPLAY_STATE_KEY = 'groupiseWebhookReplay';
const MAX_REPLAY_ENTRIES = 10_000;

export interface VerifyWebhookRequestOptions {
  secret: string;
  rawBody: string;
  headers: IncomingHttpHeaders;
  replayState: IDataObject;
  nowSeconds?: number;
  replayWindowSeconds?: number;
}

export interface VerifiedWebhookRequest {
  eventId: string;
  deliveryId: string;
  timestampSeconds: number;
}

export function verifyWebhookRequest(options: VerifyWebhookRequestOptions): VerifiedWebhookRequest {
  const eventId = readHeader(options.headers, WEBHOOK_HEADERS.eventId);
  const deliveryId = readHeader(options.headers, WEBHOOK_HEADERS.deliveryId);
  const timestamp = readHeader(options.headers, WEBHOOK_HEADERS.timestamp);
  const signature = readHeader(options.headers, WEBHOOK_HEADERS.signature);

  if (!eventId || !deliveryId || !timestamp || !signature) {
    throw new GroupiseNodeError(
      'missing_headers',
      'Required Groupise webhook headers are missing.',
    );
  }

  if (!isValidIdentifier(eventId) || !isValidIdentifier(deliveryId)) {
    throw new GroupiseNodeError('invalid_headers', 'Groupise webhook identifiers are malformed.');
  }

  if (!/^\d+$/.test(timestamp)) {
    throw new GroupiseNodeError('invalid_timestamp', 'Groupise webhook timestamp is malformed.');
  }

  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) {
    throw new GroupiseNodeError('invalid_signature', 'Groupise webhook signature is malformed.');
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) {
    throw new GroupiseNodeError('invalid_timestamp', 'Groupise webhook timestamp is malformed.');
  }

  const replayWindowSeconds = options.replayWindowSeconds ?? DEFAULT_REPLAY_WINDOW_SECONDS;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > replayWindowSeconds) {
    throw new GroupiseNodeError(
      'stale_timestamp',
      'Groupise webhook timestamp is outside the replay window.',
    );
  }

  const expectedDigest = createHmac('sha256', options.secret)
    .update(`${timestamp}.${options.rawBody}`)
    .digest('hex');
  const providedDigest = signature.slice(SIGNATURE_PREFIX.length).toLowerCase();
  const expectedBuffer = Buffer.from(expectedDigest, 'hex');
  const providedBuffer = Buffer.from(providedDigest, 'hex');
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new GroupiseNodeError('invalid_signature', 'Groupise webhook signature is invalid.');
  }

  const replayKey = `${eventId}|${deliveryId}`;
  const seen = readReplayState(options.replayState);
  pruneReplayState(seen, nowSeconds, replayWindowSeconds);
  const previous = seen[replayKey];
  if (typeof previous === 'number' && Math.abs(nowSeconds - previous) <= replayWindowSeconds) {
    throw new GroupiseNodeError('replay', 'Groupise webhook delivery is a replay.');
  }

  seen[replayKey] = timestampSeconds;
  options.replayState[REPLAY_STATE_KEY] = seen;

  return { eventId, deliveryId, timestampSeconds };
}

function readHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : undefined;
  }
  return undefined;
}

function isValidIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 255 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function readReplayState(staticData: IDataObject): Record<string, number> {
  const raw = staticData[REPLAY_STATE_KEY];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    }
  }
  return result;
}

function pruneReplayState(
  seen: Record<string, number>,
  nowSeconds: number,
  replayWindowSeconds: number,
): void {
  for (const [key, value] of Object.entries(seen)) {
    if (Math.abs(nowSeconds - value) > replayWindowSeconds) {
      delete seen[key];
    }
  }

  const entries = Object.entries(seen).sort((a, b) => a[1] - b[1]);
  while (entries.length >= MAX_REPLAY_ENTRIES) {
    const oldest = entries.shift();
    if (oldest === undefined) {
      break;
    }
    delete seen[oldest[0]];
  }
}
