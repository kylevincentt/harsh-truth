// Shared tweet-fetching helper used by /api/admin/approve and
// /api/admin/backfill-media. Wraps Twitter's public oEmbed + syndication
// endpoints so we don't need an API key.
//
// Returns an object describing what we managed to extract:
//   {
//     status: 'ok' | 'unavailable' | 'error',
//     text: string | null,
//     mediaType: 'photo' | 'video' | 'animated_gif' | null,
//     imageUrl: string | null,         // photo URL OR video poster/thumbnail
//     videoUrl: string | null,         // best mp4 variant, only when mediaType === 'video' | 'animated_gif'
//     likeCount: number | null,
//     repostCount: number | null,
//     viewCount: number | null,
//   }
//
// `status === 'unavailable'` means the tweet was deleted, the author was
// suspended, or the post is private. In that case caller should NOT overwrite
// existing post_text with bogus placeholder text like "(unavailable)".

const TWEET_ID_RE = /^[0-9]+$/;

// Same token formula used by vercel/react-tweet — required by the
// undocumented cdn.syndication endpoint to avoid 403s.
function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
}

export function extractTweetId(postUrl) {
  if (!postUrl || typeof postUrl !== 'string') return null;
  const m = postUrl.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

// Pick the best mp4 variant — react-tweet picks the second-highest bitrate
// to avoid huge files; we mirror that.
function pickBestMp4(variants) {
  if (!Array.isArray(variants)) return null;
  const mp4s = variants
    .filter((v) => v && v.content_type === 'video/mp4' && v.url)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  if (mp4s.length === 0) return null;
  return mp4s.length > 1 ? mp4s[1] : mp4s[0];
}

function extractMediaFromSyndication(data) {
  // Default
  let mediaType = null;
  let imageUrl = null;
  let videoUrl = null;

  // Prefer mediaDetails (richer), fall back to top-level photos[]
  const details = Array.isArray(data?.mediaDetails) ? data.mediaDetails : [];

  // Look for video/animated_gif first — these are the most-frequently-broken
  // case (the old import code only knew about photos).
  const video = details.find(
    (m) => m && (m.type === 'video' || m.type === 'animated_gif')
  );
  if (video) {
    mediaType = video.type; // 'video' or 'animated_gif'
    imageUrl = video.media_url_https || null; // video thumbnail / poster
    const best = pickBestMp4(video.video_info?.variants);
    if (best) videoUrl = best.url;
    return { mediaType, imageUrl, videoUrl };
  }

  const photo = details.find((m) => m && m.type === 'photo');
  if (photo) {
    mediaType = 'photo';
    imageUrl = photo.media_url_https || null;
    return { mediaType, imageUrl, videoUrl };
  }

  if (Array.isArray(data?.photos) && data.photos.length > 0) {
    mediaType = 'photo';
    imageUrl = data.photos[0].url || null;
    return { mediaType, imageUrl, videoUrl };
  }

  return { mediaType, imageUrl, videoUrl };
}

function isTombstoneText(text) {
  if (!text) return false;
  // Twitter sometimes returns literal placeholder text in oEmbed when the
  // author is suspended or the tweet is gated. Treat these as unavailable
  // rather than storing them as the post body.
  const t = String(text).trim().toLowerCase();
  if (!t) return true;
  return (
    t === '(unavailable)' ||
    t === 'unavailable' ||
    t === 'tweet unavailable' ||
    t === 'this post is unavailable' ||
    t === 'this tweet is unavailable' ||
    t === 'this post is from a suspended account' ||
    t.startsWith('this post is unavailable') ||
    t.startsWith('this tweet is unavailable')
  );
}

async function fetchOEmbed(postUrl) {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}&omit_script=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.status === 404) return { status: 'unavailable', text: null };
    if (!res.ok) return { status: 'error', text: null };
    const data = await res.json();
    if (!data?.html) return { status: 'error', text: null };

    const match = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!match) return { status: 'ok', text: null };

    const text = match[1]
      .replace(/<a[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (isTombstoneText(text)) return { status: 'unavailable', text: null };
    return { status: 'ok', text: text || null };
  } catch (_) {
    return { status: 'error', text: null };
  }
}

async function fetchSyndication(tweetId) {
  try {
    const token = syndicationToken(tweetId);
    const url = new URL('https://cdn.syndication.twimg.com/tweet-result');
    url.searchParams.set('id', tweetId);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('token', token);
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.status === 404) return { status: 'unavailable', data: null };
    if (!res.ok) return { status: 'error', data: null };

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!data || Object.keys(data).length === 0) {
      return { status: 'unavailable', data: null };
    }
    if (data.__typename === 'TweetTombstone') {
      return { status: 'unavailable', data: null };
    }
    return { status: 'ok', data };
  } catch (_) {
    return { status: 'error', data: null };
  }
}

export async function fetchTweetData(postUrl) {
  const empty = {
    status: 'error',
    text: null,
    mediaType: null,
    imageUrl: null,
    videoUrl: null,
    likeCount: null,
    repostCount: null,
    viewCount: null,
  };

  const tweetId = extractTweetId(postUrl);
  if (!tweetId || !TWEET_ID_RE.test(tweetId)) return { ...empty };

  // Run both in parallel — they're independent and oEmbed often hits faster.
  const [oembed, synd] = await Promise.all([
    fetchOEmbed(postUrl),
    fetchSyndication(tweetId),
  ]);

  // If BOTH endpoints say the tweet is gone, we report unavailable.
  if (oembed.status === 'unavailable' && synd.status !== 'ok') {
    return { ...empty, status: 'unavailable' };
  }
  if (synd.status === 'unavailable' && oembed.status !== 'ok') {
    return { ...empty, status: 'unavailable' };
  }

  let text = oembed.text || null;
  let mediaType = null;
  let imageUrl = null;
  let videoUrl = null;
  let likeCount = null;
  let repostCount = null;
  let viewCount = null;

  if (synd.status === 'ok' && synd.data) {
    const data = synd.data;

    // Syndication text is a good fallback when oEmbed didn't resolve.
    if (!text && typeof data.text === 'string') {
      const cleaned = data.text.trim();
      text = isTombstoneText(cleaned) ? null : cleaned || null;
    }

    const media = extractMediaFromSyndication(data);
    mediaType = media.mediaType;
    imageUrl = media.imageUrl;
    videoUrl = media.videoUrl;

    if (typeof data.favorite_count === 'number') likeCount = data.favorite_count;

    const maybeRetweet =
      (typeof data.retweet_count === 'number' && data.retweet_count) ||
      (typeof data.quote_count === 'number' && data.quote_count) ||
      (data.stats && typeof data.stats.retweet_count === 'number' && data.stats.retweet_count);
    if (typeof maybeRetweet === 'number') repostCount = maybeRetweet;

    const maybeViews =
      (typeof data.view_count === 'number' && data.view_count) ||
      (typeof data.views_count === 'number' && data.views_count) ||
      (data.stats && typeof data.stats.view_count === 'number' && data.stats.view_count);
    if (typeof maybeViews === 'number') viewCount = maybeViews;
  }

  return {
    status: 'ok',
    text,
    mediaType,
    imageUrl,
    videoUrl,
    likeCount,
    repostCount,
    viewCount,
  };
}

// Helper used by render-time filters. Old rows in the DB may already contain
// "(unavailable)" or similar literal strings as post_text — treat those as
// dead so the feed doesn't show empty card shells.
export function postTextLooksUnavailable(text) {
  return isTombstoneText(text);
}
