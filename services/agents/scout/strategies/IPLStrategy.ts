import { IRosterFetchingStrategy, RosterPlayer } from '../types.ts';

/**
 * IPL Strategy using Wikipedia team season pages.
 * Pattern: https://en.wikipedia.org/wiki/{Season}_{TeamName}_season
 */
export class IPLStrategy implements IRosterFetchingStrategy {
  private teamWikiMap: Record<string, string> = {
    "CHENNAI SUPER KINGS": "Chennai_Super_Kings",
    "DELHI CAPITALS": "Delhi_Capitals",
    "DELHI DAREDEVILS": "Delhi_Daredevils",
    "GUJARAT TITANS": "Gujarat_Titans",
    "KOLKATA KNIGHT RIDERS": "Kolkata_Knight_Riders",
    "LUCKNOW SUPER GIANTS": "Lucknow_Super_Giants",
    "MUMBAI INDIANS": "Mumbai_Indians",
    "PUNJAB KINGS": "Punjab_Kings",
    "KINGS XI PUNJAB": "Kings_XI_Punjab",
    "RAJASTHAN ROYALS": "Rajasthan_Royals",
    "ROYAL CHALLENGERS BENGALURU": "Royal_Challengers_Bengaluru",
    "ROYAL CHALLENGERS BANGALORE": "Royal_Challengers_Bangalore",
    "SUNRISERS HYDERABAD": "Sunrisers_Hyderabad",
    "DECCAN CHARGERS": "Deccan_Chargers",
    "PUNE WARRIORS INDIA": "Pune_Warriors_India",
    "GUJARAT LIONS": "Gujarat_Lions",
    "RISING PUNE SUPERGIANT": "Rising_Pune_Supergiant",
    "RISING PUNE SUPERGIANTS": "Rising_Pune_Supergiants",
    "KOCHI TUSKERS KERALA": "Kochi_Tuskers_Kerala"
  };

  async fetch(leagueId: string, teamName: string, teamId: string, season: number): Promise<RosterPlayer[]> {
    const wikiSlug = this.teamWikiMap[teamName.toUpperCase()] || teamName.replace(/\s+/g, '_');
    const url = `https://en.wikipedia.org/wiki/${season}_${wikiSlug}_season`;

    console.log(`[IPLStrategy] 🏏 Fetching IPL roster for ${teamName} (${season}) via Wikipedia...`);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });

      if (!res.ok) {
        // Try without "_season" if it fails (some older or newer ones might differ)
        if (res.status === 404) {
          // Fallback to the main season page if the team season page doesn't exist
          // (Though usually team season pages are standard for IPL)
          console.warn(`[IPLStrategy] ⚠️ Team season page not found: ${url}`);
        }
        return [];
      }

      const html = await res.text();
      const players: RosterPlayer[] = [];

      // The squad table is usually the first wikitable with a "Name" column
      const tableMatch = html.match(/<table[^>]*class="wikitable"[^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) {
        console.warn(`[IPLStrategy] ⚠️ No wikitable found for ${teamName} on Wikipedia.`);
        return [];
      }

      const tableHtml = tableMatch[1];

      // Extract rows
      const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

      for (const row of rows) {
        // Skip header
        if (row.includes('<th>Name</th>') || row.includes('<th>Player</th>')) continue;

        // Extract names from links: <td><a href="..." title="...">Name</a></td>
        // Or sometimes just <td>Name</td>
        const nameMatch = row.match(/<td[^>]*>.*?<a[^>]*title="([^"]+)"[^>]*>(.*?)<\/a>.*?<\/td>/i) ||
          row.match(/<td[^>]*>(?:[^<]*<[^>]+>)*\s*([^<]+?)\s*(?:<[^>]+>[^<]*)*<\/td>/i);

        if (nameMatch) {
          const name = (nameMatch[2] || nameMatch[1]).trim();
          if (name && name.length > 3 && !name.includes('No.') && !name.includes('Nationality')) {
            players.push({
              id: `wiki-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              jersey: undefined,
              position: 'ATH',
              teamId: teamId
            });
          }
        }
      }

      console.log(`[IPLStrategy] ✅ Found ${players.length} players for ${teamName} on Wikipedia.`);
      return players;

    } catch (err) {
      console.error(`[IPLStrategy] ❌ Failed to fetch ${teamName} from Wikipedia:`, err);
      return [];
    }
  }
}
