import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HARSH TRUTH â The receipts, organized.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1c1814',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#e8dcc8',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: '#c47a3a',
        }} />
        <div style={{
          fontSize: 26,
          letterSpacing: 8,
          color: '#c8bbb0',
          marginBottom: 40,
        }}>HARSHTRUTH.US</div>
        <div style={{
          fontSize: 180,
          fontWeight: 900,
          letterSpacing: 12,
          color: '#e8dcc8',
          lineHeight: 1,
        }}>HARSH TRUTH</div>
        <div style={{
          width: 80, height: 3, background: '#c47a3a', margin: '40px 0 24px',
        }} />
        <div style={{
          fontSize: 30,
          letterSpacing: 4,
          color: '#c8bbb0',
        }}>THE RECEIPTS, ORGANIZED.</div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
          background: '#c9943a',
        }} />
      </div>
    ),
    size
  );
}
