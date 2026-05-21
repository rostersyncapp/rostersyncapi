export const LEAGUE_TO_SPORT: Record<string, string> = {
  'nba': 'Basketball', 'wnba': 'Basketball', 'euroleague': 'Basketball',
  'nfl': 'Football',
  'premier-league': 'Soccer', 'la-liga': 'Soccer', 'serie-a': 'Soccer',
  'bundesliga': 'Soccer', 'ligue-1': 'Soccer', 'mls': 'Soccer', 'usa.1': 'Soccer', 'usa.nwsl': 'Soccer', 'nwsl': 'Soccer', 'liga-mx': 'Soccer',
  'eredivisie': 'Soccer', 'usl': 'Soccer',
  'ipl': 'Cricket',
  'nhl': 'Hockey',
  'mlb': 'Baseball',
  'milb': 'Baseball',
  'milb-aaa': 'Baseball',
  'milb-aa': 'Baseball',
  'milb-higha': 'Baseball',
  'milb-a': 'Baseball',
  'ncaa': 'Athlete',
};

export const DB_LEAGUE_TO_ESPN_LEAGUE: Record<string, string> = {
  'mls': 'usa.1',
  'nwsl': 'usa.nwsl',
  'nfl': 'nfl',
  'nba': 'nba',
  'mlb': 'mlb',
  'nhl': 'nhl',
  'wnba': 'wnba',
  'usl': 'usa.usl.1',
  'milb': 'milb-aaa',
  'premier-league': 'eng.1',
  'la-liga': 'esp.1',
  'bundesliga': 'ger.1',
  'serie-a': 'ita.1',
  'ligue-1': 'fra.1',
  'eredivisie': 'ned.1',
  'liga-mx': 'mex.1',
  'ncaa_fb': 'college-football',
  'ncaa_mb': 'mens-college-basketball',
  'ncaa_wb': 'womens-college-basketball',
};

export const MILB_SPORT_IDS: Record<string, number> = {
  "milb": 11,
  "milb-aaa": 11,
  "milb-aa": 12,
  "milb-higha": 13,
  "milb-a": 14
};
