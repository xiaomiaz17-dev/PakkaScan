export function SiteHeader({ ctaHref = "/register", ctaLabel = "Upload or scan" }: { ctaHref?: string; ctaLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '24px 0' }}>
      <div className="site-header-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center' }}>
        <Link href="/" className="brand" aria-label={`${SITE.name} home`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
          <BrandMark size={32} />
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
          style={{ marginTop: '12px' }}
        >
          Menu
        </button>
        <nav id="primary-nav" className={`nav ${open ? "open" : ""}`} aria-label="Primary" style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link className="button power" href={ctaHref} onClick={() => setOpen(false)}>
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}