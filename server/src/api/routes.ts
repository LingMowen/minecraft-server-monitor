import { Router, Request, Response } from 'express';
import serverManager, { ServerConfig } from '../serverManager';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

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

const configPath = path.join(__dirname, '../../../config.json');

const loadConfig = (): Config => {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const saveConfig = (config: Config): void => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const config = loadConfig();
    
    if (username === config.web.username && password === config.web.password) {
      const token = generateToken(username);
      res.json({ success: true, token, username });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/verify', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ valid: true, username: req.user?.username });
});

router.get('/servers', (_req: Request, res: Response) => {
  try {
    const servers = serverManager.getAllServers();
    const statuses = serverManager.getAllStatuses();
    
    const result = servers.map(server => ({
      ...server,
      status: statuses.find(s => s.id === server.id)
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get servers' });
  }
});

router.get('/servers/:id', (req: Request, res: Response) => {
  try {
    const server = serverManager.getServerConfig(req.params.id);
    const status = serverManager.getServerStatus(req.params.id);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({ ...server, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get server' });
  }
});

router.get('/servers/:id/status', (req: Request, res: Response) => {
  try {
    const status = serverManager.getServerStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get('/servers/:id/history', (req: Request, res: Response) => {
  try {
    const range = (req.query.range as 'hour' | 'day' | 'week' | 'month') || 'hour';
    const history = serverManager.getHistory(req.params.id, range);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

router.get('/servers/:id/stats', (req: Request, res: Response) => {
  try {
    const stats = serverManager.getPlayerStats(req.params.id);
    if (!stats) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.post('/servers', authMiddleware, (req: Request, res: Response) => {
  try {
    const { name, host, port } = req.body;
    
    if (!name || !host || !port) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const id = `server-${Date.now()}`;
    const serverConfig: ServerConfig = { id, name, host, port };
    
    const config = loadConfig();
    config.servers.push(serverConfig);
    saveConfig(config);
    
    serverManager.addServer(serverConfig);
    serverManager.startQuery(id);
    
    res.json({ success: true, server: serverConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add server' });
  }
});

router.put('/servers/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { name, host, port } = req.body;
    const serverId = req.params.id;
    
    const config = loadConfig();
    const serverIndex = config.servers.findIndex(s => s.id === serverId);
    
    if (serverIndex === -1) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    config.servers[serverIndex] = {
      ...config.servers[serverIndex],
      name: name || config.servers[serverIndex].name,
      host: host || config.servers[serverIndex].host,
      port: port || config.servers[serverIndex].port
    };
    
    saveConfig(config);
    
    serverManager.removeServer(serverId);
    serverManager.addServer(config.servers[serverIndex]);
    serverManager.startQuery(serverId);
    
    res.json({ success: true, server: config.servers[serverIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update server' });
  }
});

router.delete('/servers/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const serverId = req.params.id;
    
    const config = loadConfig();
    config.servers = config.servers.filter(s => s.id !== serverId);
    saveConfig(config);
    
    serverManager.removeServer(serverId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove server' });
  }
});

router.post('/settings/password', authMiddleware, (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const config = loadConfig();
    
    if (config.web.password !== currentPassword) {
      return res.status(400).json({ error: '当前密码错误' });
    }
    
    config.web.password = newPassword;
    saveConfig(config);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/settings', authMiddleware, (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json({
      username: config.web.username,
      port: config.web.port
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.get('/servers/:id/export', authMiddleware, (req: Request, res: Response) => {
  try {
    const serverId = req.params.id;
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const range = (req.query.range as 'hour' | 'day' | 'week' | 'month' | 'all') || 'hour';
    
    const history = serverManager.getHistoryForExport(serverId, range);
    const serverConfig = serverManager.getServerConfig(serverId);
    
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const serverName = serverConfig.name;
    
    if (format === 'csv') {
      const csvHeader = '时间戳,时间,玩家数,延迟(ms)\n';
      const csvRows = history.map(r => {
        const date = new Date(r.timestamp).toLocaleString('zh-CN');
        return `${r.timestamp},${date},${r.players},${r.latency}`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${serverName}-history-${range}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      const exportData = {
        server: serverName,
        range,
        exportTime: new Date().toISOString(),
        data: history
      };
      
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${serverName}-history-${range}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.post('/servers/:id/import', authMiddleware, (req: Request, res: Response) => {
  try {
    const serverId = req.params.id;
    const { data } = req.body;
    
    const serverConfig = serverManager.getServerConfig(serverId);
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const validRecords = data.filter(r => 
      typeof r.timestamp === 'number' && 
      typeof r.players === 'number' &&
      typeof r.latency === 'number'
    );
    
    const result = serverManager.importHistory(serverId, validRecords);
    
    res.json({ 
      success: true, 
      imported: result.imported,
      message: `成功导入 ${result.imported} 条记录`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import data' });
  }
});

router.post('/backup', authMiddleware, (_req: Request, res: Response) => {
  try {
    const result = serverManager.createBackup();
    
    if (result.success) {
      res.json({ 
        success: true, 
        filename: result.filename,
        message: `备份已保存为 ${result.filename}`
      });
    } else {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

export default router;
