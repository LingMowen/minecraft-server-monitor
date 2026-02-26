import React, { useState, useEffect } from 'react';
import { ServerWithStatus } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api, HistoryRecord, PlayerStats, TimeRange } from '../services/api';

interface ServerCardProps {
  server: ServerWithStatus;
  onRemove: () => void;
  onClick: () => void;
}

const ServerCard: React.FC<ServerCardProps> = ({ server, onRemove, onClick }) => {
  const status = server.status;
  const isOnline = status?.online;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除服务器 "${server.name}" 吗？`)) {
      onRemove();
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'var(--accent-green)';
    if (latency < 300) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="server-card" onClick={onClick}>
      <div className="server-card-header">
        <div className={`server-status-dot ${isOnline ? 'online' : 'offline'}`} />
        <span className="server-name">{server.name}</span>
      </div>
      <div className="server-card-body">
        <div className="server-address">{server.host}:{server.port}</div>
        {isOnline ? (
          <div className="server-stats">
            <div className="stat-item">
              <span className="stat-label">玩家</span>
              <span className="stat-value">{status.playerCount}/{status.maxPlayers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">延迟</span>
              <span className="stat-value" style={{ color: getLatencyColor(status.latency || 0) }}>
                {status.latency}ms
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">版本</span>
              <span className="stat-value">{status.version?.split(' ')[0]}</span>
            </div>
          </div>
        ) : (
          <div className="offline-text">离线</div>
        )}
      </div>
      <div className="server-card-footer">
        <button className="remove-btn" onClick={handleRemove}>删除</button>
      </div>
    </div>
  );
};

interface ServerDetailModalProps {
  server: ServerWithStatus;
  onClose: () => void;
}

export const ServerDetailModal: React.FC<ServerDetailModalProps> = ({ 
  server, 
  onClose 
}) => {
  const status = server.status;
  const isOnline = status?.online;
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [playerRange, setPlayerRange] = useState<TimeRange>('hour');
  const [latencyRange, setLatencyRange] = useState<TimeRange>('hour');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryData();
    loadPlayerStats();
  }, [server.id, playerRange, latencyRange]);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const data = await api.getServerHistory(server.id, playerRange);
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerStats = async () => {
    try {
      const stats = await api.getServerStats(server.id);
      setPlayerStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'var(--accent-green)';
    if (latency < 300) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const getLatencyLevel = (latency: number) => {
    if (latency < 100) return '优秀';
    if (latency < 200) return '良好';
    if (latency < 300) return '一般';
    return '较差';
  };

  const formatTime = (timestamp: number, range: TimeRange) => {
    const date = new Date(timestamp);
    if (range === 'hour') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (range === 'day') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const chartData = historyData.map(record => ({
    time: formatTime(record.timestamp, playerRange),
    fullTime: formatDate(record.timestamp),
    players: record.players,
    latency: record.latency
  }));

  const latencyChartData = historyData.map(record => ({
    time: formatTime(record.timestamp, latencyRange),
    fullTime: formatDate(record.timestamp),
    players: record.players,
    latency: record.latency
  }));

  const avgLatency = historyData.length > 0 
    ? Math.round(historyData.reduce((a, b) => a + b.latency, 0) / historyData.length)
    : 0;

  const maxLatency = historyData.length > 0 
    ? Math.max(...historyData.map(d => d.latency))
    : 0;

  const minLatency = historyData.length > 0 
    ? Math.min(...historyData.map(d => d.latency))
    : 0;

  const avgPlayers = historyData.length > 0 
    ? (historyData.reduce((a, b) => a + b.players, 1) / historyData.length).toFixed(1)
    : 0;

  const hasPlayerChange = historyData.length > 1 && 
    historyData.some(d => d.players !== historyData[0].players);

  const chartColor = '#a78bfa';

  const rangeLabels: Record<TimeRange, string> = {
    hour: '1小时',
    day: '1天',
    week: '1周',
    month: '1月'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="server-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="modal-left">
          <div className="modal-header-content">
            <h2>{server.name}</h2>
            <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '在线' : '离线'}
            </span>
          </div>

          <div className="server-address-large">{server.host}:{server.port}</div>

          {isOnline && (
            <>
              <div className="modal-stats-grid">
                <div className="modal-stat-card">
                  <div className="modal-stat-icon">👥</div>
                  <div className="modal-stat-value">{status?.playerCount || 0}</div>
                  <div className="modal-stat-label">在线玩家</div>
                  <div className="modal-stat-sub">最大 {status?.maxPlayers || 0} 人</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-icon">📡</div>
                  <div className="modal-stat-value" style={{ color: getLatencyColor(status?.latency || 0) }}>
                    {status?.latency || 0}ms
                  </div>
                  <div className="modal-stat-label">当前延迟</div>
                  <div className="modal-stat-sub">{getLatencyLevel(status?.latency || 1)}</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-icon">📦</div>
                  <div className="modal-stat-value">{status?.version || 'N/A'}</div>
                  <div className="modal-stat-label">服务器版本</div>
                  <div className="modal-stat-sub">协议 {status?.protocol || 'N/A'}</div>
                </div>
              </div>

              {playerStats && (
                <div className="modal-section">
                  <h4>🏆 最多玩家记录</h4>
                  <div className="max-players-grid">
                    <div className="max-player-card">
                      <div className="max-player-value">{playerStats.maxPlayersDay}</div>
                      <div className="max-player-label">今日最多</div>
                      <div className="max-player-time">
                        {playerStats.maxPlayersDayTime > 0 
                          ? formatDate(playerStats.maxPlayersDayTime) 
                          : '暂无数据'}
                      </div>
                    </div>
                    <div className="max-player-card">
                      <div className="max-player-value">{playerStats.maxPlayersWeek}</div>
                      <div className="max-player-label">本周最多</div>
                      <div className="max-player-time">
                        {playerStats.maxPlayersWeekTime > 0 
                          ? formatDate(playerStats.maxPlayersWeekTime) 
                          : '暂无数据'}
                      </div>
                    </div>
                    <div className="max-player-card">
                      <div className="max-player-value">{playerStats.maxPlayersMonth}</div>
                      <div className="max-player-label">本月最多</div>
                      <div className="max-player-time">
                        {playerStats.maxPlayersMonthTime > 0 
                          ? formatDate(playerStats.maxPlayersMonthTime) 
                          : '暂无数据'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-section">
                <h4>服务器描述</h4>
                <p className="modal-description">{status?.description || '无描述'}</p>
              </div>

              {historyData.length > 0 && (
                <div className="modal-section">
                  <h4>📊 统计摘要</h4>
                  <div className="stats-summary">
                    <div className="summary-item">
                      <span className="summary-label">平均延迟</span>
                      <span className="summary-value">{avgLatency}ms</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">最低延迟</span>
                      <span className="summary-value" style={{ color: 'var(--accent-green)' }}>{minLatency}ms</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">最高延迟</span>
                      <span className="summary-value" style={{ color: 'var(--accent-red)' }}>{maxLatency}ms</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">平均玩家</span>
                      <span className="summary-value">{avgPlayers}</span>
                    </div>
                  </div>
                </div>
              )}

              {status?.players && status.players.length > 0 && (
                <div className="modal-section">
                  <h4>👤 在线玩家 ({status.players.length})</h4>
                  <div className="modal-players-list">
                    {status.players.map((player, index) => (
                      <span key={index} className="modal-player-tag">{player}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isOnline && (
          <div className="modal-right">
            <div className="modal-section">
              <div className="chart-header">
                <h4>📈 玩家趋势 {!hasPlayerChange && chartData.length > 0 && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(暂无变化)</span>}</h4>
                <div className="time-range-selector">
                  {(['hour', 'day', 'week', 'month'] as TimeRange[]).map(range => (
                    <button
                      key={range}
                      className={`time-range-btn ${playerRange === range ? 'active' : ''}`}
                      onClick={() => setPlayerRange(range)}
                    >
                      {rangeLabels[range]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-chart-large">
                {loading ? (
                  <div className="chart-loading">加载中...</div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="var(--text-secondary)" fontSize={10} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'var(--bg-card)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: 'var(--text-secondary)', marginBottom: '8px' }}
                        formatter={(value: number, name: string, props: unknown) => {
                          const p = props as { payload?: { fullTime?: string } };
                          const fullTime = p?.payload?.fullTime || '';
                          return [`${value} 人 (${fullTime})`, name];
                        }}
                      />
                      <Area type="monotone" dataKey="players" stroke={chartColor} strokeWidth={2} fill="url(#colorPlayers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">暂无数据</div>
                )}
              </div>
            </div>

            <div className="modal-section">
              <div className="chart-header">
                <h4>📉 延迟趋势</h4>
                <div className="time-range-selector">
                  {(['hour', 'day', 'week', 'month'] as TimeRange[]).map(range => (
                    <button
                      key={range}
                      className={`time-range-btn ${latencyRange === range ? 'active' : ''}`}
                      onClick={() => setLatencyRange(range)}
                    >
                      {rangeLabels[range]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-chart-large">
                {loading ? (
                  <div className="chart-loading">加载中...</div>
                ) : latencyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="var(--text-secondary)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'var(--bg-card)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px'
                        }}
                        formatter={(value: number) => [`${value}ms`, '延迟']}
                      />
                      <Line type="monotone" dataKey="latency" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">暂无数据</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerCard;
