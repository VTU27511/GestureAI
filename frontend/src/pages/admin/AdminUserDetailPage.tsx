import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, AdminUserDetailResponse } from '../../services/adminService';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import { ArrowLeft, User, Shield, Layers, Cpu, Activity, CheckCircle, XCircle } from 'lucide-react';

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading user account details...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>{error || 'User not found.'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={16} /> Return to User List
        </button>
      </div>
    );
  }

  const { user, gestures, models } = data;
  const totalSamples = gestures.reduce((acc, g) => acc + (g.sample_count || 0), 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem' }}
        onClick={() => navigate('/admin/users')}
      >
        <ArrowLeft size={16} /> Back to User Directory
      </button>

      {/* User Header Profile Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>{user.name}</h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                @{user.username} · {user.email}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                </tr>
              </thead>
              <tbody>
                {gestures.map((g) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};