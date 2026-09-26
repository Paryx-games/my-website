import { createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRepositoryLanguageCacheTag } from "../../../lib/languages.js";

const MAX_REQUEST_BODY_BYTES = 1_000_000;

export const config = {
  api: {
    bodyParser: false,
  },
};

type GitHubPushPayload = {
  ref?: unknown;
  repository?: {
    default_branch?: unknown;
    full_name?: unknown;
  };
};

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasValidSignature(
  payload: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !/^sha256=[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();
  const providedSignature = Buffer.from(signature.slice("sha256=".length), "hex");

  return timingSafeEqual(expectedSignature, providedSignature);
}

async function readRequestBody(
  req: VercelRequest,
): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  let requestBodyBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    requestBodyBytes += buffer.length;

    if (requestBodyBytes > MAX_REQUEST_BODY_BYTES) {
      return undefined;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!webhookSecret || !vercelToken || !vercelProjectId || !vercelTeamId) {
    return res.status(500).json({ error: "Webhook is not configured" });
  }

  const requestBody = await readRequestBody(req);

  if (!requestBody) {
    return res.status(413).json({ error: "Webhook payload is too large" });
  }

  const signature = getHeaderValue(req.headers["x-hub-signature-256"]);

  if (!hasValidSignature(requestBody, signature, webhookSecret)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const event = getHeaderValue(req.headers["x-github-event"]);

  if (event === "ping") {
    return res.status(204).end();
  }

  if (event !== "push") {
    return res.status(202).json({ message: "Event ignored" });
  }

  let payload: GitHubPushPayload;

  try {
    payload = JSON.parse(requestBody.toString("utf8")) as GitHubPushPayload;
  } catch {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  const repository = payload.repository?.full_name;

  if (
    typeof repository !== "string" ||
    !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)
  ) {
    return res.status(400).json({ error: "Invalid repository name" });
  }

  const defaultBranch = payload.repository?.default_branch;

  if (
    typeof payload.ref === "string" &&
    typeof defaultBranch === "string" &&
    payload.ref !== `refs/heads/${defaultBranch}`
  ) {
    return res.status(204).end();
  }

  const cacheTag = getRepositoryLanguageCacheTag(repository);
  const cacheUrl = new URL(
    "https://api.vercel.com/v1/edge-cache/dangerously-delete-by-tags",
  );
  cacheUrl.searchParams.set("projectIdOrName", vercelProjectId);
  cacheUrl.searchParams.set("teamId", vercelTeamId);

  try {
    const response = await fetch(cacheUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tags: [cacheTag],
        target: "production",
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Failed to invalidate language cache" });
    }

    return res.status(204).end();
  } catch {
    return res.status(502).json({ error: "Failed to invalidate language cache" });
  }
}
