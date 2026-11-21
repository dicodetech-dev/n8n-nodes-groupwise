import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GroupiseWebhook implements ICredentialType {
  name = 'groupiseWebhook';
  displayName = 'Groupise Webhook';

  properties: INodeProperties[] = [
    {
      displayName: 'Webhook Secret',
      name: 'secret',
      type: 'string',
      required: true,
      default: '',
      typeOptions: { password: true },
      description: 'Per-subscription secret used to verify signed deliveries.',
    },
    {
      displayName: 'Replay Window (seconds)',
      name: 'replayWindowSeconds',
      type: 'number',
      default: 300,
      typeOptions: { minValue: 1, maxValue: 3600 },
      description: 'Accepted clock skew around the delivery timestamp.',
    },
  ];
}
