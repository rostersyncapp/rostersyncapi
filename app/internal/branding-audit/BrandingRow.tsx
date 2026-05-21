'use client';

import { useState } from 'react';
import { updateTeamBranding } from './actions';

export default function BrandingRow({ team }: { team: any }) {
  const [primary, setPrimary] = useState(team.primary_color || '');
  const [secondary, setSecondary] = useState(team.secondary_color || '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await updateTeamBranding(team.id, primary || null, secondary || null);
    setLoading(false);
    alert('Saved!');
  }

  return (
    <tr className="border-b">
      <td className="p-2">{team.name}</td>
      <td className="p-2">{team.league}</td>
      <td className="p-2">
        <input 
          value={primary} 
          onChange={(e) => setPrimary(e.target.value)} 
          className="border p-1 w-24"
          placeholder="#000000"
        />
      </td>
      <td className="p-2">
        <input 
          value={secondary} 
          onChange={(e) => setSecondary(e.target.value)} 
          className="border p-1 w-24"
          placeholder="#FFFFFF"
        />
      </td>
      <td className="p-2">
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-blue-500 text-white px-2 py-1 rounded"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
