'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase-browser';
import Link from 'next/link';

const supabase = createClient();

const FALLBACK_CATEGORIES = [
  'All',
  'Judiciary',
  'Media / Bias',
  'Immigration',
  'Election Integrity',
  'Economy',
  'Foreign Policy',
  'Other',
];

// Small utility hook: lock body scroll while `open` is true.
function useBodyScrollLock(open) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

// Small utility hook: close on Escape, restore focus to `restoreRef` on unmount.
function useModalKeyboard({ open, onClose, restoreRef }) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Return focus
      const el = restoreRef?.current || previouslyFocused;
      if (el && typeof el.focus === 'function') {
        try { el.focus(); } catch {}
      }
    };
  }, [open, onClose, restoreRef]);
}

export default function HomePage() {
  // Suspend-free wrapper for searchParams
  return <Home />;
}

function Home() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'popular'
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState('');
  const pendingSubmit = useRef(false);
  const headerRef = useRef(null);
  const signInBtnRef = useRef(null);
  const submitBtnRef = useRef(null);
  const hamburgerRef = useRef(null);

  // When redirected with ?signin=1 (e.g. from /admin), auto-open auth modal.
  // If ?return=/some-path is also present, redirect there after successful auth.
  const returnTo = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('signin') === '1') {
      setShowAuthModal(true);
      const ret = sp.get('return');
      if (ret && /^\//.test(ret) && !ret.startsWith('//')) {
        returnTo.current = ret;
      }
      // Clean URL so it does not re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete('signin');
      url.searchParams.delete('return');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty(
          '--header-height',
          `${headerRef.current.offsetHeight}px`
        );
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchCategories();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) fetchAdminStatus(sessionUser.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchAdminStatus(newUser.id);
        if (pendingSubmit.current) {
          pendingSubmit.current = false;
          setShowAuthModal(false);
          setShowModal(true);
        } else if (returnTo.current) {
          const dest = returnTo.current;
          returnTo.current = null;
          setShowAuthModal(false);
          // Defer to next tick so session cookies flush
          setTimeout(() => { window.location.href = dest; }, 120);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refetch whenever the user toggles Latest/Popular
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Keyboard shortcut: "/" focuses search (unless user is already typing in an input).
  useEffect(() => {
    function onKey(e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const searchEl = document.getElementById('feed-search');
      if (searchEl) {
        e.preventDefault();
        searchEl.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function fetchPosts() {
    setLoading(true);
    setLoadError(false);
    let query = supabase.from('approved_posts').select('*');
    if (sortBy === 'popular') {
      // like_count may not be present on every row (older posts); nullsFirst: false keeps them at the bottom.
      query = query
        .order('like_count', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    const { data, error } = await query;

    if (error) {
      // Fallback: if like_count column doesn't exist yet, retry with created_at only
      if (sortBy === 'popular') {
        const fb = await supabase
          .from('approved_posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (!fb.error && fb.data) {
          setPosts(fb.data);
          setLoading(false);
          return;
        }
      }
      setLoadError(true);
    } else if (data) {
      setPosts(data);
    }
    setLoading(false);
  }

  async function fetchAdminStatus(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.is_admin === true);
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCategories(['All', ...data.map((c) => c.name)]);
        }
      }
    } catch {
      // keep fallback
    }
  }

  function handleSubmitClick() {
    if (!user) {
      pendingSubmit.current = true;
      setShowAuthModal(true);
    } else {
      setShowModal(true);
    }
  }

  const handleAuthClose = useCallback(() => {
    pendingSubmit.current = false;
    setShowAuthModal(false);
  }, []);

  const handleSubmitClose = useCallback(() => {
    setShowModal(false);
  }, []);

  // Close the sidebar when Escape is pressed (mobile drawer)
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  // Filter by category + full-text search
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPosts = posts.filter((p) => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    if (!normalizedQuery) return true;
    const hay = `${p.handle || ''} ${p.post_text || ''} ${p.category || ''}`.toLowerCase();
    return hay.includes(normalizedQuery);
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? posts.length : posts.filter((p) => p.category === cat).length;
    return acc;
  }, {});

  const totalCount = posts.length;

  return (
    <>
      <header className="header" ref={headerRef} role="banner">
        <button
          className={`hamburger-btn${sidebarOpen ? ' is-open' : ''}`}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          aria-controls="site-sidebar"
          ref={hamburgerRef}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <Link href="/" className="header-brand" aria-label="HARSH TRUTH — home">
          <span className="header-title">HARSH TRUTH</span>
          <span className="header-tagline">&ldquo;The receipts, organized.&rdquo;</span>
        </Link>
        <nav className="header-right" aria-label="Primary">
          <Link href="/about" className="header-nav-link">About</Link>
          {user ? (
            <div className="header-user">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                  width="28"
                  height="28"
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
              ref={signInBtnRef}
            >
              Sign In
            </button>
          )}
          {isAdmin && (
            <Link href="/admin" className="header-admin">
              Admin
            </Link>
          )}
        </nav>
      </header>

      <nav className="mobile-category-bar" aria-label="Category filter (mobile)">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`mobile-cat-pill${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat}
            {cat !== 'All' && categoryCounts[cat] > 0 && (
              <span className="mobile-cat-pill-count">{categoryCounts[cat]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="layout">
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          id="site-sidebar"
          className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
          aria-label="Categories"
        >
          <button
            className="submit-btn"
            onClick={() => { handleSubmitClick(); setSidebarOpen(false); }}
            ref={submitBtnRef}
          >
            Submit a Post
          </button>
          {!user && (
            <p className="submit-hint">Sign in required to submit</p>
          )}

          <div className="sidebar-section-label">Categories</div>
          <ul className="category-list" role="list">
            {categories.map((cat) => (
              <li key={cat} role="listitem">
                <button
                  type="button"
                  className={`category-item${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => { setActiveCategory(cat); setSidebarOpen(false); }}
                  aria-pressed={activeCategory === cat}
                >
                  <span>{cat}</span>
                  <span className="category-count">{categoryCounts[cat] || 0}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="sidebar-footer">
            <Link href="/about" className="sidebar-footer-link">About</Link>
            <span className="sidebar-footer-dot">·</span>
            <span className="sidebar-footer-count">
              {totalCount} {totalCount === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </aside>

        <main className="feed" id="feed" tabIndex={-1}>
          <div className="feed-toolbar" role="search">
            <label htmlFor="feed-search" className="sr-only">Search posts</label>
            <div className="feed-search-wrap">
              <svg
                className="feed-search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="feed-search"
                className="feed-search-input"
                type="search"
                placeholder="Search posts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
              />
              <kbd className="feed-search-kbd" aria-hidden="true">/</kbd>
            </div>
            <div className="feed-toolbar-right">
              <div className="feed-sort" role="tablist" aria-label="Sort posts">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'latest'}
                  className={`feed-sort-btn${sortBy === 'latest' ? ' is-active' : ''}`}
                  onClick={() => setSortBy('latest')}
                >
                  Latest
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'popular'}
                  className={`feed-sort-btn${sortBy === 'popular' ? ' is-active' : ''}`}
                  onClick={() => setSortBy('popular')}
                >
                  <span className="feed-sort-icon" aria-hidden="true">♥</span>
                  Popular
                </button>
              </div>
              <div className="feed-meta">
                {activeCategory !== 'All' && (
                  <span className="feed-meta-chip">
                    {activeCategory}
                    <button
                      className="feed-meta-clear"
                      onClick={() => setActiveCategory('All')}
                      aria-label={`Clear ${activeCategory} filter`}
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="feed-meta-count">
                  {loading ? '—' : `${filteredPosts.length} / ${totalCount}`}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="feed-grid feed-skeleton">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : loadError ? (
            <div className="feed-empty">
              <div className="feed-empty-title">Couldn&rsquo;t load the feed.</div>
              <p className="feed-empty-sub">Check your connection and try again.</p>
              <button className="btn-submit feed-empty-btn" onClick={fetchPosts}>
                Retry
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon" aria-hidden="true">—</div>
              <div className="feed-empty-title">
                {normalizedQuery
                  ? 'No posts match that search.'
                  : activeCategory === 'All'
                  ? 'No posts yet.'
                  : `Nothing in “${activeCategory}” yet.`}
              </div>
              {(normalizedQuery || activeCategory !== 'All') && (
                <button
                  className="feed-empty-btn"
                  onClick={() => { setQuery(''); setActiveCategory('All'); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="feed-grid">
              {filteredPosts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>
          )}
        </main>
      </div>

      {showAuthModal && (
        <AuthModal onClose={handleAuthClose} restoreRef={signInBtnRef} />
      )}

      {showModal && (
        <SubmissionModal
          onClose={handleSubmitClose}
          user={user}
          categories={categories.filter((c) => c !== 'All')}
          restoreRef={submitBtnRef}
        />
      )}
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="post-card post-card-skeleton" aria-hidden="true">
      <div className="post-card-header">
        <span className="skeleton-chip skeleton-chip-sm" />
        <span className="skeleton-chip skeleton-chip-xs" />
        <span className="skeleton-chip skeleton-chip-date" />
      </div>
      <div className="skeleton-line skeleton-line-full" />
      <div className="skeleton-line skeleton-line-90" />
      <div className="skeleton-line skeleton-line-60" />
    </div>
  );
}

// Format integers X-style: 1234 -> 1.2K, 1_500_000 -> 1.5M.
function formatCount(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'K';
  }
  const v = n / 1_000_000;
  return (v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + 'M';
}

function PostCard({ post, index }) {
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef(null);

  // Detect whether post text is long enough to require a "See more" toggle.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      // When NOT expanded the element is line-clamped; scrollHeight exceeds
      // clientHeight when there's hidden content underneath.
      const clamped = el.scrollHeight - el.clientHeight > 2;
      setIsClamped(clamped);
    };
    measure();
    // Re-measure on window resize (column width changes, font load, etc.)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [post.post_text, expanded]);

  async function handleShare() {
    const shareData = {
      title: `HARSH TRUTH — ${post.handle || 'Post'}`,
      text: post.post_text ? post.post_text.slice(0, 140) : '',
      url: post.post_url || (typeof window !== 'undefined' ? window.location.href : ''),
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      /* user cancelled share or permission denied — silent */
    }
  }

  const reposts = formatCount(post.repost_count);
  const likes = formatCount(post.like_count);
  const views = formatCount(post.view_count);
  const hasMetrics = reposts || likes || views;

  return (
    <article
      className="post-card"
      style={{ animationDelay: `${Math.min(index, 10) * 0.04}s` }}
    >
      <div className="post-card-header">
        <span className="post-handle">{post.handle}</span>
        <span className="post-category">{post.category}</span>
        <span className="post-date">{post.date_label}</span>
      </div>
      <div
        ref={textRef}
        className={`post-text${expanded ? ' is-expanded' : ''}`}
      >
        {post.post_text}
      </div>
      {isClamped && !expanded && (
        <button
          type="button"
          className="post-see-more"
          onClick={() => setExpanded(true)}
        >
          See more
        </button>
      )}
      {expanded && (
        <button
          type="button"
          className="post-see-more"
          onClick={() => setExpanded(false)}
        >
          See less
        </button>
      )}
      {post.image_url && (
        <img
          src={post.image_url}
          alt={`Image attached to post by ${post.handle || 'unknown'}`}
          className="post-image"
          loading="lazy"
          decoding="async"
        />
      )}
      {hasMetrics && (
        <div className="post-metrics" aria-label="Post metrics from X">
          {reposts && (
            <span className="post-metric" title={`${post.repost_count.toLocaleString()} reposts`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              {reposts}
            </span>
          )}
          {likes && (
            <span className="post-metric" title={`${post.like_count.toLocaleString()} likes`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/>
              </svg>
              {likes}
            </span>
          )}
          {views && (
            <span className="post-metric" title={`${post.view_count.toLocaleString()} views`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="20" x2="4" y2="12"/>
                <line x1="10" y1="20" x2="10" y2="6"/>
                <line x1="16" y1="20" x2="16" y2="14"/>
                <line x1="22" y1="20" x2="22" y2="9"/>
              </svg>
              {views}
            </span>
          )}
        </div>
      )}
      <div className="post-footer">
        <button
          type="button"
          className="post-share"
          onClick={handleShare}
          aria-label={shared ? 'Link copied' : 'Share this post'}
        >
          {shared ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </>
          )}
        </button>
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="post-link"
          >
            View on X <span className="post-arrow" aria-hidden="true">&rarr;</span>
          </a>
        )}
      </div>
    </article>
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
      aria-hidden="true"
    >
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// Shared modal shell — provides overlay, Escape handling, scroll lock, close button.
function ModalShell({ title, onClose, restoreRef, children, labelledBy }) {
  const contentRef = useRef(null);
  useBodyScrollLock(true);
  useModalKeyboard({ open: true, onClose, restoreRef });

  // Autofocus the first focusable element in the modal
  useEffect(() => {
    const t = setTimeout(() => {
      const node = contentRef.current;
      if (!node) return;
      const focusable = node.querySelector(
        'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }, 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={contentRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="5" x2="19" y2="19"/>
            <line x1="19" y1="5" x2="5" y2="19"/>
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function AuthModal({ onClose, restoreRef }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) setError(err.message);
  }

  async function handleForgotPassword() {
    setError('');
    if (!email) {
      setError('Enter your email above first, then tap “Forgot password”.');
      return;
    }
    setAuthLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setAuthLoading(false);
    if (err) setError(err.message);
    else setResetSent(true);
  }

  if (resetSent) {
    return (
      <ModalShell onClose={onClose} restoreRef={restoreRef} labelledBy="auth-reset-title">
        <div className="success-screen">
          <div className="success-icon" aria-hidden="true">&#9993;</div>
          <div className="success-title" id="auth-reset-title">CHECK YOUR EMAIL</div>
          <p className="success-text">
            If <strong>{email}</strong> has an account, we&rsquo;ve sent a password reset link.
          </p>
          <button className="btn-submit" onClick={onClose}>
            Got it
          </button>
        </div>
      </ModalShell>
    );
  }

  if (emailSent) {
    return (
      <ModalShell onClose={onClose} restoreRef={restoreRef} labelledBy="auth-sent-title">
        <div className="success-screen">
          <div className="success-icon" aria-hidden="true">&#9993;</div>
          <div className="success-title" id="auth-sent-title">CHECK YOUR EMAIL</div>
          <p className="success-text">
            We&rsquo;ve sent a confirmation link to <strong>{email}</strong>.
            Click it to complete sign up.
          </p>
          <button className="btn-submit" onClick={onClose}>
            Got it
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} restoreRef={restoreRef} labelledBy="auth-title">
      <h2 id="auth-title" className="sr-only">
        {mode === 'signin' ? 'Sign in' : 'Sign up'}
      </h2>
      <div className="auth-tabs" role="tablist">
        <button
          className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => { setMode('signin'); setError(''); }}
          role="tab"
          aria-selected={mode === 'signin'}
          type="button"
        >
          Sign In
        </button>
        <button
          className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setError(''); }}
          role="tab"
          aria-selected={mode === 'signup'}
          type="button"
        >
          Sign Up
        </button>
      </div>

      <button className="google-btn" onClick={handleGoogleSignIn} type="button">
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider" aria-hidden="true">
        <span>or</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="form-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="auth-password">Password</label>
            {mode === 'signin' && (
              <button
                type="button"
                className="form-label-action"
                onClick={handleForgotPassword}
                disabled={authLoading}
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            id="auth-password"
            className="form-input"
            type="password"
            placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? 6 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={authLoading}>
            {authLoading
              ? 'Loading…'
              : mode === 'signin'
              ? 'Sign In'
              : 'Sign Up'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function SubmissionModal({ onClose, user, categories, restoreRef }) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [handle, setHandle] = useState(
    user?.user_metadata?.user_name ? `@${user.user_metadata.user_name}` : ''
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
      setError('Please enter a valid X/Twitter post URL (e.g. https://x.com/user/status/123…).');
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
      <ModalShell onClose={onClose} restoreRef={restoreRef} labelledBy="submit-success-title">
        <div className="success-screen">
          <div className="success-icon" aria-hidden="true">&#10003;</div>
          <div className="success-title" id="submit-success-title">SUBMITTED</div>
          <p className="success-text">
            Your post has been submitted for review. If approved, it will
            appear on the public feed.
          </p>
          <button className="btn-submit" onClick={onClose}>
            Close
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} restoreRef={restoreRef} labelledBy="submit-title">
      <div className="modal-title" id="submit-title">SUBMIT A POST</div>
      <p className="modal-subtitle">
        Found a post worth preserving? Submit it for review.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="sub-url">X Post URL *</label>
          <input
            id="sub-url"
            className="form-input"
            type="url"
            placeholder="https://x.com/username/status/123…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="url"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sub-category">Category *</label>
          <select
            id="sub-category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sub-handle">Your Handle (optional)</label>
          <input
            id="sub-handle"
            className="form-input"
            type="text"
            placeholder="@yourhandle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sub-note">Why save this post? (optional)</label>
          <textarea
            id="sub-note"
            className="form-textarea"
            placeholder="Brief note on why this post matters…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
          <div className="form-helper">
            {note.length}/500
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
