import { EventEmitter } from 'events';
import * as net from 'net';

export interface RconConfig {
  host: string;
  port: number;
  password: string;
}

export interface RconResponse {
  body: string;
}

export type LogCallback = (message: string, type: LogType) => void;

export type LogType = 'chat' | 'system' | 'death' | 'join' | 'leave' | 'command' | 'warning' | 'error' | 'info';

class RconConnection extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: RconConfig;
  private connected: boolean = false;
  private requestId: number = 0;
  private isAuthenticated: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastResponse: string = '';

  constructor(config: RconConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`Connecting to ${this.config.host}:${this.config.port}...`);
        
        this.socket = new net.Socket();
        this.socket.setTimeout(10000);

        this.socket.connect(this.config.port, this.config.host, () => {
          this.connected = true;
          console.log(`TCP connected to ${this.config.host}:${this.config.port}, sending auth...`);
          this.authenticate();
          resolve(true);
        });

        this.socket.on('data', (data: Buffer) => {
          this.handleData(data);
        });

        this.socket.on('close', () => {
          this.connected = false;
          this.isAuthenticated = false;
          console.log(`Connection closed to ${this.config.host}:${this.config.port}`);
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.socket.on('error', (err: Error) => {
          console.error(`Socket error for ${this.config.host}:${this.config.port}:`, err.message);
          this.connected = false;
          this.isAuthenticated = false;
          this.emit('error', err);
          this.scheduleReconnect();
        });

        this.socket.on('timeout', () => {
          this.connected = false;
          this.emit('timeout');
        });

        setTimeout(() => {
          if (!this.isAuthenticated) {
            resolve(false);
          }
        }, 5000);

      } catch (err) {
        resolve(false);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private authenticate(): void {
    const authPacket = this.createPacket(3, this.config.password);
    this.socket?.write(authPacket);
  }

  private createPacket(type: number, body: string): Buffer {
    const bodyBytes = Buffer.from(body, 'utf8');
    const packetLength = bodyBytes.length + 14;
    const buffer = Buffer.alloc(packetLength);
    
    buffer.writeInt32LE(packetLength - 4, 0);
    buffer.writeInt32LE(this.requestId++, 4);
    buffer.writeInt32LE(type, 8);
    bodyBytes.copy(buffer, 12);
    buffer[packetLength - 2] = 0;
    buffer[packetLength - 1] = 0;
    
    return buffer;
  }

  private handleData(data: Buffer): void {
    if (data.length < 12) return;

    const requestId = data.readInt32LE(4);
    const packetType = data.readInt32LE(8);

    if (packetType === 2 && requestId === -1) {
      console.error(`RCON authentication failed for ${this.config.host}:${this.config.port}`);
      this.emit('error', new Error('RCON authentication failed'));
      return;
    }

    if (packetType === 2 && !this.isAuthenticated) {
      this.isAuthenticated = true;
      console.log(`RCON authenticated successfully to ${this.config.host}:${this.config.port}`);
      this.emit('authenticated');
      this.startPolling();
      return;
    }

    if (packetType === 0) {
      const bodyEnd = data.indexOf(0, 12);
      if (bodyEnd > 12) {
        const message = data.slice(12, bodyEnd).toString('utf8').trim();
        if (message) {
          this.parseAndEmitLog(message);
        }
      }
    }

    if (packetType === 2 && this.isAuthenticated) {
      const bodyEnd = data.indexOf(0, 12);
      if (bodyEnd > 12) {
        const message = data.slice(12, bodyEnd).toString('utf8').trim();
        this.lastResponse = message;
      }
    }
  }

  private parseAndEmitLog(message: string): void {
    const logType = this.classifyLog(message);
    this.emit('log', message, logType);
  }

  private classifyLog(message: string): LogType {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('chat message') || lowerMsg.includes('<') && lowerMsg.includes('>')) {
      return 'chat';
    }
    if (lowerMsg.includes('joined the game') || lowerMsg.includes('logged in')) {
      return 'join';
    }
    if (lowerMsg.includes('left the game') || lowerMsg.includes('disconnected')) {
      return 'leave';
    }
    if (lowerMsg.includes('died') || lowerMsg.includes('was killed') || lowerMsg.includes('fell from') || 
        lowerMsg.includes('burned to death') || lowerMsg.includes('drowned') || lowerMsg.includes('suffocated') ||
        lowerMsg.includes('exploded') || lowerMsg.includes('hit the ground too hard')) {
      return 'death';
    }
    if (lowerMsg.includes('issued server command') || lowerMsg.includes('command executed')) {
      return 'command';
    }
    if (lowerMsg.includes('warn') || lowerMsg.includes('warning')) {
      return 'warning';
    }
    if (lowerMsg.includes('error') || lowerMsg.includes('exception') || lowerMsg.includes('failed')) {
      return 'error';
    }
    if (lowerMsg.includes('server started') || lowerMsg.includes('server stopping') || lowerMsg.includes('loading')) {
      return 'system';
    }
    
    return 'info';
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.connected || !this.isAuthenticated) {
      throw new Error('Not connected to RCON server');
    }

    this.lastResponse = '';
    const packet = this.createPacket(2, command);
    this.socket?.write(packet);

    return new Promise((resolve, reject) => {
      let retries = 0;
      const checkResponse = () => {
        if (this.lastResponse) {
          resolve(this.lastResponse);
        } else if (retries < 20) {
          retries++;
          setTimeout(checkResponse, 100);
        } else {
          resolve('');
        }
      };
      checkResponse();
    });
  }

  private startPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(() => {
      if (this.connected && this.isAuthenticated) {
        this.sendCommand('list').catch(() => {});
      }
    }, 30000);
  }

  async getPlayerList(): Promise<{ players: string[]; maxPlayers: number }> {
    try {
      const response = await this.sendCommand('list');
      const match = response.match(/There are (\d+) of a max of (\d+) players online:(.*)/);
      if (match) {
        const maxPlayers = parseInt(match[2]);
        const players = match[3] ? match[3].split(',').map(p => p.trim()).filter(p => p) : [];
        return { players, maxPlayers };
      }
      return { players: [], maxPlayers: 20 };
    } catch {
      return { players: [], maxPlayers: 20 };
    }
  }

  async getServerTPS(): Promise<{ tps: number; mspt: number }> {
    try {
      const response = await this.sendCommand('tps');
      const tpsMatch = response.match(/TPS from last 1s, 5s, 10s: (\d+\.?\d*), (\d+\.?\d*), (\d+\.?\d*)/);
      const msptMatch = response.match(/MSPT per player: (\d+\.?\d*)/);
      
      return {
        tps: tpsMatch ? parseFloat(tpsMatch[1]) : 20,
        mspt: msptMatch ? parseFloat(msptMatch[1]) : 0
      };
    } catch {
      return { tps: 20, mspt: 0 };
    }
  }

  async getMemoryInfo(): Promise<{ used: number; max: number; percentage: number }> {
    try {
      const response = await this.sendCommand('memory');
      const usedMatch = response.match(/Used: (\d+\.?\d*)MiB \/ (\d+\.?\d*)GiB/);
      const percentMatch = response.match(/(\d+\.?\d*)%/);
      
      if (usedMatch) {
        const usedMB = parseFloat(usedMatch[1]);
        const maxGB = parseFloat(usedMatch[2]);
        const maxMB = maxGB * 1024;
        const percent = percentMatch ? parseFloat(percentMatch[1]) : (usedMB / maxMB) * 100;
        
        return {
          used: usedMB,
          max: maxMB,
          percentage: percent
        };
      }
      
      const defaultMatch = response.match(/(\d+)\/(\d+)/);
      if (defaultMatch) {
        const used = parseInt(defaultMatch[1]);
        const max = parseInt(defaultMatch[2]);
        return {
          used,
          max,
          percentage: (used / max) * 100
        };
      }
      
      return { used: 0, max: 0, percentage: 0 };
    } catch {
      return { used: 0, max: 0, percentage: 0 };
    }
  }

  isConnected(): boolean {
    return this.connected && this.isAuthenticated;
  }

  disconnect(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.isAuthenticated = false;
  }
}

export default RconConnection;
