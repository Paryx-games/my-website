import { clock, frameLoop, init, surface, type Frame, type FrameLoopHandle, type Gpu, type Surface } from 'vgpu';

import { calibrateRefreshRate, createFrameHealthMonitor } from './frame-health';
import { createQualityController } from './quality-controller';
import {
  DEFAULT_QUALITY_PREFERENCE,
  qualityDpr,
  targetFpsFor,
  type QualityPreference,
  type QualityState,
  type QualityTier,
} from './quality';
import { createQualitySignals, initialQualityCeiling, type QualitySignals } from './quality-signals';
import { createScene, type Scene } from './scene';

export interface RendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly activityElement: HTMLElement;
  readonly galaxyElement: HTMLElement;
  readonly initialPreference?: QualityPreference;
  readonly benchmarksUrl?: string;
  readonly onError?: (error: unknown) => void;
}

export interface Renderer {
  readonly ready: Promise<void>;
  getState(): QualityState;
  subscribe(listener: (state: QualityState) => void): () => void;
  setPreference(preference: QualityPreference): void;
  dispose(): void;
}

export function createRenderer(options: RendererOptions): Renderer {
  const { canvas, activityElement, galaxyElement } = options;
  const initialDecision = initialQualityCeiling();
  const controller = createQualityController({
    initialPreference: options.initialPreference ?? DEFAULT_QUALITY_PREFERENCE,
    initialCeiling: initialDecision.ceiling,
  });
  const listeners = new Set<(state: QualityState) => void>();
  const health = createFrameHealthMonitor();

  let disposed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let activeScene: Scene | undefined;
  let activeTier: QualityTier | undefined;
  let loop: FrameLoopHandle | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let signals: QualitySignals | undefined;
  let switchGeneration = 0;
  let switching = false;
  let visible = true;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let refreshFps = 60;
  let lastRenderedAt = 0;
  let firstFramePresented = false;
  let signalsStarted = false;
  let resizeFrame = 0;
  let lastDpr = window.devicePixelRatio || 1;
  let pointer: readonly [number, number] = [0.5, 0.5];
  let pointerMomentum = 0;
  let pointerSpeed = 0;
  let lastPointerMoveAt = 0;
  let lastPointerFrameAt = 0;
  let hasPointerPosition = false;

  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

  const report = (error: unknown) => {
    if (disposed) return;
    if (options.onError) options.onError(error);
    else console.error(error);
  };

  const publish = (state: QualityState) => {
    for (const listener of listeners) listener(state);
  };

  const layout = (tier: QualityTier) => {
    const bounds = canvas.getBoundingClientRect();
    const galaxyBounds = galaxyElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || galaxyBounds.height <= 0) return undefined;

    const dpr = qualityDpr(tier, bounds.width, bounds.height, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    const galaxyExtent = Math.min(1, Math.max(0.02, galaxyBounds.height / bounds.height));
    const galaxyPhysicalHeight = Math.max(1, height * galaxyExtent);

    return {
      size: [width, height] as const,
      galaxyExtent,
      galaxyAspect: width / galaxyPhysicalHeight,
    };
  };

  const resizeNow = () => {
    resizeFrame = 0;
    if (disposed || !output || !activeScene || !activeTier) return;
    const next = layout(activeTier);
    if (!next) return;
    output.resize(next.size);
    activeScene.resize(output.size, next.galaxyExtent, next.galaxyAspect);
    health.reset();
  };

  const scheduleResize = () => {
    if (disposed || resizeFrame) return;
    resizeFrame = requestAnimationFrame(resizeNow);
  };

  const switchScene = async (tier: QualityTier): Promise<void> => {
    if (disposed || !gpu || !output) return;
    if (activeTier === tier && activeScene) return;

    const generation = ++switchGeneration;
    switching = true;
    const candidate = createScene(gpu, output, tier);

    try {
      await candidate.prepare();
      if (disposed || generation !== switchGeneration) {
        candidate.destroy();
        return;
      }

      const next = layout(tier);
      if (next) {
        output.resize(next.size);
        candidate.resize(output.size, next.galaxyExtent, next.galaxyAspect);
      }

      const previous = activeScene;
      activeScene = candidate;
      activeTier = tier;
      lastRenderedAt = 0;
      health.reset();
      previous?.destroy();
    } catch (error) {
      candidate.destroy();
      report(error);
      if (!activeScene) throw error;
    } finally {
      if (generation === switchGeneration) switching = false;
    }
  };

  const onControllerState = (state: QualityState) => {
    publish(state);
    if (gpu && output && state.effective !== activeTier) {
      void switchScene(state.effective).catch(report);
    }
  };
  const unsubscribeController = controller.subscribe(onControllerState);

  const startSignals = () => {
    if (signalsStarted || disposed) return;
    signalsStarted = true;
    signals = createQualitySignals({
      benchmarksUrl: options.benchmarksUrl,
      onCeiling(decision) {
        controller.setCeiling(decision.ceiling, decision.reason);
      },
    });
  };

  const onVisibilityChange = () => {
    health.reset();
    lastRenderedAt = 0;
  };

  const onReducedMotion = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    health.reset();
    lastRenderedAt = 0;
  };

  const onWindowResize = () => {
    const next = window.devicePixelRatio || 1;
    if (next !== lastDpr) lastDpr = next;
    scheduleResize();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const nextPointer: readonly [number, number] = [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    ];
    const vx = nextPointer[0] - pointer[0];
    const vy = nextPointer[1] - pointer[1];
    const speed = hasPointerPosition ? Math.hypot(vx, vy) : 0;
    pointer = nextPointer;
    pointerSpeed = Math.min(1, speed * 12);
    hasPointerPosition = true;
    lastPointerMoveAt = performance.now();
  };

  const initialize = async () => {
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }
    gpu = nextGpu;
    output = surface(gpu, canvas, { autoResize: false, dpr: 1, alphaMode: 'opaque', clearColor: [0, 0, 0, 1] });

    await switchScene(controller.state.effective);
    if (disposed || !activeScene) return;

    resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(canvas);
    resizeObserver.observe(document.body);
    resizeObserver.observe(galaxyElement);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (!visible) {
          health.reset();
          lastRenderedAt = 0;
        }
      }, { threshold: 0.01 });
      intersectionObserver.observe(activityElement);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    reduceQuery.addEventListener('change', onReducedMotion);

    const time = clock(gpu);
    loop = frameLoop(gpu, (currentFrame: Frame) => {
      if (disposed || !activeScene || !activeTier) return;

      const now = performance.now();
      const active = visible && document.visibilityState === 'visible' && !switching;
      const targetFps = targetFpsFor(activeTier, refreshFps, reducedMotion);
      const interval = 1_000 / Math.max(1, targetFps);
      const shouldRender = active && (lastRenderedAt === 0 || now - lastRenderedAt >= interval - 0.5);

      if (shouldRender) {
        const elapsedSincePointerMove = now - lastPointerMoveAt;
        const deltaSeconds = lastPointerFrameAt === 0 ? 1 / 60 : Math.min(0.1, (now - lastPointerFrameAt) / 1_000);
        const momentumTarget = lastPointerMoveAt === 0
          ? 0
          : pointerSpeed * Math.exp(-elapsedSincePointerMove / 850);
        const smoothingTime = momentumTarget > pointerMomentum ? 0.07 : 0.9;
        pointerMomentum += (momentumTarget - pointerMomentum) * (1 - Math.exp(-deltaSeconds / smoothingTime));
        lastPointerFrameAt = now;
        activeScene.render(currentFrame, time.time, pointer, pointerMomentum);
        lastRenderedAt = now;

        if (!firstFramePresented) {
          firstFramePresented = true;
          setTimeout(startSignals, 0);
          void calibrateRefreshRate().then((measured) => {
            if (disposed) return;
            refreshFps = measured;
            health.reset();
          }).catch(report);
        }
      }

      const status = health.record({
        nowMs: now,
        active,
        rendered: shouldRender,
        targetFps,
      });

      if (controller.state.preference === 'auto' && !switching) {
        if (status.downgrade) controller.downgrade('frame-health');
        else if (status.upgrade) controller.upgrade();
      }
    });
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++switchGeneration;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('pointermove', onPointerMove);
    reduceQuery.removeEventListener('change', onReducedMotion);
    signals?.dispose();
    loop?.stop();
    activeScene?.destroy();
    controller.destroy();
    unsubscribeController();
    gpu?.dispose();
    listeners.clear();
  };

  const ready = initialize().catch((error: unknown) => {
    if (!disposed) dispose();
    throw error;
  });

  return {
    ready,
    getState: () => controller.state,
    subscribe(listener) {
      listeners.add(listener);
      listener(controller.state);
      return () => listeners.delete(listener);
    },
    setPreference(preference) {
      controller.setPreference(preference);
    },
    dispose,
  };
}
