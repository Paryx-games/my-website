import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const execute = promisify(execFile);
const build = async () => {
  const result = await execute(
    process.execPath,
    ['--import', 'tsx', 'scripts/build.tsx', '--development'],
    { cwd: root },
  );
  process.stdout.write(result.stdout);
};
await build();
const server = await createServer({ configFile: `${root}vite.config.ts` });
await server.listen();
server.printUrls();
let timer: ReturnType<typeof setTimeout>;
let building = false;
let queued = false;
async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    await build();
    server.ws.send({ type: 'full-reload' });
  } catch (error) {
    console.error(error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      void rebuild();
    }
  }
}
const watchers = ['content', 'src', 'public'].map((directory) =>
  watch(`${root}${directory}`, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 150);
  }),
);
process.on('SIGINT', async () => {
  watchers.forEach((watcher) => watcher.close());
  await server.close();
  process.exit();
});
