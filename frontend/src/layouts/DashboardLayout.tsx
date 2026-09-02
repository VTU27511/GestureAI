import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  FileText
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <HandMetal size={20} />
          </div>
          <div>
            <div className="brand-name">GestureAI</div>
          </div>
          <span className="brand-badge">v2.0</span>
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
              <div className="nav-section-title" style={{ marginTop: '1.25rem', color: 'var(--accent-violet)' }}>
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
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="user-avatar">
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
      <div className="main-content">
        <header className="header">
          <div className="header-title">
            GestureAI Platform
          </div>

          <div className="header-user">
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-violet' : 'badge-cyan'}`}>
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