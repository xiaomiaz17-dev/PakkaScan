import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
  beforeSend(event) {
    if (event.request?.data) {
      const dataStr = typeof event.request.data === "string" ? event.request.data : JSON.stringify(event.request.data);
      const redacted = dataStr.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC_REDACTED]");
      event.request.data = redacted;
    }
    if (event.message) {
      event.message = event.message.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC_REDACTED]");
    }
    return event;
  },
});
