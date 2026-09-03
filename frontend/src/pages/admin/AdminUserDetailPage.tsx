import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, AdminUserDetailResponse } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import {
  ArrowLeft,
  User,
  Shield,
  Layers,
  Cpu,
  Activity,
  CheckCircle,
  XCircle,
  CopyPlus,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();

  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adoption state
  const [adoptingId, setAdoptingId] = useState<number | null>(null);
  const [adoptedIds, setAdoptedIds] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await adminService.getUserDetail(id);
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch user details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleAdoptGesture = async (gestureId: number, gestureName: string) => {
    setNotification(null);
    setAdoptingId(gestureId);
    try {
      const res = await adminService.adoptGesture(gestureId);
      setAdoptedIds((prev) => new Set(prev).add(gestureId));
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading user account details...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--accent-rose)' }}>{error || 'User not found.'}</p>
        <button
          className="btn btn-outline"
          style={{ marginTop: '1rem' }}
          onClick={() => navigate('/admin/users')}
        >
          Return to Users Directory
        </button>
      </div>
    );
  }

  const { user, gestures, models } = data;
  const totalSamples = gestures.reduce((acc, g) => acc + g.sample_count, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <button
          className="btn btn-outline"
          style={{ padding: '0.45rem 0.75rem' }}
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>
          User Profile & Gestures Inspection
        </h1>
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

      {/* User Info Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{user.name}</h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
              @{user.username} • {user.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className={`badge ${user.role === 'ADMIN' ? 'badge-violet' : 'badge-cyan'}`}>
              {user.role}
            </span>
            <span className={`badge ${user.is_active ? 'badge-emerald' : 'badge-rose'}`}>
              {user.is_active ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gestures Created</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{gestures.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Samples</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{totalSamples}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Models Trained</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-violet)' }}>{models.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Member Since</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
              {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* User's Complete Gesture Catalog Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">User's Gesture Catalog & Training Audit ({gestures.length})</h2>
        </div>

        {gestures.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>
            This user has not created any gestures yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Gesture Name</th>
                  <th>Meaning</th>
                  <th>Type</th>
                  <th>Samples</th>
                  <th>Status</th>
                  <th>Model Version</th>
                  <th>Accuracy</th>
                  <th>Created Date</th>
                  <th>Last Trained</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {gestures.map((g) => {
                  const isOwnGesture = currentAdmin?.id === user.id;
                  const isAdopted = adoptedIds.has(g.id);

                  return (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{g.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{g.meaning}</td>
                      <td>
                        <GestureTypeBadge type={g.gesture_type as any} objectName={g.object_name} />
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {g.sample_count}
                      </td>
                      <td>
                        <StatusBadge status={g.status} />
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#fff' }}>
                          {g.model_version || '—'}
                        </span>
                      </td>
                      <td>
                        {g.accuracy !== null ? (
                          <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            {g.accuracy}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(g.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {g.last_trained ? new Date(g.last_trained).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isOwnGesture ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Your Gesture</span>
                        ) : (
                          <button
                            type="button"
                            className={`btn ${isAdopted ? 'btn-outline' : 'btn-primary'}`}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                            disabled={adoptingId === g.id || isAdopted}
                            onClick={() => handleAdoptGesture(g.id, g.name)}
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};