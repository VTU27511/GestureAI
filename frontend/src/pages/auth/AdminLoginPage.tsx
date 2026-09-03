import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Lock, AlertCircle, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { MotionBackground } from '../../components/MotionBackground';
import { Captcha } from '../../components/Captcha';

export const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate CAPTCHA
    if (!captchaInput.trim()) {
      setError('Please enter the security CAPTCHA code.');
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError('Security CAPTCHA verification failed. Please try again.');
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      const user = await login({ username, password });

      // Enforce Admin Role
      if (user.role !== 'ADMIN') {
        logout();
        setError('Access Denied: Administrator clearance required. Regular users must sign in via the User Portal.');
        setLoading(false);
        return;
      }

      const from = (location.state as any)?.from?.pathname;
      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot reach server. Ensure the backend is active on port 8000.');
      } else {
        const msg = err.response?.data?.detail || 'Invalid administrator credentials.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <MotionBackground variant="admin" />

      <div className="auth-card admin-auth-card">
        {/* Portal Switcher Tabs */}
        <div className="auth-portal-tabs">
          <Link to="/login" className="auth-portal-tab">
            <UserIcon size={15} />
            <span>User Portal</span>
          </Link>
          <div className="auth-portal-tab active admin-active">
            <ShieldCheck size={15} />
            <span>Admin Portal</span>
          </div>
        </div>

        <div className="auth-header">
          <div className="brand-icon admin-brand-icon" style={{ margin: '0 auto' }}>
            <ShieldCheck size={26} />
          </div>
          <div className="admin-clearance-badge">
            <Lock size={12} />
            <span>SECURITY LEVEL 1 — RESTRICTED</span>
          </div>
          <h2 className="auth-title">Admin Control Center</h2>
          <p className="auth-subtitle">Platform governance, user management, and AI model auditing</p>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Administrator Account / Email</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Key / Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* CAPTCHA Section */}
          <div className="form-group">
            <label className="form-label">Security Verification (CAPTCHA)</label>
            <div className="captcha-field-row">
              <Captcha onCaptchaChange={setCaptchaCode} variant="admin" />
              <input
                type="text"
                className="form-input captcha-input"
                placeholder="Enter 5 characters"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                maxLength={5}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-admin"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying Clearance...' : 'Authenticate as Administrator'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Standard user?{' '}
          <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Sign in via User Portal →
          </Link>
        </div>

        <div className="demo-credentials-box admin-demo-box">
          <div><strong>Authorized Admin Credentials:</strong></div>
          <div style={{ marginTop: '4px' }}>Username: <code>admin</code> | Password: <code>admin123</code></div>
        </div>
      </div>
    </div>
  );
};
