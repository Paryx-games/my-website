export const QUALITY_TIERS = ['battery', 'low', 'balanced', 'high', 'ultra'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export const QUALITY_PREFERENCES = ['auto', 'ultra', 'high', 'balanced', 'low', 'battery'] as const;
export type QualityPreference = (typeof QUALITY_PREFERENCES)[number];

export type QualityReason =
  | 'initial'
  | 'forced'
  | 'gpu-tier'
  | 'gpu-blocklist'
  | 'mobile'
  | 'memory'
  | 'cpu'
  | 'save-data'
  | 'network'
  | 'battery'
  | 'frame-health'
  | 'recovery';

export interface QualityState {
  readonly preference: QualityPreference;
  readonly effective: QualityTier;
  readonly ceiling: QualityTier;
  readonly reason: QualityReason;
}

export interface QualityPreset {
  readonly dprCap: number;
  readonly pixelBudget: number;
  readonly targetFps: number;
  readonly steps: number;
  readonly octaves: number;
  readonly bloom: boolean;
  readonly bloomScale: number;
}

export const QUALITY_PRESETS: Readonly<Record<QualityTier, QualityPreset>> = {
  ultra: {
    dprCap: 1.6,
    pixelBudget: 6_000_000,
    targetFps: 90,
    steps: 48,
    octaves: 4,
    bloom: false,
    bloomScale: 0.5,
  },
  high: {
    dprCap: 1.35,
    pixelBudget: 4_200_000,
    targetFps: 60,
    steps: 38,
    octaves: 4,
    bloom: false,
    bloomScale: 0.42,
  },
  balanced: {
    dprCap: 1.1,
    pixelBudget: 2_800_000,
    targetFps: 60,
    steps: 28,
    octaves: 3,
    bloom: false,
    bloomScale: 0.35,
  },
  low: {
    dprCap: 0.9,
    pixelBudget: 1_800_000,
    targetFps: 45,
    steps: 18,
    octaves: 2,
    bloom: false,
    bloomScale: 0.3,
  },
  battery: {
    dprCap: 0.72,
    pixelBudget: 1_000_000,
    targetFps: 30,
    steps: 12,
    octaves: 1,
    bloom: false,
    bloomScale: 0.25,
  },
};

export const DEFAULT_QUALITY_PREFERENCE: QualityPreference = 'auto';

export function isQualityPreference(value: unknown): value is QualityPreference {
  return typeof value === 'string' && QUALITY_PREFERENCES.includes(value as QualityPreference);
}

export function tierIndex(tier: QualityTier): number {
  return QUALITY_TIERS.indexOf(tier);
}

export function lowerTier(tier: QualityTier): QualityTier {
  return QUALITY_TIERS[Math.max(0, tierIndex(tier) - 1)]!;
}

export function higherTier(tier: QualityTier): QualityTier {
  return QUALITY_TIERS[Math.min(QUALITY_TIERS.length - 1, tierIndex(tier) + 1)]!;
}

export function minTier(a: QualityTier, b: QualityTier): QualityTier {
  return tierIndex(a) <= tierIndex(b) ? a : b;
}

export function tierAtMost(tier: QualityTier, ceiling: QualityTier): QualityTier {
  return minTier(tier, ceiling);
}

export function qualityDpr(
  tier: QualityTier,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): number {
  const preset = QUALITY_PRESETS[tier];
  const area = Math.max(1, cssWidth * cssHeight);
  const budgetDpr = Math.sqrt(preset.pixelBudget / area);
  const deviceDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(deviceDpr, preset.dprCap, budgetDpr);
}

export function targetFpsFor(tier: QualityTier, refreshFps: number, reducedMotion: boolean): number {
  if (reducedMotion) return Math.min(15, refreshFps);
  return Math.max(1, Math.min(QUALITY_PRESETS[tier].targetFps, refreshFps));
}
