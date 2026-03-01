import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface AboutPanelProps {
  isModal?: boolean;
  onClose?: () => void;
}

interface VersionInfo {
  current: string;
  latest: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
  isUpdateAvailable: boolean;
}

const AboutPanel: React.FC<AboutPanelProps> = ({ isModal = false, onClose }) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    setLoading(true);
    setError('');
    try {
      const info = await api.checkUpdate();
      setVersionInfo(info);
    } catch (err) {
      setError('检查更新失败');
      const version = await api.getVersion();
      setVersionInfo({
        current: version.current,
        latest: version.current,
        releaseName: '',
        releaseNotes: '',
        releaseDate: '',
        isUpdateAvailable: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoUpdate = async () => {
    if (!window.confirm('确定要自动更新吗？这将拉取最新代码。')) return;
    
    setUpdating(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await api.autoUpdate();
      if (result.success) {
        setSuccess('更新成功！请重启服务器以应用更改。');
        await checkVersion();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('更新失败，请手动执行 git pull');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const content = (
    <div className="about-content">
      <div className="about-header">
        <div className="about-logo">⛏️</div>
        <h2>Minecraft 服务器监控面板</h2>
        <p className="about-subtitle">Minecraft Server Monitor</p>
      </div>

      {error && <div className="about-error">{error}</div>}
      {success && <div className="about-success">{success}</div>}

      <div className="about-section">
        <h3>📌 版本信息</h3>
        {loading ? (
          <div className="about-loading">加载中...</div>
        ) : versionInfo ? (
          <div className="version-info">
            <div className="version-row">
              <span className="version-label">当前版本</span>
              <span className="version-value">v{versionInfo.current}</span>
            </div>
            <div className="version-row">
              <span className="version-label">最新版本</span>
              <span className="version-value">v{versionInfo.latest}</span>
            </div>
            {versionInfo.isUpdateAvailable && (
              <div className="version-update-badge">
                🎉 发现新版本可用！
              </div>
            )}
            {versionInfo.releaseDate && (
              <div className="version-row">
                <span className="version-label">发布时间</span>
                <span className="version-value">{formatDate(versionInfo.releaseDate)}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="about-section">
        <h3>🔄 检查更新</h3>
        <p className="about-desc">检查 GitHub 仓库是否有新版本发布</p>
        <div className="about-buttons">
          <button 
            className="about-btn secondary" 
            onClick={checkVersion}
            disabled={loading}
          >
            {loading ? '检查中...' : '检查更新'}
          </button>
          {versionInfo?.isUpdateAvailable && (
            <button 
              className="about-btn primary" 
              onClick={handleAutoUpdate}
              disabled={updating}
            >
              {updating ? '更新中...' : '一键更新'}
            </button>
          )}
        </div>
      </div>

      {versionInfo?.isUpdateAvailable && versionInfo.releaseNotes && (
        <div className="about-section">
          <h3>📝 更新日志</h3>
          <div className="release-notes">
            {versionInfo.releaseNotes.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <div className="about-section">
        <h3>📂 项目信息</h3>
        <div className="version-info">
          <div className="version-row">
            <span className="version-label">GitHub</span>
            <span className="version-value">
              <a 
                href="https://github.com/LingMowen/minecraft-server-monitor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="about-link"
              >
                LingMowen/minecraft-server-monitor
              </a>
            </span>
          </div>
        </div>
      </div>

      <div className="about-footer">
        <p>Made with ❤️ for Minecraft</p>
        <p className="about-copyright">© 2024 Minecraft Monitor</p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="about-panel" onClick={e => e.stopPropagation()}>
          {onClose && <button className="modal-close-btn" onClick={onClose}>×</button>}
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default AboutPanel;
