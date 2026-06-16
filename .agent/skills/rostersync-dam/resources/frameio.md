# Frame.io Integration Reference

[Frame.io](https://frame.io/) is a cloud-based video collaboration and review platform (now part of Adobe).

## 🔑 Authentication
Authentication typically uses OAuth2 or Developer Personal Access Tokens:
* **Authorization**: `Bearer <token>`

## ⚙️ Configuration Properties
* **Base URL**: `https://api.frame.io/v2`

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/me`
* **Headers**:
  ```http
  Authorization: Bearer <token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` with current user context response.

## 📝 Metadata Mapping Pattern
Frame.io metadata mapping focuses on assets, projects, or folders (custom metadata fields on items):
* `name` ➡️ `name`
* `jersey_number` ➡️ Custom attributes or tags
* `position` ➡️ Custom attributes or tags

## 📖 API Documentation
* **Official API Reference**: [Frame.io Platform API Reference](https://next.developer.frame.io/platform/api-reference/account-permissions/index)
