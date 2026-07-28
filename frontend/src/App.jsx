import React, { useState, useEffect } from 'react';
import StudentVotePage from './pages/StudentVotePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('vote_theme') || 'dark');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vote_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setAdminToken('');
    window.history.pushState({}, '', '/admin/login');
    setPath('/admin/login');
  };

  // Route matching: /vote/:token
  const isVoteRoute = path.startsWith('/vote/');
  const voteToken = isVoteRoute ? path.split('/vote/')[1] : null;

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <nav className="app-nav">
        <div className="nav-container">
          <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => { window.history.pushState({}, '', '/'); setPath('/'); }}>
            <span>🗳️</span>
            <span>Secure Rotation Voting</span>
            <span className="brand-badge">Encrypted Links</span>
          </div>

          <div className="nav-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>

            {adminToken ? (
              <button 
                className="theme-toggle-btn" 
                style={{ background: 'rgba(59, 130, 246, 0.3)' }}
                onClick={() => { window.history.pushState({}, '', '/admin/dashboard'); setPath('/admin/dashboard'); }}
              >
                ⚙️ Admin Dashboard
              </button>
            ) : (
              <button 
                className="theme-toggle-btn" 
                onClick={() => { window.history.pushState({}, '', '/admin/login'); setPath('/admin/login'); }}
              >
                🔐 Admin Portal
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content View */}
      <main className="main-content">
        {isVoteRoute ? (
          <StudentVotePage token={voteToken} />
        ) : path === '/admin/dashboard' ? (
          adminToken ? (
            <AdminDashboard token={adminToken} onLogout={handleLogout} />
          ) : (
            <AdminLoginPage onLoginSuccess={(t) => { setAdminToken(t); window.history.pushState({}, '', '/admin/dashboard'); setPath('/admin/dashboard'); }} />
          )
        ) : path === '/admin/login' ? (
          <AdminLoginPage onLoginSuccess={(t) => { setAdminToken(t); window.history.pushState({}, '', '/admin/dashboard'); setPath('/admin/dashboard'); }} />
        ) : (
          /* Default Landing Page */
          <div className="card" style={{ maxWidth: '750px', margin: '3rem auto', textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎓</div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem' }}>Rotation Schedule Voting System</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>
              A secure, single-use token voting platform for student class rotation preferences.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3>📩 Invitation Only</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Only students with an authorized email receive a single-use voting link.
                </p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3>🔒 One Vote Guarantee</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Tokens automatically deactivate upon submission to enforce strict single voting.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => { window.history.pushState({}, '', '/admin/login'); setPath('/admin/login'); }}
              >
                🔐 Sign In to Admin Portal
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 Secure Rotation Voting System &bull; Single-Use Token Authorization &bull; Responsive UI</p>
      </footer>
    </div>
  );
}
