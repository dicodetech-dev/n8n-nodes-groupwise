import { describe, expect, it } from 'vitest';
import {
  GroupiseApi,
  GroupiseSend,
  GroupiseTrigger,
  GroupiseWebhookApi,
  credentialTypes,
  nodeTypes,
} from './index.js';

describe('Groupise node registration', () => {
  it('registers both credentials', () => {
    expect(credentialTypes.map((credential) => credential.name)).toEqual([
      'groupiseApi',
      'groupiseWebhookApi',
    ]);
  });

  it('registers the trigger and send nodes', () => {
    expect(nodeTypes.map((node) => node.description.name)).toEqual([
      'groupiseTrigger',
      'groupiseSend',
    ]);
  });

  it('uses class names that match the custom node file names', () => {
    expect(GroupiseApi.name).toBe('GroupiseApi');
    expect(GroupiseWebhookApi.name).toBe('GroupiseWebhookApi');
    expect(GroupiseTrigger.name).toBe('GroupiseTrigger');
    expect(GroupiseSend.name).toBe('GroupiseSend');
  });
});
