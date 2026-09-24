const startPixelName = async (name) => {
  const palettes = [
    { text: "#f5f5f5", accent: "#5b8cff" },
    { text: "#d9ffe6", accent: "#2bff88" },
    { text: "#ffe4f1", accent: "#ff4fa3" },
    { text: "#fff0e0", accent: "#ff8a2b" },
  ];
  const typeInterval = 170;
  const trailTime = 550;
  const cursorLinger = 900;
  const loopPause = 2200;
  const nameElement = document.querySelector(".hero-name");
  nameElement.textContent = name;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  nameElement.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) return;

  let layout;
  let glyphPoints = [];
  let particles = [];
  let paletteIndex = 0;
  let startedAt = 0;
  let spawnedCount = 0;
  let finishedAt = 0;
  let firstCycleComplete;
  const firstCycle = new Promise((resolve) => { firstCycleComplete = resolve; });
  const clamp = (value) => Math.max(0, Math.min(1, value));

  const prepare = () => {
    const style = getComputedStyle(nameElement);
    const size = parseFloat(style.fontSize);
    const font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const buffer = document.createElement("canvas");
    const bufferContext = buffer.getContext("2d");
    bufferContext.font = font;
    const offsets = [0];
    for (let index = 1; index <= name.length; index++) {
      offsets.push(bufferContext.measureText(name.slice(0, index)).width);
    }
    const width = Math.ceil(offsets[name.length] + size * 0.4);
    const height = Math.ceil(size * 1.8);
    const baseline = size * 1.28;
    const pixel = Math.max(3, Math.round(size / 22));

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.top = `${-size * 0.4}px`;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    buffer.width = width;
    buffer.height = height;
    bufferContext.font = font;
    bufferContext.textBaseline = "alphabetic";
    bufferContext.fillText(name, 0, baseline);
    const pixels = bufferContext.getImageData(0, 0, width, height).data;
    glyphPoints = [...name].map((letter, index) => {
      const points = [];
      if (letter === " ") return points;
      for (let y = 0; y < height; y += pixel) {
        for (let x = Math.floor(offsets[index]); x < offsets[index + 1]; x += pixel) {
          if (pixels[(y * width + x) * 4 + 3] > 128) points.push([x, y]);
        }
      }
      return points;
    });
    layout = { width, height, size, font, offsets, baseline, pixel };
  };

  const spawnParticle = (index, now) => {
    const points = glyphPoints[index];
    if (!points.length) return;
    let point = points[Math.floor(Math.random() * points.length)];
    const other = points[Math.floor(Math.random() * points.length)];
    if (other[1] < point[1]) point = other;
    const palette = palettes[paletteIndex];
    particles.push({
      x: point[0],
      y: point[1] - Math.random() * layout.size * 0.12,
      velocityX: (Math.random() - 0.5) * 22,
      velocityY: -(60 + Math.random() * 150),
      born: now,
      life: 1000 + Math.random() * 1000,
      size: layout.pixel * (0.6 + Math.random() * 0.9),
      color: Math.random() < 2 / 3 ? palette.text : palette.accent,
    });
  };

  const draw = (now) => {
    const elapsed = now - startedAt;
    const visible = Math.min(name.length, Math.floor(elapsed / typeInterval) + 1);
    const palette = palettes[paletteIndex];
    const { width, height, size, font, offsets, baseline, pixel } = layout;
    context.clearRect(0, 0, width, height);
    context.font = font;
    context.textBaseline = "alphabetic";

    for (; spawnedCount < visible; spawnedCount++) {
      for (let count = 0; count < 14; count++) spawnParticle(spawnedCount, now);
    }
    for (let index = 0; index < visible; index++) {
      const age = elapsed - index * typeInterval;
      if (age < trailTime && Math.random() < 0.7) spawnParticle(index, now);
      const fade = clamp(age / 120);
      context.globalAlpha = fade;
      context.fillStyle = palette.text;
      context.fillText(name[index], offsets[index], baseline - (1 - fade) * 10);
    }
    context.globalAlpha = 1;

    const isTyping = visible < name.length || elapsed < name.length * typeInterval + cursorLinger;
    if (isTyping || Math.floor(elapsed / 520) % 2 === 0) {
      context.fillStyle = palette.accent;
      context.fillRect(offsets[visible] + size * 0.05, baseline - size * 0.78, size * 0.3, size * 0.8);
    }

    let alive = 0;
    for (const particle of particles) {
      const age = now - particle.born;
      if (age > particle.life) continue;
      alive++;
      const seconds = age / 1000;
      const remaining = 1 - age / particle.life;
      const x = Math.round((particle.x + particle.velocityX * seconds) / pixel) * pixel;
      const y = Math.round((particle.y + particle.velocityY * seconds) / pixel) * pixel;
      context.globalAlpha = remaining * remaining * 0.95;
      context.fillStyle = particle.color;
      context.fillRect(x, y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
    if (particles.length > 500) particles = particles.filter((particle) => now - particle.born < particle.life);

    if (visible === name.length && elapsed >= name.length * typeInterval) firstCycleComplete();
    if (visible === name.length && alive === 0 && elapsed > name.length * typeInterval + trailTime + cursorLinger) {
      if (!finishedAt) finishedAt = now;
      if (now - finishedAt > loopPause) {
        paletteIndex = (paletteIndex + 1) % palettes.length;
        startedAt = now;
        spawnedCount = 0;
        finishedAt = 0;
        particles = [];
      }
    }
    requestAnimationFrame(draw);
  };

  await Promise.race([document.fonts.load("700 100px Sora").catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2500))]);
  prepare();
  nameElement.classList.add("is-pixel-typing");
  startedAt = performance.now();
  requestAnimationFrame(draw);
  addEventListener("resize", () => {
    prepare();
    particles = [];
  });
  await firstCycle;
};
