import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class GroupiseWebhookApi implements ICredentialType {
  name = 'groupiseWebhookApi';
  displayName = 'Groupise Webhook API';
  icon: Icon = { light: 'file:groupise.svg', dark: 'file:groupise.dark.svg' };
  documentationUrl = 'https://github.com/dicodetech-dev/n8n-nodes-groupwise#readme';

  properties: INodeProperties[] = [
    {
      displayName: 'Webhook Secret',
      name: 'secret',
      type: 'string',
      required: true,
      default: '',
      typeOptions: { password: true },
      description: 'Per-subscription secret used to verify signed deliveries',
    },
    {
      displayName: 'Replay Window (seconds)',
      name: 'replayWindowSeconds',
      type: 'number',
      default: 300,
      typeOptions: { minValue: 1, maxValue: 3600 },
      description: 'Accepted clock skew around the delivery timestamp',
    },
  ];
}
