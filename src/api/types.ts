export interface League {
  id: string
  slug: string
  name: string
  region: string
  image: string
}

export interface Player {
  id: string
  summonerName: string
  firstName: string
  lastName: string
  image: string
  role: string
}

export interface Team {
  id: string
  slug: string
  name: string
  code: string
  image: string
  alternativeImage?: string
  homeLeague: {
    name: string
    region: string
  }
  players: Player[]
}

export interface MatchTeam {
  id?: string
  name: string
  code: string
  image: string
  slug?: string
  result?: {
    outcome?: 'win' | 'loss' | null
    gameWins: number
  }
  record?: {
    wins: number
    losses: number
  }
}

export interface ScheduleEvent {
  startTime: string
  state: string
  type: string
  blockName?: string
  league: {
    name: string
    slug: string
  }
  match: {
    id: string
    teams: MatchTeam[]
    strategy: {
      type: string
      count: number
    }
  }
}

export interface GameDetail {
  number: number
  id: string
  state: string
  teams: Array<{ id: string; side: 'blue' | 'red' }>
}

export interface GameParticipant {
  participantId: number
  esportsPlayerId: string
  summonerName: string
  championId: string
  role: string
}

export interface FrameParticipant {
  participantId: number
  totalGold: number
  level: number
  kills: number
  deaths: number
  assists: number
  creepScore: number
}

export interface FrameTeam {
  totalGold: number
  totalKills: number
  towers: number
  inhibitors: number
  barons: number
  dragons: string[]
  participants: FrameParticipant[]
}

export interface GameWindow {
  esportsGameId: string
  esportsMatchId: string
  gameMetadata: {
    patchVersion: string
    blueTeamMetadata: {
      esportsTeamId: string
      participantMetadata: GameParticipant[]
    }
    redTeamMetadata: {
      esportsTeamId: string
      participantMetadata: GameParticipant[]
    }
  }
  frames: Array<{
    gameState: string
    blueTeam: FrameTeam
    redTeam: FrameTeam
  }>
}

export interface EventDetails {
  id: string
  type: string
  league: {
    name: string
    slug: string
    image?: string
  }
  match: {
    id: string
    strategy: { count: number }
    teams: Array<{
      id: string
      name: string
      code: string
      image: string
      result: { gameWins: number }
    }>
    games: GameDetail[]
  }
}

export interface StandingTeam {
  id: string
  slug: string
  name: string
  code: string
  image: string
  record: { wins: number; losses: number }
}

export interface TeamStandingResult {
  team: StandingTeam
  tournamentSlug: string
  sectionName?: string
}

export interface LeagueStandings {
  leagueSlug: string
  tournamentSlug: string
  sections: Array<{
    stageName: string
    name?: string
    teams: StandingTeam[]
  }>
}

export interface GprEntry {
  rank: number
  gprScore: number
  elo: number
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  image: string
}

export interface GprData {
  updatedAt: string
  source: string
  teams: GprEntry[]
}

export interface TeamIndexEntry {
  slug: string
  name: string
  code: string
  leagueSlug: string
  leagueName: string
  leagueId: string
  region: string
  image: string
  gprRank?: number
  gprScore?: number
}

export interface TeamsIndexData {
  updatedAt: string
  leagues: League[]
  teams: TeamIndexEntry[]
}

export interface DetailsParticipant {
  participantId: number
  level: number
  kills: number
  deaths: number
  assists: number
  totalGoldEarned: number
  creepScore: number
  killParticipation: number
  championDamageShare: number
  wardsPlaced: number
  wardsDestroyed: number
  items: number[]
  perkMetadata: {
    styleId: number
    subStyleId: number
    perks: number[]
  }
}

export interface GameDetailsFrame {
  rfc460Timestamp: string
  participants: DetailsParticipant[]
}

export interface GameDetails {
  frames: GameDetailsFrame[]
}

export interface MatchNavigationState {
  from?: string
  startTime?: string
  blockName?: string
}
