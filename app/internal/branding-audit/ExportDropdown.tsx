'use client';

import React, { useState } from 'react';

interface ExportDropdownProps {
  teamIdentifier: string;
  season: number;
  apiKey: string;
  gatewayUrl: string;
}

export default function ExportDropdown({ teamIdentifier, season, apiKey, gatewayUrl }: ExportDropdownProps) {
  const [format, setFormat] = useState<'vizrt' | 'ross' | 'chyron'>('vizrt');
  const [type, setType] = useState<'xml' | 'json' | 'csv'>('xml');
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const url = `${gatewayUrl}/v1/teams/${teamIdentifier}/export?format=${format}&type=${type}&season=${season}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const fileExtensions = { xml: 'xml', json: 'json', csv: 'csv' };
      link.download = `${teamIdentifier}_roster_${format}.${fileExtensions[type]}`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download roster export file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-700 rounded-lg text-white">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Graphics Engine</label>
        <select 
          value={format} 
          onChange={(e) => setFormat(e.target.value as any)}
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm outline-none text-white"
        >
          <option value="vizrt">Vizrt</option>
          <option value="ross">Ross XPression</option>
          <option value="chyron">Chyron PRIME</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">File Type</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as any)}
          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm outline-none text-white"
        >
          <option value="xml">XML</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </div>

      <button
        onClick={handleDownload}
        disabled={isExporting}
        className="mt-5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors cursor-pointer text-white"
      >
        {isExporting ? 'Downloading...' : 'Download Roster'}
      </button>
    </div>
  );
}
