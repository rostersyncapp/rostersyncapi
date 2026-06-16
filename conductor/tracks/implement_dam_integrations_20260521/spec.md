# Specification: Implement DAM Integrations

## 1. Overview

This track focuses on implementing the integration endpoints for B2B Digital Asset Management (DAM) platforms (such as Iconik and CatDV) and custom Webhook deliveries on the Cloudflare Worker API Gateway. These integrations allow client organizations to sync enriched roster metadata directly into their media assets and broadcast systems.

## 2. Goals

* Expose supported DAM providers and their required credential fields.
* Implement encrypted credential storage at rest using AES-256-GCM, masking credentials in outbound API responses.
* Build CRUD endpoints for managing tenant-isolated integrations.
* Implement active connectivity testing (mock or real endpoint request execution).
* Implement manual sync triggering to queue backend connector jobs.
* Retrieve historical delivery logs for audit trails.

## 3. Scope

### In-Scope
* API endpoint: `GET /v1/integrations/providers` (supported systems list).
* API endpoint: `POST /v1/integrations` (create integration, encrypt credentials).
* API endpoint: `GET /v1/integrations` (list connections for organization).
* API endpoint: `GET /v1/integrations/{id}` (get single connection details with masked credentials).
* API endpoint: `PATCH /v1/integrations/{id}` (partial update, encrypting credentials if changed).
* API endpoint: `DELETE /v1/integrations/{id}` (delete connection).
* API endpoint: `POST /v1/integrations/{id}/test` (live credentials/connection verification).
* API endpoint: `POST /v1/integrations/{id}/sync` (trigger manual synchronization job).
* API endpoint: `GET /v1/integrations/{id}/deliveries` (fetch integration delivery logs).
* AES-256-GCM encryption/decryption utilities in Cloudflare Workers environment.
* High-coverage integration tests validating all Hono routes, crypto behavior, validation, and error cases.

### Out-of-Scope
* Actually running the background sync runner (handled by separate backend scripts and Supabase Edge functions).
* Tenant management / API key issuing.
