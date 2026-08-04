import BrandMark from "@/components/BrandMark";

export default function LandingPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '60px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Centered Brand Header Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '36px', width: '100%' }}>
        <BrandMark />
      </div>

      {/* Hero Headline & Hook */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px', 
        padding: '40px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '38px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2', margin: '0 0 16px 0', letterSpacing: '-1px' }}>
          AI-powered legal due diligence for Pakistani property
        </h1>
        <p style={{ fontSize: '20px', fontWeight: '600', color: '#2563eb', margin: '0 0 20px 0' }}>
          Do not pay bayana until you know what is real.
        </p>

        <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '12px', fontWeight: '700', marginBottom: '28px' }}>
          Protects against fake stamp papers, mismatched CNICs, and unverified clauses.
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
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