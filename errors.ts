export type GroupiseErrorCode =
  | 'invalid_credential'
  | 'missing_headers'
  | 'invalid_headers'
  | 'missing_raw_body'
  | 'invalid_timestamp'
  | 'invalid_signature'
  | 'stale_timestamp'
  | 'replay'
  | 'invalid_payload'
  | 'invalid_parameters'
  | 'api_error';

export class GroupiseNodeError extends Error {
  readonly code: GroupiseErrorCode;

  constructor(code: GroupiseErrorCode, message: string) {
    super(message);
    this.name = 'GroupiseNodeError';
    this.code = code;
  }
}
