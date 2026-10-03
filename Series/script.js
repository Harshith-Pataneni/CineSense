const API_KEY = '695f58d4f7262f94456eb8863dfacbde';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&auto=format&fit=crop&q=60';

const platforms = [
  { id: 8, name: 'Netflix', color: '#e50914' },
  { id: 119, name: 'Prime Video', color: '#00a8e1' },
  { id: 122, name: 'Hotstar', color: '#2264d1' },
  { id: 237, name: 'SonyLIV', color: '#00b4d8' },
  { id: 232, name: 'Zee5', color: '#9333ea' }
];

// ─── APPLICATION STATE ───
let genres = [];
const genreMap = {};
const selectedGenres = new Set();
const selectedPlatforms = new Set();
const seriesCache = new Map();
const trailerCache = new Map();
const seriesLookup = new Map();
let currentPlatformResults = [];
let activeLayout = 'carousel';

// ─── DOM ELEMENTS ───
const genreGrid = document.getElementById('genreGrid');
const platformGrid = document.getElementById('platformGrid');
const seriesList = document.getElementById('seriesList');
const resultsControlBar = document.getElementById('resultsControlBar');
const seriesSearchInput = document.getElementById('seriesSearchInput');
const sortSelect = document.getElementById('sortSelect');
const carouselViewBtn = document.getElementById('carouselViewBtn');
const gridViewBtn = document.getElementById('gridViewBtn');

const genreCountBadge = document.getElementById('genreCountBadge');
const platformCountBadge = document.getElementById('platformCountBadge');
const activeFilterSummary = document.getElementById('activeFilterSummary');

const randomSeriesModal = document.getElementById('randomSeriesModal');
const randomModalBody = document.getElementById('randomModalBody');
const seriesDetailsModal = document.getElementById('seriesDetailsModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailModalBody = document.getElementById('detailModalBody');
const toast = document.getElementById('toastNotification');

// ─── WATCHED STORAGE (SHARED ACROSS APP) ───
const WATCHED_STORAGE_KEY = 'decider_watched_titles';

function getWatchedTitles() {
  try { return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '[]'); } catch (e) { return []; }
}

function isWatched(id) {
  if (!id) return false;
  return getWatchedTitles().some(item => String(item.id) === String(id));
}

function toggleWatched(show) {
  if (!show || !show.id) return false;
  let list = getWatchedTitles();
  const exists = list.some(w => String(w.id) === String(show.id));

  if (exists) {
    list = list.filter(w => String(w.id) !== String(show.id));
  } else {
    list.unshift({
      id: show.id,
      title: show.name || show.title || 'Untitled',
      type: 'tv',
      poster: show.poster || (show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : FALLBACK_POSTER),
      rating: show.vote_average ? show.vote_average.toFixed(1) : (show.rating || 'NR'),
      year: (show.first_air_date || show.release_date || '').slice(0, 4) || (show.year || 'N/A'),
      overview: show.overview || '',
      watchedAt: new Date().toISOString()
    });
  }

  localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(list));
  return !exists;
}

// ─── TOAST NOTIFICATION ───
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── SERIES FORMATTER ───
function formatSeries(s) {
  return {
    ...s,
    name: s.name || 'Untitled',
    poster: s.poster_path ? `${IMAGE_BASE_URL}${s.poster_path}` : FALLBACK_POSTER,
    year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'N/A',
    rating: s.vote_average ? s.vote_average.toFixed(1) : 'NR',
    overview: s.overview || 'No synopsis available.',
    platform: platforms.find(p => p.id === s.platformId) || platforms[0]
  };
}

// ─── TRAILER RESOLVER ───
async function getDirectTrailerUrl(id, fallbackTitle = '', fallbackYear = '') {
  if (trailerCache.has(id)) return trailerCache.get(id);

  try {
    const res = await fetch(`${BASE_URL}/tv/${id}/videos?api_key=${API_KEY}&language=en-US`);
    if (res.ok) {
      const data = await res.json();
      const yt = (data.results || []).filter(v => v.site === 'YouTube' && v.key);
      const match = yt.find(v => v.type === 'Trailer' && v.official)
                 || yt.find(v => v.type === 'Trailer')
                 || yt[0];
      if (match) {
        const url = `https://www.youtube.com/watch?v=${match.key}`;
        trailerCache.set(id, url);
        return url;
      }
    }
  } catch (err) {
    console.error('Error fetching trailer for id', id, err);
  }

  const query = encodeURIComponent(`${fallbackTitle} ${fallbackYear} trailer`.trim());
  const fallbackUrl = `https://www.youtube.com/results?search_query=${query}`;
  trailerCache.set(id, fallbackUrl);
  return fallbackUrl;
}

// ─── GENRES & PLATFORMS ───
async function fetchGenres() {
  try {
    const res = await fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=en`);
    const data = await res.json();
    genres = data.genres || [];
    genres.forEach(g => { genreMap[g.id] = g.name; });
    renderGenres();
  } catch (error) {
    console.error('Error fetching TV genres:', error);
  }
}

function renderGenres() {
  if (!genreGrid) return;
  genreGrid.innerHTML = genres.map(g => `
    <button type="button" class="genre-item ${selectedGenres.has(g.id) ? 'active' : ''}" data-id="${g.id}">${g.name}</button>
  `).join('');
}

function renderPlatforms() {
  if (!platformGrid) return;
  platformGrid.innerHTML = platforms.map(p => `
    <button type="button" class="platform-item ${selectedPlatforms.has(p.id) ? 'active' : ''}" data-id="${p.id}">
      <span class="platform-dot"></span>
      <span>${p.name}</span>
    </button>
  `).join('');
}

function updateBadges() {
  if (genreCountBadge) genreCountBadge.textContent = `${selectedGenres.size} selected`;
  if (platformCountBadge) platformCountBadge.textContent = `${selectedPlatforms.size} selected`;
  if (activeFilterSummary) {
    const p = selectedPlatforms.size;
    const g = selectedGenres.size;
    activeFilterSummary.textContent = (p === 0 && g === 0) ? 'All Available' : `${p} platforms, ${g} genres`;
  }
}

// ─── SERIES FETCHING ───
async function fetchSeriesForPlatform(platformId, pageLimit = 3) {
  const genreIds = Array.from(selectedGenres).sort().join(',');
  const cacheKey = `${platformId}_tv_genres_${genreIds}_pages_${pageLimit}`;
  if (seriesCache.has(cacheKey)) return { platformId, results: seriesCache.get(cacheKey) };

  const genreParam = genreIds ? `&with_genres=${genreIds}` : '';
  const providers = platformId === 122 ? [122, 315] : [platformId];

  const fetchPromises = [];
  for (const prov of providers) {
    for (let page = 1; page <= pageLimit; page++) {
      const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}${genreParam}&with_watch_providers=${prov}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
      fetchPromises.push(
        fetch(url)
          .then(res => res.ok ? res.json() : null)
          .then(data => data?.results || [])
          .catch(() => [])
      );
    }
  }

  const raw = await Promise.all(fetchPromises);
  const seenIds = new Set();
  const results = [];

  for (const show of raw.flat()) {
    if (show?.id && show.poster_path && !seenIds.has(show.id)) {
      seenIds.add(show.id);
      show.platformId = platformId;
      seriesLookup.set(show.id, show);
      results.push(show);
    }
  }

  seriesCache.set(cacheKey, results);
  return { platformId, results };
}

// ─── FILTERING & SORTING ───
const sortComparators = {
  rating: (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
  newest: (a, b) => new Date(b.first_air_date || 0) - new Date(a.first_air_date || 0),
  title: (a, b) => (a.name || '').localeCompare(b.name || ''),
  popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0)
};

function applyFiltersAndSort() {
  const query = seriesSearchInput?.value.trim().toLowerCase() || '';
  const comparator = sortComparators[sortSelect?.value] || sortComparators.popularity;

  const filtered = currentPlatformResults.map(({ platformId, results }) => {
    const matched = query ? results.filter(s => (s.name || '').toLowerCase().includes(query)) : results;
    return { platformId, results: [...matched].sort(comparator) };
  });

  renderPlatformResults(filtered);
}

// ─── SHOW RESULTS (LIST VIEW) ───
async function showResults() {
  if (selectedPlatforms.size === 0) {
    showToast('Please select at least 1 streaming platform');
    seriesList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">⚠️</div>
        <h4>No platform selected</h4>
        <p>Please select at least one streaming platform above to view available TV series.</p>
      </div>
    `;
    if (resultsControlBar) resultsControlBar.style.display = 'none';
    return;
  }

  seriesList.innerHTML = `
    <div style="display: flex; gap: 16px; overflow-x: hidden;">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  `;

  try {
    const promises = Array.from(selectedPlatforms).map(pid => fetchSeriesForPlatform(pid, 3));
    currentPlatformResults = await Promise.all(promises);
    const totalFound = currentPlatformResults.reduce((sum, p) => sum + p.results.length, 0);

    if (totalFound === 0) {
      seriesList.innerHTML = `
        <div class="hint-box">
          <div class="hint-icon">📺</div>
          <h4>No series found</h4>
          <p>We couldn't find any TV shows matching the selected genres. Try clearing some filters.</p>
        </div>
      `;
      if (resultsControlBar) resultsControlBar.style.display = 'none';
      return;
    }

    if (resultsControlBar) resultsControlBar.style.display = 'flex';
    applyFiltersAndSort();
    showToast(`Loaded ${totalFound} TV series`);
  } catch (error) {
    console.error('Error fetching series:', error);
    seriesList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">❌</div>
        <h4>Network Error</h4>
        <p>Failed to load series. Please check your connection.</p>
      </div>
    `;
  }
}

// ─── CARD HTML BUILDERS ───
function createSeriesCardHTML(show, platformName) {
  const s = formatSeries(show);
  const watchedBadge = isWatched(s.id) ? '<div class="card-watched-badge" title="Marked as Watched">✓ Watched</div>' : '';

  return `
    <article class="series-card" data-id="${s.id}">
      <div class="poster-wrapper">
        <img class="series-poster" src="${s.poster}" alt="${s.name}" loading="lazy" onerror="this.src='${FALLBACK_POSTER}'" />
        <div class="card-rating-badge">⭐ ${s.rating}</div>
        ${watchedBadge}
        <div class="card-overlay">
          <button class="quick-view-btn" type="button">Quick View</button>
        </div>
      </div>
      <div class="series-info">
        <h4 class="series-title" title="${s.name}">${s.name}</h4>
        <div class="series-meta-row">
          <span class="series-year">${s.year}</span>
          <span style="color: var(--text-dim); font-size: 0.75rem;">${platformName}</span>
        </div>
      </div>
    </article>
  `;
}

function renderPlatformResults(platformResults) {
  seriesList.innerHTML = '';
  let count = 0;
  const isCarousel = activeLayout === 'carousel';

  platformResults.forEach(({ platformId, results }) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform || results.length === 0) return;
    count += results.length;

    const section = document.createElement('div');
    section.className = 'platform-section';
    section.innerHTML = `
      <div class="platform-header-row">
        <div class="platform-title-badge">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${platform.color};"></span>
          <h2 class="platform-title">${platform.name}</h2>
          <span class="platform-item-count">${results.length} series</span>
        </div>
        ${isCarousel ? `
          <div class="carousel-nav-btns">
            <button class="carousel-nav-btn" data-action="prev" data-target="carousel-${platformId}">‹</button>
            <button class="carousel-nav-btn" data-action="next" data-target="carousel-${platformId}">›</button>
          </div>
        ` : ''}
      </div>
      <div class="cards-container ${isCarousel ? '' : 'grid-layout'}" id="carousel-${platformId}">
        ${results.map(show => createSeriesCardHTML(show, platform.name)).join('')}
      </div>
    `;
    seriesList.appendChild(section);
  });

  if (count === 0) {
    seriesList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">🔍</div>
        <h4>No matching TV series</h4>
        <p>No titles matched your search query in the current results.</p>
      </div>
    `;
  }
}

// ─── RANDOM PICKER LOGIC ───
function pickWeightedRandom(items) {
  if (!items || items.length === 0) return null;
  const weights = items.map(item => Math.max(((item.vote_average || 5) * 0.7) + (Math.min(item.popularity || 10, 100) * 0.3), 0.5));
  let rand = Math.random() * weights.reduce((sum, w) => sum + w, 0);

  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[0];
}

async function getRandomSeriesRecommendations() {
  const pids = selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : platforms.map(p => p.id);
  const results = await Promise.all(pids.map(pid => fetchSeriesForPlatform(pid, 2)));

  const platformPicks = [];
  const allEligible = [];

  for (const { platformId, results: shows } of results) {
    if (shows.length > 0) {
      const pick = pickWeightedRandom(shows);
      if (pick) {
        platformPicks.push({ platform: platforms.find(p => p.id === platformId), series: pick });
        allEligible.push(...shows);
      }
    }
  }

  if (platformPicks.length === 0) return null;
  const spotlightShow = pickWeightedRandom(allEligible);
  const spotlightPlatform = platforms.find(p => p.id === spotlightShow.platformId) || platforms[0];

  return { spotlight: { series: spotlightShow, platform: spotlightPlatform }, platformPicks };
}

async function openRandomModal() {
  if (!randomSeriesModal) return;
  randomSeriesModal.classList.add('active');
  randomModalBody.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 3rem; margin-bottom: 12px;">🎲</div>
      <h3>Picking a standout TV show...</h3>
      <p style="color: var(--text-muted);">Consulting the algorithm across your platforms...</p>
    </div>
  `;

  const data = await getRandomSeriesRecommendations();
  if (!data) {
    randomModalBody.innerHTML = `<div class="hint-box"><h4>No series found</h4></div>`;
    return;
  }
  await renderRandomModalContent(data);
}

async function renderRandomModalContent(data) {
  const { spotlight } = data;
  const s = formatSeries(spotlight.series);
  const platform = spotlight.platform;
  const trailerUrl = await getDirectTrailerUrl(s.id, s.name, s.year);
  const watched = isWatched(s.id);

  randomModalBody.innerHTML = `
    <div class="spotlight-card">
      <div>
        <img class="spotlight-poster" src="${s.poster}" alt="${s.name}" onerror="this.src='${FALLBACK_POSTER}'" />
      </div>
      <div class="spotlight-details">
        <span style="font-size: 0.8rem; font-weight: 700; color: ${platform.color}; margin-bottom: 8px;">
          Streaming on ${platform.name}
        </span>
        <h2 class="spotlight-title">${s.name}</h2>
        <div class="spotlight-meta">
          <span>⭐ ${s.rating}</span>
          <span>📅 ${s.year}</span>
        </div>
        <p class="spotlight-overview">${s.overview}</p>
        <div class="spotlight-actions">
          <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
            <span>▶</span>
            <span>Watch Trailer on YouTube</span>
          </a>
          <button type="button" class="btn-watched ${watched ? 'active' : ''}" data-id="${s.id}" id="modalWatchedBtn">
            <span>${watched ? '✓ Watched' : '+ Mark as Watched'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── SERIES DETAILS MODAL ───
async function openDetailModal(show) {
  if (!seriesDetailsModal) return;
  const s = formatSeries(show);
  const trailerUrl = await getDirectTrailerUrl(s.id, s.name, s.year);
  const watched = isWatched(s.id);

  if (detailModalTitle) detailModalTitle.textContent = s.name;
  if (detailModalBody) {
    detailModalBody.innerHTML = `
      <div class="spotlight-card" style="margin-bottom: 0;">
        <div>
          <img class="spotlight-poster" src="${s.poster}" alt="${s.name}" onerror="this.src='${FALLBACK_POSTER}'" />
        </div>
        <div class="spotlight-details">
          <h3 class="spotlight-title">${s.name}</h3>
          <div class="spotlight-meta">
            <span>⭐ ${s.rating}</span>
            <span>📅 ${s.year}</span>
          </div>
          <p class="spotlight-overview">${s.overview}</p>
          <div class="spotlight-actions">
            <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
              <span>▶</span>
              <span>Watch Trailer on YouTube</span>
            </a>
            <button type="button" class="btn-watched ${watched ? 'active' : ''}" data-id="${s.id}" id="modalWatchedBtn">
              <span>${watched ? '✓ Watched' : '+ Mark as Watched'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  seriesDetailsModal.classList.add('active');
}

// ─── EVENT LISTENERS ───

// Filter Controls
document.getElementById('clearGenresBtn')?.addEventListener('click', () => {
  selectedGenres.clear();
  document.querySelectorAll('.genre-item').forEach(btn => btn.classList.remove('active'));
  updateBadges();
  showToast('Genres cleared');
});

document.getElementById('selectAllPlatformsBtn')?.addEventListener('click', () => {
  platforms.forEach(p => selectedPlatforms.add(p.id));
  document.querySelectorAll('.platform-item').forEach(btn => btn.classList.add('active'));
  updateBadges();
  showToast('All platforms selected');
});

document.getElementById('clearPlatformsBtn')?.addEventListener('click', () => {
  selectedPlatforms.clear();
  document.querySelectorAll('.platform-item').forEach(btn => btn.classList.remove('active'));
  updateBadges();
  showToast('Platforms cleared');
});

// Selection Delegation
genreGrid?.addEventListener('click', e => {
  const btn = e.target.closest('.genre-item');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  selectedGenres.has(id) ? selectedGenres.delete(id) : selectedGenres.add(id);
  btn.classList.toggle('active', selectedGenres.has(id));
  updateBadges();
});

platformGrid?.addEventListener('click', e => {
  const btn = e.target.closest('.platform-item');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  selectedPlatforms.has(id) ? selectedPlatforms.delete(id) : selectedPlatforms.add(id);
  btn.classList.toggle('active', selectedPlatforms.has(id));
  updateBadges();
});

// Series List Delegation (Carousel Navigation & Card Clicks)
seriesList?.addEventListener('click', e => {
  const navBtn = e.target.closest('.carousel-nav-btn');
  if (navBtn) {
    const container = document.getElementById(navBtn.dataset.target);
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({ left: navBtn.dataset.action === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    }
    return;
  }

  const card = e.target.closest('.series-card');
  if (card && card.dataset.id) {
    const show = seriesLookup.get(Number(card.dataset.id));
    if (show) openDetailModal(show);
  }
});

// Primary Actions
document.getElementById('showResultsBtn')?.addEventListener('click', showResults);
document.getElementById('pickRandomBtn')?.addEventListener('click', openRandomModal);
document.getElementById('reRandomizeBtn')?.addEventListener('click', openRandomModal);

// Modal Closing
const closeModals = () => {
  randomSeriesModal?.classList.remove('active');
  seriesDetailsModal?.classList.remove('active');
};
document.getElementById('closeModal')?.addEventListener('click', closeModals);
document.getElementById('closeDetailModal')?.addEventListener('click', closeModals);

window.addEventListener('click', e => {
  if (e.target === randomSeriesModal || e.target === seriesDetailsModal) closeModals();
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModals();
});

// Search and Sort
let searchTimeout;
seriesSearchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFiltersAndSort, 200);
});
sortSelect?.addEventListener('change', applyFiltersAndSort);

// Layout Toggle
function setLayout(layout) {
  activeLayout = layout;
  carouselViewBtn?.classList.toggle('active', layout === 'carousel');
  gridViewBtn?.classList.toggle('active', layout === 'grid');
  applyFiltersAndSort();
}
carouselViewBtn?.addEventListener('click', () => setLayout('carousel'));
gridViewBtn?.addEventListener('click', () => setLayout('grid'));

// Watched Toggle Delegation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#modalWatchedBtn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const show = seriesLookup.get(id) || { id };
  const isNowWatched = toggleWatched(show);

  btn.classList.toggle('active', isNowWatched);
  btn.innerHTML = `<span>${isNowWatched ? '✓ Watched' : '+ Mark as Watched'}</span>`;
  showToast(isNowWatched ? 'Marked as Watched' : 'Removed from Watched');

  const cardWrapper = document.querySelector(`.series-card[data-id="${id}"] .poster-wrapper`);
  if (cardWrapper) {
    let badge = cardWrapper.querySelector('.card-watched-badge');
    if (isNowWatched && !badge) {
      const b = document.createElement('div');
      b.className = 'card-watched-badge';
      b.title = 'Marked as Watched';
      b.textContent = '✓ Watched';
      cardWrapper.appendChild(b);
    } else if (!isNowWatched && badge) {
      badge.remove();
    }
  }
});

// ─── INITIALIZATION ───
fetchGenres();
renderPlatforms();
updateBadges();
