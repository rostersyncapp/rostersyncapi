export interface RosterPlayer {
    id: string;
    name: string;
    jersey?: string;
    position: string;
    teamId: string;
}

export interface IRosterFetchingStrategy {
    fetch(leagueId: string, teamName: string, teamId: string, season: number, apiKey?: string): Promise<RosterPlayer[]>;
}
