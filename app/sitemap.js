export default function sitemap() {
  const base = 'https://harshtruth.us';
  const now = new Date().toISOString();
  return [
    { url: `${base}/`,      lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
