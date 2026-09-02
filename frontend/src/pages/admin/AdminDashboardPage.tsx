import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { AdminStats } from '../../types';
import {
  Shield,
  Users,
  Layers,
  Activity,
  Cpu,
  Radio,
  ArrowRight,
  Database,
  FileText
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const data = await adminService.getStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
          <Shield size={26} style={{ color: 'var(--accent-violet)' }} />
          <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#fff' }}>
            System Administration Center
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Platform-wide monitoring, user accounts, model artifacts, and real-time recognition audit
        </p>
      </div>

      {/* 6 Metric KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-violet">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_users ?? 0}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.active_users ?? 0}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-cyan">
            <Layers size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_gestures ?? 0}</div>
            <div className="stat-label">Total Gestures</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Activity size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_samples ?? 0}</div>
            <div className="stat-label">Total Samples</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-violet">
            <Cpu size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_models ?? 0}</div>
            <div className="stat-label">Total Models</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-cyan">
            <Radio size={22} />
          </div>
          <div>
            <div className="stat-value">{stats?.total_recognitions ?? 0}</div>
            <div className="stat-label">Recognition Logs</div>
          </div>
        </div>
      </div>

      {/* Admin Modules Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Users size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 className="card-title">User Management</h3>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Inspect user profiles, audit dataset contributions, and toggle account activation.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/users')}>
            Manage Users <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Layers size={20} style={{ color: 'var(--accent-violet)' }} />
              <h3 className="card-title">Gestures Directory</h3>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Browse all custom gestures, voice phrases, and categories across the platform.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/gestures')}>
            Browse Gestures <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Activity size={20} style={{ color: 'var(--accent-emerald)' }} />
              <h3 className="card-title">Training Pipeline</h3>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Monitor sample capture volumes, landmark validation rates, and training status.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/training')}>
            Training Audit <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Cpu size={20} style={{ color: 'var(--accent-amber)' }} />
              <h3 className="card-title">Models Registry</h3>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Inspect active Random Forest classifier artifacts, version histories, and test accuracy.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/models')}>
            Inspect Models <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Radio size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 className="card-title">Recognition Audit</h3>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Real-time recognition logs, prediction confidence distributions, and speech triggers.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/logs')}>
            View Audit Logs <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};