import React, { useState, useEffect } from 'react';

export default function StudentVotePage({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [userData, setUserData] = useState(null);
  const [pollData, setPollData] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/vote/validate/${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.already_voted) {
          setAlreadyVoted(true);
        }
        setError(data.error || 'Invalid voting link.');
        setLoading(false);
        return;
      }

      setUserData(data.user);
      setPollData(data.poll);
      setLoading(false);
    } catch (err) {
      setError('Unable to connect to the voting server. Please check your network connection.');
      setLoading(false);
    }
  };

  const handleSubmitVote = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      alert('Please select one option before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, selected_option: selectedOption })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Submission failed.');
        setSubmitting(false);
        return;
      }

      setReceipt(data.receipt);
      setSubmitting(false);
    } catch (err) {
      alert('Failed to submit vote. Server error.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlignment: 'center', padding: '3rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>⏳ Verifying Voting Link...</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please wait while we validate your security token.</p>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="card" style={{ maxWidth: '650px', margin: '3rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-green)', marginBottom: '0.5rem' }}>Vote Successfully Recorded!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Thank you for participating. Your response is saved securely and anonymously.</p>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', margin: '0 auto 1.5rem', maxWidth: '480px' }}>
          <div style={{ marginBottom: '0.5rem' }}><strong>Voter:</strong> {receipt.email}</div>
          <div style={{ marginBottom: '0.5rem' }}><strong>Selected Preference:</strong> {receipt.selected_option}</div>
          <div><strong>Timestamp:</strong> {receipt.timestamp}</div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
          🔒 Your voting token has now been permanently invalidated to prevent revoting.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>
          {alreadyVoted ? 'Response Already Submitted' : 'Access Restricted'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>{error}</p>
        {alreadyVoted && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.85rem', borderRadius: '8px', fontSize: '0.9rem' }}>
            Each invited voter is permitted exactly <strong>one vote</strong>. If you believe this is an error, please contact the administrator.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '750px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="brand-badge" style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: '0.8rem', padding: '4px 12px' }}>
          Official Student Poll
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.75rem' }}>{pollData?.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{pollData?.description}</p>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)', padding: '1rem', borderRadius: '0 8px 8px 0', marginBottom: '2rem', fontSize: '0.9rem' }}>
        👤 Verified Voter: <strong>{userData?.email}</strong> {userData?.name ? `(${userData.name})` : ''}
      </div>

      <form onSubmit={handleSubmitVote}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>
          Which rotation schedule do you prefer? <span style={{ color: 'var(--accent-red)' }}>*</span>
        </h3>

        <div className="options-grid">
          {/* Option 1 */}
          <div 
            className={`option-card ${selectedOption === 'option_1' ? 'selected' : ''}`}
            onClick={() => setSelectedOption('option_1')}
          >
            <input 
              type="radio" 
              name="rotation" 
              className="option-radio" 
              checked={selectedOption === 'option_1'} 
              onChange={() => setSelectedOption('option_1')}
            />
            <div>
              <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', fontWeight: '800', fontSize: '1rem', padding: '5px 14px', borderRadius: '8px', marginBottom: '0.7rem' }}>
                Option 1 🙂
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                🪑 "ఈ రోజు నువ్వు... రేపు నేను!"
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.75rem' }}>
                ( 3rd, 4th, 5th {'&'} 6th బెంచ్ rotation )
              </div>
              <div className="rot-tag-row">
                <span className="rot-tag fixed">Rot 1: Fixed</span>
                <span className="rot-tag fixed">Rot 2: Fixed</span>
                <span className="rot-tag rotate">Rot 3: Rotate</span>
                <span className="rot-tag rotate">Rot 4: Rotate</span>
                <span className="rot-tag rotate">Rot 5: Rotate</span>
                <span className="rot-tag rotate">Rot 6: Rotate</span>
              </div>
            </div>
          </div>

          {/* Option 2 */}
          <div 
            className={`option-card ${selectedOption === 'option_2' ? 'selected' : ''}`}
            onClick={() => setSelectedOption('option_2')}
          >
            <input 
              type="radio" 
              name="rotation" 
              className="option-radio" 
              checked={selectedOption === 'option_2'} 
              onChange={() => setSelectedOption('option_2')}
            />
            <div>
              <div style={{ display: 'inline-block', background: '#d1fae5', color: '#065f46', fontWeight: '800', fontSize: '1rem', padding: '5px 14px', borderRadius: '8px', marginBottom: '0.7rem' }}>
                Option 2 😎
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                🪑 వెనుక బెంచ్ మా జన్మహక్కు... దానిపై కన్నేయొద్దు! 😭😂
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.75rem' }}>
                ( 5th {'&'} 6th బెంచ్ మాత్రమే rotation )
              </div>
              <div className="rot-tag-row">
                <span className="rot-tag fixed">Rot 1: Fixed</span>
                <span className="rot-tag fixed">Rot 2: Fixed</span>
                <span className="rot-tag fixed">Rot 3: Fixed</span>
                <span className="rot-tag fixed">Rot 4: Fixed</span>
                <span className="rot-tag rotate">Rot 5: Rotate</span>
                <span className="rot-tag rotate">Rot 6: Rotate</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn btn-success" 
            disabled={submitting}
            style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
          >
            {submitting ? 'Submitting...' : 'Submit Vote ✓'}
          </button>
        </div>
      </form>
    </div>
  );
}
