# Shade Integration Reference

[Shade](https://www.shade.inc/) is an AI-powered media manager and collaboration engine for creative assets.

## 🔑 Authentication
Authentication typically uses API keys:
* **Authorization**: `Bearer <api_key>` or custom headers depending on integration mode.

## ⚙️ Configuration Properties
* **Base URL**: `https://api.shade.inc/v1`

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/me` or `/auth/verify`
* **Headers**:
  ```http
  Authorization: Bearer <api_key>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` on valid credentials.

## 📝 Metadata Mapping Pattern
* `name` ➡️ `title` or custom tag
* `jersey_number` ➡️ Custom tags/metadata key
* `position` ➡️ Custom tags/metadata key

## 📖 API Documentation
* **Official API Reference**: [Using the Shade API](https://academy.shade.inc/developers/using-the-api/using-the-api)
