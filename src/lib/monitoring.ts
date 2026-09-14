import * as Sentry from "@sentry/react";

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    // No session recordings or request bodies; source projects contain secrets.
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      return event;
    },
  });
}

export function reportError(error: Error, operation?: string) {
  if (import.meta.env.VITE_SENTRY_DSN) Sentry.captureException(error, { tags: { operation: operation ?? "render" } });
}
