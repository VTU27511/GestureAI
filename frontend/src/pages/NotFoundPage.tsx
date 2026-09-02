import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', margin: '0.75rem 0' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.5rem' }}>
        The requested page does not exist or you may not have authorization to view it.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/user/dashboard')}>
        <Home size={16} /> Return to Dashboard
      </button>
    </div>
  );
};
