import type {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';
import { GroupiseNodeError } from '../errors.js';
import type { GroupiseWebhookCredentials } from '../types.js';
import { DEFAULT_REPLAY_WINDOW_SECONDS, verifyWebhookRequest } from '../verification.js';
import { parseWebhookEnvelope } from '../validation.js';

export class GroupiseTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Groupise Trigger',
    name: 'groupiseTrigger',
    group: ['trigger'],
    version: 1,
    description: 'Starts a workflow when Laravel delivers a signed Groupise webhook.',
    defaults: { name: 'Groupise Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'groupiseWebhook', required: true }],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        path: 'groupise',
        responseMode: 'onReceived',
      },
    ],
    properties: [],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    try {
      const credentials = await this.getCredentials<GroupiseWebhookCredentials>('groupiseWebhook');
      if (typeof credentials.secret !== 'string' || credentials.secret.length === 0) {
        throw new GroupiseNodeError('invalid_credential', 'Groupise webhook secret is missing.');
      }

      const replayWindowSeconds =
        typeof credentials.replayWindowSeconds === 'number' && credentials.replayWindowSeconds > 0
          ? credentials.replayWindowSeconds
          : DEFAULT_REPLAY_WINDOW_SECONDS;

      const rawBody = readRawBody(this);
      const verified = verifyWebhookRequest({
        secret: credentials.secret,
        rawBody,
        headers: this.getHeaderData(),
        replayState: this.getWorkflowStaticData('global'),
        replayWindowSeconds,
      });

      const envelope = parseWebhookEnvelope(rawBody);
      if (envelope === undefined) {
        throw new GroupiseNodeError('invalid_payload', 'Groupise webhook payload is invalid.');
      }
      const output: IDataObject = {
        id: envelope.id,
        event_id: envelope.id,
        delivery_id: verified.deliveryId,
        type: envelope.type,
        version: envelope.version,
        occurred_at: envelope.occurred_at,
        data: envelope.data as IDataObject,
      };
      const item: INodeExecutionData = { json: output };

      return {
        workflowData: [[item]],
        webhookResponse: { status: 202 },
      };
    } catch (error) {
      return { webhookResponse: { status: statusForError(error) } };
    }
  }
}

function statusForError(error: unknown): number {
  if (!(error instanceof GroupiseNodeError)) {
    return 500;
  }
  return error.code === 'invalid_payload' || error.code === 'missing_raw_body' ? 400 : 401;
}

function readRawBody(context: IWebhookFunctions): string {
  const request = context.getRequestObject() as unknown as { rawBody?: string | Buffer };
  if (typeof request.rawBody === 'string') {
    return request.rawBody;
  }
  if (Buffer.isBuffer(request.rawBody)) {
    return request.rawBody.toString('utf8');
  }
  throw new GroupiseNodeError('missing_raw_body', 'Raw webhook body is unavailable.');
}
