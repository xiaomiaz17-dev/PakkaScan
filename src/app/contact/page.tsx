import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Contact",
  description: "Reach support, sales, and partnerships.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Contact</h1>
        <p className="muted">Reach support, sales, and partnerships.</p>
        
        <form className="stack" action="/api/contact" method="post" style={{ maxWidth: 480 }}>
          <label htmlFor="name">Name<input id="name" name="name" required /></label>
          <label htmlFor="email">Email<input id="email" name="email" type="email" required /></label>
          <label htmlFor="message">Message<textarea id="message" name="message" required /></label>
          <button className="primary" type="submit">Send message</button>
        </form>
        <p className="muted">Or email support@pakkadeed.com</p>

      </div>
    </MarketingShell>
  );
}
