export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://harshtruth.us/sitemap.xml',
    host: 'https://harshtruth.us',
  };
}
