import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { UserStats } from '../../types';
import {
  User as UserIcon,
  Shield,
  Mail,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save,
  KeyRound,
  Layers,
  Sparkles
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await userService.getMyStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters long.');
      return;
    }

    setProfileLoading(true);
    try {
      const updated = await userService.updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      updateCurrentUser(updated);
      setProfileSuccess('Profile details updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile settings.';
      setProfileError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const updated = await userService.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateCurrentUser(updated);
      setPasswordSuccess('Password changed successfully! You can now use your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update password.';
      setPasswordError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPasswordLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
          Account & Profile Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Manage your personal identity, credentials, and gesture workspace preferences
        </p>
      </div>

      {/* User Summary Card */}
      <div className="card" style={{ marginBottom: '2rem', border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: 'var(--radius-full)',
            background: isAdmin 
              ? 'linear-gradient(135deg, #a855f7, #ec4899)'
              : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.85rem',
            fontWeight: 800,
            boxShadow: isAdmin ? '0 0 20px rgba(168, 85, 247, 0.4)' : '0 0 20px rgba(56, 189, 248, 0.3)',
          }}>
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff' }}>{user?.name}</h2>
              <span className={`badge ${isAdmin ? 'badge-violet' : 'badge-cyan'}`}>
                {isAdmin ? '🛡️ SYSTEM ADMINISTRATOR' : '👤 USER ACCOUNT'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.88rem', flexWrap: 'wrap' }}>
              <span>@{user?.username}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} /> {user?.email}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} /> Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Form 1: Profile Information */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <UserIcon size={19} style={{ color: isAdmin ? '#c084fc' : 'var(--accent-cyan)' }} />
            <h3 className="card-title" style={{ margin: 0 }}>Personal Information</h3>
          </div>

          {profileSuccess && (
            <div className="form-error-banner" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80', marginBottom: '1.25rem' }}>
              <CheckCircle size={18} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="form-error-banner" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username (Read-Only)</label>
              <input
                type="text"
                className="form-input"
                value={user?.username || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <button
              type="submit"
              className={`btn ${isAdmin ? 'btn-admin' : 'btn-primary'}`}
              style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={profileLoading}
            >
              <Save size={16} />
              <span>{profileLoading ? 'Saving Changes...' : 'Save Personal Details'}</span>
            </button>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <KeyRound size={19} style={{ color: isAdmin ? '#c084fc' : 'var(--accent-cyan)' }} />
            <h3 className="card-title" style={{ margin: 0 }}>Security & Password</h3>
          </div>

          {passwordSuccess && (
            <div className="form-error-banner" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80', marginBottom: '1.25rem' }}>
              <CheckCircle size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="form-error-banner" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="password-input-container">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  title={showCurrentPassword ? 'Hide' : 'Show'}
                >
                  {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password (min. 6 characters)</label>
              <div className="password-input-container">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? 'Hide' : 'Show'}
                >
                  {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide' : 'Show'}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`btn ${isAdmin ? 'btn-admin' : 'btn-primary'}`}
              style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={passwordLoading}
            >
              <Lock size={16} />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Dataset Overview */}
      {stats && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="card-title">My Gesture Dataset Activity</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: '#0a0e17', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created Gestures</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                {stats.total_gestures}
              </div>
            </div>
            <div style={{ background: '#0a0e17', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recorded Samples</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                {stats.total_samples}
              </div>
            </div>
            <div style={{ background: '#0a0e17', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active AI Models</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
                {stats.trained_models}
              </div>
            </div>
            <div style={{ background: '#0a0e17', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recognition Tests</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {stats.recognition_sessions}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
