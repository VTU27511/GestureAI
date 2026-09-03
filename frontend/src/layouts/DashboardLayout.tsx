import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MotionBackground } from '../components/MotionBackground';
import { DYNAMIC_THEMES, applyThemeVariables } from '../utils/theme';
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  Activity,
  Radio,
  User as UserIcon,
  ShieldCheck,
  Users,
  LogOut,
  HandMetal,
  Cpu,
  FileText,
  Palette
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();

  // Load persisted theme or default to 0
  const [themeIndex, setThemeIndex] = useState<number>(() => {
    const saved = localStorage.getItem('gestureai_theme_index');
    return saved !== null ? parseInt(saved, 10) % DYNAMIC_THEMES.length : (isAdmin ? 1 : 0);
  });

  const currentTheme = DYNAMIC_THEMES[themeIndex];

  useEffect(() => {
    applyThemeVariables(currentTheme);
    localStorage.setItem('gestureai_theme_index', themeIndex.toString());
  }, [themeIndex, currentTheme]);

  const cycleTheme = () => {
    setThemeIndex((prev) => (prev + 1) % DYNAMIC_THEMES.length);
  };

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Real-time Human Hand Gesture Motion Capture Video Canvas Background */}
      <MotionBackground
        variant={isAdmin ? 'admin' : 'user'}
        customColor={currentTheme.primary}
        customSecondary={currentTheme.secondary}
      />

      {/* Glassmorphic Sidebar */}
      <aside className="sidebar" style={{ zIndex: 10 }}>
        <div className="sidebar-brand">
          <div
            className="brand-icon"
            style={{
              borderColor: currentTheme.primary,
              boxShadow: `0 0 16px ${currentTheme.glow}`,
              color: currentTheme.textAccent,
            }}
          >
            <HandMetal size={20} />
          </div>
          <div>
            <div className="brand-name">GestureAI</div>
          </div>
          <span
            className="brand-badge"
            style={{
              borderColor: currentTheme.primary,
              color: currentTheme.textAccent,
              background: `rgba(15, 23, 42, 0.7)`,
            }}
          >
            v2.0
          </span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">User Workspace</div>

          <NavLink
            to="/user/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/user/gestures"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Layers size={18} />
            <span>My Gestures</span>
          </NavLink>

          <NavLink
            to="/user/gestures/create"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <PlusCircle size={18} />
            <span>Create Gesture</span>
          </NavLink>

          <NavLink
            to="/user/training"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Activity size={18} />
            <span>Training Hub</span>
          </NavLink>

          <NavLink
            to="/user/recognition"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Radio size={18} />
            <span>Recognition</span>
          </NavLink>

          <NavLink
            to="/user/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <UserIcon size={18} />
            <span>My Profile</span>
          </NavLink>

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <div
                className="nav-section-title"
                style={{ marginTop: '1.25rem', color: currentTheme.textAccent }}
              >
                Admin Portal
              </div>

              <NavLink
                to="/admin"
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <ShieldCheck size={18} />
                <span>Admin Overview</span>
              </NavLink>

              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>Manage Users</span>
              </NavLink>

              <NavLink
                to="/admin/gestures"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Layers size={18} />
                <span>All Gestures</span>
              </NavLink>

              <NavLink
                to="/admin/training"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Activity size={18} />
                <span>Training Audit</span>
              </NavLink>

              <NavLink
                to="/admin/models"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Cpu size={18} />
                <span>Models Registry</span>
              </NavLink>

              <NavLink
                to="/admin/logs"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <FileText size={18} />
                <span>Recognition Logs</span>
              </NavLink>

              <NavLink
                to="/user/profile"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <UserIcon size={18} />
                <span>Admin Profile</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              className="user-avatar"
              style={{
                background: currentTheme.gradient,
                boxShadow: `0 0 10px ${currentTheme.glow}`,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                @{user?.username}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content" style={{ zIndex: 10, position: 'relative' }}>
        <header className="header">
          <div className="header-title">
            GestureAI Platform
          </div>

          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Dynamic Color Theme Cycler Button */}
            <button
              type="button"
              onClick={cycleTheme}
              title="Click to cycle theme color"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${currentTheme.primary}`,
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                color: '#fff',
                boxShadow: `0 0 14px ${currentTheme.glow}`,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: currentTheme.gradient,
                  boxShadow: `0 0 8px ${currentTheme.primary}`,
                  display: 'inline-block',
                }}
              />
              <Palette size={14} style={{ color: currentTheme.textAccent }} />
              <span>{currentTheme.name}</span>
            </button>

            <span
              className="badge"
              style={{
                background: `rgba(15, 23, 42, 0.7)`,
                borderColor: currentTheme.primary,
                color: currentTheme.textAccent,
              }}
            >
              {user?.role}
            </span>

            <button
              className="btn btn-sm btn-secondary"
              onClick={logout}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};