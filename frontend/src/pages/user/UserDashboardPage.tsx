import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { gestureService } from '../../services/gestureService';
import { Gesture, UserStats } from '../../types';
import { GestureCard } from '../../components/GestureCard';
import { DeleteModal } from '../../components/DeleteModal';
import {
  Layers,
  Activity,
  Cpu,
  Radio,
  PlusCircle,
  Play,
  ArrowRight
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({
    total_gestures: 0,
    total_samples: 0,
    trained_models: 0,
    recognition_sessions: 0,
  });
  const [recentGestures, setRecentGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Gesture | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, gesturesData] = await Promise.all([
        userService.getMyStats(),
        gestureService.getGestures(),
      ]);
      setStats(statsData);
      setRecentGestures(gesturesData.slice(0, 3)); // show top 3 recent
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await gestureService.deleteGesture(deleteTarget.id);
      setDeleteTarget(null);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to delete gesture', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Real-time custom hand gesture recognition control center
        </p>
      </div>

      {/* 4 Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-cyan">
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.total_gestures}</div>
            <div className="stat-label">Total Gestures</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.total_samples}</div>
            <div className="stat-label">Training Samples</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-violet">
            <Cpu size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.trained_models}</div>
            <div className="stat-label">Trained Models</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Radio size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.recognition_sessions}</div>
            <div className="stat-label">Recognition Sessions</div>
          </div>
        </div>
      </div>

      {/* Required Action Buttons */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/user/gestures/create')}
          >
            <PlusCircle size={18} /> Create Gesture
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => navigate('/user/recognition')}
          >
            <Play size={18} /> Start Recognition
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => navigate('/user/gestures')}
          >
            <Layers size={18} /> My Gestures
          </button>
        </div>
      </div>

      {/* Recent Gestures Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">My Recent Gestures</h2>
          <Link
            to="/user/gestures"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading gestures...
          </div>
        ) : recentGestures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Layers size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1rem' }}>
              No custom gestures created yet.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/user/gestures/create')}
            >
              <PlusCircle size={16} /> Create Your First Gesture
            </button>
          </div>
        ) : (
          <div className="gestures-grid">
            {recentGestures.map((gesture) => (
              <GestureCard
                key={gesture.id}
                gesture={gesture}
                onDelete={(g) => setDeleteTarget(g)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        title={`Delete Gesture "${deleteTarget?.name}"?`}
        message="Are you sure you want to delete this custom gesture? All associated training samples, sessions, and models will be permanently removed."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
