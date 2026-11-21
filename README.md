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

- **API Base URL**: your Laravel API base URL, including `/api/v1`
- **API Token**: a user-scoped Sanctum token with the message send ability

### Groupise Webhook API

Create a **Groupise Webhook API** credential with:

- **Webhook Secret**: the secret from the matching Laravel webhook subscription
- **Replay Window (seconds)**: accepted clock skew, default `300`

Never store either credential in node parameters.

## Nodes

### Groupise Trigger

Starts a workflow when Laravel delivers a signed webhook. The node verifies the `x-groupwise-event-id`, `x-groupwise-timestamp`, `x-groupwise-signature`, and `x-groupwise-delivery-id` headers against the raw request body, enforces the replay window, and emits only the verified envelope plus `delivery_id`.

The webhook path is `groupise`. Use the n8n webhook URL shown by the trigger as the Laravel webhook subscription URL. Laravel owns webhook subscription registration and deletion; this trigger is a receiver-only webhook.

### Groupise Send Message

Sends a message through `POST /api/v1/messages/send`. The server enforces chat allowlists, bot match rules, and DM opt-in state. The node requires an idempotency key, normally derived from `delivery_id` or `event_id` from the trigger.

## License

MIT
