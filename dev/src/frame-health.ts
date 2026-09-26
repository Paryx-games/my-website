const DEFAULT_REFRESH_FPS = 60;
const DOWNGRADE_WINDOW_MS = 2_500;
const UPGRADE_WINDOW_MS = 16_000;
const DOWNGRADE_RATIO = 0.78;
const UPGRADE_RATIO = 0.94;
const INACTIVE_GAP_MS = 300;

export interface FrameHealthSample {
  readonly nowMs: number;
  readonly active: boolean;
  readonly rendered: boolean;
  readonly targetFps: number;
}

export interface FrameHealthStatus {
  readonly observedFps?: number;
  readonly targetFps: number;
  readonly downgrade: boolean;
  readonly upgrade: boolean;
  readonly activeWindowMs: number;
  readonly healthyWindowMs: number;
}

interface TimedFrame {
  readonly durationMs: number;
  readonly rendered: boolean;
}

export interface FrameHealthMonitor {
  record(sample: FrameHealthSample): FrameHealthStatus;
  reset(): void;
}

export function createFrameHealthMonitor(): FrameHealthMonitor {
  let previousMs: number | undefined;
  let frames: TimedFrame[] = [];
  let durationMs = 0;
  let renderedFrames = 0;
  let healthyWindowMs = 0;

  const resetWindow = () => {
    frames = [];
    durationMs = 0;
    renderedFrames = 0;
    healthyWindowMs = 0;
  };

  const reset = () => {
    previousMs = undefined;
    resetWindow();
  };

  const record = (sample: FrameHealthSample): FrameHealthStatus => {
    const target = Math.max(1, sample.targetFps || DEFAULT_REFRESH_FPS);
    if (!sample.active || !Number.isFinite(sample.nowMs)) {
      previousMs = sample.nowMs;
      resetWindow();
      return status(undefined, target, false, false, 0, 0);
    }

    if (previousMs === undefined) {
      previousMs = sample.nowMs;
      return status(undefined, target, false, false, 0, 0);
    }

    const deltaMs = sample.nowMs - previousMs;
    previousMs = sample.nowMs;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > INACTIVE_GAP_MS) {
      resetWindow();
      return status(undefined, target, false, false, 0, 0);
    }

    const frame = { durationMs: deltaMs, rendered: sample.rendered };
    frames.push(frame);
    durationMs += deltaMs;
    if (sample.rendered) renderedFrames += 1;

    while (frames.length > 1 && durationMs - frames[0]!.durationMs >= DOWNGRADE_WINDOW_MS) {
      const removed = frames.shift()!;
      durationMs -= removed.durationMs;
      if (removed.rendered) renderedFrames -= 1;
    }

    const observed = renderedFrames / (durationMs / 1_000);
    const healthy = durationMs >= DOWNGRADE_WINDOW_MS && observed >= target * UPGRADE_RATIO;
    healthyWindowMs = healthy ? Math.min(UPGRADE_WINDOW_MS, healthyWindowMs + deltaMs) : 0;

    return status(
      observed,
      target,
      durationMs >= DOWNGRADE_WINDOW_MS && observed < target * DOWNGRADE_RATIO,
      healthyWindowMs >= UPGRADE_WINDOW_MS,
      durationMs,
      healthyWindowMs,
    );
  };

  return { record, reset };
}

function status(
  observedFps: number | undefined,
  targetFps: number,
  downgrade: boolean,
  upgrade: boolean,
  activeWindowMs: number,
  healthyWindowMs: number,
): FrameHealthStatus {
  return { observedFps, targetFps, downgrade, upgrade, activeWindowMs, healthyWindowMs };
}

export async function calibrateRefreshRate(sampleCount = 24): Promise<number> {
  if (typeof requestAnimationFrame === 'undefined' || typeof performance === 'undefined') return DEFAULT_REFRESH_FPS;

  const deltas: number[] = [];
  let previous = performance.now();

  await new Promise<void>((resolve) => {
    const sample = (now: number) => {
      const delta = now - previous;
      previous = now;
      if (delta >= 3 && delta <= 60) deltas.push(delta);
      if (deltas.length >= sampleCount) resolve();
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  if (deltas.length < Math.max(8, sampleCount / 2)) return DEFAULT_REFRESH_FPS;
  const sorted = [...deltas].sort((a, b) => a - b);
  const trimmed = sorted.slice(Math.floor(sorted.length * 0.15), Math.ceil(sorted.length * 0.85));
  const median = trimmed[Math.floor(trimmed.length / 2)] ?? 1000 / DEFAULT_REFRESH_FPS;
  const measured = 1_000 / median;
  const common = [24, 30, 40, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240];
  const nearest = common.reduce((best, candidate) =>
    Math.abs(candidate - measured) < Math.abs(best - measured) ? candidate : best,
  common[0]!);
  if (Math.abs(nearest - measured) / nearest <= 0.08) return nearest;
  return Math.max(24, Math.min(240, measured));
}
