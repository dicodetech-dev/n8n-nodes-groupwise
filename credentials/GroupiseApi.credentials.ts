import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class GroupiseApi implements ICredentialType {
  name = 'groupiseApi';
  displayName = 'Groupise API';
  icon: Icon = { light: 'file:groupise.svg', dark: 'file:groupise.dark.svg' };
  documentationUrl = 'https://github.com/dicodetech-dev/n8n-nodes-groupwise#readme';

  test: ICredentialTestRequest = {
    request: {
      method: 'GET',
      url: '={{$credentials.baseUrl}}/health/ready',
      headers: {
        Authorization: '=Bearer {{$credentials.token}}',
      },
    },
  };

  properties: INodeProperties[] = [
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      required: true,
      default: '',
      placeholder: 'http://127.0.0.1:8080/api/v1',
      description: 'Laravel API base URL, including the /api/v1 prefix',
    },
    {
      displayName: 'API Token',
      name: 'token',
      type: 'string',
      required: true,
      default: '',
      typeOptions: { password: true },
      description: 'Sanctum personal access token with messages:send ability',
    },
  ];
}
