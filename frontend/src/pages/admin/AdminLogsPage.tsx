import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { RecognitionLogItem } from '../../types';
import { Radio, Search, Filter, Calendar } from 'lucide-react';

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<RecognitionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getRecognitionLogs({ limit: 200 });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      log.user_name.toLowerCase().includes(query) ||
      log.gesture_name.toLowerCase().includes(query);

    const matchDate = !dateFilter || log.recognized_at.startsWith(dateFilter);

    return matchSearch && matchDate;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          System-Wide Recognition Audit Logs
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Historical record of real-time gesture classifications across all active webcam sessions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ border: 'none', background: 'transparent', padding: '0.35rem 0' }}
              placeholder="Filter by user or recognized gesture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setDateFilter('')}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recognition Logs Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>User</th>
              <th>Recognized Gesture</th>
              <th>Confidence Score</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading recognition logs...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No recognition events recorded yet. Run live recognition to populate this log.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{log.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{log.user_name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {log.gesture_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: log.confidence >= 85 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {log.confidence.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.confidence >= 85 ? 'badge-emerald' : 'badge-amber'}`}>
                      {log.confidence >= 85 ? 'VERIFIED' : 'LOW CONFIDENCE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(log.recognized_at).toLocaleString()}
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