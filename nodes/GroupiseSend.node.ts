import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { GroupiseNodeError } from '../errors.js';
import type { GroupiseApiCredentials } from '../types.js';
import { parseSendMessageRequest, type SendMessageRequest } from '../validation.js';

const REQUEST_TIMEOUT_MS = 30_000;

export class GroupiseSend implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Groupise Send Message',
    name: 'groupiseSend',
    group: ['output'],
    version: 1,
    description: 'Sends a message to a Groupise chat through the Laravel API.',
    defaults: { name: 'Groupise Send Message' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'groupiseApi', required: true }],
    properties: [
      {
        displayName: 'Connection ID',
        name: 'connectionId',
        type: 'string',
        required: true,
        default: '',
      },
      {
        displayName: 'Chat ID',
        name: 'chatId',
        type: 'string',
        required: true,
        default: '',
      },
      {
        displayName: 'Message',
        name: 'body',
        type: 'string',
        typeOptions: { rows: 5 },
        required: true,
        default: '',
      },
      {
        displayName: 'Reply To WhatsApp Message ID',
        name: 'replyToWaMessageId',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Client Message ID',
        name: 'clientMessageId',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Idempotency Key',
        name: 'idempotencyKey',
        type: 'string',
        default: '={{ $json.delivery_id || $json.event_id }}',
        description: 'Stable key derived from the verified webhook delivery or event ID.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials<GroupiseApiCredentials>('groupiseApi');
    const baseUrl = normalizeBaseUrl(credentials);
    const inputData = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < inputData.length; itemIndex += 1) {
      const item = inputData[itemIndex];
      const request = parseSendMessageRequest({
        connection_id: stringParameter(this, 'connectionId', itemIndex),
        chat_id: stringParameter(this, 'chatId', itemIndex),
        body: stringParameter(this, 'body', itemIndex),
        ...(() => {
          const replyToWaMessageId = optionalParameter(this, 'replyToWaMessageId', itemIndex);
          const clientMessageId = optionalParameter(this, 'clientMessageId', itemIndex);
          return {
            ...(replyToWaMessageId === undefined
              ? {}
              : { reply_to_wa_message_id: replyToWaMessageId }),
            ...(clientMessageId === undefined ? {} : { client_message_id: clientMessageId }),
          };
        })(),
      });
      if (request === undefined) {
        throw new GroupiseNodeError('invalid_parameters', 'Groupise send parameters are invalid.');
      }

      const idempotencyKey =
        optionalParameter(this, 'idempotencyKey', itemIndex) ??
        inputString(item, 'delivery_id') ??
        inputString(item, 'event_id') ??
        request.client_message_id;
      if (idempotencyKey === undefined || idempotencyKey.length === 0) {
        throw new GroupiseNodeError('invalid_parameters', 'An idempotency key is required.');
      }

      const sent = await sendMessage(baseUrl, credentials.token, request, idempotencyKey);
      returnData.push({
        json: { ...(sent as IDataObject), idempotency_key: idempotencyKey },
      });
    }

    return [returnData];
  }
}

function normalizeBaseUrl(credentials: GroupiseApiCredentials): string {
  if (typeof credentials.baseUrl !== 'string' || typeof credentials.token !== 'string') {
    throw new GroupiseNodeError('invalid_credential', 'Groupise API credential is incomplete.');
  }
  const baseUrl = credentials.baseUrl.trim().replace(/\/+$/, '');
  if (credentials.token.length === 0 || !/^https?:\/\//.test(baseUrl)) {
    throw new GroupiseNodeError('invalid_credential', 'Groupise API credential is incomplete.');
  }
  return baseUrl;
}

async function sendMessage(
  baseUrl: string,
  token: string,
  request: SendMessageRequest,
  idempotencyKey: string,
): Promise<Record<string, unknown>> {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey,
  });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/messages/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GroupiseNodeError('api_error', 'Groupise API request failed.');
  }

  if (!response.ok) {
    throw new GroupiseNodeError(
      'api_error',
      `Groupise API request failed with HTTP ${response.status}.`,
    );
  }

  const payload: unknown = await response.json().catch(() => undefined);
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new GroupiseNodeError('api_error', 'Groupise API returned an invalid response.');
  }
  return payload.data;
}

function stringParameter(context: IExecuteFunctions, name: string, itemIndex: number): string {
  const value = context.getNodeParameter(name, itemIndex, '');
  return typeof value === 'string' ? value : '';
}

function optionalParameter(
  context: IExecuteFunctions,
  name: string,
  itemIndex: number,
): string | undefined {
  const value = stringParameter(context, name, itemIndex);
  return value.length === 0 ? undefined : value;
}

function inputString(item: INodeExecutionData | undefined, key: string): string | undefined {
  if (item === undefined) {
    return undefined;
  }
  const value = item.json[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
