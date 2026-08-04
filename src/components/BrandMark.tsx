export default function BrandMark() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
      {/* Shield Icon Graphic */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1.5px solid #3b82f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="#0B132B" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 8H16" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 12H13" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M9 16L11 18L15 13" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Brand Name & Subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
          <span style={{ fontSize: '28px', fontWeight: '850', color: '#0f172a', letterSpacing: '-0.8px' }}>
            Pakka
          </span>
          <span style={{ fontSize: '28px', fontWeight: '850', color: '#2563eb', letterSpacing: '-0.8px' }}>
            Scan
          </span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>
          Evidence-Linked Verification &middot; Verify before you trust.
        </div>
      </div>
    </div>
  );
}