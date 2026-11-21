import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GroupiseApi implements ICredentialType {
  name = 'groupiseApi';
  displayName = 'Groupise API';

  properties: INodeProperties[] = [
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      required: true,
      default: '',
      placeholder: 'http://127.0.0.1:8080/api/v1',
      description: 'Laravel API base URL, including the /api/v1 prefix.',
    },
    {
      displayName: 'API Token',
      name: 'token',
      type: 'string',
      required: true,
      default: '',
      typeOptions: { password: true },
      description: 'Sanctum personal access token with messages:send ability.',
    },
  ];
}
