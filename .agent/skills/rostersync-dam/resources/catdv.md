# CatDV Integration Reference

[CatDV](https://www.squarebox.com/) is an on-premise/hybrid media asset management system.

## 🔑 Authentication
Authentication uses Basic Access Authentication:
* **Authorization**: `Basic <Base64(username:password)>`

## ⚙️ Configuration Properties
* **Base URL**: Mandatory. The URL of the CatDV Server REST API (e.g. `http://catdv.local:8080/server`).
* **Endpoint URL**: Not used.

## 📡 Verification / Test Connection
* **HTTP Method**: `POST`
* **Path**: `/api/v1/login`
* **Headers**:
  ```http
  Authorization: Basic <credentials>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` with session token response.

## 📝 Metadata Mapping Pattern
CatDV maps metadata to **User Defined Fields (UDFs)**, typically named `UDF_1`, `UDF_2`, etc.
* `name` ➡️ `UDF_01` (e.g., Player Name)
* `jersey_number` ➡️ `UDF_02` (e.g., Jersey)
* `position` ➡️ `UDF_03` (e.g., Position)

## 📖 API Documentation
* **Official REST API Reference**: [CatDV Server REST API](https://catdv-docs.services.quantum.com/catdv-server/rest-api/index.html)
