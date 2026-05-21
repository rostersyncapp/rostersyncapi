
import { createScopedClient } from '@/services/supabase';
import BrandingRow from './BrandingRow';

// This is a Server Component for the Branding Audit
export default async function BrandingAuditPage() {
  const supabase = createScopedClient();
  const { data: teams, error } = await supabase
    .from('branding_audit_view')
    .select('*');

  if (error) return <div>Error loading audit data</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Branding Audit View</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border p-2">Team Name</th>
            <th className="border p-2">League</th>
            <th className="border p-2">Primary</th>
            <th className="border p-2">Secondary</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team: any) => (
            <BrandingRow key={team.id} team={team} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
