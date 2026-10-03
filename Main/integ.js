// ─── API CONFIGURATION & CONSTANTS ───
const API_KEY = '695f58d4f7262f94456eb8863dfacbde';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

const platforms = [
  { id: 8, name: 'Netflix', color: '#e50914' },
  { id: 119, name: 'Prime Video', color: '#00a8e1' },
  { id: 122, name: 'Disney+ Hotstar', color: '#2264d1' },
  { id: 237, name: 'SonyLIV', color: '#00b4d8' },
  { id: 232, name: 'Zee5', color: '#9333ea' }
];

// ─── WATCHED TITLES STORAGE (SHARED ACROSS APP) ───
const WATCHED_STORAGE_KEY = 'decider_watched_titles';

function getWatchedTitles() {
  try {
    return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function isWatched(id) {
  if (!id) return false;
  return getWatchedTitles().some(item => String(item.id) === String(id));
}

function toggleWatched(item) {
  if (!item || !item.id) return false;
  let list = getWatchedTitles();
  const exists = list.some(w => String(w.id) === String(item.id));

  if (exists) {
    list = list.filter(w => String(w.id) !== String(item.id));
  } else {
    list.unshift({
      id: item.id,
      title: item.title || item.name || 'Untitled',
      type: item.type || (item.title ? 'movie' : 'tv'),
      poster: item.poster || (item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : FALLBACK_POSTER),
      rating: item.rating || (item.vote_average ? item.vote_average.toFixed(1) : 'NR'),
      year: item.year || (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A',
      overview: item.overview || '',
      watchedAt: new Date().toISOString()
    });
  }

  localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(list));
  updateWatchedUI();
  return !exists; // returns true if now marked as watched
}

function clearWatchedHistory() {
  localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify([]));
  updateWatchedUI();
}

// ─── SIDEBAR & MY HUB MANAGEMENT ───
const toggle = document.getElementById('sidebar-toggle');
const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.overlay');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const openSidebarNavBtn = document.getElementById('openSidebarNavBtn');
const closeSidebarXBtn = document.getElementById('closeSidebarXBtn');

function setSidebarOpen(open) {
  document.body.classList.toggle('sidebar-open', open);
  if (toggle) toggle.checked = open;
}

if (toggle) {
  toggle.addEventListener('change', () => {
    document.body.classList.toggle('sidebar-open', toggle.checked);
  });
}

openSidebarNavBtn?.addEventListener('click', () => setSidebarOpen(true));
openSidebarBtn?.addEventListener('click', () => setSidebarOpen(true));
closeSidebarXBtn?.addEventListener('click', () => setSidebarOpen(false));
overlay?.addEventListener('click', () => setSidebarOpen(false));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
    setSidebarOpen(false);
  }
});

// Hub Tab Switching
const hubTabs = document.querySelectorAll('.hub-tab');
const hubPanels = document.querySelectorAll('.hub-panel');

hubTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    hubTabs.forEach(t => t.classList.toggle('active', t === tab));
    hubPanels.forEach(p => p.classList.toggle('active', p.id === `${tabName}Panel`));

    if (tabName === 'recommended') loadRecommendedTab();
    if (tabName === 'popular') loadPopularTab();
  });
});

// Update Watched UI & Badges
function updateWatchedUI() {
  const list = getWatchedTitles();
  const count = list.length;

  const countBadge = document.getElementById('watchedCountBadge');
  const tabBadge = document.getElementById('watchedTabBadge');
  if (countBadge) countBadge.textContent = count;
  if (tabBadge) tabBadge.textContent = count;

  const watchedList = document.getElementById('watchedList');
  if (!watchedList) return;

  if (count === 0) {
    watchedList.innerHTML = `
      <div class="hub-empty-state">
        <span style="font-size: 2.2rem;">🍿</span>
        <h4>No watched titles yet</h4>
        <p>Click "Mark as Watched" on any movie or series to keep track of your viewing history here!</p>
      </div>
    `;
    return;
  }

  watchedList.innerHTML = list.map(item => `
    <div class="sidebar-media-item" data-id="${item.id}" data-type="${item.type}">
      <img src="${item.poster || FALLBACK_POSTER}" class="sidebar-media-thumb" alt="${item.title}" onerror="this.src='${FALLBACK_POSTER}'" />
      <div class="sidebar-media-info">
        <div class="sidebar-media-title" title="${item.title}">${item.title}</div>
        <div class="sidebar-media-meta">
          <span>⭐ ${item.rating}</span>
          <span>📅 ${item.year}</span>
          <span class="sidebar-media-type">${item.type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
      </div>
      <button type="button" class="btn-remove-watched" data-id="${item.id}" title="Remove from watched">&times;</button>
    </div>
  `).join('');

  // Remove single watched item handler
  watchedList.querySelectorAll('.btn-remove-watched').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentList = getWatchedTitles().filter(w => String(w.id) !== String(id));
      localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(currentList));
      updateWatchedUI();
    });
  });

  // Clicking an item in the watched list opens detail modal
  watchedList.querySelectorAll('.sidebar-media-item').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const found = getWatchedTitles().find(w => String(w.id) === String(id));
      if (found) {
        showItemDetailsModal(found);
      }
    });
  });
}

document.getElementById('clearWatchedBtn')?.addEventListener('click', () => {
  if (confirm('Clear all watched history?')) {
    clearWatchedHistory();
  }
});

// Recommended & Popular Tab Loaders
let recommendedLoaded = false;
let popularLoaded = false;

async function loadRecommendedTab() {
  if (recommendedLoaded) return;
  const container = document.getElementById('recommendedList');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; padding: 30px;"><div class="dice-spinner" style="font-size: 2rem;">🎲</div><p style="font-size: 0.85rem; color: var(--text-muted);">Finding top recommendations...</p></div>`;

  try {
    const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}`);
    const data = await res.json();
    const items = (data.results || []).filter(item => item && item.poster_path).slice(0, 10);
    renderSidebarItems(container, items);
    recommendedLoaded = true;
  } catch (e) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-dim); padding: 20px;">Could not load recommendations.</p>`;
  }
}

async function loadPopularTab() {
  if (popularLoaded) return;
  const container = document.getElementById('popularList');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; padding: 30px;"><div class="dice-spinner" style="font-size: 2rem;">🔥</div><p style="font-size: 0.85rem; color: var(--text-muted);">Loading trending titles...</p></div>`;

  try {
    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=100&page=1`);
    const data = await res.json();
    const items = (data.results || []).filter(item => item && item.poster_path).slice(0, 10);
    renderSidebarItems(container, items, 'movie');
    popularLoaded = true;
  } catch (e) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-dim); padding: 20px;">Could not load popular titles.</p>`;
  }
}

function renderSidebarItems(container, items, defaultType = null) {
  container.innerHTML = items.map(item => {
    const title = item.title || item.name || 'Untitled';
    const type = item.media_type || defaultType || (item.title ? 'movie' : 'tv');
    const year = (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
    const poster = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : FALLBACK_POSTER;

    return `
      <div class="sidebar-media-item" data-id="${item.id}" data-type="${type}">
        <img src="${poster}" class="sidebar-media-thumb" alt="${title}" onerror="this.src='${FALLBACK_POSTER}'" />
        <div class="sidebar-media-info">
          <div class="sidebar-media-title" title="${title}">${title}</div>
          <div class="sidebar-media-meta">
            <span>⭐ ${rating}</span>
            <span>📅 ${year}</span>
            <span class="sidebar-media-type">${type === 'tv' ? 'Series' : 'Film'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.sidebar-media-item').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const found = items.find(m => String(m.id) === String(id));
      if (found) {
        showItemDetailsModal({
          id: found.id,
          title: found.title || found.name,
          type: found.media_type || defaultType || (found.title ? 'movie' : 'tv'),
          poster: found.poster_path ? `${IMAGE_BASE_URL}${found.poster_path}` : FALLBACK_POSTER,
          rating: found.vote_average ? found.vote_average.toFixed(1) : 'NR',
          year: (found.release_date || found.first_air_date || '').slice(0, 4),
          overview: found.overview || ''
        });
      }
    });
  });
}

// ─── AUTH GUARD + USER BAR ───
const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
if (tokenParam) {
  localStorage.setItem('token', tokenParam);
  try {
    const payload = JSON.parse(atob(tokenParam.split('.')[1]));
    if (payload.email) localStorage.setItem('userEmail', payload.email);
    if (payload.name) localStorage.setItem('userName', payload.name);
  } catch (e) {}
  window.history.replaceState({}, document.title, window.location.pathname);
}
if (!localStorage.getItem('token')) {
  window.location.href = '../Login/login.html';
}

const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User';
const userEmail = localStorage.getItem('userEmail') || '';
const initials = userName.slice(0, 2).toUpperCase();

const userAvatar = document.getElementById('userAvatar');
const userNameText = document.getElementById('userNameText');
const menuName = document.getElementById('menuName');
const menuEmail = document.getElementById('menuEmail');

if (userAvatar) userAvatar.textContent = initials;
if (userNameText) userNameText.textContent = userName;
if (menuName) menuName.textContent = userName;
if (menuEmail) menuEmail.textContent = userEmail;

const userBar = document.getElementById('userBar');
const userBarBtn = document.getElementById('userBarBtn');
if (userBar && userBarBtn) {
  userBarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userBar.classList.toggle('open');
    userBarBtn.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', (e) => {
    if (!userBar.contains(e.target)) {
      userBar.classList.remove('open');
      userBarBtn.setAttribute('aria-expanded', false);
    }
  });
}

document.getElementById('switchAccountBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  window.location.href = '../Login/login.html';
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  window.location.href = '../Login/login.html';
});

// Category cards navigation
const moviesCard = document.querySelector('.card-movies');
const seriesCard = document.querySelector('.card-series');
moviesCard?.addEventListener('click', () => { window.location.href = '../Movies/index.html'; });
seriesCard?.addEventListener('click', () => { window.location.href = '../Series/index.html'; });

// ─── DECIDER MODAL CONTROLLER ───
const modal = document.getElementById('deciderModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal(title, htmlContent) {
  if (!modal) return;
  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = htmlContent;
  modal.classList.add('active');
}

function closeModal() {
  if (modal) modal.classList.remove('active');
}

closeModalBtn?.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─── API HELPERS (RESILIENT & GUARANTEED RESULTS) ───
async function fetchRandomItem(type = 'movie', platformId = null) {
  // Provider 315 is Disney+ Hotstar in India (122 is alias)
  const provider = platformId === 122 ? '315|122' : platformId;
  const provParam = platformId ? `&with_watch_providers=${encodeURIComponent(provider)}&watch_region=IN` : '';

  // Random page 1 or 2
  const page = Math.floor(Math.random() * 2) + 1;
  let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}${provParam}&sort_by=popularity.desc&vote_count.gte=5&page=${page}`;

  try {
    let res = await fetch(url);
    let data = await res.json();
    let items = (data.results || []).filter(item => item && item.poster_path);

    // Reliable fallback: if random page yielded no items, always fallback to page 1
    if (!items.length) {
      url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}${provParam}&sort_by=popularity.desc&page=1`;
      res = await fetch(url);
      data = await res.json();
      items = (data.results || []).filter(item => item && item.poster_path);
    }

    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
  }
}

async function getTrailerUrl(id, type, title, year) {
  try {
    const res = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=en-US`);
    if (res.ok) {
      const data = await res.json();
      const yt = (data.results || []).filter(v => v.site === 'YouTube' && v.key);
      const match = yt.find(v => v.type === 'Trailer' && v.official)
                 || yt.find(v => v.type === 'Trailer')
                 || yt[0];
      if (match) return `https://www.youtube.com/watch?v=${match.key}`;
    }
  } catch (e) {}
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year} trailer`.trim())}`;
}

function formatTitle(item, type, platform) {
  return {
    id: item.id,
    type,
    title: item.title || item.name || 'Untitled',
    year: (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A',
    rating: item.vote_average ? item.vote_average.toFixed(1) : 'NR',
    votes: item.vote_count ? item.vote_count.toLocaleString() : '',
    overview: item.overview || 'No synopsis available for this title.',
    poster: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : FALLBACK_POSTER,
    platform: platform || platforms.find(p => p.id === item.platformId) || platforms[Math.floor(Math.random() * platforms.length)]
  };
}

// ─── VIEW 1: PLATFORM CHOICE MODAL (MOVIE OR SERIES) ───
function showChoiceModal(platform) {
  openModal(`Select on ${platform.name}`, `
    <div class="platform-choice-view">
      <div class="choice-platform-pill" style="border-color: ${platform.color}; background: ${platform.color}25;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${platform.color};"></span>
        <span>${platform.name}</span>
      </div>
      <h3 class="choice-title">What would you like to watch?</h3>
      <p class="choice-subtitle">Pick whether you want a feature film or a TV series on ${platform.name}:</p>
      <div class="choice-buttons-grid">
        <button type="button" class="choice-btn" id="chooseMovieBtn">
          <span class="choice-icon">🎬</span>
          <span class="choice-label">Movie</span>
          <span class="choice-desc">Popular films, blockbusters & indie releases</span>
        </button>
        <button type="button" class="choice-btn" id="chooseSeriesBtn">
          <span class="choice-icon">📺</span>
          <span class="choice-label">TV Series</span>
          <span class="choice-desc">Binge-worthy seasons, miniseries & shows</span>
        </button>
      </div>
    </div>
  `);

  document.getElementById('chooseMovieBtn')?.addEventListener('click', () => {
    loadAndShowRecommendation('movie', platform, 'platform');
  });

  document.getElementById('chooseSeriesBtn')?.addEventListener('click', () => {
    loadAndShowRecommendation('tv', platform, 'platform');
  });
}

// ─── VIEW 2: RECOMMENDATION SPOTLIGHT MODAL ───
async function loadAndShowRecommendation(type, platform, spinContext) {
  const typeLabel = type === 'movie' ? 'Movie' : 'TV Series';
  const platformName = platform ? platform.name : 'Streaming Platforms';

  openModal(`Decider Recommendation`, `
    <div class="modal-loading-state">
      <div class="dice-spinner">🎲</div>
      <h3>Finding a standout ${typeLabel.toLowerCase()}...</h3>
      <p>Rolling the decider across top titles on ${platformName}...</p>
    </div>
  `);

  const rawItem = await fetchRandomItem(type, platform?.id);
  if (!rawItem) {
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">😕</div>
          <h3>No title found</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Could not fetch a recommendation right now. Please try again.</p>
          <button type="button" class="btn-spin-again" id="retryBtn">Retry</button>
        </div>
      `;
      document.getElementById('retryBtn')?.addEventListener('click', () => {
        loadAndShowRecommendation(type, platform, spinContext);
      });
    }
    return;
  }

  const item = formatTitle(rawItem, type, platform);
  const trailerUrl = await getTrailerUrl(item.id, type, item.title, item.year);

  renderSpotlightModalContent(item, typeLabel, trailerUrl, () => {
    if (spinContext === 'surprise') {
      handleSurpriseMe();
    } else {
      loadAndShowRecommendation(type, platform, spinContext);
    }
  });
}

// Render detailed modal for any media item (from decider or from sidebar lists)
async function showItemDetailsModal(item) {
  const type = item.type || 'movie';
  const typeLabel = type === 'tv' ? 'TV Series' : 'Movie';
  const trailerUrl = await getTrailerUrl(item.id, type, item.title, item.year);
  const platform = item.platform || platforms[0];
  const fullItem = { ...item, platform };

  renderSpotlightModalContent(fullItem, typeLabel, trailerUrl, null);
}

function renderSpotlightModalContent(item, typeLabel, trailerUrl, onSpinAgain) {
  if (modalTitle) modalTitle.textContent = `${item.platform.name} • ${typeLabel}`;
  if (!modalBody) return;

  const watched = isWatched(item.id);

  modalBody.innerHTML = `
    <div class="spotlight-card">
      <div>
        <img class="spotlight-poster" src="${item.poster}" alt="${item.title}" onerror="this.src='${FALLBACK_POSTER}'" />
      </div>
      <div class="spotlight-details">
        <span class="spotlight-platform-pill" style="background: ${item.platform.color}25; color: #fff; border: 1px solid ${item.platform.color};">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.platform.color};"></span>
          Streaming on ${item.platform.name} • ${typeLabel}
        </span>
        <h2 class="spotlight-title">${item.title}</h2>
        <div class="spotlight-meta">
          <span class="rating">⭐ ${item.rating}</span>
          <span>📅 ${item.year}</span>
          ${item.votes ? `<span style="color: var(--text-dim); font-size: 0.82rem;">(${item.votes} votes)</span>` : ''}
        </div>
        <p class="spotlight-overview">${item.overview}</p>
        <div class="spotlight-actions">
          <a href="${trailerUrl}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
            <span>▶</span>
            <span>Watch Trailer on YouTube</span>
          </a>
          <button type="button" class="btn-watched ${watched ? 'active' : ''}" id="toggleWatchedBtn">
            <span>${watched ? '✓ Watched' : '+ Mark as Watched'}</span>
          </button>
          ${onSpinAgain ? `
            <button type="button" class="btn-spin-again" id="spinAgainBtn">
              <span>🎲</span>
              <span>Spin Again</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Toggle Watched Button Handler
  document.getElementById('toggleWatchedBtn')?.addEventListener('click', () => {
    const isNowWatched = toggleWatched(item);
    const btn = document.getElementById('toggleWatchedBtn');
    if (btn) {
      btn.classList.toggle('active', isNowWatched);
      btn.innerHTML = `<span>${isNowWatched ? '✓ Watched' : '+ Mark as Watched'}</span>`;
    }
  });

  // Spin Again Handler
  if (onSpinAgain) {
    document.getElementById('spinAgainBtn')?.addEventListener('click', onSpinAgain);
  }

  modal.classList.add('active');
}

// ─── SURPRISE ME (RANDOM MOVIE OR TV SERIES) ───
function handleSurpriseMe() {
  const randomType = Math.random() < 0.5 ? 'movie' : 'tv';
  const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
  loadAndShowRecommendation(randomType, randomPlatform, 'surprise');
}

// ─── EVENT ATTACHMENTS ───

// 1. Platform Ticker Pills (opens Movie/Series choice popup)
document.querySelectorAll('.ticker-item').forEach(ticker => {
  ticker.addEventListener('click', () => {
    const platformId = Number(ticker.dataset.platform);
    const platform = platforms.find(p => p.id === platformId);
    if (platform) {
      showChoiceModal(platform);
    }
  });
});

// 2. Surprise Me button (in top navbar)
document.getElementById('surpriseMeBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  handleSurpriseMe();
});

// 3. Sidebar Random Pick button
document.getElementById('sidebarRandomPick')?.addEventListener('click', (e) => {
  e.preventDefault();
  setSidebarOpen(false);
  handleSurpriseMe();
});

// 4. Bottom Quick Decider Buttons
document.getElementById('pickRandomMovieBtn')?.addEventListener('click', () => {
  loadAndShowRecommendation('movie', null, 'movie');
});

document.getElementById('pickRandomSeriesBtn')?.addEventListener('click', () => {
  loadAndShowRecommendation('tv', null, 'series');
});

// Initial boot
updateWatchedUI();