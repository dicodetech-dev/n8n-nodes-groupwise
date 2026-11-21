export interface GroupiseApiCredentials {
  baseUrl: string;
  token: string;
}

export interface GroupiseWebhookCredentials {
  secret: string;
  replayWindowSeconds?: number;
}
