import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HandMetal, ShieldCheck, AlertCircle, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { MotionBackground } from '../../components/MotionBackground';
import { Captcha } from '../../components/Captcha';
import { HandGestureShowcase } from '../../components/HandGestureShowcase';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
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
      setError('Invalid CAPTCHA code. Please enter the characters shown.');
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      const user = await login({ username, password });
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot reach server. Ensure backend is running on port 8000.');
      } else {
        const msg = err.response?.data?.detail || 'Invalid username/email or password.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <MotionBackground variant="user" />

      <div className="auth-split-layout">
        <HandGestureShowcase variant="user" />

        <div className="auth-card">
        {/* Portal Switcher Tabs */}
        <div className="auth-portal-tabs">
          <div className="auth-portal-tab active user-active">
            <UserIcon size={15} />
            <span>User Portal</span>
          </div>
          <Link to="/admin/login" className="auth-portal-tab">
            <ShieldCheck size={15} />
            <span>Admin Portal</span>
          </Link>
        </div>

        <div className="auth-header">
          <div className="brand-icon" style={{ margin: '0 auto' }}>
            <HandMetal size={24} />
          </div>
          <h2 className="auth-title">Welcome to GestureAI</h2>
          <p className="auth-subtitle">Sign in to train gestures and recognize hand signs in real time</p>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. demo or ranjith"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
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
              <Captcha onCaptchaChange={setCaptchaCode} variant="user" />
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
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Create one now
          </Link>
        </div>

        <div className="demo-credentials-box">
          <div><strong>Quick Demo Account:</strong></div>
          <div style={{ marginTop: '4px' }}>Username: <code>demo</code> | Password: <code>demo123</code></div>
        </div>
      </div>
      </div>
    </div>
  );
};
