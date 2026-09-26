import {
  DEFAULT_QUALITY_PREFERENCE,
  higherTier,
  lowerTier,
  tierAtMost,
  tierIndex,
  type QualityPreference,
  type QualityReason,
  type QualityState,
  type QualityTier,
} from './quality';

export interface QualityController {
  readonly state: QualityState;
  setPreference(preference: QualityPreference): void;
  setCeiling(ceiling: QualityTier, reason: QualityReason): void;
  downgrade(reason?: QualityReason): void;
  upgrade(): void;
  subscribe(listener: (state: QualityState) => void): () => void;
  destroy(): void;
}

export function createQualityController(options: {
  initialPreference?: QualityPreference;
  initialCeiling?: QualityTier;
} = {}): QualityController {
  let disposed = false;
  let preference = options.initialPreference ?? DEFAULT_QUALITY_PREFERENCE;
  let ceiling = options.initialCeiling ?? 'high';
  let effective: QualityTier = preference === 'auto' ? ceiling : preference;
  let reason: QualityReason = preference === 'auto' ? 'initial' : 'forced';
  let runtimeLimited = false;
  const listeners = new Set<(state: QualityState) => void>();

  const snapshot = (): QualityState => ({ preference, effective, ceiling, reason });
  const emit = () => {
    const state = snapshot();
    for (const listener of listeners) listener(state);
  };

  return {
    get state() {
      return snapshot();
    },
    setPreference(next) {
      if (disposed || preference === next) return;
      preference = next;
      runtimeLimited = false;
      if (next === 'auto') {
        effective = ceiling;
        reason = 'initial';
      } else {
        effective = next;
        reason = 'forced';
      }
      emit();
    },
    setCeiling(next, nextReason) {
      if (disposed) return;
      const changed = next !== ceiling;
      ceiling = next;
      if (preference !== 'auto') {
        if (changed) emit();
        return;
      }

      const capped = tierAtMost(effective, ceiling);
      if (tierIndex(capped) < tierIndex(effective)) {
        effective = capped;
        reason = nextReason;
        runtimeLimited = false;
        emit();
        return;
      }

      if (!runtimeLimited && tierIndex(effective) < tierIndex(ceiling)) {
        effective = ceiling;
        reason = nextReason;
        emit();
        return;
      }

      if (changed) emit();
    },
    downgrade(nextReason = 'frame-health') {
      if (disposed || preference !== 'auto' || effective === 'battery') return;
      effective = lowerTier(effective);
      reason = nextReason;
      runtimeLimited = true;
      emit();
    },
    upgrade() {
      if (disposed || preference !== 'auto' || tierIndex(effective) >= tierIndex(ceiling)) return;
      effective = tierAtMost(higherTier(effective), ceiling);
      reason = 'recovery';
      runtimeLimited = effective !== ceiling;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      disposed = true;
      listeners.clear();
    },
  };
}
