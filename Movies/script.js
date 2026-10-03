const API_KEY = '695f58d4f7262f94456eb8863dfacbde';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

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
const movieCache = new Map();
const trailerCache = new Map();
const movieLookup = new Map();
let currentPlatformResults = [];
let activeLayout = 'carousel';
let activeRandomData = null;

// ─── DOM ELEMENTS ───
const genreGrid = document.getElementById('genreGrid');
const platformGrid = document.getElementById('platformGrid');
const movieList = document.getElementById('movieList');
const resultsControlBar = document.getElementById('resultsControlBar');
const movieSearchInput = document.getElementById('movieSearchInput');
const sortSelect = document.getElementById('sortSelect');
const carouselViewBtn = document.getElementById('carouselViewBtn');
const gridViewBtn = document.getElementById('gridViewBtn');

const genreCountBadge = document.getElementById('genreCountBadge');
const platformCountBadge = document.getElementById('platformCountBadge');
const activeFilterSummary = document.getElementById('activeFilterSummary');

const randomMovieModal = document.getElementById('randomMovieModal');
const randomModalBody = document.getElementById('randomModalBody');
const movieDetailsModal = document.getElementById('movieDetailsModal');
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

function toggleWatched(movie) {
  if (!movie || !movie.id) return false;
  let list = getWatchedTitles();
  const exists = list.some(w => String(w.id) === String(movie.id));

  if (exists) {
    list = list.filter(w => String(w.id) !== String(movie.id));
  } else {
    list.unshift({
      id: movie.id,
      title: movie.title || 'Untitled',
      type: 'movie',
      poster: movie.poster || (movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : FALLBACK_POSTER),
      rating: movie.vote_average ? movie.vote_average.toFixed(1) : (movie.rating || 'NR'),
      year: (movie.release_date || '').slice(0, 4) || (movie.year || 'N/A'),
      overview: movie.overview || '',
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

// ─── MOVIE FORMATTER ───
function formatMovie(m) {
  return {
    ...m,
    title: m.title || 'Untitled',
    poster: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : FALLBACK_POSTER,
    year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A',
    rating: m.vote_average ? m.vote_average.toFixed(1) : 'NR',
    votes: m.vote_count ? `(${m.vote_count.toLocaleString()} votes)` : '',
    overview: m.overview || 'No synopsis available for this title.',
    genreNames: (m.genre_ids || []).map(id => genreMap[id]).filter(Boolean),
    platform: platforms.find(p => p.id === m.platformId) || platforms[0]
  };
}

// ─── TRAILER RESOLVER ───
async function getDirectTrailerUrl(id, fallbackTitle = '', fallbackYear = '') {
  if (trailerCache.has(id)) return trailerCache.get(id);

  try {
    const res = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}&language=en-US`);
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

  const query = encodeURIComponent(`${fallbackTitle} ${fallbackYear} official trailer`.trim());
  const fallbackUrl = `https://www.youtube.com/results?search_query=${query}`;
  trailerCache.set(id, fallbackUrl);
  return fallbackUrl;
}

// ─── GENRES & PLATFORMS ───
async function fetchGenres() {
  try {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en`);
    const data = await res.json();
    genres = data.genres || [];
    genres.forEach(g => { genreMap[g.id] = g.name; });
    renderGenres();
  } catch (err) {
    console.error('Error fetching genres:', err);
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

// ─── MOVIE FETCHING ───
async function fetchMoviesForPlatform(platformId, pageLimit = 3) {
  const genreIds = Array.from(selectedGenres).sort().join(',');
  const cacheKey = `${platformId}_genres_${genreIds}_pages_${pageLimit}`;
  if (movieCache.has(cacheKey)) return { platformId, results: movieCache.get(cacheKey) };

  const genreParam = genreIds ? `&with_genres=${genreIds}` : '';
  const providers = platformId === 122 ? [122, 315] : [platformId];

  const fetchPromises = [];
  for (const prov of providers) {
    for (let page = 1; page <= pageLimit; page++) {
      const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}${genreParam}&with_watch_providers=${prov}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=15&page=${page}`;
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

  for (const movie of raw.flat()) {
    if (movie?.id && movie.poster_path && !seenIds.has(movie.id)) {
      seenIds.add(movie.id);
      movie.platformId = platformId;
      movieLookup.set(movie.id, movie);
      results.push(movie);
    }
  }

  movieCache.set(cacheKey, results);
  return { platformId, results };
}

// ─── FILTERING & SORTING ───
const sortComparators = {
  rating: (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
  newest: (a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0),
  title: (a, b) => (a.title || '').localeCompare(b.title || ''),
  popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0)
};

function applyFiltersAndSort() {
  const query = movieSearchInput?.value.trim().toLowerCase() || '';
  const comparator = sortComparators[sortSelect?.value] || sortComparators.popularity;

  const filtered = currentPlatformResults.map(({ platformId, results }) => {
    const matched = query ? results.filter(m => (m.title || '').toLowerCase().includes(query)) : results;
    return { platformId, results: [...matched].sort(comparator) };
  });

  renderPlatformResults(filtered);
}

// ─── SHOW RESULTS (LIST VIEW) ───
async function showResults() {
  if (selectedPlatforms.size === 0) {
    showToast('Please select at least 1 streaming platform');
    movieList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">⚠️</div>
        <h4>No platform selected</h4>
        <p>Please select at least one streaming platform above (or click <strong>Select All</strong>) to view available movies.</p>
      </div>
    `;
    if (resultsControlBar) resultsControlBar.style.display = 'none';
    return;
  }

  movieList.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 30px;">
      <div style="display: flex; gap: 16px; overflow-x: hidden;">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    </div>
  `;

  try {
    const promises = Array.from(selectedPlatforms).map(pid => fetchMoviesForPlatform(pid, 3));
    currentPlatformResults = await Promise.all(promises);
    const totalFound = currentPlatformResults.reduce((sum, p) => sum + p.results.length, 0);

    if (totalFound === 0) {
      movieList.innerHTML = `
        <div class="hint-box">
          <div class="hint-icon">🎬</div>
          <h4>No movies found</h4>
          <p>We couldn't find any titles matching the selected genres and platforms. Try removing a genre filter for broader options.</p>
        </div>
      `;
      if (resultsControlBar) resultsControlBar.style.display = 'none';
      return;
    }

    if (resultsControlBar) resultsControlBar.style.display = 'flex';
    applyFiltersAndSort();
    showToast(`Loaded ${totalFound} titles across ${selectedPlatforms.size} platforms`);
  } catch (error) {
    console.error('Error fetching movies:', error);
    movieList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">❌</div>
        <h4>Network Error</h4>
        <p>Failed to load movies. Please check your internet connection and try again.</p>
      </div>
    `;
  }
}

// ─── CARD HTML BUILDERS ───
function createMovieCardHTML(movie, platformName) {
  const m = formatMovie(movie);
  const watchedBadge = isWatched(m.id) ? '<div class="card-watched-badge" title="Marked as Watched">✓ Watched</div>' : '';

  return `
    <article class="movie-card" data-id="${m.id}">
      <div class="poster-wrapper">
        <img class="movie-poster" src="${m.poster}" alt="${m.title}" loading="lazy" onerror="this.src='${FALLBACK_POSTER}'" />
        <div class="card-rating-badge">⭐ ${m.rating}</div>
        ${watchedBadge}
        <div class="card-overlay">
          <button class="quick-view-btn" type="button">Quick View</button>
        </div>
      </div>
      <div class="movie-info">
        <h4 class="movie-title" title="${m.title}">${m.title}</h4>
        <div class="movie-meta-row">
          <span class="movie-year">${m.year}</span>
          <span style="color: var(--text-dim); font-size: 0.75rem;">${platformName}</span>
        </div>
      </div>
    </article>
  `;
}

function renderPlatformResults(platformResults) {
  movieList.innerHTML = '';
  let renderedCount = 0;
  const isCarousel = activeLayout === 'carousel';

  platformResults.forEach(({ platformId, results }) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform || results.length === 0) return;
    renderedCount += results.length;

    const section = document.createElement('div');
    section.className = 'platform-section';
    section.id = `platform-section-${platformId}`;
    section.innerHTML = `
      <div class="platform-header-row">
        <div class="platform-title-badge">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${platform.color};"></span>
          <h2 class="platform-title">${platform.name}</h2>
          <span class="platform-item-count">${results.length} movies</span>
        </div>
        ${isCarousel ? `
          <div class="carousel-nav-btns">
            <button class="carousel-nav-btn" data-action="prev" data-target="carousel-${platformId}" title="Scroll Left">‹</button>
            <button class="carousel-nav-btn" data-action="next" data-target="carousel-${platformId}" title="Scroll Right">›</button>
          </div>
        ` : ''}
      </div>
      <div class="cards-container ${isCarousel ? '' : 'grid-layout'}" id="carousel-${platformId}">
        ${results.map(movie => createMovieCardHTML(movie, platform.name)).join('')}
      </div>
    `;
    movieList.appendChild(section);
  });

  if (renderedCount === 0) {
    movieList.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">🔍</div>
        <h4>No matching titles</h4>
        <p>No titles matched your search query in the current results.</p>
      </div>
    `;
  }
}

// ─── MODAL CARD BUILDERS ───
function createSpotlightCardHTML(movie, platform, trailerUrl) {
  const m = formatMovie(movie);
  const color = platform?.color || m.platform.color;
  const name = platform?.name || m.platform.name;
  const genreTags = m.genreNames.length > 0 ? `<span>🏷️ ${m.genreNames.slice(0, 3).join(', ')}</span>` : '';
  const watched = isWatched(m.id);

  return `
    <div class="spotlight-card">
      <div>
        <img class="spotlight-poster" src="${m.poster}" alt="${m.title}" onerror="this.src='${FALLBACK_POSTER}'" />
      </div>
      <div class="spotlight-details">
        <span class="spotlight-platform-pill" style="background: ${color}25; color: #fff; border: 1px solid ${color};">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
          Streaming on ${name}
        </span>

        <h2 class="spotlight-title">${m.title}</h2>

        <div class="spotlight-meta">
          <span class="rating">⭐ ${m.rating} <small style="color: var(--text-dim); font-size: 0.78rem;">${m.votes}</small></span>
          <span>📅 ${m.year}</span>
          ${genreTags}
        </div>

        <p class="spotlight-overview">${m.overview}</p>

        <div class="spotlight-actions">
          <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
            <span>▶</span>
            <span>Watch Trailer on YouTube</span>
          </a>
          <button type="button" class="btn-watched ${watched ? 'active' : ''}" data-id="${m.id}" id="modalWatchedBtn">
            <span>${watched ? '✓ Watched' : '+ Mark as Watched'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function createDetailCardHTML(movie, platform, trailerUrl) {
  const m = formatMovie(movie);
  const color = platform?.color || m.platform.color;
  const name = platform?.name || m.platform.name;
  const genreBadges = m.genreNames.length > 0 ? `
    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
      ${m.genreNames.map(g => `<span class="selection-badge" style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #e2e8f0;">${g}</span>`).join('')}
    </div>
  ` : '';
  const watched = isWatched(m.id);

  return `
    <div class="spotlight-card" style="margin-bottom: 0;">
      <div>
        <img class="spotlight-poster" src="${m.poster}" alt="${m.title}" onerror="this.src='${FALLBACK_POSTER}'" />
      </div>
      <div class="spotlight-details">
        <span class="spotlight-platform-pill" style="background: ${color}25; color: #fff; border: 1px solid ${color};">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
          Available on ${name}
        </span>

        <h3 class="spotlight-title" style="font-size: 1.6rem;">${m.title}</h3>

        <div class="spotlight-meta">
          <span class="rating">⭐ ${m.rating} <small style="color: var(--text-dim); font-size: 0.78rem;">${m.votes}</small></span>
          <span>📅 ${m.year}</span>
          <span>🔥 Pop: ${Math.round(movie.popularity || 0)}</span>
        </div>

        ${genreBadges}

        <p class="spotlight-overview" style="-webkit-line-clamp: 6;">${m.overview}</p>

        <div class="spotlight-actions">
          <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
            <span>▶</span>
            <span>Watch Trailer on YouTube</span>
          </a>
          <button type="button" class="btn-watched ${watched ? 'active' : ''}" data-id="${m.id}" id="modalWatchedBtn">
            <span>${watched ? '✓ Watched' : '+ Mark as Watched'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── RANDOM PICKER LOGIC ───
function pickWeightedRandomItem(items) {
  if (!items || items.length === 0) return null;
  const weights = items.map(m => Math.max(((m.vote_average || 5) * 0.7) + (Math.min(m.popularity || 10, 100) * 0.3), 0.5));
  let rand = Math.random() * weights.reduce((sum, w) => sum + w, 0);

  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[0];
}

async function getRandomMovieRecommendations() {
  const pids = selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : platforms.map(p => p.id);
  const results = await Promise.all(pids.map(pid => fetchMoviesForPlatform(pid, 2)));

  const platformPicks = [];
  const allEligibleMovies = [];

  for (const { platformId, results: movies } of results) {
    if (movies.length > 0) {
      const movie = pickWeightedRandomItem(movies);
      if (movie) {
        platformPicks.push({ platform: platforms.find(p => p.id === platformId), movie });
        allEligibleMovies.push(...movies);
      }
    }
  }

  if (platformPicks.length === 0) return null;

  const spotlightMovie = pickWeightedRandomItem(allEligibleMovies);
  const spotlightPlatform = platforms.find(p => p.id === spotlightMovie.platformId) || platforms[0];

  return {
    spotlight: { movie: spotlightMovie, platform: spotlightPlatform },
    platformPicks
  };
}

async function openRandomModal() {
  randomMovieModal.classList.add('active');
  randomModalBody.innerHTML = `
    <div class="modal-loading-state">
      <div class="dice-spinner">🎲</div>
      <h3>Rolling the decider...</h3>
      <p>Finding the highest rated movies across your streaming platforms!</p>
    </div>
  `;

  try {
    const data = await getRandomMovieRecommendations();
    if (!data) {
      randomModalBody.innerHTML = `
        <div class="hint-box">
          <div class="hint-icon">😕</div>
          <h4>No Movies Found</h4>
          <p>Could not find any movies with the selected filters. Try unchecking some genres.</p>
        </div>
      `;
      return;
    }
    await renderRandomModalContent(data);
  } catch (err) {
    console.error('Error fetching random movie:', err);
    randomModalBody.innerHTML = `
      <div class="hint-box">
        <div class="hint-icon">⚠️</div>
        <h4>Something went wrong</h4>
        <p>Could not fetch recommendations. Please try again.</p>
      </div>
    `;
  }
}

async function renderRandomModalContent(data) {
  activeRandomData = data;
  const { spotlight, platformPicks } = data;
  const { movie, platform } = spotlight;
  const trailerUrl = await getDirectTrailerUrl(movie.id, movie.title, movie.release_date?.slice(0, 4));

  randomModalBody.innerHTML = `
    ${createSpotlightCardHTML(movie, platform, trailerUrl)}

    <div class="modal-section-title">
      <span>Top Pick by Platform</span>
      <small style="color: var(--text-dim); font-weight: 400; font-size: 0.8rem;">Click any card to spotlight it</small>
    </div>

    <div class="platform-recommendations">
      ${platformPicks.map((item, index) => {
        const m = formatMovie(item.movie);
        return `
          <div class="modal-platform-card" data-index="${index}" style="cursor: pointer;">
            <div class="modal-platform-name">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.platform.color};"></span>
              <span>${item.platform.name}</span>
            </div>
            <img class="modal-movie-card-thumb" src="${m.poster}" alt="${m.title}" onerror="this.src='${FALLBACK_POSTER}'" />
            <h5 class="modal-movie-card-title">${m.title}</h5>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="modal-movie-card-rating">⭐ ${m.rating}</span>
              <span style="color: var(--text-dim); font-size: 0.75rem;">${m.year !== 'N/A' ? m.year : ''}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function reRandomize() {
  const reRandomizeIcon = document.getElementById('reRandomizeIcon');
  if (reRandomizeIcon) {
    reRandomizeIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => { reRandomizeIcon.style.transform = 'rotate(0deg)'; }, 400);
  }

  randomModalBody.innerHTML = `
    <div class="modal-loading-state">
      <div class="dice-spinner">🎲</div>
      <h3>Shuffling picks...</h3>
      <p>Spinning the wheel across your streaming services...</p>
    </div>
  `;

  const data = await getRandomMovieRecommendations();
  if (data) await renderRandomModalContent(data);
}

// ─── MOVIE DETAILS MODAL ───
async function openDetailModal(movie) {
  if (!movieDetailsModal) return;
  const platform = platforms.find(p => p.id === movie.platformId) || platforms[0];
  const trailerUrl = await getDirectTrailerUrl(movie.id, movie.title, movie.release_date?.slice(0, 4));

  if (detailModalTitle) detailModalTitle.textContent = movie.title || 'Movie Details';
  if (detailModalBody) {
    detailModalBody.innerHTML = createDetailCardHTML(movie, platform, trailerUrl);
  }
  movieDetailsModal.classList.add('active');
}

// ─── EVENT LISTENERS ───

// Filter Controls
document.getElementById('clearGenresBtn')?.addEventListener('click', () => {
  selectedGenres.clear();
  document.querySelectorAll('.genre-item').forEach(b => b.classList.remove('active'));
  updateBadges();
  showToast('Genres cleared');
});

document.getElementById('selectAllPlatformsBtn')?.addEventListener('click', () => {
  platforms.forEach(p => selectedPlatforms.add(p.id));
  document.querySelectorAll('.platform-item').forEach(b => b.classList.add('active'));
  updateBadges();
  showToast('All platforms selected');
});

document.getElementById('clearPlatformsBtn')?.addEventListener('click', () => {
  selectedPlatforms.clear();
  document.querySelectorAll('.platform-item').forEach(b => b.classList.remove('active'));
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

// Movie List Delegation (Carousel Navigation & Card Clicks)
movieList?.addEventListener('click', e => {
  const navBtn = e.target.closest('.carousel-nav-btn');
  if (navBtn) {
    const container = document.getElementById(navBtn.dataset.target);
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: navBtn.dataset.action === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
    return;
  }

  const card = e.target.closest('.movie-card');
  if (card && card.dataset.id) {
    const movie = movieLookup.get(Number(card.dataset.id));
    if (movie) openDetailModal(movie);
  }
});

// Spotlight Switcher in Random Modal
randomModalBody?.addEventListener('click', async e => {
  const card = e.target.closest('.modal-platform-card');
  if (card && card.dataset.index !== undefined && activeRandomData) {
    const item = activeRandomData.platformPicks[Number(card.dataset.index)];
    if (item) {
      await renderRandomModalContent({
        spotlight: { movie: item.movie, platform: item.platform },
        platformPicks: activeRandomData.platformPicks
      });
      showToast(`Spotlight switched to: ${item.movie.title || 'Untitled'}`);
    }
  }
});

// Primary Actions
document.getElementById('showResultsBtn')?.addEventListener('click', showResults);
document.getElementById('pickRandomBtn')?.addEventListener('click', openRandomModal);
document.getElementById('reRandomizeBtn')?.addEventListener('click', reRandomize);

// Modal Closing
const closeModals = () => {
  randomMovieModal?.classList.remove('active');
  movieDetailsModal?.classList.remove('active');
};
document.getElementById('closeModal')?.addEventListener('click', closeModals);
document.getElementById('closeDetailModal')?.addEventListener('click', closeModals);

window.addEventListener('click', e => {
  if (e.target === randomMovieModal || e.target === movieDetailsModal) closeModals();
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModals();
});

// Search and Sort
let searchTimeout;
movieSearchInput?.addEventListener('input', () => {
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
  const movie = movieLookup.get(id) || { id };
  const isNowWatched = toggleWatched(movie);

  btn.classList.toggle('active', isNowWatched);
  btn.innerHTML = `<span>${isNowWatched ? '✓ Watched' : '+ Mark as Watched'}</span>`;
  showToast(isNowWatched ? 'Marked as Watched' : 'Removed from Watched');

  const cardWrapper = document.querySelector(`.movie-card[data-id="${id}"] .poster-wrapper`);
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
