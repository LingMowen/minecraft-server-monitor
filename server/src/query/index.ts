import * as net from 'net';
import { EventEmitter } from 'events';

export interface ServerQueryConfig {
  host: string;
  port: number;
}

export interface ServerQueryResult {
  online: boolean;
  version: string;
  protocol: number;
  maxPlayers: number;
  onlinePlayers: number;
  players: string[];
  description: string;
  favicon: string | null;
  latency: number;
}

class MinecraftQuery extends EventEmitter {
  private config: ServerQueryConfig;
  private queryInterval: NodeJS.Timeout | null = null;

  constructor(config: ServerQueryConfig) {
    super();
    this.config = config;
  }

  async query(): Promise<ServerQueryResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);

      const defaultResult: ServerQueryResult = {
        online: false,
        version: '',
        protocol: 0,
        maxPlayers: 0,
        onlinePlayers: 0,
        players: [],
        description: '',
        favicon: null,
        latency: 0
      };

      socket.connect(this.config.port, this.config.host, () => {
        const handshake = this.createHandshakePacket();
        socket.write(handshake);
        
        const statusRequest = this.createStatusRequestPacket();
        socket.write(statusRequest);
      });

      let buffer = Buffer.alloc(0);

      socket.on('data', (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);
        
        try {
          const result = this.parseResponse(buffer);
          if (result) {
            result.online = true;
            result.latency = Date.now() - startTime;
            socket.destroy();
            resolve(result);
          }
        } catch (e) {
          // Continue collecting data
        }
      });

      socket.on('error', () => {
        resolve(defaultResult);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(defaultResult);
      });

      socket.on('close', () => {
        resolve(defaultResult);
      });
    });
  }

  private createHandshakePacket(): Buffer {
    const hostBuffer = Buffer.from(this.config.host, 'utf8');
    const packets: Buffer[] = [];
    
    // Protocol version
    packets.push(this.writeVarInt(47));
    // Host length + host
    packets.push(this.writeVarInt(hostBuffer.length));
    packets.push(hostBuffer);
    // Port
    const portBuffer = Buffer.alloc(2);
    portBuffer.writeUInt16BE(this.config.port, 0);
    packets.push(portBuffer);
    // Next state (1 = status)
    packets.push(this.writeVarInt(1));
    
    const innerBuffer = Buffer.concat(packets);
    
    return Buffer.concat([
      this.writeVarInt(innerBuffer.length + 1),
      this.writeVarInt(0),
      innerBuffer
    ]);
  }

  private createStatusRequestPacket(): Buffer {
    return Buffer.concat([
      this.writeVarInt(1),
      this.writeVarInt(0)
    ]);
  }

  private writeVarInt(value: number): Buffer {
    const bytes: number[] = [];
    
    while (true) {
      if ((value & ~0x7F) === 0) {
        bytes.push(value);
        break;
      }
      bytes.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    
    return Buffer.from(bytes);
  }

  private readVarInt(buffer: Buffer, offset: number): { value: number; size: number } {
    let value = 0;
    let size = 0;
    let byte: number;
    
    do {
      if (offset + size >= buffer.length) {
        return { value: 0, size: 0 };
      }
      byte = buffer[offset + size];
      value |= (byte & 0x7F) << (size * 7);
      size++;
      if (size > 5) {
        return { value: 0, size: 0 };
      }
    } while ((byte & 0x80) !== 0);
    
    return { value, size };
  }

  private parseResponse(buffer: Buffer): ServerQueryResult | null {
    try {
      let offset = 0;
      
      // Read packet length
      const packetLength = this.readVarInt(buffer, offset);
      if (packetLength.size === 0) return null;
      offset += packetLength.size;
      
      // Read packet ID
      const packetId = this.readVarInt(buffer, offset);
      if (packetId.size === 0) return null;
      offset += packetId.size;
      
      if (packetId.value !== 0) {
        return null;
      }
      
      // Read JSON length
      const jsonLength = this.readVarInt(buffer, offset);
      if (jsonLength.size === 0) return null;
      offset += jsonLength.size;
      
      // Check if we have enough data
      if (offset + jsonLength.value > buffer.length) {
        return null;
      }
      
      // Read JSON data
      const jsonData = buffer.slice(offset, offset + jsonLength.value);
      const json = JSON.parse(jsonData.toString('utf8'));
      
      const result: ServerQueryResult = {
        online: true,
        version: json.version?.name || '',
        protocol: json.version?.protocol || 0,
        maxPlayers: json.players?.max || 0,
        onlinePlayers: json.players?.online || 0,
        players: json.players?.sample?.map((p: { name: string }) => p.name) || [],
        description: typeof json.description === 'string' 
          ? json.description 
          : json.description?.text || '',
        favicon: json.favicon || null,
        latency: 0
      };
      
      return result;
    } catch (e) {
      return null;
    }
  }

  startPolling(intervalMs: number = 5000, callback: (result: ServerQueryResult) => void): void {
    this.stopPolling();
    
    const poll = async () => {
      const result = await this.query();
      callback(result);
      this.emit('query', result);
    };
    
    poll();
    this.queryInterval = setInterval(poll, intervalMs);
  }

  stopPolling(): void {
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
  }
}

export default MinecraftQuery;
