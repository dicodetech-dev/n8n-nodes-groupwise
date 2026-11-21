# Groupise community nodes for n8n

Groupise Trigger and Groupise Send Message connect n8n workflows to a self-hosted Groupise Laravel API. The trigger verifies Laravel's HMAC-signed webhook deliveries before emitting data; the send node posts validated messages through the Groupise API.

This package does not include Baileys, WhatsApp session material, QR codes, or WhatsApp credentials. WhatsApp connectivity stays in the private Groupise engine. Users are responsible for complying with WhatsApp's terms and for configuring Groupise allowlists, match rules, and DM opt-in server-side.

## Installation

In self-hosted n8n, open **Settings → Community Nodes**, choose **Install a community node**, and enter:

```text
n8n-nodes-groupise
```

Restart n8n after installation if prompted.

## Credentials

### Groupise API

Create a **Groupise API** credential with:

- **API Base URL**: your Laravel API host including `/api/v1`, for example `https://api.example.com/api/v1`
- **API Token**: a user-scoped Sanctum token with the message send ability

The credential test calls `/api/v1/auth/me`, so it verifies both the API host and token. Do not use the dashboard host; a `405` response when sending messages means the Base URL points to the wrong host or path.

### Groupise Webhook API

Create a **Groupise Webhook API** credential with:

- **Webhook Secret**: the secret from the matching Laravel webhook subscription
- **Replay Window (seconds)**: accepted clock skew, default `300`

Never store either credential in node parameters.

## Nodes

### Groupise Trigger

Starts a workflow when Laravel delivers a signed webhook. The node verifies the `x-groupwise-event-id`, `x-groupwise-timestamp`, `x-groupwise-signature`, and `x-groupwise-delivery-id` headers against the raw request body, enforces the replay window, and emits only the verified envelope plus `delivery_id`.

The webhook path is `groupise`. Use the n8n webhook URL shown by the trigger as the Laravel webhook subscription URL. Laravel owns webhook subscription registration and deletion; this trigger is a receiver-only webhook.

### Trigger output and filters

Each verified delivery is emitted as one item. Message events use this shape:

```json
{
  "id": "019a0000-0000-7000-8000-000000000001",
  "event_id": "019a0000-0000-7000-8000-000000000001",
  "delivery_id": "019a0000-0000-7000-8000-000000000003",
  "type": "message.received",
  "version": 1,
  "occurred_at": "2026-03-10T09:12:00.123Z",
  "data": {
    "connection_id": "019a0000-0000-7000-8000-000000000004",
    "chat_id": "019a0000-0000-7000-8000-000000000002",
    "chat_type": "group",
    "wa_message_id": "WA_MESSAGE_ID",
    "sent_at": "2026-03-10T09:12:00.123Z",
    "direction": "inbound",
    "source": "engine",
    "reply_to_wa_message_id": null,
    "status": null,
    "body": "Deployment is at 15:00."
  }
}
```

`event_id` duplicates the signed envelope `id`; `delivery_id` comes from `X-Groupwise-Delivery-Id`. The chat field is snake_case: use `{{ $json.data.chat_id }}`, not `chatId`. A single-chat IF filter is `String → Equals` with `Value 1 = {{ $json.data.chat_id }}`; for multiple chats use `{{ ['019a0000-0000-7000-8000-000000000002'].includes($json.data.chat_id) }}` as a boolean expression. n8n filters are advisory: Laravel enforces allowlists, match rules, and DM opt-in before delivery.

### Groupise Send Message

Sends a message through `POST /api/v1/messages/send`. The server enforces chat allowlists, bot match rules, and DM opt-in state. The node requires an idempotency key, normally derived from `delivery_id` or `event_id` from the trigger.

## License

MIT
