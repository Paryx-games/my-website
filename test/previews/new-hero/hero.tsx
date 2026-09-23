import { useEffect, useRef, useState } from 'react';
import { Example as Triangle } from '../triangle-led-front';

const palettes = [
  { label: 'white and blue', text: '#f5f5f5', blend: ['#5b8cff', '#70c8ff'] },
  { label: 'green tint', text: '#d9ffe6', blend: ['#2bff88', '#b6ffd0'] },
  { label: 'blue and green', text: '#e6fff5', blend: ['#5b8cff', '#2bff88'] },
  { label: 'pink', text: '#ffe4f1', blend: ['#ff4fa3', '#ff91c4'] },
  { label: 'orange', text: '#fff0e0', blend: ['#ff8a2b', '#ffc078'] },
  { label: 'pink and orange', text: '#fff0ea', blend: ['#ff4fa3', '#ff8a2b'] },
] as const;

type Palette = (typeof palettes)[number];
type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  born: number;
  lifetime: number;
  size: number;
  color: string;
};

const title = "Hi, I'm Paryx";
const subtitle = 'This is my testing domain!';

export default function Hero() {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPalette, setSelectedPalette] = useState<Palette>(palettes[0]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !matchMedia('(pointer: fine)').matches) return;

    let animationFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        stage.style.setProperty('--pointer-x', `${event.clientX}px`);
        stage.style.setProperty('--pointer-y', `${event.clientY}px`);
        stage.classList.add('is-pointer-active');
      });
    };
    const onPointerLeave = () => stage.classList.remove('is-pointer-active');

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onPointerLeave);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', onPointerLeave);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isDisposed = false;
    let animationFrame = 0;
    let startTime = performance.now();
    let width = 0;
    let height = 0;
    let fontSize = 64;
    let pixelSize = 4;
    let baseline = 0;
    let left = 0;
    let characterOffsets: number[] = [];
    let characterPoints: Array<Array<[number, number]>> = [];
    let particles: Particle[] = [];
    const font = (size: number) => `300 ${size}px Inter, system-ui, sans-serif`;

    const setup = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      context.font = font(100);
      const naturalWidth = context.measureText(title).width;
      fontSize = Math.min(76, Math.max(36, (width * 0.82 / naturalWidth) * 100));
      context.font = font(fontSize);
      const fullWidth = context.measureText(title).width;
      left = (width - fullWidth) / 2;
      baseline = height * 0.235;
      pixelSize = Math.max(3, Math.round(fontSize / 22));
      characterOffsets = [...title].map((_, index) => left + context.measureText(title.slice(0, index)).width);
      characterOffsets.push(left + fullWidth);

      const buffer = document.createElement('canvas');
      buffer.width = Math.max(1, Math.ceil(width));
      buffer.height = Math.max(1, Math.ceil(height));
      const bufferContext = buffer.getContext('2d');
      if (!bufferContext) return;
      bufferContext.font = font(fontSize);
      bufferContext.textBaseline = 'alphabetic';
      bufferContext.fillText(title, left, baseline);
      const pixels = bufferContext.getImageData(0, 0, buffer.width, buffer.height).data;
      characterPoints = [...title].map((character, index) => {
        const points: Array<[number, number]> = [];
        if (character === ' ') return points;
        for (let y = Math.max(0, Math.floor(baseline - fontSize)); y < baseline; y += pixelSize) {
          for (let x = Math.max(0, Math.floor(characterOffsets[index])); x < characterOffsets[index + 1]; x += pixelSize) {
            if (pixels[(y * buffer.width + x) * 4 + 3] > 128) points.push([x, y]);
          }
        }
        return points;
      });
    };

    const spawnParticle = (characterIndex: number, now: number) => {
      const points = characterPoints[characterIndex];
      if (!points?.length) return;
      const point = points[Math.floor(Math.random() * points.length)];
      const from = hexToRgb(selectedPalette.blend[0]);
      const to = hexToRgb(selectedPalette.blend[1]);
      const progress = (point[0] - left) / Math.max(1, characterOffsets.at(-1)! - left);
      const mix = Math.max(0, Math.min(1, progress * 0.8 + 0.1 + (Math.random() - 0.5) * 0.35));
      const color = from.map((channel, index) => Math.round(channel + (to[index] - channel) * mix));
      particles.push({
        x: point[0],
        y: point[1],
        velocityX: (Math.random() - 0.5) * 20,
        velocityY: -(45 + Math.random() * 105),
        born: now,
        lifetime: 700 + Math.random() * 850,
        size: pixelSize * (0.6 + Math.random() * 0.8),
        color: `rgb(${color.join(',')})`,
      });
    };

    const draw = (now: number) => {
      const elapsed = now - startTime;
      const visibleCharacters = Math.min(title.length, Math.max(0, Math.floor((elapsed - 350) / 120) + 1));
      context.clearRect(0, 0, width, height);
      context.font = font(fontSize);
      context.textBaseline = 'alphabetic';
      context.fillStyle = selectedPalette.text;

      for (let index = 0; index < visibleCharacters; index++) {
        const age = elapsed - 350 - index * 120;
        const fade = Math.max(0, Math.min(1, age / 120));
        context.globalAlpha = fade;
        context.fillText(title[index], characterOffsets[index], baseline - (1 - fade) * 7);
        if (age < 650 && Math.random() < 0.28) spawnParticle(index, now);
      }
      context.globalAlpha = 1;

      if (reducedMotion) {
        context.clearRect(0, 0, width, height);
        context.fillText(title, left, baseline);
        return;
      }

      if (elapsed > 350) {
        const newlyVisible = Math.floor(elapsed / 120) - Math.floor((elapsed - 16) / 120);
        for (let index = Math.max(0, visibleCharacters - newlyVisible); index < visibleCharacters; index++) {
          for (let count = 0; count < 8; count++) spawnParticle(index, now);
        }
      }

      particles = particles.filter((particle) => now - particle.born < particle.lifetime);
      for (const particle of particles) {
        const age = (now - particle.born) / 1000;
        const fade = 1 - (now - particle.born) / particle.lifetime;
        const x = Math.round((particle.x + particle.velocityX * age) / pixelSize) * pixelSize;
        const y = Math.round((particle.y + particle.velocityY * age) / pixelSize) * pixelSize;
        context.globalAlpha = fade * fade * 0.9;
        context.fillStyle = particle.color;
        context.fillRect(x, y, particle.size, particle.size);
      }
      context.globalAlpha = 1;

      const completeAt = 350 + title.length * 120 + 1500;
      if (elapsed < completeAt || particles.length) animationFrame = requestAnimationFrame(draw);
    };

    const replay = () => {
      cancelAnimationFrame(animationFrame);
      particles = [];
      startTime = performance.now();
      setup();
      animationFrame = requestAnimationFrame(draw);
    };
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      replay();
    };
    const onResize = () => replay();

    const startAfterFontsLoad = () => {
      if (!isDisposed) replay();
    };
    void document.fonts.load(font(100)).then(startAfterFontsLoad, startAfterFontsLoad);
    window.addEventListener('resize', onResize);
    stageRef.current?.addEventListener('pointerdown', onPointerDown);
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onResize);
      stageRef.current?.removeEventListener('pointerdown', onPointerDown);
    };
  }, [selectedPalette]);

  return (
    <main className="hero-stage" ref={stageRef}>
      <Triangle />
      <div className="grid" aria-hidden="true" />
      <canvas ref={canvasRef} className="pixel-title" aria-hidden="true" />
      <section className="hero-copy" aria-label="Introduction">
        <h1 className="visually-hidden">{title}</h1>
        <div className="hero-rule" aria-hidden="true" />
        <p className="hero-subtitle">{subtitle}</p>
        <p className="main-page">
          <span>My main page is</span>
          <a href="https://paryx.uk" aria-label="Visit paryx.uk">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
              <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
            </svg>
            <span>paryx.uk</span>
          </a>
        </p>
      </section>
      <div className="swatches" role="group" aria-label="Particle colour">
        {palettes.map((palette) => (
          <button
            key={palette.label}
            type="button"
            aria-label={palette.label}
            aria-pressed={palette === selectedPalette}
            style={{ background: `linear-gradient(135deg, ${palette.blend[0]} 50%, ${palette.blend[1]} 50%)` }}
            onClick={() => setSelectedPalette(palette)}
          />
        ))}
      </div>
    </main>
  );
}

function hexToRgb(hex: string) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}
