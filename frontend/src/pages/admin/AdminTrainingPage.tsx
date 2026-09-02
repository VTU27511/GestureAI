import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminTrainingListItem } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Activity, Search, CheckCircle, XCircle } from 'lucide-react';

export const AdminTrainingPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminTrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await adminService.getTrainingSessions();
        setSessions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const filtered = sessions.filter(
    (s) =>
      s.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gesture_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          Global Training Pipeline Audit
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          System-wide inspection of hand landmark training datasets, validation ratios, and model accuracy
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
            placeholder="Search by user or gesture name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Training Sessions Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Gesture</th>
              <th>Total Samples</th>
              <th>Valid</th>
              <th>Invalid</th>
              <th>Model Classifier</th>
              <th>Accuracy</th>
              <th>Status</th>
              <th>Last Trained</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading training pipeline records...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No training session records found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={`${s.id}-${s.gesture_id}`}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{s.user_name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {s.gesture_name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {s.sample_count}
                  </td>
                  <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    {s.valid_samples}
                  </td>
                  <td style={{ color: s.invalid_samples > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                    {s.invalid_samples}
                  </td>
                  <td>
                    <span className="badge badge-violet">{s.model_type}</span>
                  </td>
                  <td>
                    {s.accuracy !== null ? (
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {s.accuracy}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {s.completed_at
                      ? new Date(s.completed_at).toLocaleString()
                      : new Date(s.started_at).toLocaleString()}
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