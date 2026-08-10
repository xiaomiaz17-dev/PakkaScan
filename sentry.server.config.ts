import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    if (event.request?.data) {
      const dataStr = typeof event.request.data === "string" ? event.request.data : JSON.stringify(event.request.data);
      const redacted = dataStr.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC_REDACTED]");
      event.request.data = redacted;
    }
    if (event.message) {
      event.message = event.message.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC_REDACTED]");
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.message) b.message = b.message.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC_REDACTED]");
        return b;
      });
    }
    return event;
  },
});
