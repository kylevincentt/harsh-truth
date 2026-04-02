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
  const [activeTab, setActiveTab] = useState('queue');

  // Category state
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  async function fetchCategories() {
    setCatLoading(true);
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
    setCatLoading(false);
  }

  useEffect(() => {
    if (authenticated) {
      fetchSubmissions();
      fetchCategories();
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

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ name: newCatName.trim() }),
    });

    if (res.ok) {
      setNewCatName('');
      fetchCategories();
      showToast('Category added.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to add category.', 'error');
    }
  }

  async function handleSaveEdit(id) {
    if (!editingCat || !editingCat.name.trim()) return;

    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ name: editingCat.name.trim() }),
    });

    if (res.ok) {
      setEditingCat(null);
      fetchCategories();
      showToast('Category updated.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to update category.', 'error');
    }
  }

  async function handleDeleteCategory(id) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password },
    });

    if (res.ok) {
      setDeleteConfirm(null);
      fetchCategories();
      showToast('Category deleted. Posts moved to Other.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to delete category.', 'error');
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

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          Approval Queue
          {submissions.length > 0 && (
            <span className="tab-count">{submissions.length}</span>
          )}
        </button>
        <button
          className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
          <span className="tab-count">{categories.length}</span>
        </button>
      </div>

      {activeTab === 'queue' && (
        <>
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
        </>
      )}

      {activeTab === 'categories' && (
        <div className="cat-section">
          <p className="cat-section-desc">
            Manage categories for the public feed. Deleting a category moves all its posts to&nbsp;&ldquo;Other&rdquo;. Renaming a category updates all existing posts automatically.
          </p>

          {catLoading ? (
            <div className="queue-empty">Loading categories&hellip;</div>
          ) : (
            <div className="cat-list">
              {categories.map((cat) => (
                <div key={cat.id} className="cat-row">
                  {editingCat?.id === cat.id ? (
                    <>
                      <input
                        className="cat-edit-input"
                        value={editingCat.name}
                        onChange={(e) =>
                          setEditingCat({ ...editingCat, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(cat.id);
                          if (e.key === 'Escape') setEditingCat(null);
                        }}
                        autoFocus
                      />
                      <div className="cat-row-actions">
                        <button
                          className="cat-btn cat-btn-save"
                          onClick={() => handleSaveEdit(cat.id)}
                        >
                          Save
                        </button>
                        <button
                          className="cat-btn cat-btn-cancel"
                          onClick={() => setEditingCat(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="cat-name">
                        {cat.name}
                        {cat.name === 'Other' && (
                          <span className="cat-protected">protected</span>
                        )}
                      </span>
                      <div className="cat-row-actions">
                        <button
                          className="cat-btn cat-btn-edit"
                          onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                        >
                          Rename
                        </button>
                        {cat.name !== 'Other' && (
                          <button
                            className="cat-btn cat-btn-delete"
                            onClick={() => setDeleteConfirm(cat)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="cat-add-row" onSubmit={handleAddCategory}>
            <input
              className="cat-add-input"
              type="text"
              placeholder="New category name&hellip;"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <button type="submit" className="cat-add-btn" disabled={!newCatName.trim()}>
              Add Category
            </button>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">DELETE CATEGORY</div>
            <p className="modal-subtitle">
              Delete &ldquo;{deleteConfirm.name}&rdquo;? All posts in this category will be moved to{' '}
              <strong style={{ color: 'var(--text)' }}>Other</strong>.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-reject"
                onClick={() => handleDeleteCategory(deleteConfirm.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
