import React, { useState, useEffect } from 'react';
import './App.css';
import { api } from './services/api';
import { ServerWithStatus } from './types';
import ServerCard, { ServerDetailModal } from './components/ServerCard';
import AddServerModal from './components/AddServerModal';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerWithStatus | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    setIsAuthenticated(api.isAuthenticated());
  }, []);

  useEffect(() => {
    loadServers();
    const interval = setInterval(loadServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const loadServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddServer = async (server: Omit<ServerWithStatus, 'id'>) => {
    try {
      await api.addServer(server);
      loadServers();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add server:', err);
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    try {
      await api.removeServer(serverId);
      if (selectedServer?.id === serverId) {
        setSelectedServer(null);
      }
      loadServers();
    } catch (err) {
      console.error('Failed to remove server:', err);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  const onlineCount = servers.filter(s => s.status?.online).length;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⛏️ Minecraft 服务器监控面板</h1>
        <div className="header-info">
          <span className="connection-status connected">
            已连接 {onlineCount} / {servers.length} 服务器
          </span>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isAuthenticated ? (
            <>
              <button className="admin-btn" onClick={() => setShowAdminPanel(true)}>
                ⚙️ 管理
              </button>
              <button className="add-server-btn" onClick={() => setShowAddModal(true)}>
                + 添加服务器
              </button>
            </>
          ) : (
            <button className="login-btn" onClick={() => setShowLoginModal(true)}>
              🔐 登录
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-main">
        <div className="server-grid">
          {servers.map(server => (
            <ServerCard
              key={server.id}
              server={server}
              onRemove={() => handleRemoveServer(server.id)}
              onClick={() => setSelectedServer(server)}
            />
          ))}
          {isAuthenticated && (
            <div className="add-card" onClick={() => setShowAddModal(true)}>
              <div className="add-icon">+</div>
              <div className="add-text">添加服务器</div>
            </div>
          )}
        </div>
      </main>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}

      {showAdminPanel && (
        <AdminPanel
          servers={servers}
          onClose={() => setShowAdminPanel(false)}
          onRefresh={loadServers}
        />
      )}

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddServer}
        />
      )}

      {selectedServer && (
        <ServerDetailModal
          server={selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}
    </div>
  );
};

export default App;
