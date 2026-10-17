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

export async function pcSocialImage(specs: {
  groups: { fields: { id: string; value: string }[] }[];
}): Promise<Buffer> {
  const fields = new Map(
    specs.groups.flatMap((group) =>
      group.fields.map((field) => [field.id, field.value] as const),
    ),
  );
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&apos;',
        })[character]!,
    );
  const rows = [
    ['CPU', fields.get('cpu') || ''],
    [
      'GPU',
      `${fields.get('gpu') || ''} / ${fields.get('vram')?.split('/')[0].trim() || ''}`,
    ],
    ['Memory', fields.get('memory') || ''],
    ['Storage', fields.get('storage') || ''],
    [
      'Display',
      fields.get('display')?.split('/').slice(2).join('/').trim() || '',
    ],
  ];
  const logo = Array.from(
    { length: 18 },
    (_, index) =>
      `<text x="84" y="${252 + index * 13 + (index > 8 ? 12 : 0)}">/////////////////  /////////////////</text>`,
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#080809"/>
    <g font-family="Arial, sans-serif"><text x="48" y="64" fill="#f4f4f5" font-size="34" font-weight="700">My PC specs.</text><text x="1152" y="61" fill="#4dabf7" text-anchor="end" font-size="22">paryx</text></g>
    <rect x="48" y="98" width="1104" height="452" rx="12" fill="#050505" stroke="#303137"/>
    <path d="M60 98H1140Q1152 98 1152 110V148H48V110Q48 98 60 98" fill="#14161a"/>
    <path d="M48 148H1152" stroke="#303137"/>
    <g font-family="Consolas, monospace" font-size="20"><text x="74" y="131" fill="#dce0e7">&gt;_  PowerShell</text><text x="1118" y="131" text-anchor="end" fill="#949ba8">fastfetch</text>
    <text x="76" y="195" fill="#949ba8">PS ~&gt; <tspan fill="#f4f4f5">fastfetch</tspan></text>
    <g font-size="11" fill="#0078d6" xml:space="preserve">${logo}</g>
    <text x="430" y="242" fill="#4dabf7" font-size="25" font-weight="700">paryx <tspan fill="#e2e3e7">@</tspan> paryx</text>
    <path d="M430 255H620" stroke="#686d78" stroke-dasharray="5 4"/>
    ${rows.map(([key, value], index) => `<text x="430" y="${296 + index * 43}" fill="#0078d6" font-weight="700">${key}:</text><text x="542" y="${296 + index * 43}" fill="#e2e3e7" font-size="18">${escape(value)}</text>`).join('')}
    </g><g font-family="Arial, sans-serif" font-size="20" fill="#b6b6bf"><text x="48" y="597">paryx.uk/pc-specs</text><text x="1152" y="597" text-anchor="end">Hardware / software / the full setup</text></g>
  </svg>`;
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
