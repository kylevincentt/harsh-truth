'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');

    const res = await fetch('/api/admin/submissions', {
      headers: { 'x-admin-password': password },
    });

    if (res.ok) {
      setAuthenticated(true);
      const data = await res.json();
      setSubmissions(data);
    } else {
      setAuthError('Invalid password.');
    }
  }

  async function fetchSubmissions() {
    setLoading(true);
    const res = await fetch('/api/admin/submissions', {
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authenticated) {
      fetchSubmissions();
    }
  }, [authenticated]);

  async function handleApprove(submission) {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ id: submission.id }),
    });

    if (res.ok) {
      showToast('Post approved and published.');
      fetchSubmissions();
    } else {
      showToast('Failed to approve.', 'error');
    }
  }

  async function handleReject(submission) {
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ id: submission.id }),
    });

    if (res.ok) {
      showToast('Submission rejected.');
      fetchSubmissions();
    } else {
      showToast('Failed to reject.', 'error');
    }
  }

  if (!authenticated) {
    return (
      <div className="admin-overlay">
        <div className="admin-login">
          <div className="admin-login-title">ADMIN ACCESS</div>
          <p className="admin-login-sub">Enter the admin password to continue.</p>
          <form onSubmit={handleLogin}>
            <input
              className="admin-password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {authError && (
              <div className="form-error" style={{ marginBottom: '1rem' }}>
                {authError}
              </div>
            )}
            <button type="submit" className="admin-login-btn">
              Enter
            </button>
          </form>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}
          >
            &larr; Back to site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-overlay">
      <div className="admin-header">
        <span className="admin-title">ADMIN PANEL</span>
        {submissions.length > 0 && (
          <span className="admin-badge">{submissions.length} pending</span>
        )}
        <Link href="/" className="admin-back">
          &larr; Back to site
        </Link>
      </div>

      {loading ? (
        <div className="queue-empty">Loading submissions&hellip;</div>
      ) : submissions.length === 0 ? (
        <div className="queue-empty">No pending submissions. All clear.</div>
      ) : (
        submissions.map((sub) => (
          <div key={sub.id} className="queue-item">
            <div className="queue-item-url">
              <a href={sub.post_url} target="_blank" rel="noopener noreferrer">
                {sub.post_url}
              </a>
            </div>
            <div className="queue-item-meta">
              <span className="queue-meta-item">
                <span className="queue-meta-label">Category: </span>
                <span className="queue-meta-value">{sub.category}</span>
              </span>
              {sub.submitter_handle && (
                <span className="queue-meta-item">
                  <span className="queue-meta-label">From: </span>
                  <span className="queue-meta-value">{sub.submitter_handle}</span>
                </span>
              )}
              <span className="queue-meta-item">
                <span className="queue-meta-label">Submitted: </span>
                <span className="queue-meta-value">
                  {new Date(sub.created_at).toLocaleString()}
                </span>
              </span>
            </div>
            {sub.note && <div className="queue-item-note">&ldquo;{sub.note}&rdquo;</div>}
            <div className="queue-actions">
              <button className="btn-approve" onClick={() => handleApprove(sub)}>
                Approve
              </button>
              <button className="btn-reject" onClick={() => handleReject(sub)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
