# Orange Logic Integration Reference

[Orange Logic (Cortex)](https://www.orangelogic.com/) is an enterprise Digital Asset Management (DAM) platform.

## 🔑 Authentication
Authentication typically uses OAuth 2.0 Client Credentials or custom API Keys:
* **Authorization**: `Bearer <access_token>` or custom headers depending on client configuration.

## ⚙️ Configuration Properties
* **Base URL**: Tenant-specific domain (e.g. `https://<tenant>.orangelogic.com/api` or gateway endpoint).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/v1.0/system/info` or standard diagnostics endpoint.
* **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` on valid credentials.

## 📝 Metadata Mapping Pattern
Orange Logic organizes fields using dynamic schemas and field groups:
* `name` ➡️ Cortex Field ID (e.g., `Title` or `PlayerName`)
* `jersey_number` ➡️ Cortex Field ID (e.g., `JerseyNumber`)
* `position` ➡️ Cortex Field ID (e.g., `Position`)

## 📖 API Documentation
* **Official API Reference**: [Orange Logic Developer Platform](https://developer.orangelogic.com/reference/about)
