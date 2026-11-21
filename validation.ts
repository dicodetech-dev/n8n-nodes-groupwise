export const WEBHOOK_EVENT_TYPES = [
  'message.received',
  'message.sent',
  'connection.status_changed',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface SendMessageRequest {
  connection_id: string;
  chat_id: string;
  body: string;
  reply_to_wa_message_id?: string;
  client_message_id?: string;
}

export interface WebhookEnvelope {
  id: string;
  type: WebhookEventType;
  version: number;
  occurred_at: string;
  data: Record<string, unknown>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseSendMessageRequest(value: unknown): SendMessageRequest | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (!isUuid(value.connection_id) || !isUuid(value.chat_id) || !isNonEmptyString(value.body)) {
    return undefined;
  }
  if (
    (value.reply_to_wa_message_id !== undefined && !isString(value.reply_to_wa_message_id)) ||
    (value.client_message_id !== undefined && !isString(value.client_message_id))
  ) {
    return undefined;
  }

  return {
    connection_id: value.connection_id,
    chat_id: value.chat_id,
    body: value.body,
    ...(value.reply_to_wa_message_id === undefined
      ? {}
      : { reply_to_wa_message_id: value.reply_to_wa_message_id }),
    ...(value.client_message_id === undefined
      ? {}
      : { client_message_id: value.client_message_id }),
  };
}

export function parseWebhookEnvelope(rawBody: string): WebhookEnvelope | undefined {
  let value: unknown;
  try {
    value = JSON.parse(rawBody) as unknown;
  } catch {
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }
  if (!isUuid(value.id) || !isWebhookEventType(value.type)) {
    return undefined;
  }
  if (
    !Number.isInteger(value.version) ||
    (value.version as number) < 1 ||
    !isIsoDateTime(value.occurred_at) ||
    !isRecord(value.data)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    type: value.type,
    version: value.version as number,
    occurred_at: value.occurred_at,
    data: value.data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DATE_TIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isWebhookEventType(value: unknown): value is WebhookEventType {
  return typeof value === 'string' && WEBHOOK_EVENT_TYPES.includes(value as WebhookEventType);
}
