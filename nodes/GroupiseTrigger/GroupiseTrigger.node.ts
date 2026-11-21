import {
  NodeConnectionTypes,
  NodeOperationError,
  type ICredentialsDecrypted,
  type IDataObject,
  type INodeCredentialTestResult,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type IWebhookFunctions,
  type IWebhookResponseData,
} from 'n8n-workflow';
import { GroupiseNodeError } from '../../errors.js';
import type { GroupiseWebhookCredentials } from '../../types.js';
import { DEFAULT_REPLAY_WINDOW_SECONDS, verifyWebhookRequest } from '../../verification.js';
import { parseWebhookEnvelope } from '../../validation.js';

export class GroupiseTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Groupise Trigger',
    name: 'groupiseTrigger',
    icon: { light: 'file:groupise.svg', dark: 'file:groupise.dark.svg' },
    group: ['trigger'],
    version: 1,
    description: 'Starts a workflow when Laravel delivers a signed Groupise webhook',
    subtitle: 'Signed Laravel webhooks',
    defaults: { name: 'Groupise Trigger' },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      { name: 'groupiseWebhookApi', required: true, testedBy: 'groupiseWebhookApiTest' },
    ],
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

  methods = {
    credentialTest: {
      async groupiseWebhookApiTest(
        credential: ICredentialsDecrypted,
      ): Promise<INodeCredentialTestResult> {
        const secret = credential.data?.secret;
        return typeof secret === 'string' && secret.length > 0
          ? { status: 'OK', message: 'Webhook secret is set.' }
          : { status: 'Error', message: 'Webhook secret is missing.' };
      },
    },
  };

  webhookMethods = {
    default: {
      async checkExists(): Promise<boolean> {
        return true;
      },
      async create(): Promise<boolean> {
        return true;
      },
      async delete(): Promise<boolean> {
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    try {
      const credentials =
        await this.getCredentials<GroupiseWebhookCredentials>('groupiseWebhookApi');
      if (typeof credentials.secret !== 'string' || credentials.secret.length === 0) {
        throw new NodeOperationError(this.getNode(), 'Groupise webhook secret is missing.');
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
        throw new NodeOperationError(this.getNode(), 'Groupise webhook payload is invalid.');
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
  if (error instanceof NodeOperationError) {
    if (error.message.includes('payload') || error.message.includes('Raw webhook body')) {
      return 400;
    }
    return error.message.includes('secret') ? 401 : 500;
  }
  if (error instanceof GroupiseNodeError) {
    return error.code === 'invalid_payload' || error.code === 'missing_raw_body' ? 400 : 401;
  }
  return 500;
}

function readRawBody(context: IWebhookFunctions): string {
  const request = context.getRequestObject() as unknown as { rawBody?: string | Buffer };
  if (typeof request.rawBody === 'string') {
    return request.rawBody;
  }
  if (Buffer.isBuffer(request.rawBody)) {
    return request.rawBody.toString('utf8');
  }
  throw new NodeOperationError(context.getNode(), 'Raw webhook body is unavailable.');
}
