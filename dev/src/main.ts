import { createRenderer, type Renderer } from './renderer';
import { DEFAULT_QUALITY_PREFERENCE, isQualityPreference, type QualityPreference, type QualityState } from './quality';

const STORAGE_KEY = 'paryx.galaxy.quality';
const QUALITY_MODES: readonly QualityPreference[] = ['ultra', 'high', 'battery'];
const canvas = document.getElementById('galaxyCanvas') as HTMLCanvasElement | null;
const backdrop = document.getElementById('galaxyBackdrop') as HTMLElement | null;
const hero = document.querySelector('.hero') as HTMLElement | null;

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
  }).catch((error) => {
    console.error('[galaxy-hero] failed to initialize', error);
    document.body.classList.add('galaxy-fallback');
  });

  window.addEventListener('pagehide', () => {
    unsubscribe();
    renderer?.dispose();
  }, { once: true });
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
