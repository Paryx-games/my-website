import { inject } from '@vercel/analytics';
import { createRenderer, type Renderer } from './renderer';
import { DEFAULT_QUALITY_PREFERENCE, isQualityPreference, type QualityPreference, type QualityState } from './quality';

inject();

const STORAGE_KEY = 'paryx.galaxy.quality';
const QUALITY_MODES: readonly QualityPreference[] = ['ultra', 'high', 'battery'];
const canvas = document.getElementById('galaxyCanvas') as HTMLCanvasElement | null;
const backdrop = document.getElementById('galaxyBackdrop') as HTMLElement | null;
const hero = document.querySelector('.hero') as HTMLElement | null;
const siteTitle = document.getElementById('siteTitleCopy') as HTMLButtonElement | null;
const siteTitleAcrylic = document.getElementById('siteTitleAcrylic') as HTMLCanvasElement | null;

declare global {
  interface Window {
    galaxyQuality: {
      get(): QualityState | null;
      set(preference: QualityPreference): QualityState | null;
      toggle(): QualityState | null;
    };
  }
}

if (!canvas || !backdrop || !hero) {
  throw new Error('Galaxy background markup is missing.');
}

let renderer: Renderer | undefined;
let stopAcrylicTitle: (() => void) | undefined;
const saved = readPreference();
let currentState: QualityState | null = {
  preference: saved,
  effective: saved === 'auto' ? 'high' : saved,
  ceiling: 'high',
  reason: saved === 'auto' ? 'initial' : 'forced',
};

window.galaxyQuality = {
  get: () => currentState,
  set(preference) {
    if (!isQualityPreference(preference)) throw new TypeError(`Invalid galaxy quality preference: ${preference}`);
    savePreference(preference);
    renderer?.setPreference(preference);
    if (!renderer) currentState = {
      preference,
      effective: preference === 'auto' ? 'high' : preference,
      ceiling: 'high',
      reason: preference === 'auto' ? 'initial' : 'forced',
    };
    return currentState;
  },
  toggle() {
    const current = currentState?.preference;
    const index = current ? QUALITY_MODES.indexOf(current) : -1;
    return window.galaxyQuality.set(QUALITY_MODES[(index + 1) % QUALITY_MODES.length]!);
  },
};

if (!('gpu' in navigator)) {
  document.body.classList.add('galaxy-fallback');
} else {
  renderer = createRenderer({
    canvas,
    activityElement: backdrop,
    galaxyElement: hero,
    initialPreference: saved,
    onError(error) {
      console.error('[galaxy-hero]', error);
    },
  });

  const unsubscribe = renderer.subscribe((state) => {
    currentState = state;
  });

  renderer.ready.then(() => {
    canvas.classList.add('is-ready');
    if (siteTitle && siteTitleAcrylic) {
      stopAcrylicTitle = startAcrylicTitle(canvas, siteTitleAcrylic, siteTitle);
    }
  }).catch((error) => {
    console.error('[galaxy-hero] failed to initialize', error);
    document.body.classList.add('galaxy-fallback');
  });

  window.addEventListener('pagehide', () => {
    unsubscribe();
    stopAcrylicTitle?.();
    renderer?.dispose();
  }, { once: true });
}

function startAcrylicTitle(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  button: HTMLButtonElement,
): () => void {
  const context = target.getContext('2d');
  if (!context) return () => {};

  const staging = document.createElement('canvas');
  const stagingContext = staging.getContext('2d', { willReadFrequently: false });
  if (!stagingContext) return () => {};

  const label = 'paryx.uk';
  const padding = 8;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animationFrame = 0;
  let lastPaintAt = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;

  const resize = () => {
    const bounds = button.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = Math.ceil(bounds.width + padding * 2);
    cssHeight = Math.ceil(bounds.height + padding * 2);

    target.style.left = `-${padding}px`;
    target.style.top = `-${padding}px`;
    target.style.width = `${cssWidth}px`;
    target.style.height = `${cssHeight}px`;

    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    target.width = width;
    target.height = height;
    staging.width = width;
    staging.height = height;
  };

  const composeFrame = (): boolean => {
    if (!source.width || !source.height || !cssWidth || !cssHeight) return false;

    const sourceBounds = source.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    if (sourceBounds.width <= 0 || sourceBounds.height <= 0) return false;

    const sourceScaleX = source.width / sourceBounds.width;
    const sourceScaleY = source.height / sourceBounds.height;
    const sampleLeft = buttonBounds.left - padding - sourceBounds.left;
    const sampleTop = buttonBounds.top - padding - sourceBounds.top;
    const style = getComputedStyle(button);
    const fontSize = Number.parseFloat(style.fontSize) || 21.6;

    stagingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    stagingContext.clearRect(0, 0, cssWidth, cssHeight);
    stagingContext.save();
    stagingContext.filter = 'blur(4px) saturate(1.25)';
    stagingContext.globalAlpha = 0.62;

    try {
      stagingContext.drawImage(
        source,
        sampleLeft * sourceScaleX,
        sampleTop * sourceScaleY,
        cssWidth * sourceScaleX,
        cssHeight * sourceScaleY,
        0,
        0,
        cssWidth,
        cssHeight,
      );
    } catch {
      stagingContext.restore();
      return false;
    }

    stagingContext.restore();

    stagingContext.globalCompositeOperation = 'destination-in';
    stagingContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    stagingContext.textBaseline = 'alphabetic';

    const metrics = stagingContext.measureText(label);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const baseline = padding + (buttonBounds.height - ascent - descent) / 2 + ascent;

    stagingContext.fillStyle = '#000';
    stagingContext.fillText(label, padding, baseline);

    stagingContext.globalCompositeOperation = 'source-over';
    stagingContext.fillStyle = 'rgba(255, 255, 255, 0.62)';
    stagingContext.fillText(label, padding, baseline);
    stagingContext.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    stagingContext.lineWidth = 0.6;
    stagingContext.strokeText(label, padding, baseline);
    stagingContext.globalCompositeOperation = 'source-over';

    return true;
  };

  const paint = () => {
    if (!composeFrame()) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(staging, 0, 0);
    button.classList.add('is-acrylic-ready');
  };

  const tick = (now: number) => {
    const interval = reducedMotion.matches ? 300 : 100;
    if (document.visibilityState === 'visible' && now - lastPaintAt >= interval) {
      paint();
      lastPaintAt = now;
    }
    animationFrame = requestAnimationFrame(tick);
  };

  const onResize = () => {
    resize();
    paint();
  };

  resize();
  void document.fonts.ready.then(onResize);
  window.addEventListener('resize', onResize, { passive: true });
  animationFrame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', onResize);
  };
}

function readPreference(): QualityPreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isQualityPreference(value) ? value : DEFAULT_QUALITY_PREFERENCE;
  } catch {
    return DEFAULT_QUALITY_PREFERENCE;
  }
}

function savePreference(preference: QualityPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
  }
}
