'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase-browser';
import Link from 'next/link';

const supabase = createClient();

const COLOR_KEYS = [
  { key: 'bg', label: 'Background' },
  { key: 'bg-card', label: 'Card Bg' },
  { key: 'bg-card-hover', label: 'Card Hover' },
  { key: 'text', label: 'Text' },
  { key: 'text-muted', label: 'Muted Text' },
  { key: 'red', label: 'Accent' },
  { key: 'gold', label: 'Gold' },
  { key: 'border', label: 'Border' },
];

const BLANK_COLORS = {
  bg: '#0a0a0a',
  'bg-card': '#111111',
  'bg-card-hover': '#1a1a1a',
  text: '#f2ede6',
  'text-muted': '#8a8478',
  red: '#c0392b',
  gold: '#c9a84c',
  border: '#222222',
};

function ThemePreview({ colors }) {
  return (
    <div className="theme-preview">
      <div className="theme-preview-label">Preview</div>
      <div
        className="theme-preview-card"
        style={{
          background: colors['bg-card'],
          borderColor: colors['border'],
        }}
      >
        <div className="theme-preview-handle" style={{ color: colors['gold'] }}>
          @example
        </div>
        <div
          className="theme-preview-category"
          style={{
            color: colors['red'],
            background: `${colors['red']}22`,
          }}
        >
          Category
        </div>
        <div className="theme-preview-text" style={{ color: colors['text'] }}>
          This is a sample post showing how text looks in this theme.
        </div>
        <div className="theme-preview-muted" style={{ color: colors['text-muted'] }}>
          View original &rarr;
        </div>
      </div>
    </div>
  );
}

function ThemeColorEditor({ colors, onChange }) {
  return (
    <div className="theme-color-grid">
      {COLOR_KEYS.map(({ key, label }) => (
        <div key={key} className="theme-color-field">
          <span className="theme-color-field-label">{label}</span>
          <input
            type="color"
            className="theme-color-swatch-input"
            value={colors[key] || '#000000'}
            onChange={(e) => onChange(key, e.target.value)}
          />
          <input
            type="text"
            className="theme-color-hex-input"
            value={colors[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(null); // null=loading, true/false=result
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

  // Theme state
  const [themes, setThemes] = useState([]);
  const [themeLoading, setThemeLoading] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null); // { id, name, colors }
  const [addingTheme, setAddingTheme] = useState(null); // { name, colors }
  const [themeDeleteConfirm, setThemeDeleteConfirm] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminAndLoad();
      } else {
        setAuthorized(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setAuthorized(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdminAndLoad() {
    setLoading(true);
    const res = await fetch('/api/admin/submissions');
    setLoading(false);

    if (res.status === 401) {
      setAuthorized(false);
    } else if (res.ok) {
      setAuthorized(true);
      const data = await res.json();
      setSubmissions(data);
      fetchCategories();
      fetchThemes();
    }
  }

  async function fetchSubmissions() {
    setLoading(true);
    const res = await fetch('/api/admin/submissions');
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

  async function fetchThemes() {
    setThemeLoading(true);
    const res = await fetch('/api/admin/themes');
    if (res.ok) {
      const data = await res.json();
      setThemes(data);
    }
    setThemeLoading(false);
  }

  async function handleApprove(submission) {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

  // — Theme handlers —

  function applyColorsToPage(colors) {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }

  async function handleActivateTheme(id) {
    const res = await fetch(`/api/admin/themes/${id}/activate`, { method: 'PUT' });
    if (res.ok) {
      const data = await res.json();
      applyColorsToPage(data.colors);
      fetchThemes();
      showToast('Theme activated — live on site.');
    } else {
      showToast('Failed to activate theme.', 'error');
    }
  }

  async function handleSaveThemeEdit() {
    if (!editingTheme) return;
    const res = await fetch(`/api/admin/themes/${editingTheme.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTheme.name, colors: editingTheme.colors }),
    });
    if (res.ok) {
      setEditingTheme(null);
      fetchThemes();
      showToast('Theme saved.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to save theme.', 'error');
    }
  }

  async function handleCreateTheme(e) {
    e.preventDefault();
    if (!addingTheme?.name?.trim()) return;
    const res = await fetch('/api/admin/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addingTheme.name.trim(), colors: addingTheme.colors }),
    });
    if (res.ok) {
      setAddingTheme(null);
      fetchThemes();
      showToast('Theme created.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to create theme.', 'error');
    }
  }

  async function handleDuplicateTheme(theme) {
    const res = await fetch('/api/admin/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Copy of ${theme.name}`, colors: theme.colors }),
    });
    if (res.ok) {
      fetchThemes();
      showToast('Theme duplicated.');
    } else {
      showToast('Failed to duplicate theme.', 'error');
    }
  }

  async function handleDeleteTheme(id) {
    const res = await fetch(`/api/admin/themes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setThemeDeleteConfirm(null);
      fetchThemes();
      showToast('Theme deleted.');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to delete theme.', 'error');
    }
  }

  function updateEditingColor(key, value) {
    setEditingTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  }

  function updateAddingColor(key, value) {
    setAddingTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  }

  // Loading — waiting for session check
  if (authorized === null) {
    return (
      <div className="admin-overlay">
        <div className="queue-empty">Checking access&hellip;</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="admin-overlay">
        <div className="admin-login">
          <div className="admin-login-title">ADMIN ACCESS</div>
          <p className="admin-login-sub">
            Sign in with your admin account to continue.
          </p>
          <Link
            href="/"
            className="admin-login-btn"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
          >
            Sign In on Homepage
          </Link>
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

  // Logged in but not admin
  if (!authorized) {
    return (
      <div className="admin-overlay">
        <div className="admin-login">
          <div className="admin-login-title">ACCESS DENIED</div>
          <p className="admin-login-sub">
            {user.email} does not have admin privileges.
          </p>
          <button
            className="admin-login-btn"
            style={{ marginTop: '1rem' }}
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
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
        <div className="admin-header-right">
          <span className="admin-user-label">{user.email}</span>
          <button
            className="admin-signout-btn"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
          <Link href="/" className="admin-back">
            &larr; Back to site
          </Link>
        </div>
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
        <button
          className={`admin-tab ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          Themes
          <span className="tab-count">{themes.length}</span>
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

      {activeTab === 'themes' && (
        <div className="theme-section">
          <div className="theme-section-header">
            <p className="theme-section-desc">
              Manage color themes for the site. Activating a theme updates the live site instantly — no redeploy needed. Edit colors, duplicate themes as starting points, or create from scratch.
            </p>
            <button
              className="theme-add-btn"
              onClick={() =>
                setAddingTheme({
                  name: '',
                  colors: { ...BLANK_COLORS },
                })
              }
            >
              + Add Theme
            </button>
          </div>

          {addingTheme && (
            <div className="theme-add-panel">
              <div className="theme-add-panel-header">New Theme</div>
              <form className="theme-add-panel-body" onSubmit={handleCreateTheme}>
                <div className="theme-editor-name-row">
                  <span className="theme-editor-name-label">Name</span>
                  <input
                    className="theme-editor-name-input"
                    type="text"
                    placeholder="Theme name&hellip;"
                    value={addingTheme.name}
                    onChange={(e) =>
                      setAddingTheme((prev) => ({ ...prev, name: e.target.value }))
                    }
                    autoFocus
                  />
                </div>
                <div className="theme-editor-body">
                  <ThemeColorEditor
                    colors={addingTheme.colors}
                    onChange={updateAddingColor}
                  />
                  <ThemePreview colors={addingTheme.colors} />
                </div>
                <div className="theme-editor-actions">
                  <button type="submit" className="theme-save-btn" disabled={!addingTheme.name.trim()}>
                    Create Theme
                  </button>
                  <button
                    type="button"
                    className="theme-cancel-btn"
                    onClick={() => setAddingTheme(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {themeLoading ? (
            <div className="queue-empty">Loading themes&hellip;</div>
          ) : (
            <div className="theme-list">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className={`theme-row${theme.is_active ? ' is-active' : ''}`}
                >
                  <div className="theme-row-header">
                    <div className="theme-swatches">
                      {['bg', 'bg-card', 'text', 'gold', 'red', 'border'].map((key) => (
                        <div
                          key={key}
                          className="theme-swatch"
                          style={{ background: theme.colors[key] }}
                          title={`${key}: ${theme.colors[key]}`}
                        />
                      ))}
                    </div>
                    <span className="theme-name">{theme.name}</span>
                    {theme.is_active && (
                      <span className="theme-active-badge">Active</span>
                    )}
                    <div className="theme-row-actions">
                      {!theme.is_active && (
                        <button
                          className="theme-btn theme-btn-activate"
                          onClick={() => handleActivateTheme(theme.id)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="theme-btn theme-btn-edit"
                        onClick={() =>
                          setEditingTheme(
                            editingTheme?.id === theme.id
                              ? null
                              : { id: theme.id, name: theme.name, colors: { ...theme.colors } }
                          )
                        }
                      >
                        {editingTheme?.id === theme.id ? 'Close' : 'Edit'}
                      </button>
                      <button
                        className="theme-btn theme-btn-duplicate"
                        onClick={() => handleDuplicateTheme(theme)}
                      >
                        Duplicate
                      </button>
                      <button
                        className="theme-btn theme-btn-delete"
                        onClick={() => setThemeDeleteConfirm(theme)}
                        disabled={theme.is_active}
                        title={theme.is_active ? 'Cannot delete the active theme' : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingTheme?.id === theme.id && (
                    <div className="theme-editor">
                      <div className="theme-editor-name-row">
                        <span className="theme-editor-name-label">Name</span>
                        <input
                          className="theme-editor-name-input"
                          type="text"
                          value={editingTheme.name}
                          onChange={(e) =>
                            setEditingTheme((prev) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className="theme-editor-body">
                        <ThemeColorEditor
                          colors={editingTheme.colors}
                          onChange={updateEditingColor}
                        />
                        <ThemePreview colors={editingTheme.colors} />
                      </div>
                      <div className="theme-editor-actions">
                        <button className="theme-save-btn" onClick={handleSaveThemeEdit}>
                          Save Changes
                        </button>
                        <button
                          className="theme-cancel-btn"
                          onClick={() => setEditingTheme(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {themeDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setThemeDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">DELETE THEME</div>
            <p className="modal-subtitle">
              Delete &ldquo;{themeDeleteConfirm.name}&rdquo;? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setThemeDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-reject"
                onClick={() => handleDeleteTheme(themeDeleteConfirm.id)}
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
