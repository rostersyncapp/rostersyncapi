# Axle AI Integration Reference

[Axle AI](https://axle.ai/) is a lightweight, on-premise or private-cloud media asset management system focused on ease of search and AI tagging.

## 🔑 Authentication
Authentication typically uses API tokens or local user credentials depending on configuration:
* **Authorization**: `Bearer <api_token>` or Basic Authentication.

## ⚙️ Configuration Properties
* **Base URL**: IP address or host-specific URL of the axle ai server (e.g. `http://<axle-server-ip>/api`).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/status` or general info route.
* **Headers**:
  ```http
  Authorization: Bearer <api_token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` on active server communication.

## 📝 Metadata Mapping Pattern
Axle AI maps metadata to files using subclips, tags, and field catalogs:
* `name` ➡️ Subclip name or tags field
* `jersey_number` ➡️ Custom fields/tag attributes
* `position` ➡️ Custom fields/tag attributes

## 📖 API Documentation
* **Official API Reference**: [Axle Tags API Documentation 2.0 (PDF)](https://axleai.com/wp-content/uploads/2024/12/Axle_Tags_API_Documentation_2.0.pdf)
