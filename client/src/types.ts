export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface ServerStatus {
  id: string;
  name: string;
  online: boolean;
  players: string[];
  playerCount: number;
  maxPlayers: number;
  version: string;
  protocol: number;
  description: string;
  latency: number;
  lastUpdate: number;
}

export interface ServerWithStatus extends ServerConfig {
  status?: ServerStatus;
}
