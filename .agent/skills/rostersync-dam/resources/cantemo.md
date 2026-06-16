# Cantemo Portal Integration Reference

[Cantemo Portal](https://www.cantemo.com/) is a modular, scalable media asset management system built for professional video workflows.

## 🔑 Authentication
Authentication typically uses Basic Access Authentication or custom Auth Tokens:
* **Authorization**: `Basic <Base64(username:password)>` or custom API key header.

## ⚙️ Configuration Properties
* **Base URL**: The local server IP or domain of the Cantemo Portal REST API (e.g. `http://<cantemo-ip>:8080/API`).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/API/version/`
* **Headers**:
  ```http
  Authorization: Basic <credentials>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` containing Portal server version information.

## 📝 Metadata Mapping Pattern
Cantemo Portal stores metadata in custom metadata groups:
* `name` ➡️ Custom field identifier
* `jersey_number` ➡️ Custom field identifier
* `position` ➡️ Custom field identifier

## 📖 API Documentation
* **Official API Reference**: [Cantemo Portal API Documentation](https://cantemo.com/portal/docs/latest/)
