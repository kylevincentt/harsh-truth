export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Audit 2026-05-08 L8: /post/<id> URLs are canonical without
        // query strings. Block query-string variants (?ref=, ?utm_*=,
        // etc.) so we don't burn crawl budget on duplicate URLs of the
        // same detail page.
        disallow: ['/admin', '/api/', '/post/*?*'],
      },
    ],
    sitemap: 'https://harshtruth.us/sitemap.xml',
    host: 'https://harshtruth.us',
  };
}
