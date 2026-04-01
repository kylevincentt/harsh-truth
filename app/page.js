'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
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
        <Link href="/admin" className="header-admin">
          Admin
        </Link>
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
          <button className="submit-btn" onClick={() => setShowModal(true)}>
            Submit a Post
          </button>
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

      {showModal && (
        <SubmissionModal onClose={() => setShowModal(false)} />
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

function SubmissionModal({ onClose }) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [handle, setHandle] = useState('');
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
