import React, { useState } from 'react';
import { ServerWithStatus } from '../types';

interface AddServerModalProps {
  onClose: () => void;
  onAdd: (server: Omit<ServerWithStatus, 'id'>) => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('25565');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host || !port) return;

    setLoading(true);
    try {
      await onAdd({
        name,
        host,
        port: parseInt(port)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>添加服务器</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>服务器名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：生存服务器"
              required
            />
          </div>
          <div className="form-group">
            <label>服务器地址</label>
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="例如：mc.example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>服务器端口</label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="25565"
              required
            />
          </div>
          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServerModal;
