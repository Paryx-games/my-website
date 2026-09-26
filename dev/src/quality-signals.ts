import type { TierResult } from '@pmndrs/detect-gpu';

import { minTier, type QualityReason, type QualityTier } from './quality';

interface BatteryManagerLike extends EventTarget {
  readonly charging: boolean;
  readonly level: number;
}

interface NavigatorWithSignals extends Navigator {
  readonly deviceMemory?: number;
  readonly userAgentData?: { readonly mobile?: boolean };
  readonly connection?: EventTarget & {
    readonly saveData?: boolean;
    readonly effectiveType?: string;
  };
  getBattery?(): Promise<BatteryManagerLike>;
}

export interface QualitySignalDecision {
  readonly ceiling: QualityTier;
  readonly reason: QualityReason;
}

export interface QualitySignals {
  dispose(): void;
}

export interface QualitySignalsOptions {
  onCeiling(decision: QualitySignalDecision): void;
  readonly benchmarksUrl?: string;
  readonly logger?: Pick<Console, 'info'>;
}

export function initialQualityCeiling(nav: NavigatorWithSignals | undefined = browserNavigator()): QualitySignalDecision {
  return computeDecision(nav, undefined, undefined);
}

export function createQualitySignals(options: QualitySignalsOptions): QualitySignals {
  let disposed = false;
  let battery: BatteryManagerLike | undefined;
  let gpuResult: TierResult | undefined;
  const nav = browserNavigator();
  const logger = options.logger ?? console;

  const recompute = () => {
    if (disposed) return;
    const decision = computeDecision(nav, battery, gpuResult);
    logger.info('[hero-quality] device decision', {
      ceiling: decision.ceiling,
      reason: decision.reason,
      gpu: gpuResult?.gpu,
      gpuTier: gpuResult?.tier,
      gpuType: gpuResult?.type,
      mobile: gpuResult?.isMobile ?? nav?.userAgentData?.mobile,
      memory: nav?.deviceMemory,
      hardwareConcurrency: nav?.hardwareConcurrency,
      battery: battery ? { charging: battery.charging, level: battery.level } : undefined,
      saveData: nav?.connection?.saveData,
      effectiveType: nav?.connection?.effectiveType,
    });
    options.onCeiling(decision);
  };

  const onBattery = () => recompute();
  const onConnection = () => recompute();
  nav?.connection?.addEventListener?.('change', onConnection);

  if (nav?.getBattery) {
    void nav.getBattery().then((manager) => {
      if (disposed) return;
      battery = manager;
      manager.addEventListener('levelchange', onBattery);
      manager.addEventListener('chargingchange', onBattery);
      recompute();
    }).catch((error: unknown) => {
      if (!disposed) logger.info('[hero-quality] battery signal unavailable', { error: errorMessage(error) });
    });
  }

  void import('@pmndrs/detect-gpu').then(({ getGPUTier }) =>
    getGPUTier(options.benchmarksUrl ? { benchmarksURL: options.benchmarksUrl } : {}),
  ).then((result) => {
    if (disposed) return;
    gpuResult = result;
    recompute();
  }).catch((error: unknown) => {
    if (!disposed) logger.info('[hero-quality] GPU benchmark unavailable', { error: errorMessage(error) });
  });

  recompute();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      nav?.connection?.removeEventListener?.('change', onConnection);
      battery?.removeEventListener('levelchange', onBattery);
      battery?.removeEventListener('chargingchange', onBattery);
      battery = undefined;
    },
  };
}

function computeDecision(
  nav: NavigatorWithSignals | undefined,
  battery: BatteryManagerLike | undefined,
  gpuResult: TierResult | undefined,
): QualitySignalDecision {
  let decision: QualitySignalDecision = { ceiling: 'high', reason: 'initial' };

  const limit = (ceiling: QualityTier, reason: QualityReason) => {
    const next = minTier(decision.ceiling, ceiling);
    if (next !== decision.ceiling) decision = { ceiling: next, reason };
  };

  if (gpuResult) {
    if (gpuResult.type === 'BLOCKLISTED') {
      limit('battery', 'gpu-blocklist');
    } else if (gpuResult.isMobile) {
      limit('balanced', 'mobile');
    }

    if (gpuResult.tier <= 0) limit('battery', 'gpu-tier');
    else if (gpuResult.tier === 1) limit('low', 'gpu-tier');
    else if (gpuResult.tier === 2) limit('balanced', 'gpu-tier');
    else if (!gpuResult.isMobile) decision = { ceiling: 'ultra', reason: 'gpu-tier' };
  } else if (nav?.userAgentData?.mobile === true) {
    limit('balanced', 'mobile');
  }

  const memory = nav?.deviceMemory;
  if (Number.isFinite(memory)) {
    if ((memory ?? 8) <= 2) limit('battery', 'memory');
    else if ((memory ?? 8) <= 4) limit('low', 'memory');
    else if ((memory ?? 8) <= 6) limit('balanced', 'memory');
  }

  const cores = nav?.hardwareConcurrency;
  if (Number.isFinite(cores)) {
    if ((cores ?? 8) <= 2) limit('battery', 'cpu');
    else if ((cores ?? 8) <= 4) limit('low', 'cpu');
    else if ((cores ?? 8) <= 6) limit('balanced', 'cpu');
  }

  if (nav?.connection?.saveData) limit('battery', 'save-data');
  const effectiveType = nav?.connection?.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') limit('battery', 'network');
  else if (effectiveType === '3g') limit('low', 'network');

  if (battery && !battery.charging && Number.isFinite(battery.level)) {
    if (battery.level <= 0.2) limit('battery', 'battery');
    else if (battery.level <= 0.35) limit('low', 'battery');
  }

  return decision;
}

function browserNavigator(): NavigatorWithSignals | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator as NavigatorWithSignals;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
