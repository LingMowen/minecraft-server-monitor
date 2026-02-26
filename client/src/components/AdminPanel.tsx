import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServerWithStatus } from '../types';

interface AdminPanelProps {
  servers: ServerWithStatus[];
  onClose: () => void;
  onRefresh: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ servers, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'servers' | 'settings'>('servers');
  const [editingServer, setEditingServer] = useState<ServerWithStatus | null>(null);
  const [serverForm, setServerForm] = useState({ name: '', host: '', port: 25565 });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingServer) {
      setServerForm({
        name: editingServer.name,
        host: editingServer.host,
        port: editingServer.port
      });
    } else {
      setServerForm({ name: '', host: '', port: 25565 });
    }
  }, [editingServer]);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.addServer(serverForm);
      setServerForm({ name: '', host: '', port: 25565 });
      onRefresh();
      setSuccess('服务器添加成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;
    
    setError('');
    setLoading(true);

    try {
      await api.updateServer(editingServer.id, serverForm);
      setEditingServer(null);
      setServerForm({ name: '', host: '', port: 25565 });
      onRefresh();
      setSuccess('服务器更新成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!window.confirm('确定要删除此服务器吗？')) return;
    
    setError('');
    setLoading(true);

    try {
      await api.removeServer(serverId);
      onRefresh();
      setSuccess('服务器删除成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少6位');
      return;
    }

    setLoading(true);

    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('密码修改成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="admin-header">
          <h2>⚙️ 管理后台</h2>
          <div className="admin-user-info">
            <span>欢迎, {api.getUsername()}</span>
            <button className="logout-btn" onClick={handleLogout}>退出登录</button>
          </div>
        </div>

        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'servers' ? 'active' : ''}`}
            onClick={() => setActiveTab('servers')}
          >
            服务器管理
          </button>
          <button 
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            系统设置
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        <div className="admin-content">
          {activeTab === 'servers' && (
            <div className="admin-servers">
              <div className="admin-section">
                <h3>{editingServer ? '编辑服务器' : '添加服务器'}</h3>
                <form onSubmit={editingServer ? handleUpdateServer : handleAddServer} className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>服务器名称</label>
                      <input
                        type="text"
                        value={serverForm.name}
                        onChange={e => setServerForm({ ...serverForm, name: e.target.value })}
                        placeholder="我的服务器"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>服务器地址</label>
                      <input
                        type="text"
                        value={serverForm.host}
                        onChange={e => setServerForm({ ...serverForm, host: e.target.value })}
                        placeholder="mc.example.com"
                        required
                      />
                    </div>
                    <div className="form-group form-group-port">
                      <label>端口</label>
                      <input
                        type="number"
                        value={serverForm.port}
                        onChange={e => setServerForm({ ...serverForm, port: parseInt(e.target.value) || 25565 })}
                        placeholder="25565"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-buttons">
                    {editingServer && (
                      <button 
                        type="button" 
                        className="btn-cancel"
                        onClick={() => {
                          setEditingServer(null);
                          setServerForm({ name: '', host: '', port: 25565 });
                        }}
                      >
                        取消
                      </button>
                    )}
                    <button type="submit" className="btn-submit" disabled={loading}>
                      {loading ? '处理中...' : (editingServer ? '更新' : '添加')}
                    </button>
                  </div>
                </form>
              </div>

              <div className="admin-section">
                <h3>服务器列表</h3>
                <div className="admin-server-list">
                  {servers.length === 0 ? (
                    <div className="admin-empty">暂无服务器</div>
                  ) : (
                    servers.map(server => (
                      <div key={server.id} className="admin-server-item">
                        <div className="admin-server-info">
                          <span className="admin-server-name">{server.name}</span>
                          <span className="admin-server-address">{server.host}:{server.port}</span>
                          <span className={`admin-server-status ${server.status?.online ? 'online' : 'offline'}`}>
                            {server.status?.online ? '在线' : '离线'}
                          </span>
                        </div>
                        <div className="admin-server-actions">
                          <button 
                            className="admin-edit-btn"
                            onClick={() => setEditingServer(server)}
                          >
                            编辑
                          </button>
                          <button 
                            className="admin-delete-btn"
                            onClick={() => handleDeleteServer(server.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="admin-settings">
              <div className="admin-section">
                <h3>修改密码</h3>
                <form onSubmit={handleChangePassword} className="admin-form">
                  <div className="form-group">
                    <label>当前密码</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="请输入当前密码"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>新密码</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="请输入新密码"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>确认新密码</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="请再次输入新密码"
                      required
                    />
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="btn-submit" disabled={loading}>
                      {loading ? '处理中...' : '修改密码'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
