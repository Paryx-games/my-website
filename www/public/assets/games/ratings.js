export function validPersonalRating(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5 && Number.isInteger(value * 2));
}

export function starMarkup(value) {
  const rating = validPersonalRating(value) && value !== null ? value : 0;
  const path = 'M12 2.5 14.9 8.4 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.4Z';
  return Array.from({ length: 5 }, (_, index) => {
    const fill = Math.max(0, Math.min(1, rating - index)) * 100;
    return `<span class="rating-star"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg><span class="rating-star-fill" style="width:${fill}%"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></span></span>`;
  }).join('');
}

export function personalRatingElement(value) {
  const row = document.createElement('div');
  row.className = 'game-personal-rating';
  const label = document.createElement('span');
  label.textContent = 'My rating';
  const stars = document.createElement('span');
  stars.className = 'rating-stars';
  stars.innerHTML = starMarkup(value);
  stars.setAttribute('aria-hidden', 'true');
  const score = document.createElement('span');
  score.className = 'rating-score';
  score.textContent = value === null ? 'Not rated' : `${value} / 5`;
  row.setAttribute('aria-label', value === null ? 'My rating: not rated' : `My rating: ${value} out of 5 stars`);
  row.append(label, score, stars);
  return row;
}

export function imdbRatingElement(imdb) {
  return sourceRatingElement('imdb', 'IMDb', imdb?.score ?? null, 10,
    imdb ? `https://www.imdb.com/title/${imdb.id}/` : null,
    'Audience score', imdb?.checked);
}

export function metacriticRatingElement(metacritic) {
  return sourceRatingElement('metacritic', 'Metacritic', metacritic?.score ?? null, 100,
    metacritic ? `https://www.metacritic.com/game/${metacritic.slug}/?platform=${metacritic.platformSlug}` : null,
    metacritic ? `Critics · ${metacritic.platform}` : 'Critic score', metacritic?.checked);
}

function sourceRatingElement(source, label, score, scale, url, context, checked) {
  const row = document.createElement(url ? 'a' : 'div');
  row.className = `game-source-rating game-${source}-rating`;
  const brand = document.createElement('span');
  brand.className = 'rating-source-label';
  brand.textContent = label;
  const value = document.createElement('span');
  value.className = 'rating-source-value';
  if (score === null) {
    row.classList.add('is-unavailable');
    value.textContent = url ? 'No score' : 'N/A';
  } else {
    const number = document.createElement('strong');
    number.textContent = scale === 10 ? score.toFixed(1) : String(score);
    const denominator = document.createElement('span');
    denominator.textContent = `/${scale}`;
    value.append(number, denominator);
  }
  const detail = document.createElement('span');
  detail.className = 'rating-source-context';
  detail.textContent = context;
  row.append(brand, value, detail);
  row.setAttribute('aria-label', `${label}: ${score === null ? 'score unavailable' : `${score} out of ${scale}`}. ${context}.${url ? ' Opens in a new tab.' : ''}`);
  if (url) {
    row.href = url;
    row.target = '_blank';
    row.rel = 'noopener noreferrer';
    row.title = `${label} ${score === null ? 'listing' : 'score'} checked ${checked}. View the latest on ${label}.`;
  }
  return row;
}

export function ratingsPanelElement(rating, title) {
  const panel = document.createElement('section');
  panel.className = 'game-ratings-panel';
  panel.setAttribute('aria-label', `${title} ratings`);
  panel.append(personalRatingElement(rating?.personal ?? null),
    imdbRatingElement(rating?.imdb), metacriticRatingElement(rating?.metacritic));
  return panel;
}
