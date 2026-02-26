import MinecraftQuery, { ServerQueryConfig, ServerQueryResult } from './query';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

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
  description: string;
  latency: number;
  lastUpdate: number;
}

export interface HistoryRecord {
  timestamp: number;
  players: number;
  latency: number;
}

export interface PlayerStats {
  maxPlayersDay: number;
  maxPlayersWeek: number;
  maxPlayersMonth: number;
  maxPlayersDayTime: number;
  maxPlayersWeekTime: number;
  maxPlayersMonthTime: number;
}

const HISTORY_FILE = path.join(__dirname, '../../data/history.json');

class ServerManager extends EventEmitter {
  private servers: Map<string, ServerConfig> = new Map();
  private queries: Map<string, MinecraftQuery> = new Map();
  private statuses: Map<string, ServerStatus> = new Map();
  private history: Map<string, HistoryRecord[]> = new Map();
  private playerStats: Map<string, PlayerStats> = new Map();
  private updateInterval: number = 5000;
  private hourlyInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.loadHistory();
    this.startHourlyAggregation();
  }

  private loadHistory(): void {
    try {
      const dataDir = path.dirname(HISTORY_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      if (fs.existsSync(HISTORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        Object.entries(data.history || {}).forEach(([serverId, records]) => {
          this.history.set(serverId, records as HistoryRecord[]);
        });
        Object.entries(data.playerStats || {}).forEach(([serverId, stats]) => {
          this.playerStats.set(serverId, stats as PlayerStats);
        });
        console.log('History data loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  private saveHistory(): void {
    try {
      const dataDir = path.dirname(HISTORY_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const data = {
        history: Object.fromEntries(this.history),
        playerStats: Object.fromEntries(this.playerStats)
      };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  private startHourlyAggregation(): void {
    const aggregateAndSave = () => {
      this.saveHistory();
    };
    
    this.hourlyInterval = setInterval(aggregateAndSave, 3600000);
  }

  addServer(config: ServerConfig): void {
    this.servers.set(config.id, config);
    this.initializeServerStatus(config);
    
    if (!this.history.has(config.id)) {
      this.history.set(config.id, []);
    }
    if (!this.playerStats.has(config.id)) {
      this.playerStats.set(config.id, {
        maxPlayersDay: 0,
        maxPlayersWeek: 0,
        maxPlayersMonth: 0,
        maxPlayersDayTime: 0,
        maxPlayersWeekTime: 0,
        maxPlayersMonthTime: 0
      });
    }
  }

  removeServer(serverId: string): void {
    const query = this.queries.get(serverId);
    if (query) {
      query.stopPolling();
      this.queries.delete(serverId);
    }
    this.servers.delete(serverId);
    this.statuses.delete(serverId);
  }

  private initializeServerStatus(config: ServerConfig): void {
    this.statuses.set(config.id, {
      id: config.id,
      name: config.name,
      online: false,
      players: [],
      playerCount: 0,
      maxPlayers: 0,
      version: '',
      description: '',
      latency: 0,
      lastUpdate: Date.now()
    });
  }

  startQuery(serverId: string): void {
    const config = this.servers.get(serverId);
    if (!config) return;

    const existingQuery = this.queries.get(serverId);
    if (existingQuery) {
      existingQuery.stopPolling();
    }

    const queryConfig: ServerQueryConfig = {
      host: config.host,
      port: config.port
    };

    const query = new MinecraftQuery(queryConfig);
    
    query.startPolling(this.updateInterval, (result: ServerQueryResult) => {
      this.updateServerStatus(serverId, result);
    });

    query.on('query', (result: ServerQueryResult) => {
      this.recordHistory(serverId, result);
      
      this.emit('statusUpdate', {
        id: serverId,
        name: config.name,
        online: result.online,
        players: result.players,
        playerCount: result.onlinePlayers,
        maxPlayers: result.maxPlayers,
        version: result.version,
        description: result.description,
        latency: result.latency,
        lastUpdate: Date.now()
      });
    });

    this.queries.set(serverId, query);
  }

  private recordHistory(serverId: string, result: ServerQueryResult): void {
    if (!result.online) return;
    
    const now = Date.now();
    const record: HistoryRecord = {
      timestamp: now,
      players: result.onlinePlayers,
      latency: result.latency
    };
    
    const history = this.history.get(serverId) || [];
    history.push(record);
    
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const filteredHistory = history.filter(r => r.timestamp > oneMonthAgo);
    this.history.set(serverId, filteredHistory);
    
    this.updatePlayerStats(serverId, result.onlinePlayers, now);
  }

  private updatePlayerStats(serverId: string, playerCount: number, timestamp: number): void {
    const stats = this.playerStats.get(serverId) || {
      maxPlayersDay: 0,
      maxPlayersWeek: 0,
      maxPlayersMonth: 0,
      maxPlayersDayTime: 0,
      maxPlayersWeekTime: 0,
      maxPlayersMonthTime: 0
    };
    
    const oneDayAgo = timestamp - 24 * 60 * 60 * 1000;
    const oneWeekAgo = timestamp - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = timestamp - 30 * 24 * 60 * 60 * 1000;
    
    if (playerCount > stats.maxPlayersDay || stats.maxPlayersDayTime < oneDayAgo) {
      if (timestamp >= oneDayAgo) {
        stats.maxPlayersDay = playerCount;
        stats.maxPlayersDayTime = timestamp;
      } else {
        stats.maxPlayersDay = 0;
        stats.maxPlayersDayTime = 0;
      }
    }
    
    if (playerCount > stats.maxPlayersWeek || stats.maxPlayersWeekTime < oneWeekAgo) {
      if (timestamp >= oneWeekAgo) {
        stats.maxPlayersWeek = playerCount;
        stats.maxPlayersWeekTime = timestamp;
      } else {
        stats.maxPlayersWeek = 0;
        stats.maxPlayersWeekTime = 0;
      }
    }
    
    if (playerCount > stats.maxPlayersMonth || stats.maxPlayersMonthTime < oneMonthAgo) {
      if (timestamp >= oneMonthAgo) {
        stats.maxPlayersMonth = playerCount;
        stats.maxPlayersMonthTime = timestamp;
      } else {
        stats.maxPlayersMonth = 0;
        stats.maxPlayersMonthTime = 0;
      }
    }
    
    this.playerStats.set(serverId, stats);
  }

  startAllQueries(): void {
    this.servers.forEach((_, serverId) => {
      this.startQuery(serverId);
    });
  }

  private updateServerStatus(serverId: string, result: ServerQueryResult): void {
    const config = this.servers.get(serverId);
    if (!config) return;

    const status: ServerStatus = {
      id: serverId,
      name: config.name,
      online: result.online,
      players: result.players,
      playerCount: result.onlinePlayers,
      maxPlayers: result.maxPlayers,
      version: result.version,
      description: result.description,
      latency: result.latency,
      lastUpdate: Date.now()
    };

    this.statuses.set(serverId, status);
    this.emit('statusUpdate', status);
  }

  getServerStatus(serverId: string): ServerStatus | undefined {
    return this.statuses.get(serverId);
  }

  getAllStatuses(): ServerStatus[] {
    return Array.from(this.statuses.values());
  }

  getServerConfig(serverId: string): ServerConfig | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): ServerConfig[] {
    return Array.from(this.servers.values());
  }

  getHistory(serverId: string, range: 'hour' | 'day' | 'week' | 'month' = 'hour'): HistoryRecord[] {
    const history = this.history.get(serverId) || [];
    const now = Date.now();
    
    let cutoff: number;
    switch (range) {
      case 'hour':
        cutoff = now - 60 * 60 * 1000;
        break;
      case 'day':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoff = now - 60 * 60 * 1000;
    }
    
    return history.filter(r => r.timestamp > cutoff);
  }

  getPlayerStats(serverId: string): PlayerStats | undefined {
    return this.playerStats.get(serverId);
  }
}

export default new ServerManager();
