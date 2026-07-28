import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ token, onLogout }) {
  const [stats, setStats] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Single Email Form
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  
  // Custom Email Template Form
  const [emailSubject, setEmailSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);

  // CSV Upload
  const [csvFile, setCsvFile] = useState(null);
  
  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI Messages
  const [actionMsg, setActionMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchWhitelist();
    fetchAuditLogs();
  }, []);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.poll) {
          setEmailSubject(data.poll.email_subject || 'Rotation Schedule Preference Voting Invitation');
          setCustomMessage(data.poll.custom_message || 'Hello! You are invited to participate in the rotation schedule preference voting poll. Please click the button below to submit your choice.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchWhitelist = async () => {
    try {
      const res = await fetch('/api/admin/whitelist', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setWhitelist(data);
      }
    } catch (err) {
      console.error('Failed to fetch whitelist:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!singleEmail) return;

    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: singleEmail, name: singleName })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`✅ Added ${singleEmail} to whitelist.`);
        setSingleEmail('');
        setSingleName('');
        fetchWhitelist();
        fetchDashboardStats();
      } else {
        alert(data.error || 'Failed to add email.');
      }
    } catch (err) {
      alert('Error adding email.');
    }
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      alert('Please select a CSV or Excel file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await fetch('/api/admin/whitelist/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`✅ ${data.message}`);
        setCsvFile(null);
        fetchWhitelist();
        fetchDashboardStats();
      } else {
        alert(data.error || 'CSV Upload failed.');
      }
    } catch (err) {
      alert('Upload error.');
    }
  };

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setSavingEmailSettings(true);
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email_subject: emailSubject,
          custom_message: customMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg('✅ Custom email template saved!');
        fetchDashboardStats();
      } else {
        alert(data.error || 'Failed to save email settings.');
      }
      setSavingEmailSettings(false);
    } catch (err) {
      alert('Error saving email settings.');
      setSavingEmailSettings(false);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (!confirm(`Are you sure you want to remove "${email}" from the whitelist?`)) return;

    try {
      const res = await fetch(`/api/admin/whitelist/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        setActionMsg(`Removed ${email}.`);
        fetchWhitelist();
        fetchDashboardStats();
      }
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const handleSendToAll = async () => {
    if (!confirm(`⚠️ This will send invitation emails to ALL ${whitelist.length} whitelisted voters immediately. Continue?`)) return;
    setLoading(true);
    setActionMsg('📧 Sending email invitations to ALL voters via Gmail SMTP...');
    try {
      const res = await fetch('/api/admin/send-invitations', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          send_all: true,
          email_subject: emailSubject,
          custom_message: customMessage
        })
      });
      const data = await res.json();
      setActionMsg(`📧 ${data.message}`);
      fetchWhitelist();
      fetchDashboardStats();
      setLoading(false);
    } catch (err) {
      setActionMsg('Error sending invitations.');
      setLoading(false);
    }
  };

  const handleTogglePollStatus = async () => {
    const nextStatus = !stats?.poll_is_closed;
    try {
      const res = await fetch('/api/admin/poll-status', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ is_closed: nextStatus })
      });
      const data = await res.json();
      setActionMsg(`🔒 ${data.message}`);
      fetchDashboardStats();
    } catch (err) {
      alert('Failed to toggle poll status.');
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/export/csv', '_blank');
  };

  const handleDownloadSampleCSV = () => {
    window.open('/api/admin/template/csv', '_blank');
  };

  const filteredWhitelist = whitelist.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {/* Top Banner Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Administrator Control Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time polling analytics and batch email dispatcher</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExportCSV}>📥 Export Results CSV</button>
          <button className="btn btn-danger btn-sm" onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid var(--accent-primary)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
          {actionMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-value">{stats?.total_invited || 0}</div>
          <div className="stat-label">Total Invited</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{stats?.emails_sent || 0}</div>
          <div className="stat-label">Emails Sent</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats?.votes_received || 0}</div>
          <div className="stat-label">Votes Received</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats?.pending_votes || 0}</div>
          <div className="stat-label">Pending Votes</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{stats?.turnout_pct || 0}%</div>
          <div className="stat-label">Turnout Rate</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Results & Visual Charts
        </button>
        <button 
          className={`btn ${activeTab === 'whitelist' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('whitelist')}
        >
          👥 Email Whitelist & Batch CSV ({whitelist.length})
        </button>
        <button 
          className={`btn ${activeTab === 'email_template' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('email_template')}
        >
          ✉️ Custom Email Message Template
        </button>
        <button 
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Audit Logs
        </button>
      </div>

      {/* TAB 1: RESULTS & CHARTS */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>Live Voting Breakdown</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Poll Status: <strong style={{ color: stats?.poll_is_closed ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {stats?.poll_is_closed ? 'CLOSED' : 'OPEN'}
                </strong>
              </span>
            </div>
            <button 
              className={`btn ${stats?.poll_is_closed ? 'btn-success' : 'btn-danger'} btn-sm`}
              onClick={handleTogglePollStatus}
            >
              {stats?.poll_is_closed ? '▶ Re-open Poll' : '🔒 Close Poll Now'}
            </button>
          </div>

          <div className="chart-container">
            {/* Option 1 Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>
                  🔵 Option 1 🙂
                </div>
                <div style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                  🪑 "ఈ రోజు నువ్వు... రేపు నేను!"
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  ( 3rd, 4th, 5th {'&'} 6th బెంచ్ rotation )
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: '700', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                <span><strong>{stats?.opt1_count || 0}</strong> votes ({stats?.opt1_pct || 0}%)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-blue" style={{ width: `${stats?.opt1_pct || 0}%` }}>
                  {stats?.opt1_pct > 10 ? `${stats?.opt1_pct}%` : ''}
                </div>
              </div>
            </div>

            {/* Option 2 Bar */}
            <div>
              <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>
                  🟢 Option 2 😎
                </div>
                <div style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                  🪑 వెనుక బెంచ్ మా జన్మహక్కు... దానిపై కన్నేయొద్దు! 😭😂
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  ( 5th {'&'} 6th బెంచ్ మాత్రమే rotation )
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: '700', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                <span><strong>{stats?.opt2_count || 0}</strong> votes ({stats?.opt2_pct || 0}%)</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-green" style={{ width: `${stats?.opt2_pct || 0}%` }}>
                  {stats?.opt2_pct > 10 ? `${stats?.opt2_pct}%` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL WHITELIST & CSV BATCH */}
      {activeTab === 'whitelist' && (
        <div>
          {/* Controls Card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Batch CSV/Excel Import */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>📁 Batch Import CSV / Excel</h4>
                  <button className="btn btn-outline btn-sm" onClick={handleDownloadSampleCSV}>📄 Sample CSV</button>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Upload a file containing multiple student email addresses (`email`, `name`).
                </p>
                <form onSubmit={handleCSVUpload}>
                  <div className="form-group">
                    <input 
                      type="file" 
                      accept=".csv, .xlsx" 
                      className="form-control" 
                      onChange={e => setCsvFile(e.target.files[0])} 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Process & Import Emails</button>
                </form>
              </div>

              {/* Single Add */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>👤 Add Single Voter Email</h4>
                <form onSubmit={handleAddSingle}>
                  <div className="form-group">
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="student@rguktn.ac.in" 
                      value={singleEmail} 
                      onChange={e => setSingleEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Student Name (Optional)" 
                      value={singleName} 
                      onChange={e => setSingleName(e.target.value)} 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Add to Whitelist</button>
                </form>
              </div>

            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <button className="btn btn-success" onClick={handleSendToAll} disabled={loading} style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
                {loading ? '📧 Sending Emails...' : `📧 Send Email to ALL (${whitelist.length}) Voters Now`}
              </button>
              
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search email or name..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ maxWidth: '280px' }}
              />
            </div>
          </div>

          {/* Table Card */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Name</th>
                    <th>Invitation Sent</th>
                    <th>Status</th>
                    <th>Vote Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWhitelist.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No emails found.</td>
                    </tr>
                  ) : (
                    filteredWhitelist.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.email}</strong></td>
                        <td>{u.name || '-'}</td>
                        <td>
                          {u.invitation_sent ? (
                            <span className="badge-status badge-sent">Sent ✓</span>
                          ) : (
                            <span className="badge-status badge-pending">Not Sent</span>
                          )}
                        </td>
                        <td>
                          {u.has_voted ? (
                            <span className="badge-status badge-voted">Voted ✓</span>
                          ) : (
                            <span className="badge-status badge-pending">Pending</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {u.vote_time ? new Date(u.vote_time).toLocaleString() : '-'}
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM EMAIL MESSAGE TEMPLATE */}
      {activeTab === 'email_template' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>✉️ Customize Email Announcement Message</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Set the custom message students will read in their email notification.</p>
            </div>
          </div>

          <form onSubmit={handleSaveEmailSettings}>
            <div className="form-group">
              <label className="form-label">Email Subject Line <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input 
                type="text" 
                className="form-control" 
                value={emailSubject} 
                onChange={e => setEmailSubject(e.target.value)} 
                placeholder="e.g. Rotation Schedule Preference Voting Invitation"
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom Body Message / Announcement <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <textarea 
                className="form-control" 
                rows="6" 
                value={customMessage} 
                onChange={e => setCustomMessage(e.target.value)} 
                placeholder="Enter the message instructions for students..."
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={savingEmailSettings}>
                {savingEmailSettings ? 'Saving Template...' : '💾 Save Email Template'}
              </button>
              <button type="button" className="btn btn-success" onClick={handleSendToAll} disabled={loading} style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
                {loading ? '📧 Sending...' : `📧 Send Email to ALL (${whitelist.length}) Voters Now`}
              </button>
            </div>
          </form>

          {/* Email Preview Card */}
          <div style={{ marginTop: '2.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>📱 Live Student Email Preview</h4>
            <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '8px', padding: '1.5rem', maxWidth: '560px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ background: '#1e3a8a', color: '#ffffff', padding: '12px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>
                {emailSubject || 'Email Subject'}
              </div>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Hello <strong>Student Name</strong>,</p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px', fontSize: '0.88rem', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {customMessage || 'Your custom message will appear here.'}
              </div>
              <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <span style={{ display: 'inline-block', background: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Cast Your Vote Now &rarr;
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                🔒 This voting link is unique to your email address and can be used only once.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h2>Administrative Audit Logs</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td><strong>{log.admin_username}</strong></td>
                    <td>{log.action}</td>
                    <td style={{ fontSize: '0.85rem' }}>{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
