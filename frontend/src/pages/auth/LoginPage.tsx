import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HandMetal, ShieldCheck, AlertCircle, Eye, EyeOff, User as UserIcon, Lock, ArrowRightLeft } from 'lucide-react';
import { MotionBackground } from '../../components/MotionBackground';
import { Captcha } from '../../components/Captcha';
import { CyberMotionVideo } from '../../components/CyberMotionVideo';

interface LoginPageProps {
  initialMode?: 'user' | 'admin';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  // Determine starting mode from prop or URL
  const [portalMode, setPortalMode] = useState<'user' | 'admin'>(() => {
    if (initialMode) return initialMode;
    return location.pathname.includes('admin') ? 'admin' : 'user';
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode if route changes
  useEffect(() => {
    if (location.pathname === '/admin/login') {
      setPortalMode('admin');
    } else if (location.pathname === '/login') {
      setPortalMode('user');
    }
  }, [location.pathname]);

  const isAdmin = portalMode === 'admin';

  const handleSwap = () => {
    setError(null);
    setCaptchaInput('');
    const newMode = isAdmin ? 'user' : 'admin';
    setPortalMode(newMode);
    // Optionally update URL history without full reload
    window.history.replaceState(null, '', newMode === 'admin' ? '/admin/login' : '/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate CAPTCHA
    if (!captchaInput.trim()) {
      setError('Please enter the security CAPTCHA code.');
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError('Invalid security CAPTCHA. Please enter the characters shown.');
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      const user = await login({ username, password });

      if (isAdmin) {
        if (user.role !== 'ADMIN') {
          logout();
          setError('Access Denied: Administrator clearance required. Please swap to the User Portal.');
          setLoading(false);
          return;
        }
        navigate('/admin', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname;
        if (from && !from.startsWith('/admin')) {
          navigate(from, { replace: true });
        } else if (user.role === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/user/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot connect to server. Ensure backend is running on port 8000.');
      } else {
        const msg = err.response?.data?.detail || 'Invalid username or password.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Dynamic Background Particle Field */}
      <MotionBackground variant={portalMode} />

      {/* Main Sliding Swap Container */}
      <div className={`auth-swap-container ${isAdmin ? 'swapped-admin' : 'swapped-user'}`}>
        
        {/* Panel 1: Cyber Motion Video Showcase */}
        <div className="swap-panel swap-video-panel">
          <CyberMotionVideo portalMode={portalMode} onSwapPortal={handleSwap} />
        </div>

        {/* Panel 2: Interactive Login Form */}
        <div className="swap-panel swap-form-panel">
          <div className="auth-card-inner">
            
            {/* Top Sliding Pill Switcher */}
            <div className="portal-pill-switcher">
              <button
                type="button"
                className={`pill-option ${!isAdmin ? 'active pill-user' : ''}`}
                onClick={() => portalMode !== 'user' && handleSwap()}
              >
                <UserIcon size={15} />
                <span>User Portal</span>
              </button>

              <button
                type="button"
                className={`pill-option ${isAdmin ? 'active pill-admin' : ''}`}
                onClick={() => portalMode !== 'admin' && handleSwap()}
              >
                <ShieldCheck size={15} />
                <span>Admin Portal</span>
              </button>
            </div>

            {/* Header */}
            <div className="auth-header">
              <div
                className={`brand-icon ${isAdmin ? 'admin-brand-icon' : ''}`}
                style={{ margin: '0 auto' }}
              >
                {isAdmin ? <ShieldCheck size={26} /> : <HandMetal size={24} />}
              </div>

              {isAdmin && (
                <div className="admin-clearance-badge">
                  <Lock size={12} />
                  <span>SECURITY LEVEL 1 — RESTRICTED</span>
                </div>
              )}

              <h2 className="auth-title">
                {isAdmin ? 'Admin Control Center' : 'Welcome to GestureAI'}
              </h2>
              <p className="auth-subtitle">
                {isAdmin
                  ? 'Authorized administrator clearance and model auditing'
                  : 'Sign in to train gestures and recognize hand signs in real time'}
              </p>
            </div>

            {error && (
              <div className="form-error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  {isAdmin ? 'Administrator Account / Email' : 'Username or Email'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={isAdmin ? 'e.g. admin' : 'e.g. demo or ranjith'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isAdmin ? 'Security Key / Password' : 'Password'}
                </label>
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
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA Section */}
              <div className="form-group">
                <label className="form-label">Security Verification (CAPTCHA)</label>
                <div className="captcha-field-row">
                  <Captcha onCaptchaChange={setCaptchaCode} variant={portalMode} />
                  <input
                    type="text"
                    className="form-input captcha-input"
                    placeholder="5 characters"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`btn ${isAdmin ? 'btn-admin' : 'btn-primary'}`}
                style={{ width: '100%', marginTop: '0.85rem', padding: '0.75rem' }}
                disabled={loading}
              >
                {loading
                  ? (isAdmin ? 'Verifying Clearance...' : 'Authenticating...')
                  : (isAdmin ? 'Authenticate as Administrator' : 'Sign In')}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {isAdmin ? (
                <>
                  Standard user?{' '}
                  <button
                    type="button"
                    onClick={handleSwap}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Swap to User Portal →
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <Link to="/register" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    Create one now
                  </Link>
                </>
              )}
            </div>

            {/* Quick Demo Credentials Box */}
            <div className={`demo-credentials-box ${isAdmin ? 'admin-demo-box' : ''}`}>
              <div>
                <strong>{isAdmin ? 'Authorized Admin Credentials:' : 'Quick Demo Account:'}</strong>
              </div>
              <div style={{ marginTop: '4px' }}>
                Username: <code>{isAdmin ? 'admin' : 'demo'}</code> | Password: <code>{isAdmin ? 'admin123' : 'demo123'}</code>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
