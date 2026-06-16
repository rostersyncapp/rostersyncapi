# Webhook Delivery Reference

Custom Webhook integrations allow real-time pushing of roster sync updates to client endpoints.

## 🔑 Authentication / Signing
Webhooks verify payload integrity using an HMAC-SHA256 signature signed with a client-configured `secret_key`.

* **Signature Header**: `X-Webhook-Signature`
* **Algorithm**: HMAC-SHA256
* **Content Type**: `application/json`

```typescript
// Signature generation example:
const signature = hmac_sha256(secretKey, JSON.stringify(payload));
```

## ⚙️ Configuration Properties
* **Base URL**: Not used.
* **Endpoint URL**: Mandatory. The target endpoint to receive the HTTP `POST` requests.

## 📡 Verification / Test Connection
Executes a test dispatch (`ping` event) to the configured `endpoint_url`.
* **HTTP Method**: `POST`
* **Payload**:
  ```json
  {
    "event": "ping",
    "timestamp": "2026-05-21T23:53:30Z",
    "connection_id": "a3b2c3d4-e5f6-7890-1234-567890abcdef"
  }
  ```
* **Success Criteria**: HTTP status `200`, `204`, or any `2xx` return code.
