const SHORT_LINK_CODE_PATTERN = /^(?=.{1,32}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

function addReservedSegment(segments, value) {
  const segment = value.toLowerCase();
  if (SHORT_LINK_CODE_PATTERN.test(segment)) segments.add(segment);
}

export function createReservedShortLinkPaths(entries, vercelConfig) {
  const segments = new Set();
  let allPathsReserved = false;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      addReservedSegment(segments, entry.name);
    } else if (entry.name.endsWith('.html')) {
      const path = entry.name.slice(0, -'.html'.length);
      if (path !== 'index') addReservedSegment(segments, path);
    } else if (!entry.name.includes('.')) {
      addReservedSegment(segments, entry.name);
    }
  }

  for (const route of [...(vercelConfig.rewrites || []), ...(vercelConfig.redirects || [])]) {
    if (route.destination === 'https://admin.paryx.uk/api/shortlinks/resolve/:code'
      || route.destination === 'https://admin.paryx.uk/api/forms?resource=shortlinks&code=:code') continue;
    const firstSegment = route.source.split('/').filter(Boolean)[0];
    if (!firstSegment) continue;
    if (/[:*()]/.test(firstSegment)) {
      allPathsReserved = true;
      continue;
    }
    addReservedSegment(segments, firstSegment);
  }

  return {
    allPathsReserved,
    segments: [...segments].sort(),
  };
}
