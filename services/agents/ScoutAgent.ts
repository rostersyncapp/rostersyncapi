import type { RosterPlayer, IRosterFetchingStrategy } from './scout/types.ts';
import { MLBStrategy } from './scout/strategies/MLBStrategy.ts';
import { NHLStrategy } from './scout/strategies/NHLStrategy.ts';
import { NBAStrategy } from './scout/strategies/NBAStrategy.ts';
import { WNBAStrategy } from './scout/strategies/WNBAStrategy.ts';
import { NFLStrategy } from './scout/strategies/NFLStrategy.ts';
import { MLSStrategy } from './scout/strategies/MLSStrategy.ts';
import { NWSLStrategy } from './scout/strategies/NWSLStrategy.ts';
import { USLStrategy } from './scout/strategies/USLStrategy.ts';
import { PremierLeagueStrategy } from './scout/strategies/PremierLeagueStrategy.ts';
import { LaLigaStrategy } from './scout/strategies/LaLigaStrategy.ts';
import { BundesligaStrategy } from './scout/strategies/BundesligaStrategy.ts';
import { SerieAStrategy } from './scout/strategies/SerieAStrategy.ts';
import { Ligue1Strategy } from './scout/strategies/Ligue1Strategy.ts';
import { LigaMXStrategy } from './scout/strategies/LigaMXStrategy.ts';
import { NCAAFootballStrategy } from './scout/strategies/NCAAFootballStrategy.ts';
import { NCAABasketballStrategy } from './scout/strategies/NCAABasketballStrategy.ts';
import { NCAAWomensBasketballStrategy } from './scout/strategies/NCAAWomensBasketballStrategy.ts';
import { EredivisieStrategy } from './scout/strategies/EredivisieStrategy.ts';
import { IPLStrategy } from './scout/strategies/IPLStrategy.ts';
import { ESPNStrategy } from './scout/strategies/ESPNStrategy.ts';

export type { RosterPlayer };

export class ScoutAgent {
  private strategies: Record<string, IRosterFetchingStrategy> = {
    'mlb': new MLBStrategy(),
    'milb': new MLBStrategy(),
    'nhl': new NHLStrategy(),
    'nba': new NBAStrategy(),
    'wnba': new WNBAStrategy(),
    'nfl': new NFLStrategy(),
    'ncaa': new NCAAFootballStrategy(),
    'ncaa_fb': new NCAAFootballStrategy(),
    'ncaa_mb': new NCAABasketballStrategy(),
    'ncaa-mens-basketball': new NCAABasketballStrategy(),
    'ncaa_wb': new NCAAWomensBasketballStrategy(),
    'ncaa-womens-basketball': new NCAAWomensBasketballStrategy(),
    'ipl': new IPLStrategy(),
    'mls': new MLSStrategy(),
    'nwsl': new NWSLStrategy(),
    'usl': new USLStrategy(),
    'premier-league': new PremierLeagueStrategy(),
    'eng.1': new PremierLeagueStrategy(),
    'la-liga': new LaLigaStrategy(),
    'esp.1': new LaLigaStrategy(),
    'bundesliga': new BundesligaStrategy(),
    'ger.1': new BundesligaStrategy(),
    'serie-a': new SerieAStrategy(),
    'ita.1': new SerieAStrategy(),
    'ligue-1': new Ligue1Strategy(),
    'fra.1': new Ligue1Strategy(),
    'liga-mx': new LigaMXStrategy(),
    'mex.1': new LigaMXStrategy(),
    'eredivisie': new EredivisieStrategy(),
    'ned.1': new EredivisieStrategy(),
    'default': new ESPNStrategy()
  };

  async fetchOfficialRoster(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]> {
    console.log(`[Scout] Fetching official roster for ${teamName} in ${leagueId}...`);

    try {
      let strategyKey = leagueId;
      if (leagueId.startsWith('milb-')) strategyKey = 'milb';

      const strategy = this.strategies[strategyKey] || this.strategies['default'];
      return await strategy.fetch(leagueId, teamName, teamId, season, apiKey);
    } catch (err) {
      console.error(`[Scout] ❌ Failed for ${teamName}:`, err);
      return [];
    }
  }
}
