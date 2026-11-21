import type { ICredentialType, INodeType } from 'n8n-workflow';
import { GroupiseApi } from './credentials/GroupiseApi.credentials.js';
import { GroupiseWebhookApi } from './credentials/GroupiseWebhookApi.credentials.js';
import { GroupiseSend } from './nodes/GroupiseSend/GroupiseSend.node.js';
import { GroupiseTrigger } from './nodes/GroupiseTrigger/GroupiseTrigger.node.js';

export const credentialTypes: ICredentialType[] = [new GroupiseApi(), new GroupiseWebhookApi()];

export const nodeTypes: INodeType[] = [new GroupiseTrigger(), new GroupiseSend()];

export { GroupiseApi } from './credentials/GroupiseApi.credentials.js';
export { GroupiseWebhookApi } from './credentials/GroupiseWebhookApi.credentials.js';
export { GroupiseSend } from './nodes/GroupiseSend/GroupiseSend.node.js';
export { GroupiseTrigger } from './nodes/GroupiseTrigger/GroupiseTrigger.node.js';
export { GroupiseNodeError, type GroupiseErrorCode } from './errors.js';
export {
  DEFAULT_REPLAY_WINDOW_SECONDS,
  WEBHOOK_HEADERS,
  verifyWebhookRequest,
  type VerifiedWebhookRequest,
  type VerifyWebhookRequestOptions,
} from './verification.js';
export type { GroupiseApiCredentials, GroupiseWebhookCredentials } from './types.js';
export {
  WEBHOOK_EVENT_TYPES,
  parseSendMessageRequest,
  parseWebhookEnvelope,
  type SendMessageRequest,
  type WebhookEnvelope,
  type WebhookEventType,
} from './validation.js';
