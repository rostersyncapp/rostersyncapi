# Iconik Integration Reference

[Iconik](https://www.iconik.io/) is a cloud-native media management and collaboration platform.

## 🔑 Authentication
Authentication requires two key headers:
1. `App-Id`: App ID generated in Iconik Admin portal.
2. `Auth-Token`: Application token generated in Iconik Admin portal.

## ⚙️ Configuration Properties
* **Base URL**: Custom domain (e.g. `https://api.iconik.io` or customer-specific gateway URL).
* **Endpoint URL**: Not used (defaults to API endpoints).

## 📡 Verification / Test Connection
* **HTTP Method**: `GET`
* **Path**: `/api/v1/users/me/`
* **Headers**:
  ```http
  App-Id: <app_id>
  Auth-Token: <auth_token>
  Accept: application/json
  ```
* **Success Criteria**: HTTP status `200 OK` indicates active credentials.

## 📝 Metadata Mapping Pattern
Metadata fields in Iconik are grouped under **Metadata Views**. 
To sync roster fields, target fields should map to the field IDs configured in the client's Iconik schema:
* `name` ➡️ `custom_field_name`
* `jersey_number` ➡️ `jersey_no`
* `position` ➡️ `player_position`

### 📋 Dropdown Field Schema Example (Roster Options)
Below is an example of an Iconik dropdown metadata field payload representing a team roster synchronized via RosterSync:

```json
{
	"auto_set": true,
	"date_created": "2025-12-23T05:20:34.229000+00:00",
	"date_modified": "2025-12-23T05:29:44.702000+00:00",
	"description": "Imported via RosterSync AI from web search",
	"external_id": null,
	"field_type": "drop_down",
	"hide_if_not_set": false,
	"is_block_field": true,
	"is_warning_field": false,
	"label": "Sacramento Kings",
	"mapped_field_name": null,
	"max_value": 0.0,
	"min_value": 0.0,
	"multi": true,
	"name": "sacramento-kings",
	"options": [
		{
			"label": "Precious Achiuwa",
			"value": "Precious Achiuwa"
		},
		{
			"label": "Dylan Cardwell",
			"value": "Dylan Cardwell"
		},
		{
			"label": "Devin Carter",
			"value": "Devin Carter"
		},
		{
			"label": "Nique Clifford",
			"value": "Nique Clifford"
		},
		{
			"label": "DeMar DeRozan",
			"value": "DeMar DeRozan"
		},
		{
			"label": "Keon Ellis",
			"value": "Keon Ellis"
		},
		{
			"label": "Drew Eubanks",
			"value": "Drew Eubanks"
		},
		{
			"label": "Zach LaVine",
			"value": "Zach LaVine"
		},
		{
			"label": "Doug McDermott",
			"value": "Doug McDermott"
		},
		{
			"label": "Malik Monk",
			"value": "Malik Monk"
		},
		{
			"label": "Keegan Murray",
			"value": "Keegan Murray"
		},
		{
			"label": "Daeqwon Plowden",
			"value": "Daeqwon Plowden"
		},
		{
			"label": "Maxime Raynaud",
			"value": "Maxime Raynaud"
		},
		{
			"label": "Domantas Sabonis",
			"value": "Domantas Sabonis"
		},
		{
			"label": "Dario Šarić",
			"value": "Dario Šarić"
		},
		{
			"label": "Dennis Schröder",
			"value": "Dennis Schröder"
		},
		{
			"label": "Isaiah Stevens",
			"value": "Isaiah Stevens"
		},
		{
			"label": "Russell Westbrook",
			"value": "Russell Westbrook"
		}
	],
	"read_only": false,
	"representative": true,
	"required": false,
	"sortable": true,
	"source_url": null,
	"use_as_facet": true
}
```

## 📖 API Documentation
* **Official REST API Reference**: [Iconik API Documentation](https://app.iconik.io/docs/index.html)
