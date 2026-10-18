#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogueFile = path.join(root, 'www/public/assets/games/roblox-games.js');
const catalogueIndexFile = path.join(root, 'www/public/assets/games/games.js');
const artworkFile = path.join(root, 'www/content/game-artwork-sources.json');
const sourcesFile = path.join(root, 'www/content/roblox-games-sources.json');
const statsFile = path.join(root, 'api/lib/roblox-stats.ts');
const palette = ['#d89baf', '#bd9670', '#b6bdcc', '#80a3c2', '#77b9df', '#c6c9c8', '#e4a76c', '#e0bb79', '#c7bd86', '#c4ad77', '#8cbf8c', '#dfca70', '#87b7a9'];
const fetchedResponses = [];

function usage() {
  console.log(`Roblox game importer

Usage:
  pnpm --dir www import:roblox -- <game URL> [<game URL> ...]
  pnpm --dir www import:roblox -- --check <game URL> [<game URL> ...]
  pnpm --dir www import:roblox -- --file games.txt

The default mode fetches and validates a proposal, then asks you to type ADD
before it changes the catalogue. --check performs the same fetch and validation
without writing anything. --file accepts one Roblox game URL per line.`);
}

function parseArguments(args) {
  if (args[0] === '--') args = args.slice(1);
  let checkOnly = false;
  const input = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') return { help: true };
    if (args[i] === '--check') checkOnly = true;
    else if (args[i] === '--file') {
      if (!args[i + 1]) throw new Error('--file requires a path');
      input.push({ file: path.resolve(args[++i]) });
    } else if (args[i].startsWith('-')) throw new Error(`Unknown option: ${args[i]}`);
    else input.push(...args[i].split(/[\s,]+/).filter(Boolean));
  }
  return { checkOnly, input };
}

async function urlsFromInput(input) {
  const values = (await Promise.all(input.map(async value => typeof value === 'string'
    ? value
    : (await readFile(value.file, 'utf8')).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))))).flat();
  const placeIds = values.map(value => {
    let url;
    try { url = new URL(value); } catch { throw new Error(`Not a URL: ${value}`); }
    if (!['www.roblox.com', 'roblox.com'].includes(url.hostname) || !url.pathname.startsWith('/games/')) {
      throw new Error(`Expected a Roblox game URL: ${value}`);
    }
    const placeId = Number(url.pathname.split('/')[2]);
    if (!Number.isSafeInteger(placeId) || placeId <= 0) throw new Error(`Could not read a place ID from: ${value}`);
    return placeId;
  });
  const unique = [...new Set(placeIds)];
  if (!unique.length) throw new Error('Provide at least one Roblox game URL.');
  if (unique.length > 25) throw new Error('Import batches are limited to 25 games.');
  return unique;
}

async function requestJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (response.status === 429 && attempt < 3) {
      const wait = Math.min(Number(response.headers.get('retry-after')) * 1000 || 1500 * (attempt + 1), 10_000);
      await new Promise(resolve => setTimeout(resolve, wait));
      continue;
    }
    if (!response.ok) throw new Error(`Roblox returned HTTP ${response.status} for ${url}`);
    const data = await response.json();
    fetchedResponses.push({ url, status: response.status, data });
    return data;
  }
  throw new Error('Roblox rate limited the request. Please try again shortly.');
}

async function fetchImage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Artwork download returned HTTP ${response.status}: ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 100 || data.length > 15_000_000) throw new Error(`Artwork has an unexpected size: ${url}`);
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Roblox returned a non-PNG image: ${url}`);
  return data;
}

async function fetchBadgeCount(universeId) {
  let count = 0;
  let cursor = '';
  const seen = new Set();
  for (let page = 0; page < 100; page++) {
    const url = `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=100&sortOrder=Asc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const result = await requestJson(url);
    if (!Array.isArray(result.data)) throw new Error(`Invalid badges response for universe ${universeId}`);
    count += result.data.length;
    if (result.nextPageCursor === null) return count;
    cursor = result.nextPageCursor;
    if (typeof cursor !== 'string' || seen.has(cursor)) throw new Error(`Repeated badge cursor for universe ${universeId}`);
    seen.add(cursor);
  }
  throw new Error(`Too many badge pages for universe ${universeId}`);
}

async function fetchGame(placeId, index) {
  const firstResponse = fetchedResponses.length;
  const universeResponse = await requestJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  const universeId = universeResponse.universeId;
  if (!Number.isSafeInteger(universeId) || universeId <= 0) throw new Error(`No public Roblox universe found for place ${placeId}`);

  const [detailsResponse, votesResponse, iconResponse, mediaResponse, badgeCount] = await Promise.all([
    requestJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
    requestJson(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`),
    requestJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`),
    requestJson(`https://games.roblox.com/v2/games/${universeId}/media`),
    fetchBadgeCount(universeId),
  ]);
  const game = detailsResponse.data?.find(item => item.id === universeId);
  const vote = votesResponse.data?.find(item => item.id === universeId);
  const icon = iconResponse.data?.find(item => item.targetId === universeId && item.state === 'Completed');
  if (!game || game.rootPlaceId !== placeId || !game.name || !game.created || !game.creator?.name) {
    throw new Error(`Roblox game details did not match place ${placeId}`);
  }
  if (!vote || !icon || !Array.isArray(mediaResponse.data)) throw new Error(`Roblox omitted votes, icon, or media for ${game.name}`);
  if (!['User', 'Group'].includes(game.creator.type) || typeof game.creator.hasVerifiedBadge !== 'boolean') {
    throw new Error(`Roblox returned an invalid creator for ${game.name}`);
  }

  const id = game.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id) throw new Error(`Could not make a catalogue ID for ${game.name}`);
  const created = Date.parse(game.created);
  if (!Number.isFinite(created)) throw new Error(`Invalid creation date for ${game.name}`);
  for (const field of ['creator.id', 'playing', 'visits', 'favoritedCount', 'maxPlayers']) {
    const value = field.startsWith('creator.') ? game.creator.id : game[field];
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${field} value for ${game.name}`);
  }
  if (game.price !== null && (!Number.isSafeInteger(game.price) || game.price < 0)) throw new Error(`Invalid price for ${game.name}`);
  const website = `https://www.roblox.com/games/${placeId}/${game.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '-')}`;
  const media = mediaResponse.data.filter(item => item.assetType === 'Image' && item.approved && Number.isSafeInteger(item.imageId));
  const thumbnailIds = [...new Set(media.map(item => item.imageId))];
  const thumbnailResponse = thumbnailIds.length
    ? await requestJson(`https://thumbnails.roblox.com/v1/games/${universeId}/thumbnails?thumbnailIds=${thumbnailIds.join(',')}&size=768x432&format=Png&isCircular=false`)
    : { data: [] };
  const thumbnails = (thumbnailResponse.data ?? []).filter(item => item.state === 'Completed' && item.imageUrl);
  if (!thumbnails.length) throw new Error(`Roblox returned no usable gallery images for ${game.name}`);

  const iconUrl = icon.imageUrl;
  const iconAsset = `/assets/games/${id}-icon.png`;
  const pictures = thumbnails.map((_, pictureIndex) => `/assets/games/${id}-${pictureIndex + 1}.png`);
  const assets = await Promise.all([
    fetchImage(iconUrl),
    ...thumbnails.map(item => fetchImage(item.imageUrl)),
  ]);
  const checked = new Date().toISOString();
  const voteValue = field => {
    const value = vote[field];
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid vote count for ${game.name}`);
    return value;
  };
  const entry = {
    id, titleArtwork: iconAsset, title: game.name, year: new Date(created).toISOString().slice(0, 4),
    developer: game.creator.name, publisher: game.creator.name,
    genre: [game.genre_l1, game.genre_l2].filter(Boolean).join(' - ') || game.genre || 'Roblox experience',
    website, description: game.description || '', cover: iconAsset, icon: iconAsset, backdrop: pictures[0], pictures,
    captions: pictures.map((_, pictureIndex) => `${game.name} - official Roblox thumbnail ${pictureIndex + 1}`),
    accent: palette[index % palette.length],
    roblox: {
      universeId, placeId, creatorType: game.creator.type, creatorId: game.creator.id,
      creatorName: game.creator.name, creatorVerified: game.creator.hasVerifiedBadge,
      created: game.created, updated: game.updated, playing: game.playing, visits: game.visits,
      favorites: game.favoritedCount, maxPlayers: game.maxPlayers,
      upVotes: voteValue('upVotes'), downVotes: voteValue('downVotes'), price: game.price,
      avatarType: game.universeAvatarType, badgeCount, checked,
    },
    artworkSource: website,
  };
  return {
    entry,
    images: [
      { asset: iconAsset, url: iconUrl, purpose: 'official Roblox icon', width: 512, height: 512, data: assets[0] },
      ...thumbnails.map((item, imageIndex) => ({
        asset: pictures[imageIndex], url: item.imageUrl, purpose: 'official Roblox thumbnail', width: 768, height: 432, data: assets[imageIndex + 1],
      })),
    ],
    sourceRequests: fetchedResponses.slice(firstResponse),
    badgeCount,
  };
}

function addObjectEntries(original, additions, property = null) {
  const serialized = JSON.stringify(additions, null, 2).slice(2, -2)
    .split('\n').map(line => `  ${line}`).join('\n');
  if (property) {
    const marker = `  "${property}": {`;
    const start = original.indexOf(marker);
    if (start < 0) throw new Error(`Could not find ${property} in its source file`);
    const close = original.lastIndexOf('\n  }\n}');
    if (close < start) throw new Error(`Could not find the end of ${property}`);
    return `${original.slice(0, close)},\n${serialized}${original.slice(close)}`;
  }
  const close = original.lastIndexOf('\n}');
  if (close < 0) throw new Error('Could not find the end of the JSON source file');
  return `${original.slice(0, close)},\n${serialized}${original.slice(close)}`;
}

async function applyGames(games) {
  const catalogue = await readFile(catalogueFile, 'utf8');
  const currentGames = await import(`${pathToFileURL(catalogueIndexFile).href}?import=${Date.now()}`);
  const existingById = new Map(currentGames.catalogue.map(game => [game.id, game]));
  const existingByPlaceId = new Set(currentGames.robloxGames.map(game => game.roblox.placeId));
  for (const game of games) {
    if (existingById.has(game.entry.id)) throw new Error(`${game.entry.title} conflicts with existing game ID "${game.entry.id}".`);
    if (existingByPlaceId.has(game.entry.roblox.placeId)) throw new Error(`Place ${game.entry.roblox.placeId} is already in the catalogue.`);
    existingById.set(game.entry.id, game.entry);
    existingByPlaceId.add(game.entry.roblox.placeId);
  }

  const [artworkText, sourcesText, statsText] = await Promise.all([
    readFile(artworkFile, 'utf8'), readFile(sourcesFile, 'utf8'), readFile(statsFile, 'utf8'),
  ]);
  const artworkSources = JSON.parse(artworkText);
  const provenance = JSON.parse(sourcesText);
  const universeMap = Object.fromEntries(currentGames.robloxGames.map(game => [game.id, game.roblox.universeId]));
  const duplicateUniverseIds = new Set(Object.values(universeMap));
  for (const game of games) {
    if (duplicateUniverseIds.has(game.entry.roblox.universeId)) throw new Error(`Universe ${game.entry.roblox.universeId} is already registered for live stats.`);
    duplicateUniverseIds.add(game.entry.roblox.universeId);
    for (const image of game.images) {
      if (artworkSources[image.asset]) throw new Error(`Artwork path already exists: ${image.asset}`);
      artworkSources[image.asset] = { url: image.url, purpose: image.purpose, width: image.width, height: image.height };
    }
    for (const { url, status, data } of game.sourceRequests) provenance.sources[url] = { url, status, data };
  }
  const statsAddition = games.map(({ entry }) => `  '${entry.id}': ${entry.roblox.universeId},`).join('\n');
  const statsMarker = /(  '[a-z0-9-]+': \d+,)(\r?\n};)/;
  if (!statsMarker.test(statsText)) throw new Error('Could not find the Roblox live stats list.');
  const updatedStats = statsText.replace(statsMarker, `$1\n${statsAddition}$2`);
  const updatedCatalogue = catalogue.replace(/\r?\n\];\s*$/, `,\n${games.map(({ entry }) => JSON.stringify(entry, null, 2)).join(',\n')}\n];\n`);
  if (updatedCatalogue === catalogue) throw new Error('Could not append games to the catalogue.');
  const changedFiles = new Map([
    [catalogueFile, updatedCatalogue],
    [artworkFile, JSON.stringify(artworkSources, null, 2) + '\n'],
    [sourcesFile, addObjectEntries(sourcesText, Object.fromEntries(Object.entries(provenance.sources).filter(([url]) => !sources.sources[url])), 'sources')],
    [statsFile, updatedStats],
  ]);

  const fileBackups = new Map();
  const writtenAssets = [];
  try {
    for (const game of games) for (const image of game.images) {
      const absolute = path.join(root, 'www/public', image.asset.replace(/^\//, ''));
      writtenAssets.push(absolute);
      await writeFile(absolute, image.data, { flag: 'wx' });
    }
    changedFiles.set(artworkFile, JSON.stringify(artworkSources, null, 2) + '\n');
    for (const [file, contents] of changedFiles) {
      fileBackups.set(file, await readFile(file));
      await writeFile(file, contents, 'utf8');
    }
  } catch (error) {
    for (const [file, contents] of [...fileBackups].reverse()) await writeFile(file, contents);
    const { unlink } = await import('node:fs/promises');
    for (const file of writtenAssets) await unlink(file).catch(() => {});
    throw error;
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { usage(); process.exit(0); }
  const placeIds = await urlsFromInput(options.input);
  const existingModule = await import(pathToFileURL(catalogueIndexFile));
  const knownCatalogueIds = new Set(existingModule.catalogue.map(game => game.id));
  const knownPlaces = new Set(existingModule.robloxGames.map(game => game.roblox.placeId));
  const knownUniverses = new Set(existingModule.robloxGames.map(game => game.roblox.universeId));
  const alreadyAdded = placeIds.filter(id => knownPlaces.has(id));
  if (alreadyAdded.length) throw new Error(`Already in the catalogue: ${alreadyAdded.join(', ')}.`);

  const imported = [];
  for (const placeId of placeIds) imported.push(await fetchGame(placeId, imported.length));
  const ids = new Set();
  const universes = new Set(Object.values((await import('../../api/lib/roblox-stats.ts')).universes ?? {}));
  for (const game of imported) {
    if (knownCatalogueIds.has(game.entry.id) || ids.has(game.entry.id)) throw new Error(`Game ID "${game.entry.id}" already exists or occurs twice in this batch.`);
    if (knownUniverses.has(game.entry.roblox.universeId)) throw new Error(`Universe ${game.entry.roblox.universeId} is already in the catalogue.`);
    knownUniverses.add(game.entry.roblox.universeId);
    ids.add(game.entry.id);
  }

  console.log(`\nReady to add ${imported.length} Roblox game${imported.length === 1 ? '' : 's'}:`);
  for (const { entry, images, badgeCount } of imported) {
    console.log(`  ${entry.title} (${entry.year}) | ${entry.roblox.creatorName} | ${entry.genre}`);
    console.log(`    ${entry.roblox.playing.toLocaleString()} playing | ${images.length} images | ${badgeCount} badges | ${entry.website}`);
  }
  if (options.checkOnly) {
    console.log('\nCheck complete. No files were changed. Re-run without --check to review and apply.');
    process.exit(0);
  }
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  let answer;
  try { answer = await terminal.question('\nType ADD to write these games into the catalogue: '); }
  finally { terminal.close(); }
  if (answer.trim() !== 'ADD') {
    console.log('Cancelled. No files were changed.');
    process.exit(0);
  }
  await applyGames(imported);
  console.log(`\nAdded ${imported.length} game${imported.length === 1 ? '' : 's'} to the catalogue and live stats list.`);
} catch (error) {
  console.error(`\nImport failed: ${error.message}`);
  process.exitCode = 1;
}
