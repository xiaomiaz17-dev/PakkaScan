export default function LandingPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '60px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Canonical Brand Mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        {/* Shield Icon Graphic (48x48) */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1.5px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)',
        }}>
          {/* Document shape inside shield */}
          <div style={{
            width: '20px',
            height: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '3px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Green checkmark overlay */}
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-4px',
              width: '18px',
              height: '18px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '900',
              border: '2px solid #0f172a',
            }}>
              
            </div>
          </div>
        </div>

        {/* Brand Name & Subtitle */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '28px', fontWeight: '850', color: '#0f172a', letterSpacing: '-0.8px' }}>
              Pakka
            </span>
            <span style={{ fontSize: '28px', fontWeight: '850', color: '#2563eb', letterSpacing: '-0.8px' }}>
              Scan
            </span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '-2px' }}>
            Evidence-Linked Verification  Verify before you trust.
          </div>
        </div>
      </div>

      {/* Hero Headline & Hook */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
        <h1 style={{ fontSize: '38px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2', margin: '0 0 16px 0', letterSpacing: '-1px' }}>
          AI-powered legal due diligence for Pakistani property
        </h1>
        <p style={{ fontSize: '20px', fontWeight: '600', color: '#2563eb', margin: '0 0 20px 0' }}>
          Dont pay bayana until you know whats real.
        </p>

        <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '12px', fontWeight: '700', marginBottom: '28px' }}>
           Protects against fake stamp papers, mismatched CNICs, and unverified clauses.
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a
            href="/app/scan"
            style={{
              display: 'inline-block',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            Upload Contract & Scan 
          </a>
        </div>
      </div>

    </div>
  );
}
