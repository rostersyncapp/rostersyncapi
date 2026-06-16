'use client';

import React, { useState, useEffect } from 'react';
import { formatSeasonLabel } from '@/utils/season';
import {
  getDAMConnections,
  saveDAMConnection,
  deleteDAMConnection,
  testDAMConnection,
  saveFieldMappings,
  getDeliveryLogs,
  triggerDAMSync,
} from './actions';

function displayTier(tier: string | null | undefined): string {
  switch (tier?.toUpperCase()) {
    case 'SYNC':
      return 'Sync';
    case 'STUDIO':
      return 'Studio';
    case 'TRIAL':
      return 'Sync (Trial)';
    default:
      return 'Sync (Trial)';
  }
}

interface Profile {
  full_name: string | null;
  organization_name: string | null;
  subscription_tier: string | null;
}

interface Connection {
  id: string;
  name: string;
  provider: 'catdv' | 'iconik' | 'webhook' | 'google_sheets';
  base_url?: string | null;
  endpoint_url?: string | null;
  active: boolean;
  last_error?: string | null;
  last_sync_at?: string | null;
  leagues?: string[];
  teams?: string[];
  seasons?: string[];
  credentials?: Record<string, string>;
}

interface FieldMapping {
  id: string;
  connector_type: string;
  source_field: string;
  target_field: string;
}

interface SettingsTabsProps {
  profile: Profile | null;
  email: string | undefined;
  initialConnections: Connection[];
  initialFieldMappings: FieldMapping[];
}

const PROVIDER_FIELDS = {
  catdv: [
    { key: 'base_url', label: 'Server URL', type: 'url', placeholder: 'https://catdv.yourcompany.com' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }
  ],
  iconik: [
    { key: 'base_url', label: 'Base URL (Optional)', type: 'url', placeholder: 'https://api.iconik.io' },
    { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'a1b2c3d4-...' },
    { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' }
  ],
  webhook: [
    { key: 'endpoint_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.yourcompany.com/roster' },
    { key: 'secret_key', label: 'Secret Key (HMAC)', type: 'password', placeholder: '••••••••' }
  ],
  google_sheets: [
    { key: 'spreadsheet_id', label: 'Spreadsheet ID', type: 'text', placeholder: '1a2b3c4d5e...' },
    { key: 'oauth_token', label: 'OAuth Access Token', type: 'password', placeholder: '••••••••' }
  ]
};

const SOURCE_FIELDS = [
  { key: 'player_name', label: 'Player Name', desc: 'Standard full name' },
  { key: 'phonetic_name', label: 'Phonetic Spelling', desc: 'Broadcast-safe pronunciation' },
  { key: 'ipa_name', label: 'IPA Notation', desc: 'International Phonetic Alphabet representation' },
  { key: 'chinese_name', label: 'Mandarin Translation', desc: 'Localized Chinese character mapping' },
  { key: 'hardware_safe_name', label: 'Hardware-Safe Name', desc: 'ASCII-compatible sanitized spelling' },
  { key: 'career_summary', label: 'Career Summary', desc: 'Short paragraph details' },
  { key: 'color_commentary', label: 'Color Commentary', desc: 'Announcer speaking points' },
  { key: 'stats_insight', label: 'Stats Insight', desc: 'Real-time statistical narrative' },
  { key: 'team_primary_color', label: 'Team Primary Color', desc: 'Hex color code for the team\'s primary brand color' },
  { key: 'team_secondary_color', label: 'Team Secondary Color', desc: 'Hex color code for the team\'s secondary brand color' },
];

export default function SettingsTabs({
  profile,
  email,
  initialConnections,
  initialFieldMappings
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations'>('profile');
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialFieldMappings);
  const [showAdvancedMapper, setShowAdvancedMapper] = useState(false);
  
  // Delivery logs states
  const [viewingLogsConnectionId, setViewingLogsConnectionId] = useState<string | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  // Preferred measurement units state (defaults to imperial on first load)
  const [unitsPref, setUnitsPref] = useState<'imperial' | 'metric'>('imperial');


  useEffect(() => {
    const saved = localStorage.getItem('rostersync_units_pref');
    if (saved === 'metric' || saved === 'imperial') {
      setUnitsPref(saved);
    } else {
      localStorage.setItem('rostersync_units_pref', 'imperial');
      setUnitsPref('imperial');
      window.dispatchEvent(new Event('storage'));
    }

    // Google Sheets integration query param handling
    const params = new URLSearchParams(window.location.search);
    const googleSuccess = params.get('google_success');
    const googleError = params.get('google_error');

    if (googleSuccess === 'true') {
      setActiveTab('integrations');
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
      alert('Google Sheets account connected successfully! Now edit the connection to enter your Spreadsheet ID.');
    } else if (googleError) {
      setActiveTab('integrations');
      const newUrl = window.location.pathname + '?tab=integrations';
      window.history.replaceState({}, '', newUrl);
      alert(`Failed to link Google Sheets account: ${googleError}`);
    }
  }, []);

  // Form states for Integration Connections
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<'catdv' | 'iconik' | 'webhook' | 'google_sheets'>('google_sheets');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formEndpointUrl, setFormEndpointUrl] = useState('');
  const [formActive, setFormActive] = useState(false);
  const [formSeasons, setFormSeasons] = useState<string[]>([]);
  const [formLeagues, setFormLeagues] = useState<string[]>([]);
  
  // Status states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [saving, setSaving] = useState(false);

  // Field mapping states
  const [selectedMapperType, setSelectedMapperType] = useState<'catdv' | 'iconik' | 'webhook' | 'google_sheets'>('webhook');
  const [mapperFields, setMapperFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SOURCE_FIELDS.forEach(f => {
      const match = initialFieldMappings.find(
        m => m.connector_type === 'webhook' && m.source_field === f.key
      );
      initial[f.key] = match ? match.target_field : '';
    });
    return initial;
  });

  const handleMapperTypeChange = (type: 'catdv' | 'iconik' | 'webhook' | 'google_sheets') => {
    setSelectedMapperType(type);
    const newFields: Record<string, string> = {};
    SOURCE_FIELDS.forEach(f => {
      const match = fieldMappings.find(
        m => m.connector_type === type && m.source_field === f.key
      );
      newFields[f.key] = match ? match.target_field : '';
    });
    setMapperFields(newFields);
  };

  const handleEditConnection = (conn: Connection) => {
    setEditingId(conn.id);
    setFormName(conn.name);
    setFormProvider(conn.provider);
    setFormBaseUrl(conn.base_url || '');
    setFormEndpointUrl(conn.endpoint_url || '');
    setFormActive(conn.active);
    setFormSeasons(conn.seasons || []);
    setFormLeagues(conn.leagues || []);

    // Fill credentials using actual values if decrypted/available, otherwise placeholder
    const initialCreds: Record<string, string> = {};
    PROVIDER_FIELDS[conn.provider].forEach(f => {
      if (conn.credentials && conn.credentials[f.key] !== undefined) {
        initialCreds[f.key] = conn.credentials[f.key];
      } else {
        initialCreds[f.key] = '********';
      }
    });
    setFormCredentials(initialCreds);
    setShowForm(true);
  };

  const handleNewConnection = () => {
    setEditingId(null);
    setFormName('');
    setFormProvider('google_sheets');
    setFormBaseUrl('');
    setFormEndpointUrl('');
    setFormActive(false);
    setFormSeasons(['current']);
    setFormCredentials({});
    setShowForm(true);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payloadCreds: Record<string, string> = {};
      PROVIDER_FIELDS[formProvider].forEach(f => {
        // Collect credentials input values
        if (f.key === 'base_url') {
          payloadCreds[f.key] = formBaseUrl;
        } else if (f.key === 'endpoint_url') {
          payloadCreds[f.key] = formEndpointUrl;
        } else {
          payloadCreds[f.key] = formCredentials[f.key] || '';
        }
      });

      await saveDAMConnection(editingId, {
        name: formName,
        provider: formProvider,
        credentials: payloadCreds,
        base_url: formProvider !== 'webhook' && formProvider !== 'google_sheets' ? formBaseUrl : undefined,
        endpoint_url: formProvider === 'webhook' ? formEndpointUrl : undefined,
        active: formActive,
        seasons: formSeasons,
      });

      const updatedList = await getDAMConnections();
      setConnections(updatedList);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await deleteDAMConnection(id);
      setConnections(connections.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete connection');
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(prev => ({ ...prev, [id]: { success: false, message: 'Testing connection...' } }));
    try {
      const res = await testDAMConnection(id);
      setTestResult(prev => ({
        ...prev,
        [id]: {
          success: res.success,
          message: res.success ? 'Success' : `Error: ${res.error || 'Connection failed'}`
        }
      }));

      const updatedList = await getDAMConnections();
      setConnections(updatedList);
    } catch (err: any) {
      setTestResult(prev => ({
        ...prev,
        [id]: { success: false, message: `Failed: ${err.message}` }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveFieldMappings = async () => {
    setSaving(true);
    try {
      const mappingsList = Object.entries(mapperFields)
        .filter(([_, value]) => value.trim() !== '')
        .map(([key, value]) => ({
          source_field: key,
          target_field: value.trim(),
        }));

      await saveFieldMappings(selectedMapperType, mappingsList);
      
      const updatedMappings = fieldMappings.filter(m => m.connector_type !== selectedMapperType);
      mappingsList.forEach((m, idx) => {
        updatedMappings.push({
          id: `temp-${idx}-${Date.now()}`,
          connector_type: selectedMapperType,
          source_field: m.source_field,
          target_field: m.target_field,
        });
      });
      setFieldMappings(updatedMappings);
      alert('Field mappings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save field mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleAutofillDefaults = () => {
    const defaults: Record<string, string> = {};
    SOURCE_FIELDS.forEach(f => {
      defaults[f.key] = `${selectedMapperType}_${f.key}`;
    });
    setMapperFields(defaults);
  };



  const handleViewLogs = async (connectionId: string) => {
    setViewingLogsConnectionId(connectionId);
    setLoadingLogs(true);
    setShowLogsModal(true);
    try {
      const logs = await getDeliveryLogs(connectionId);
      setDeliveryLogs(logs);
    } catch (err) {
      console.error(err);
      alert('Failed to load delivery logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleTriggerSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      const res = await triggerDAMSync(connectionId);
      if (res.success) {
        alert('Manual sync job successfully enqueued! Background workers are now executing the delivery.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to trigger manual sync: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl">
      {/* 1. TABS NAVIGATION */}
      <div className="flex border-b border-border-custom bg-bg-surface/40">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 hover:text-text-primary ${
            activeTab === 'profile'
              ? 'text-text-primary border-b-text-primary bg-bg-surface/80 font-bold'
              : 'text-text-secondary border-b-transparent'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 hover:text-text-primary ${
            activeTab === 'integrations'
              ? 'text-text-primary border-b-text-primary bg-bg-surface/80 font-bold'
              : 'text-text-secondary border-b-transparent'
          }`}
        >
          DAM Connections
        </button>
      </div>

      {/* 2. TAB CONTENT MODULES */}
      <div className="w-full">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-bg-surface border border-border-custom p-6 rounded-md">
            <h2 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider mb-6 pb-2 border-b border-border-custom">
              Account Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Full Name</p>
                  <p className="text-sm font-mono text-text-primary bg-bg-primary px-3 py-2 border border-border-custom rounded-md">
                    {profile?.full_name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Primary Email</p>
                  <p className="text-sm font-mono text-text-primary bg-bg-primary px-3 py-2 border border-border-custom rounded-md">
                    {email}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Organization</p>
                  <p className="text-sm font-mono text-text-primary bg-bg-primary px-3 py-2 border border-border-custom rounded-md">
                    {profile?.organization_name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-text-muted mb-1">Subscription Tier</p>
                  <p className="text-sm font-mono text-emerald-400 font-bold bg-bg-primary px-3 py-2 border border-border-custom rounded-md uppercase">
                    {displayTier(profile?.subscription_tier)}
                  </p>
                </div>
              </div>
            </div>

            {/* System Preferences Card */}
            <div className="bg-bg-surface border border-border-custom p-6 rounded-md mt-6">
              <h2 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider mb-6 pb-2 border-b border-border-custom">
                System Preferences
              </h2>
              <div>
                <p className="text-[10px] font-mono uppercase text-text-muted mb-2">Preferred Measurement Units</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUnitsPref('imperial');
                      localStorage.setItem('rostersync_units_pref', 'imperial');
                      window.dispatchEvent(new Event('storage'));
                    }}
                    className={`px-4 py-2 text-xs font-mono font-bold border rounded-md transition-all cursor-pointer ${
                      unitsPref === 'imperial'
                        ? 'bg-text-primary text-bg-primary border-text-primary'
                        : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary'
                    }`}
                  >
                    Imperial (ft/in, lbs)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUnitsPref('metric');
                      localStorage.setItem('rostersync_units_pref', 'metric');
                      window.dispatchEvent(new Event('storage'));
                    }}
                    className={`px-4 py-2 text-xs font-mono font-bold border rounded-md transition-all cursor-pointer ${
                      unitsPref === 'metric'
                        ? 'bg-text-primary text-bg-primary border-text-primary'
                        : 'bg-transparent text-text-secondary border-border-custom hover:border-text-primary hover:text-text-primary'
                    }`}
                  >
                    Metric (cm, kg)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="flex flex-col gap-6">
            {!showForm ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">
                      Connected Digital Asset Management (DAM) Platforms
                    </h2>
                    <p className="text-xs font-mono text-text-secondary mt-1">
                      Configure integrations to synchronize player metadata directly with CatDV, Iconik, or generic webhooks.
                    </p>
                  </div>
                  <button
                    onClick={handleNewConnection}
                    className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-4 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md cursor-pointer"
                  >
                    + Add Connection
                  </button>
                </div>

                {connections.length === 0 ? (
                  <div className="bg-bg-surface border border-border-custom p-12 text-center rounded-md">
                    <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">
                      No connections configured.
                    </p>
                    <p className="text-[11px] font-mono text-text-muted mt-1">
                      Setup an integration to export player rosters and AI translation guides automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="bg-bg-surface border border-border-custom p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-md"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-text-primary text-sm uppercase">
                              {conn.name}
                            </span>
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-bg-primary text-emerald-400 border border-border-custom uppercase">
                              {conn.provider}
                            </span>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                conn.active ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              title={conn.active ? 'Connection active' : 'Connection inactive/failed'}
                            />
                          </div>
                          <div className="text-[11px] font-mono text-text-secondary mt-1.5 truncate max-w-lg">
                            {conn.provider === 'webhook' ? (
                              <span>ENDPOINT URL: <span className="text-text-primary">{conn.endpoint_url}</span></span>
                            ) : (
                              <span>SERVER BASE URL: <span className="text-text-primary">{conn.base_url}</span></span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 items-center mt-2.5 text-[10px] font-mono">
                            <span className="text-text-muted uppercase tracking-wider font-bold">Scope:</span>
                            {conn.leagues && conn.leagues.length > 0 ? (
                              conn.leagues.map((l) => (
                                <span key={l} className="bg-bg-primary text-text-primary border border-border-custom px-1.5 py-0.5 rounded uppercase">
                                  {l}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 bg-bg-primary/50 border border-border-custom/50 px-1.5 py-0.5 rounded uppercase">
                                All Leagues
                              </span>
                            )}
                            
                            {conn.teams && conn.teams.length > 0 ? (
                              <span className="text-text-primary bg-bg-primary border border-border-custom px-1.5 py-0.5 rounded uppercase">
                                {conn.teams.length} Custom Teams
                              </span>
                            ) : (
                              <span className="text-gray-400 bg-bg-primary/50 border border-border-custom/50 px-1.5 py-0.5 rounded uppercase">
                                All Teams
                              </span>
                            )}

                            <span className="text-text-muted uppercase tracking-wider font-bold ml-1">Seasons:</span>
                            {conn.seasons && conn.seasons.length > 0 ? (
                              conn.seasons.includes('all') ? (
                                <span className="text-amber-400 bg-amber-950/20 border border-amber-900/40 px-1.5 py-0.5 rounded uppercase font-bold">
                                  All Seasons
                                </span>
                              ) : conn.seasons.includes('current') ? (
                                <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase font-bold">
                                  Current Season
                                </span>
                              ) : (
                                <span className="text-white bg-bg-primary border border-border-custom px-1.5 py-0.5 rounded uppercase">
                                  {conn.seasons
                                    .map((s) => formatSeasonLabel(parseInt(s), conn.leagues?.[0]))
                                    .join(', ')}
                                </span>
                              )
                            ) : (
                              <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase font-bold">
                                Current Season
                              </span>
                            )}
                          </div>

                          {conn.last_error && (
                            <div className="mt-2 text-[10px] font-mono text-red-500 bg-red-500/5 border border-red-500/20 p-2 max-w-xl">
                              ERROR: {conn.last_error}
                            </div>
                          )}
                        </div>

                        {/* Test Status/Actions */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {testResult[conn.id] && (
                            <span
                              className={`text-[10px] font-mono px-2 py-1 max-w-[150px] truncate ${
                                testResult[conn.id].success ? 'text-emerald-400' : 'text-red-500'
                              }`}
                            >
                              {testResult[conn.id].message}
                            </span>
                          )}

                          <button
                            onClick={() => handleTestConnection(conn.id)}
                            disabled={testingId === conn.id}
                            className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-border-custom text-text-secondary hover:border-text-primary hover:text-text-primary rounded-md disabled:opacity-50 transition-all active:scale-[0.97] cursor-pointer"
                          >
                            {testingId === conn.id ? 'Testing...' : 'Test'}
                          </button>

                          <button
                            onClick={() => handleViewLogs(conn.id)}
                            className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-border-custom text-emerald-400 hover:border-emerald-400 hover:bg-emerald-400/5 rounded-md transition-all active:scale-[0.97] cursor-pointer"
                          >
                            History
                          </button>

                          {conn.active && (
                            <button
                              onClick={() => handleTriggerSync(conn.id)}
                              disabled={syncingId === conn.id}
                              className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-transparent bg-text-primary text-bg-primary hover:opacity-90 rounded-md disabled:opacity-50 transition-all active:scale-[0.97] cursor-pointer"
                            >
                              {syncingId === conn.id ? 'Syncing...' : 'Sync Now'}
                            </button>
                          )}

                          <button
                            onClick={() => handleEditConnection(conn)}
                            className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-border-custom text-text-primary hover:bg-bg-elevated rounded-md transition-all active:scale-[0.97] cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteConnection(conn.id)}
                            className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-transparent text-red-500 hover:bg-red-500/10 rounded-md transition-all active:scale-[0.97] cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Add/Edit Connection Form */
              <form
                onSubmit={handleSaveConnection}
                className="bg-bg-surface border border-border-custom p-6 max-w-2xl flex flex-col gap-5 rounded-md"
              >
                <div className="border-b border-border-custom pb-3 flex justify-between items-center">
                  <h3 className="font-mono font-bold text-text-primary text-xs uppercase tracking-wider">
                    {editingId ? 'Edit DAM Connection' : 'Add DAM Connection'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-[10px] uppercase font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase text-text-muted">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Iconik Vault"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-bg-primary border border-border-custom text-sm text-text-primary px-3 py-2 font-mono focus:outline-none focus:border-accent rounded-md"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase text-text-muted">
                    Provider Type
                  </label>
                  <select
                    disabled={editingId !== null}
                    value={formProvider}
                    onChange={(e) => {
                      const p = e.target.value as 'catdv' | 'iconik' | 'webhook' | 'google_sheets';
                      setFormProvider(p);
                      setFormCredentials({});
                    }}
                    className="bg-bg-primary border border-border-custom text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-white rounded-md cursor-pointer disabled:bg-bg-primary/40 disabled:text-text-muted disabled:border-border-custom/50 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    <option value="google_sheets" className="bg-bg-primary text-text-primary">Google Sheets Auto-Sync</option>
                    <option value="webhook" className="bg-bg-primary text-text-primary">Generic Webhook</option>
                    <option value="iconik" className="bg-bg-primary text-text-primary">Iconik DAM</option>
                    <option value="catdv" className="bg-bg-primary text-text-primary">Quantum CatDV</option>
                  </select>
                </div>

                {/* Provider specific endpoints inputs */}
                {formProvider === 'google_sheets' ? (
                  <div className="text-xs font-mono text-text-secondary leading-relaxed bg-bg-primary/40 border border-border-custom p-4 rounded-md">
                    <p className="font-bold text-white mb-2">// GOOGLE AUTHORIZATION</p>
                    Connect with Google Drive once to automatically write active rosters to your spreadsheets. No API keys or credentials setup required.
                  </div>
                ) : formProvider === 'webhook' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-text-muted">
                      Webhook Endpoint URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://hooks.yourcompany.com/rostersync"
                      value={formEndpointUrl}
                      onChange={(e) => setFormEndpointUrl(e.target.value)}
                      className="bg-bg-primary border border-border-custom text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-white rounded-md"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-text-muted">
                      Server base URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder={formProvider === 'iconik' ? 'https://api.iconik.io' : 'https://catdv.yourcompany.com'}
                      value={formBaseUrl}
                      onChange={(e) => setFormBaseUrl(e.target.value)}
                      className="bg-bg-primary border border-border-custom text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-white rounded-md"
                    />
                  </div>
                )}

                {/* Dynamic credentials fields */}
                <div className="flex flex-col gap-4 border-t border-border-custom pt-4 mt-2">
                  <h4 className="text-[10px] font-mono uppercase text-white font-bold tracking-wide">
                    Credentials Vault
                  </h4>

                  {formProvider === 'google_sheets' ? (
                    editingId ? (
                      <div className="space-y-4">
                        <div className="bg-bg-primary/40 border border-border-custom p-4 rounded-md flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-mono text-xs font-bold">✓ Connected to Google Account</span>
                          </div>
                          <a
                            href="/api/auth/google"
                            className="inline-block text-center bg-transparent border border-border-custom text-text-secondary hover:border-white hover:text-white text-xs px-4 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer"
                          >
                            Reconnect / Change Account
                          </a>
                        </div>
                        {PROVIDER_FIELDS.google_sheets.map((f) => {
                          if (f.key === 'oauth_token') return null;
                          return (
                            <div key={f.key} className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-mono uppercase text-text-muted">
                                {f.label}
                              </label>
                              <input
                                type={f.type}
                                required
                                placeholder={f.placeholder}
                                value={formCredentials[f.key] || ''}
                                onChange={(e) =>
                                  setFormCredentials({
                                    ...formCredentials,
                                    [f.key]: e.target.value,
                                  })
                                }
                                className="bg-bg-primary border border-border-custom text-sm text-text-primary px-3 py-2 font-mono focus:outline-none focus:border-accent rounded-md"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-bg-primary/40 border border-border-custom p-4 rounded-md flex flex-col gap-3">
                        <p className="text-xs font-mono text-text-secondary">
                          To set up Google Sheets synchronization, you must link your Google account.
                        </p>
                        <a
                          href="/api/auth/google"
                          className="inline-block text-center bg-white text-black hover:bg-neutral-200 text-xs px-4 py-2.5 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-[0_1px_10px_rgba(255,255,255,0.15)] hover:shadow-white/20 cursor-pointer"
                        >
                          Connect Google Sheets Account
                        </a>
                      </div>
                    )
                  ) : (
                    PROVIDER_FIELDS[formProvider].map((f) => {
                      if (f.key === 'base_url' || f.key === 'endpoint_url') return null;

                      return (
                        <div key={f.key} className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-text-muted">
                            {f.label}
                          </label>
                          <input
                            type={f.type}
                            required
                            placeholder={f.placeholder}
                            value={formCredentials[f.key] || ''}
                            onChange={(e) =>
                              setFormCredentials({
                                ...formCredentials,
                                [f.key]: e.target.value,
                              })
                            }
                            className="bg-bg-primary border border-border-custom text-sm text-white px-3 py-2 font-mono focus:outline-none focus:border-white rounded-md"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Season scope filter */}
                <div className="flex flex-col gap-2 mt-4 bg-bg-primary/40 border border-border-custom p-4 rounded-md">
                  <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                    Season Synchronization Scope
                  </span>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="seasonScope"
                        checked={formSeasons.includes('current') || formSeasons.length === 0}
                        onChange={() => setFormSeasons(['current'])}
                        className="accent-white cursor-pointer"
                      />
                      <span>Current Season Only</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="seasonScope"
                        checked={formSeasons.includes('all')}
                        onChange={() => setFormSeasons(['all'])}
                        className="accent-white cursor-pointer"
                      />
                      <span>All Seasons</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="seasonScope"
                        checked={!formSeasons.includes('current') && !formSeasons.includes('all') && formSeasons.length > 0}
                        onChange={() => setFormSeasons(['2026'])}
                        className="accent-white cursor-pointer"
                      />
                      <span>Specific Seasons</span>
                    </label>
                  </div>

                  {/* Render Specific Seasons checkboxes */}
                  {!formSeasons.includes('current') && !formSeasons.includes('all') && formSeasons.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3 p-3 bg-bg-primary/20 border border-border-custom rounded-md">
                      {['2023', '2024', '2025', '2026'].map((year) => {
                        const isChecked = formSeasons.includes(year);
                        return (
                          <label key={year} className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormSeasons([...formSeasons.filter(s => s !== 'current' && s !== 'all'), year]);
                                } else {
                                  const updated = formSeasons.filter(s => s !== year);
                                  setFormSeasons(updated.length === 0 ? ['current'] : updated);
                                }
                              }}
                              className="accent-white cursor-pointer"
                            />
                            <span>{formatSeasonLabel(parseInt(year), formLeagues?.[0])}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Active switch */}
                {!(formProvider === 'google_sheets' && !editingId) && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="checkbox"
                      id="formActive"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="accent-white w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="formActive" className="text-xs font-mono text-text-secondary cursor-pointer">
                      Enable auto-synchronization for this connector
                    </label>
                  </div>
                )}

                <div className="flex gap-4 mt-4 border-t border-border-custom pt-4">
                  {!(formProvider === 'google_sheets' && !editingId) && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-5 py-2 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save Connection'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2 text-xs uppercase tracking-wider font-mono font-bold border border-border-custom text-text-secondary hover:border-text-primary hover:text-text-primary rounded-md transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Advanced Mapper Accordion */}
            <div className="bg-bg-surface border border-border-custom rounded-md overflow-hidden mt-6">
              <button
                type="button"
                onClick={() => setShowAdvancedMapper(!showAdvancedMapper)}
                className="w-full flex items-center justify-between p-4 bg-bg-primary/40 hover:bg-bg-primary/80 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="font-mono font-bold text-text-primary text-xs uppercase tracking-wider text-left">
                    Advanced: Custom Field Mapping
                  </h3>
                  <p className="text-[11px] font-mono text-text-secondary mt-1 text-left">
                    Override the default target field names if your DAM has strict custom metadata schemas.
                  </p>
                </div>
                <span className="text-text-secondary">
                  {showAdvancedMapper ? '▲' : '▼'}
                </span>
              </button>

              {showAdvancedMapper && (
                <div className="p-6 border-t border-border-custom bg-bg-surface/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-4 mb-6 gap-4">
                    <div>
                      <h3 className="font-mono font-bold text-text-primary text-xs uppercase tracking-wider">
                        Metadata Field Schema Mapping
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedMapperType}
                        onChange={(e) => handleMapperTypeChange(e.target.value as 'catdv' | 'iconik' | 'webhook' | 'google_sheets')}
                        className="bg-bg-primary border border-border-custom text-xs text-text-primary px-3 py-1.5 font-mono focus:outline-none focus:border-accent rounded-md cursor-pointer"
                      >
                        <option value="google_sheets">Google Sheets Mappings</option>
                        <option value="webhook">Webhook Mappings</option>
                        <option value="iconik">Iconik Mappings</option>
                        <option value="catdv">CatDV Mappings</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAutofillDefaults}
                        className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold border border-border-custom text-text-secondary hover:border-text-primary hover:text-text-primary rounded-md transition-all cursor-pointer"
                      >
                        Autofill Defaults
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {SOURCE_FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border-custom/40 last:border-b-0"
                      >
                        <div className="max-w-xs">
                          <span className="font-mono text-xs text-text-primary block uppercase font-bold">
                            {field.label}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                            Source key: <code className="text-gray-400">{field.key}</code>
                          </span>
                        </div>

                        <div className="flex-1 max-w-sm w-full">
                          <input
                            type="text"
                            placeholder="Target attribute key (e.g. catdv_ipa)"
                            value={mapperFields[field.key] || ''}
                            onChange={(e) =>
                              setMapperFields({
                                ...mapperFields,
                                [field.key]: e.target.value,
                              })
                            }
                            className="w-full bg-bg-primary border border-border-custom text-xs text-text-primary px-3 py-2 font-mono focus:outline-none focus:border-accent rounded-md"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="mt-6 pt-4 border-t border-border-custom">
                      <button
                        type="button"
                        onClick={handleSaveFieldMappings}
                        disabled={saving}
                        className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-6 py-2.5 font-mono font-bold uppercase tracking-wider rounded-md transition-all shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? 'Saving Mappings...' : 'Save Mappings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



      </div>

      {/* SYNC DELIVERY LOGS MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-surface border border-border-custom w-full max-w-4xl max-h-[85vh] flex flex-col rounded-lg shadow-[0_10px_50px_rgba(0,0,0,0.8)] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-border-custom flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-md font-mono font-bold text-text-primary uppercase tracking-wider">
                  Sync Delivery Logs
                </h3>
                <p className="text-[11px] font-mono text-text-secondary mt-1">
                  Showing recent 50 sync events dispatched for this connection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLogsModal(false);
                  setDeliveryLogs([]);
                  setExpandedLogId(null);
                }}
                className="text-xs uppercase font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingLogs ? (
                <div className="text-center py-12">
                  <p className="text-xs font-mono text-text-secondary uppercase animate-pulse">
                    Loading delivery logs...
                  </p>
                </div>
              ) : deliveryLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border-custom rounded-md bg-bg-primary/20">
                  <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">
                    No sync deliveries logged yet.
                  </p>
                  <p className="text-[10px] font-mono text-text-muted mt-1">
                    Once a roster sync runs or a connection test triggers, events will populate here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {deliveryLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-bg-primary border border-border-custom rounded-md overflow-hidden"
                    >
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-primary/40">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono font-bold text-xs text-text-primary uppercase break-all">
                              {log.event}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                                log.status === 'delivered'
                                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/60'
                                  : log.status === 'failed' || log.status === 'dead_letter'
                                  ? 'bg-red-950/30 text-red-400 border-red-900/60'
                                  : 'bg-amber-950/30 text-amber-400 border-amber-900/60'
                              }`}
                            >
                              {log.status === 'dead_letter' ? 'exhausted' : log.status}
                            </span>
                            {log.response_code && (
                              <span className="text-[10px] font-mono text-text-muted">
                                HTTP {log.response_code}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-text-muted mt-1">
                            Dispatched: {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-text-secondary">
                            Attempts: {log.attempts || 1}/3
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                            className="px-2.5 py-1 text-[10px] uppercase font-mono font-bold border border-border-custom text-text-secondary hover:border-text-primary hover:text-text-primary rounded transition-all cursor-pointer"
                          >
                            {expandedLogId === log.id ? 'Hide Payload' : 'Inspect'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Inspect Content */}
                      {expandedLogId === log.id && (
                        <div className="border-t border-border-custom/50 p-4 bg-bg-primary/20 flex flex-col gap-3">
                          {log.error_message && (
                            <div className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded">
                              <strong>ERROR MESSAGE:</strong> {log.error_message}
                            </div>
                          )}
                          <div>
                            <div className="text-[9px] font-mono text-text-muted uppercase font-bold mb-1.5">// JSON PAYLOAD</div>
                            <pre className="text-[10px] bg-bg-primary border border-border-custom/60 p-3 rounded overflow-x-auto text-gray-300 font-mono max-h-60">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border-custom flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowLogsModal(false);
                  setDeliveryLogs([]);
                  setExpandedLogId(null);
                }}
                className="px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-text-primary text-bg-primary hover:opacity-90 rounded-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

