# Dalet Flex Integration Reference

[Dalet Flex](https://www.dalet.com/platforms/flex/) is an enterprise media asset management and workflow orchestration platform widely used in sports broadcast and media engineering.

## 🔑 Authentication
Authentication typically uses OAuth 2.0 (Client Credentials) or API Keys:
* **Authorization**: `Bearer <access_token>` or custom headers.

## ⚙️ Configuration Properties
* **Base URL**: Environment-specific endpoint (e.g. `https://<tenant>.dalet-flex.com/api` or internal server IP).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/api/v2/users/me` or `/api/v2/system/health`
* **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` on active authorization context.

## 📝 Metadata Mapping Pattern
Dalet Flex maps metadata using custom metadata schemas (defined as definitions and taxonomies):
* `name` ➡️ Flex metadata property
* `jersey_number` ➡️ Flex metadata property
* `position` ➡️ Flex metadata property

## 📖 API Documentation
* **Official API Reference**: [Dalet Flex Help Center & API Documentation](https://flex-help.dalet.com/)
* **Developer Guide & API Reference**: [Dalet Flex Developer Guide APIs](https://help.dalet.com/daletflex/admin/developer_guide/apis/apis.html)
