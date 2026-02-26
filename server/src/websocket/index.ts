import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import serverManager, { ServerStatus } from '../serverManager';

interface Client {
  ws: WebSocket;
  subscribedServers: Set<string>;
}

class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        subscribedServers: new Set()
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', () => {
        this.clients.delete(clientId);
      });
    });

    this.setupEventListeners();
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(clientId: string, message: { type: string; payload?: unknown }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.payload && typeof message.payload === 'object' && 'serverId' in message.payload) {
          client.subscribedServers.add(message.payload.serverId as string);
        }
        break;

      case 'unsubscribe':
        if (message.payload && typeof message.payload === 'object' && 'serverId' in message.payload) {
          client.subscribedServers.delete(message.payload.serverId as string);
        }
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong' });
        break;
    }
  }

  private setupEventListeners(): void {
    serverManager.on('statusUpdate', (status: ServerStatus) => {
      this.broadcastToServerSubscribers(status.id, {
        type: 'statusUpdate',
        payload: status
      });
    });
  }

  private broadcastToServerSubscribers(serverId: string, message: object): void {
    this.clients.forEach((client, clientId) => {
      if (client.subscribedServers.has(serverId)) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private sendToClient(clientId: string, message: object): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: object): void {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
}

export default new WebSocketHandler();
