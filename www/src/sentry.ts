import * as Sentry from "@sentry/browser";
import type { ErrorEvent, Exception } from "@sentry/browser";

function redact(value: string | undefined): string | undefined {
  return value
    ?.replace(/\bbearer\s+[a-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(
      /\b(password|passwd|secret|token|api[_-]?key|authorization|cookie)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[redacted]",
    )
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]");
}

function safeException(exception: Exception) {
  return {
    type: redact(exception.type),
    value: redact(exception.value),
    stacktrace: exception.stacktrace
      ? {
          frames: exception.stacktrace.frames?.map((frame) => ({
            filename: redact(frame.filename?.replace(/[?#].*$/, "")),
            function: redact(frame.function),
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        }
      : undefined,
  };
}

export function sanitizeBrowserEvent(
  event: ErrorEvent,
  pathname: string,
  userAgent: string,
  platform: string,
): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    message: redact(event.message),
    exception: event.exception
      ? { values: event.exception.values?.map(safeException) }
      : undefined,
    contexts: {
      browser: { user_agent: userAgent },
      os: { platform },
    },
    request: { url: pathname },
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: event.release,
    tags: { application: "www" },
    sdk: event.sdk
      ? { name: event.sdk.name, version: event.sdk.version }
      : undefined,
  };
}

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration()],
    beforeSend: (event) =>
      sanitizeBrowserEvent(
        event,
        window.location.pathname,
        window.navigator.userAgent,
        window.navigator.platform,
      ),
  });
}
