import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { AdminGestureListItem } from '../../types';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import { Search, Filter, CopyPlus, Check, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminGesturesPage: React.FC = () => {
  const { user } = useAuth();
  const [gestures, setGestures] = useState<AdminGestureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Gesture Adoption State
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const [adoptedIds, setAdoptedIds] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleAdoptGesture = async (gesture: AdminGestureListItem) => {
    setNotification(null);
    setAdoptingId(gesture.id);
    try {
      const res = await adminService.adoptGesture(gesture.id);
      setAdoptedIds((prev) => new Set(prev).add(gesture.id));
      setNotification({
        type: 'success',
        message: `${res.message} (${res.copied_samples} samples copied). You can now view and train it in 'My Gestures'!`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to adopt gesture.';
      setNotification({
        type: 'error',
        message: typeof msg === 'string' ? msg : JSON.stringify(msg),
      });
    } finally {
      setAdoptingId(null);
    }
  };

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
          Global inventory of all custom hand gestures created across all users ({gestures.length} total). Inspect details and adopt any user's gestures into your own library.
        </p>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className="form-error-banner"
          style={{
            backgroundColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
            color: notification.type === 'success' ? '#4ade80' : '#f87171',
            marginBottom: '1.5rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

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
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading gestures inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No gestures found matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((g) => {
                const isOwnGesture = user?.id === g.user_id;
                const isAdopted = adoptedIds.has(g.id);

                return (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{g.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{g.meaning}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: isOwnGesture ? 'var(--accent-violet)' : 'var(--text-primary)' }}>
                        {g.user_name} {isOwnGesture && '(You)'}
                      </div>
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
                    <td style={{ textAlign: 'right' }}>
                      {isOwnGesture ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>In Your Library</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn ${isAdopted ? 'btn-outline' : 'btn-primary'}`}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                          disabled={adoptingId === g.id || isAdopted}
                          onClick={() => handleAdoptGesture(g)}
                        >
                          {isAdopted ? (
                            <>
                              <Check size={14} style={{ color: 'var(--accent-emerald)' }} />
                              <span>Added</span>
                            </>
                          ) : adoptingId === g.id ? (
                            <span>Adopting...</span>
                          ) : (
                            <>
                              <CopyPlus size={14} />
                              <span>Add to My Gestures</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};