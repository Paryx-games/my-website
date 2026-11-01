import { release as osRelease } from "node:os";
import * as Sentry from "@sentry/node";
import type { ErrorEvent, Exception } from "@sentry/node";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

export function sanitizeApiEvent(event: ErrorEvent): ErrorEvent {
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
      os: { name: process.platform, version: osRelease() },
      runtime: { name: "node", version: process.version },
    },
    environment: event.environment,
    release: event.release,
    tags: {
      application: "api",
      ...(event.tags?.route ? { route: event.tags.route } : {}),
    },
    sdk: event.sdk
      ? { name: event.sdk.name, version: event.sdk.version }
      : undefined,
  };
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    defaultIntegrations: false,
    beforeSend: sanitizeApiEvent,
  });
}

export async function captureApiException(
  error: unknown,
  route: string,
): Promise<void> {
  Sentry.withScope((scope) => {
    scope.setTag("application", "api");
    scope.setTag("route", route);
    Sentry.captureException(error);
  });
  await Sentry.flush(2000);
}

type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => VercelResponse | void | Promise<VercelResponse | void>;

export function withSentry(handler: ApiHandler, route: string): ApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      await captureApiException(error, route);
      throw error;
    }
  };
}
