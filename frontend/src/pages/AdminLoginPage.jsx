import React, { useState } from 'react';

export default function AdminLoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_username', data.username);
      onLoginSuccess(data.access_token);
    } catch (err) {
      setError('Unable to connect to server.');
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '440px', margin: '4rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Admin Portal Login</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Secure Rotation Voting System</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: '600' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            type="text" 
            className="form-control" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
        </button>
      </form>
    </div>
  );
}
