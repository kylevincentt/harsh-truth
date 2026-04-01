'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../lib/supabase-browser';
import Link from 'next/link';

const supabase = createClient();

const CATEGORIES = [
  'All',
  'Judiciary',
  'Media / Bias',
  'Immigration',
  'Election Integrity',
  'Economy',
  'Foreign Policy',
  'Other',
];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const pendingSubmit = useRef(false);

  useEffect(() => {
    fetchPosts();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser && pendingSubmit.current) {
        pendingSubmit.current = false;
        setShowAuthModal(false);
        setShowModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('approved_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  }

  function handleSubmitClick() {
    if (!user) {
      pendingSubmit.current = true;
      setShowAuthModal(true);
    } else {
      setShowModal(true);
    }
  }

  function handleAuthClose() {
    pendingSubmit.current = false;
    setShowAuthModal(false);
  }

  const filteredPosts =
    activeCategory === 'All'
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    if (cat === 'All') {
      acc[cat] = posts.length;
    } else {
      acc[cat] = posts.filter((p) => p.category === cat).length;
    }
    return acc;
  }, {});

  return (
    <>
      <header className="header">
        <span className="header-title">HARSH TRUTH</span>
        <span className="header-tagline">&ldquo;No algorithm. Just curation.&rdquo;</span>
        <div className="header-right">
          {user ? (
            <div className="header-user">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="user-display-name">
                {user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email}
              </span>
              <button
                className="btn-signout"
                onClick={() => supabase.auth.signOut()}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              className="btn-signin"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </button>
          )}
          <Link href="/admin" className="header-admin">
            Admin
          </Link>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <span className="sidebar-label">Categories</span>
          <ul className="category-list">
            {CATEGORIES.map((cat) => (
              <li
                key={cat}
                className={`category-item ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{cat}</span>
                <span className="category-count">{categoryCounts[cat] || 0}</span>
              </li>
            ))}
          </ul>
          <button className="submit-btn" onClick={handleSubmitClick}>
            Submit a Post
          </button>
          {!user && (
            <p className="submit-hint">Sign in required to submit</p>
          )}
        </aside>

        <main className="feed">
          {loading ? (
            <div className="feed-empty">Loading&hellip;</div>
          ) : filteredPosts.length === 0 ? (
            <div className="feed-empty">
              {activeCategory === 'All'
                ? 'No posts yet.'
                : `No posts in "${activeCategory}" yet.`}
            </div>
          ) : (
            filteredPosts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))
          )}
        </main>
      </div>

      {showAuthModal && <AuthModal onClose={handleAuthClose} />}

      {showModal && (
        <SubmissionModal onClose={() => setShowModal(false)} user={user} />
      )}
    </>
  );
}

function PostCard({ post, index }) {
  return (
    <div
      className="post-card"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="post-card-header">
        <span className="post-handle">{post.handle}</span>
        <span className="post-category">{post.category}</span>
        <span className="post-date">{post.date_label}</span>
      </div>
      <p className="post-text">{post.post_text}</p>
      <div className="post-footer">
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="post-link"
          >
            View on X <span className="post-arrow">&rarr;</span>
          </a>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) setError(err.message);
      // onAuthStateChange in parent handles closing + opening submit modal
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else {
        setEmailSent(true);
      }
    }
    setAuthLoading(false);
  }

  async function handleGoogleSignIn() {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) setError(err.message);
  }

  if (emailSent) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-screen">
            <div className="success-icon">&#9993;</div>
            <div className="success-title">CHECK YOUR EMAIL</div>
            <p className="success-text">
              We&apos;ve sent a confirmation link to{' '}
              <strong>{email}</strong>. Click it to complete sign up.
            </p>
            <button className="btn-submit" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <button className="google-btn" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 6 : undefined}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={authLoading}>
              {authLoading
                ? 'Loading...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmissionModal({ onClose, user }) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [handle, setHandle] = useState(
    user?.user_metadata?.user_name
      ? `@${user.user_metadata.user_name}`
      : ''
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const urlPattern = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/\w+\/status\/\d+/;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!url || !category) {
      setError('URL and category are required.');
      return;
    }

    if (!urlPattern.test(url)) {
      setError('Please enter a valid X/Twitter post URL.');
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('submissions').insert({
      post_url: url,
      category,
      submitter_handle: handle || null,
      note: note || null,
      status: 'pending',
      user_id: user?.id || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-screen">
            <div className="success-icon">&#10003;</div>
            <div className="success-title">SUBMITTED</div>
            <p className="success-text">
              Your post has been submitted for review. If approved, it will
              appear on the public feed.
            </p>
            <button className="btn-submit" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">SUBMIT A POST</div>
        <p className="modal-subtitle">
          Found a post worth preserving? Submit it for review.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">X Post URL *</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://x.com/username/status/123..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Your Handle (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Why save this post? (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Brief note on why this post matters..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
