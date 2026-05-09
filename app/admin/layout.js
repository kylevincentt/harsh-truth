// Server component layout for /admin so we can attach metadata to a
// route whose page.js is a 'use client' component (metadata exports
// are not allowed in client components). Renders children unchanged.
//
// Audit R3 2026-05-09 M2: tab title was "HARSH TRUTH" (same as the
// home page) — bumps to "Admin · HARSH TRUTH" via the layout template.

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
