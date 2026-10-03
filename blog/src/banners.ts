import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Post } from './content.js';

export const fallbackBanner = '/assets/banner-fallback.webp';
const maxBytes = 10 * 1024 * 1024;

export function isRemoteBanner(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Resolve once during the build so every page and social card uses the same image.
export async function resolveBanner(
  post: Post,
  publicDirectory: string,
  outputDirectory: string,
  download: typeof fetch = fetch,
): Promise<string | undefined> {
  if (!post.banner) return undefined;
  if (!isRemoteBanner(post.banner)) {
    const filename = path.resolve(publicDirectory, `.${post.banner}`);
    if (!filename.startsWith(path.resolve(publicDirectory) + path.sep))
      throw new Error(`${post.slug}: banner path leaves public directory`);
    await access(filename).catch(() => {
      throw new Error(
        `${post.slug}: banner asset does not exist: ${post.banner}`,
      );
    });
    return filename;
  }

  let image: Buffer;
  try {
    const response = await download(post.banner, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !response.body) throw new Error('download failed');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new Error('image exceeds 10 MB');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    image = await sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    console.warn(
      `${post.slug}: remote banner unavailable; using local fallback`,
    );
    post.banner = fallbackBanner;
    post.bannerAlt = 'Abstract charcoal folds';
    const filename = path.join(publicDirectory, fallbackBanner.slice(1));
    await access(filename);
    return filename;
  }
  post.banner = `/assets/remote-banners/${post.slug}.webp`;
  const filename = path.join(outputDirectory, post.banner.slice(1));
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, image);
  return filename;
}
