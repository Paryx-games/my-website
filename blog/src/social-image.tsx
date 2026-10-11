import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import { authors } from './authors.js';
import { formatDate } from './config.js';
import type { Post } from './content.js';

const require = createRequire(import.meta.url);
const font = readFile(
  require.resolve('@fontsource/sora/files/sora-latin-600-normal.woff'),
);

export async function pageSocialImage({
  title,
  description,
  label,
  domain,
}: {
  title: string;
  description: string;
  label: string;
  domain: string;
}): Promise<Buffer> {
  const svg = await satori(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#080809',
        color: '#f4f4f5',
        fontFamily: 'Sora',
        padding: '48px 64px',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, letterSpacing: '-1px' }}>
          paryx
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: '#b6b6bf' }}>
          {label}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            lineHeight: 1.12,
            letterSpacing: '-3px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            maxWidth: 920,
            marginTop: 24,
            fontSize: 26,
            lineHeight: 1.5,
            color: '#b6b6bf',
          }}
        >
          {description}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          paddingTop: 24,
          borderTop: '1px solid #303034',
          fontSize: 20,
          color: '#b6b6bf',
        }}
      >
        {domain}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Sora', data: await font, weight: 600, style: 'normal' }],
    },
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function socialImage(
  post: Post,
  bannerPath?: string,
): Promise<Buffer> {
  const background = bannerPath
    ? await sharp(await readFile(bannerPath))
        .resize(1200, 630, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer()
    : await sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 4,
          background: '#080809',
        },
      })
        .png()
        .toBuffer();
  const svg = await satori(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#f4f4f5',
        fontFamily: 'Sora',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          margin: 48,
          padding: '12px 20px',
          background: '#080809',
          borderRadius: 8,
          fontSize: 28,
        }}
      >
        paryx / blog
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 48px',
          background: 'rgba(8, 8, 9, 0.94)',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize:
              post.title.length > 90 ? 38 : post.title.length > 55 ? 48 : 58,
            lineHeight: 1.2,
            overflow: 'hidden',
            maxHeight: 250,
          }}
        >
          {post.title}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 22,
            color: '#c8c8ce',
          }}
        >
          {post.authors.map((id) => authors[id].name).join(', ')} ·{' '}
          {formatDate(post.date)}
          {post.demo ? ' · Demo article' : ''}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Sora', data: await font, weight: 600, style: 'normal' }],
    },
  );
  return sharp(background)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}
