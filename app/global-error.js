'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        background: '#1c1814',
        color: '#e8dcc8',
        fontFamily: 'Inter, system-ui, sans-serif',
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            color: '#c8bbb0',
            marginBottom: '0.75rem',
          }}>HARSH TRUTH</div>
          <h1 style={{
            fontSize: '1.8rem',
            margin: '0 0 0.5rem',
            letterSpacing: '0.04em',
          }}>Something broke completely.</h1>
          <p style={{
            fontSize: '0.85rem',
            color: '#c8bbb0',
            marginBottom: '1.5rem',
          }}>
            The app hit an error it couldn't recover from.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#c47a3a',
              color: '#fff',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
