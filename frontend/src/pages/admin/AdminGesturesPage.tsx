import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminGestureListItem } from '../../types';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import { Layers, Search, Filter, Cpu } from 'lucide-react';

export const AdminGesturesPage: React.FC = () => {
  const [gestures, setGestures] = useState<AdminGestureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const fetchAllGestures = async () => {
      try {
        setLoading(true);
        const data = await adminService.getGestures();
        setGestures(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllGestures();
  }, []);

  const filtered = gestures.filter((g) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      g.name.toLowerCase().includes(query) ||
      g.user_name.toLowerCase().includes(query) ||
      g.meaning.toLowerCase().includes(query);
    const matchType = typeFilter === 'ALL' || g.gesture_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          Platform Gestures Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Global inventory of all custom hand gestures created across all users ({gestures.length} total)
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
              placeholder="Search by gesture name, user name, or meaning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="ONE_HAND">One Hand</option>
              <option value="TWO_HANDS">Two Hands</option>
              <option value="HAND_OBJECT">Hand + Object</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gestures Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Gesture</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Speech Phrase</th>
              <th>Samples</th>
              <th>Status</th>
              <th>Model Acc.</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading gestures inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No gestures found matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{g.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{g.meaning}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.user_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.user_email}</div>
                  </td>
                  <td>
                    <GestureTypeBadge type={g.gesture_type} objectName={g.object_name} />
                  </td>
                  <td style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{g.speech_text}"
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {g.samples_count}
                  </td>
                  <td>
                    <StatusBadge status={g.status} />
                  </td>
                  <td>
                    {g.accuracy !== null ? (
                      <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                        {g.accuracy}% ({g.model_version})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(g.created_at).toLocaleDateString()}
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