export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !/^https:\/\/video\.twimg\.com\//.test(url)) {
    return new Response('Forbidden', { status: 403 });
  }

  const range = request.headers.get('range');
  const upstream = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(range ? { Range: range } : {}),
    },
  }).catch(() => null);

  if (!upstream) return new Response('Bad Gateway', { status: 502 });

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'Access-Control-Allow-Origin': '*',
  });

  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);

  const cr = upstream.headers.get('content-range');
  if (cr) headers.set('Content-Range', cr);

  return new Response(upstream.body, { status: upstream.status, headers });
}
