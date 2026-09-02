import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminModelListItem } from '../../types';
import { Cpu, Search, CheckCircle, Clock } from 'lucide-react';

export const AdminModelsPage: React.FC = () => {
  const [models, setModels] = useState<AdminModelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const data = await adminService.getModels();
        setModels(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const filtered = models.filter(
    (m) =>
      m.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.gesture_name && m.gesture_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.version.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          Trained Models Registry
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect serialized machine learning artifacts, classification accuracy, and active versions ({models.length} total)
        </p>
      </div>

      {/* Search Filter */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ border: 'none', background: 'transparent', padding: '0.35rem 0' }}
            placeholder="Search models by user, gesture, or version..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Models Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Model ID</th>
              <th>User</th>
              <th>Scope / Gesture</th>
              <th>Algorithm</th>
              <th>Version</th>
              <th>Test Accuracy</th>
              <th>Samples Used</th>
              <th>Active Status</th>
              <th>Trained At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading models registry...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No models registered yet.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{m.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{m.user_name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {m.gesture_name || 'All User Gestures'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-violet">{m.model_type}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {m.version}
                    </span>
                  </td>
                  <td>
                    {m.accuracy !== null ? (
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {m.accuracy}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.sample_count}</td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge-emerald' : 'badge-gray'}`}>
                      {m.is_active ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};