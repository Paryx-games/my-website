struct Params {
  time: f32,
  aspect: f32,
  galaxyExtent: f32,
  pageAspect: f32,
  steps: u32,
  octaves: u32,
  tonemap: u32,
  pointer: vec2f,
  pointerMomentum: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

fn hash(p: vec3f) -> f32 {
  let q = fract(p * vec3f(0.1031, 0.1030, 0.0973));
  let r = q + dot(q, q.yxz + 33.33);
  return fract((r.x + r.y) * r.z);
}

fn noise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = mix(hash(i), hash(i + vec3f(1.0, 0.0, 0.0)), u.x);
  let b = mix(hash(i + vec3f(0.0, 1.0, 0.0)), hash(i + vec3f(1.0, 1.0, 0.0)), u.x);
  let c = mix(hash(i + vec3f(0.0, 0.0, 1.0)), hash(i + vec3f(1.0, 0.0, 1.0)), u.x);
  let d = mix(hash(i + vec3f(0.0, 1.0, 1.0)), hash(i + vec3f(1.0, 1.0, 1.0)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

fn fbm(p: vec3f, octaveCount: u32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var q = p;
  for (var i = 0u; i < 4u; i++) {
    if (i >= max(1u, octaveCount)) { break; }
    value += amplitude * noise(q);
    q = q * 2.02 + vec3f(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return value;
}

fn density(p: vec3f, time: f32) -> f32 {
  let drift = vec3f(time * 0.12, time * 0.05, time * 0.08);
  let band = exp(-abs(p.y - 0.35 * sin(p.x * 1.3 + time * 0.4)) * 2.6);
  let ribbons = fbm(p * 1.8 + drift, params.octaves);
  return max(0.0, ribbons - 0.46) * band * 2.0;
}

fn palette(t: f32) -> vec3f {
  let a = vec3f(0.05, 0.35, 0.45);
  let b = vec3f(0.55, 0.25, 0.65);
  let c = vec3f(0.95, 0.55, 0.15);
  return mix(mix(a, b, smoothstep(0.0, 0.6, t)), c, smoothstep(0.55, 1.0, t));
}

fn tonemapAces(color: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((color * (a * color + b)) / (color * (c * color + d) + e), vec3f(0.0), vec3f(1.0));
}

fn clusterStrength(position: vec2f, center: vec2f) -> f32 {
  let delta = position - center;
  return exp(-dot(delta, delta) / 0.0016);
}

fn shootingStar(uv: vec2f, time: f32) -> f32 {
  let interval = 18.0;
  let elapsed = time + 8.0;
  let phase = fract(elapsed / interval);
  let duration = 0.1;
  let cycle = floor(elapsed / interval);
  let eventSeed = hash(vec3f(cycle, 23.4, 11.6));
  if (phase >= duration || eventSeed < 0.18) {
    return 0.0;
  }

  let progress = phase / duration;
  let side = step(0.5, hash(vec3f(cycle, 5.2, 8.1)));
  let start = vec2f(
    mix(-0.025, 1.025, side) * params.pageAspect,
    mix(0.04, 0.96, hash(vec3f(cycle, 14.7, 2.6))) * params.galaxyExtent
  );
  let travel = vec2f(
    mix(1.08, -1.08, side) * params.pageAspect,
    mix(-0.32, 0.32, hash(vec3f(cycle, 3.3, 19.1))) * params.galaxyExtent
  );
  let direction = normalize(travel);
  let head = start + travel * progress;
  let position = vec2f(uv.x * params.pageAspect, uv.y);
  let delta = position - head;
  let along = dot(delta, direction);
  let across = abs(delta.x * direction.y - delta.y * direction.x);
  let tailLength = 0.18 * params.pageAspect;
  let tail = step(0.0, -along) * (1.0 - smoothstep(0.0, tailLength, -along));
  let core = exp(-dot(delta, delta) / (0.000002 * params.galaxyExtent * params.galaxyExtent));
  let width = exp(-(across * across) / (0.000001 * params.galaxyExtent * params.galaxyExtent));
  let fadeIn = smoothstep(0.0, 0.14, progress);
  let fadeOut = 1.0 - smoothstep(0.9, 1.0, progress);
  return max(core, tail * width) * fadeIn * fadeOut;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let extent = clamp(params.galaxyExtent, 0.001, 1.0);
  let horizontal = abs(uv.x - 0.5) * 2.0;
  let taperedExtent = extent * (1.0 - 0.24 * horizontal * horizontal);
  let localUv = vec2f(uv.x, uv.y / taperedExtent);
  let screen = vec2f((localUv.x - 0.5) * params.aspect, 0.5 - localUv.y) * 2.0;
  let pointerDelta = vec2f((uv.x - params.pointer.x) * params.pageAspect, uv.y - params.pointer.y);
  let pointerField = exp(-dot(pointerDelta, pointerDelta) / 0.08) * params.pointerMomentum;
  let pointerResponse = pointerField;
  let pointerHalo = exp(-dot(pointerDelta, pointerDelta) / 0.025) * params.pointerMomentum;
  let cloudFade = 1.0 - smoothstep(0.35, 2.2, localUv.y);
  var color = vec3f(0.0);

  if (cloudFade > 0.001) {
    let origin = vec3f(0.0, 0.0, -3.0);
    let direction = normalize(vec3f(screen, 1.6));

    let steps = max(params.steps, 4u);
    let stepSize = 5.0 / f32(steps);
    var accumulated = vec3f(0.0);
    var transmittance = 1.0;
    var t = 0.5;
    for (var i = 0u; i < steps; i++) {
      let p = origin + direction * t;
      let d = max(0.0, density(p, params.time) - (1.0 - cloudFade) * 0.12) * cloudFade;
      if (d > 0.001) {
        let glow = palette(clamp(d * 0.9 + p.y * 0.3 + 0.35, 0.0, 1.0));
        let absorb = exp(-d * stepSize * 1.8);
        accumulated += glow * d * transmittance * stepSize * (1.15 + pointerResponse * 0.45);
        transmittance *= absorb;
      }
      t += stepSize;
    }

    let horizon = smoothstep(-1.2, 0.8, screen.y);
    let sky = mix(vec3f(0.02, 0.03, 0.06), vec3f(0.01, 0.015, 0.03), horizon)
      + vec3f(0.58) * shootingStar(uv, params.time) * (1.0 - smoothstep(0.25, 1.0, uv.y))
      + vec3f(0.035, 0.07, 0.13) * pointerHalo;
    color = sky * transmittance * cloudFade + accumulated;
  }

  let starGrid = vec2f(160.0, 160.0 / max(params.pageAspect, 0.001));
  let cell = floor(uv * starGrid);
  let seed = hash(vec3f(cell, 7.0));
  let local = fract(uv * starGrid) - vec2f(hash(vec3f(cell, 11.0)), hash(vec3f(cell, 13.0)));
  let starFade = 1.0 - smoothstep(0.25, 1.0, uv.y);
  let starPosition = vec2f(uv.x * params.pageAspect, uv.y);
  let cluster = max(
    max(
      clusterStrength(starPosition, vec2f(params.pageAspect * 0.14, 0.12)),
      clusterStrength(starPosition, vec2f(params.pageAspect * 0.76, 0.25))
    ),
    max(
      clusterStrength(starPosition, vec2f(params.pageAspect * 0.36, 0.48)),
      clusterStrength(starPosition, vec2f(params.pageAspect * 0.82, 0.72))
    )
  );
  let threshold = mix(0.985, 0.955, cluster);
  let isStar = step(threshold, seed);
  let starSize = smoothstep(0.08, 0.0, length(local));
  let starVariation = hash(vec3f(cell, 17.0));
  let twinkleSeed = hash(vec3f(cell, 29.0));
  let twinklePhase = fract(params.time * 0.12 + twinkleSeed);
  let twinklePulse = smoothstep(0.0, 0.12, twinklePhase) * (1.0 - smoothstep(0.12, 0.3, twinklePhase));
  let twinkle = select(1.0, 1.0 + twinklePulse * (0.35 + 0.65 * starVariation), twinkleSeed > 0.55);
  let star = isStar * starSize * (0.4 + 0.6 * starVariation) * twinkle;
  let clusterBrightness = mix(1.0, 2.2, cluster);
  color += vec3f(star) * clusterBrightness * (0.85 + pointerResponse * 1.0) * starFade;
  color *= 0.84;
  if (params.tonemap == 1u) {
    color = tonemapAces(color);
  }
  return vec4f(color, 1.0);
}
