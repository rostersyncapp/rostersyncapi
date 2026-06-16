# Bynder Integration Reference

[Bynder](https://www.bynder.com/) is a cloud-native digital asset management platform widely used by teams for branding, marketing, and media storage.

## 🔑 Authentication
Authentication uses standard OAuth 2.0 (Authorization Code or Client Credentials flow):
* **Authorization**: `Bearer <token>`

## ⚙️ Configuration Properties
* **Base URL**: Tenant-specific domain (e.g. `https://<tenant>.bynder.com/api`).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/api/v4/users/` or standard configuration validation endpoints.
* **Headers**:
  ```http
  Authorization: Bearer <token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` on active user verification.

## 📝 Metadata Mapping Pattern
Bynder maps fields to **Metaproperties** configured in the account settings:
* `name` ➡️ Metaproperty option name
* `jersey_number` ➡️ Metaproperty tag or text value
* `position` ➡️ Metaproperty tag or text value

## 📖 API Documentation
* **Official API Reference**: [Bynder Developer Portal](https://developer-docs.bynder.com/)
* **API Getting Started Guide**: [Bynder API Getting Started Reference](https://api.bynder.com/reference/getting-started)
