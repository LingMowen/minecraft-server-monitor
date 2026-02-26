import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import apiRoutes from './api/routes';
import webSocketHandler from './websocket';
import serverManager from './serverManager';

interface Config {
  servers: Array<{
    id: string;
    name: string;
    host: string;
    port: number;
  }>;
  web: {
    port: number;
    username: string;
    password: string;
  };
}

const app = express();
const configPath = path.join(__dirname, '../../config.json');
let config: Config;

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
  console.log('Configuration loaded successfully');
} catch (error) {
  console.error('Failed to load configuration:', error);
  process.exit(1);
}

const PORT = process.env.PORT || config.web.port || 3000;

app.use(cors());
app.use(express.json());

const clientPath = path.join(__dirname, '../../client/build');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
}

config.servers.forEach(server => {
  serverManager.addServer(server);
});
serverManager.startAllQueries();
console.log(`Started monitoring ${config.servers.length} server(s)`)

app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', servers: serverManager.getAllStatuses().length });
});

if (fs.existsSync(clientPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

const httpServer = createServer(app);
webSocketHandler.initialize(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  httpServer.close(() => {
    process.exit(0);
  });
});
