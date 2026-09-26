import { effect, type Frame, type Gpu, type Surface, type Target } from 'vgpu';

import fieldWgsl from './shaders/field.wgsl';
import { QUALITY_PRESETS, type QualityTier } from './quality';

type Output = Surface | Target;

const CLEAR = [0, 0, 0, 1] as const;

export interface Scene {
  readonly tier: QualityTier;
  prepare(): Promise<void>;
  resize(size: readonly [number, number], galaxyExtent: number, galaxyAspect: number): void;
  render(currentFrame: Frame, time: number, pointer: readonly [number, number], pointerMomentum: number): void;
  destroy(): void;
}

export function createScene(gpu: Gpu, output: Output, tier: QualityTier): Scene {
  const settings = QUALITY_PRESETS[tier];
  const [width, height] = output.size;
  const field = effect(gpu, fieldWgsl, {
    label: `paryx-galaxy-field-${tier}`,
    set: {
      params: {
        time: 0,
        aspect: width / Math.max(1, height),
        galaxyExtent: 1,
        pageAspect: width / Math.max(1, height),
        steps: settings.steps,
        octaves: settings.octaves,
        tonemap: 1,
        pointer: [0.5, 0.5],
        pointerMomentum: 0,
      },
    },
  });

  return {
    tier,
    prepare: () => field.compile({ colors: [output.format] }).then(() => undefined),
    resize: (size, galaxyExtent, galaxyAspect) => {
      field.set({ params: { galaxyExtent, aspect: galaxyAspect, pageAspect: size[0] / Math.max(1, size[1]) } });
    },
    render: (currentFrame, time, pointer, pointerMomentum) => {
      field.set({ params: { time, pointer, pointerMomentum } });
      currentFrame.pass({ target: output, clear: CLEAR }, field);
    },
    destroy() {},
  };
}
