// ─── API CONFIGURATION & CONSTANTS ───
const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes(':5000'))
  ? '/api'
  : 'http://localhost:5000/api';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

const platforms = [
  { id: 8, name: 'Netflix', color: '#e50914' },
  { id: 119, name: 'Prime Video', color: '#00a8e1' },
  { id: 122, name: 'Disney+ Hotstar', color: '#2264d1' },
  { id: 237, name: 'SonyLIV', color: '#00b4d8' },
  { id: 232, name: 'Zee5', color: '#9333ea' }
];

function getPosterUrl(item) {
  if (!item) return FALLBACK_POSTER;
  const p = item.poster || item.poster_path;
  if (!p || p === 'null' || p === 'undefined') return FALLBACK_POSTER;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${IMAGE_BASE_URL}${path}`;
}

// ─── WATCHED TITLES STORAGE (SHARED ACROSS APP & ADAPTER) ───
const WATCHED_STORAGE_KEY = 'decider_watched_titles';

function getWatchedTitles() {
  if (window.UserAdapter) return window.UserAdapter.getWatchedTitles();
  try {
    return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function isWatched(id) {
  if (!id) return false;
  if (window.UserAdapter) return window.UserAdapter.isWatched(id);
  return getWatchedTitles().some(item => String(item.id) === String(id));
}

function toggleWatched(item) {
  if (!item || !item.id) return false;
  if (window.UserAdapter) {
    const isNow = !isWatched(item.id);
    window.UserAdapter.toggleWatched(item).then(() => updateWatchedUI());
    updateWatchedUI();
    return isNow;
  }
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
  return !exists;
}

function clearWatchedHistory() {
  if (window.UserAdapter) {
    window.UserAdapter.clearWatchedHistory().then(() => updateWatchedUI());
  } else {
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify([]));
  }
  updateWatchedUI();
}

// ─── INTERESTED TITLES STORAGE (SHARED ACROSS APP & ADAPTER) ───
const INTERESTED_STORAGE_KEY = 'decider_interested_titles';

function getInterestedTitles() {
  if (window.UserAdapter) return window.UserAdapter.getInterestedTitles();
  try {
    return JSON.parse(localStorage.getItem(INTERESTED_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function isInterested(id) {
  if (!id) return false;
  if (window.UserAdapter) return window.UserAdapter.isInterested(id);
  return getInterestedTitles().some(item => String(item.id) === String(id));
}

function toggleInterested(item) {
  if (!item || !item.id) return false;
  if (window.UserAdapter) {
    const isNow = !isInterested(item.id);
    window.UserAdapter.toggleInterested(item).then(() => updateInterestedUI());
    updateInterestedUI();
    return isNow;
  }
  let list = getInterestedTitles();
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
      interestedAt: new Date().toISOString()
    });
  }

  localStorage.setItem(INTERESTED_STORAGE_KEY, JSON.stringify(list));
  updateInterestedUI();
  return !exists;
}

function clearInterestedHistory() {
  if (window.UserAdapter) {
    window.UserAdapter.clearInterestedHistory().then(() => updateInterestedUI());
  } else {
    localStorage.setItem(INTERESTED_STORAGE_KEY, JSON.stringify([]));
  }
  updateInterestedUI();
}

if (window.UserAdapter) {
  window.UserAdapter.onLibraryChange(() => {
    updateWatchedUI();
    updateInterestedUI();
  });
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
      <img src="${getPosterUrl(item)}" class="sidebar-media-thumb" alt="${item.title}" onerror="this.src='${FALLBACK_POSTER}'" />
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
      if (window.UserAdapter) {
        window.UserAdapter.removeWatched(id);
      } else {
        const currentList = getWatchedTitles().filter(w => String(w.id) !== String(id));
        localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(currentList));
      }
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

// Update Interested UI & Badges
function updateInterestedUI() {
  const list = getInterestedTitles();
  const count = list.length;

  const tabBadge = document.getElementById('interestedTabBadge');
  if (tabBadge) tabBadge.textContent = count;

  const interestedList = document.getElementById('interestedList');
  if (!interestedList) return;

  if (count === 0) {
    interestedList.innerHTML = `
      <div class="hub-empty-state">
        <span style="font-size: 2.2rem;">🔖</span>
        <h4>No interested titles yet</h4>
        <p>Click "+ Interested" on any movie or series to save titles you want to watch!</p>
      </div>
    `;
    return;
  }

  interestedList.innerHTML = list.map(item => `
    <div class="sidebar-media-item" data-id="${item.id}" data-type="${item.type}">
      <img src="${getPosterUrl(item)}" class="sidebar-media-thumb" alt="${item.title}" onerror="this.src='${FALLBACK_POSTER}'" />
      <div class="sidebar-media-info">
        <div class="sidebar-media-title" title="${item.title}">${item.title}</div>
        <div class="sidebar-media-meta">
          <span>⭐ ${item.rating}</span>
          <span>📅 ${item.year}</span>
          <span class="sidebar-media-type">${item.type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
      </div>
      <button type="button" class="btn-remove-interested" data-id="${item.id}" title="Remove from interested">&times;</button>
    </div>
  `).join('');

  // Remove single interested item handler
  interestedList.querySelectorAll('.btn-remove-interested').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (window.UserAdapter) {
        window.UserAdapter.removeInterested(id);
      } else {
        const currentList = getInterestedTitles().filter(w => String(w.id) !== String(id));
        localStorage.setItem(INTERESTED_STORAGE_KEY, JSON.stringify(currentList));
      }
      updateInterestedUI();
    });
  });

  // Clicking an item in the interested list opens detail modal
  interestedList.querySelectorAll('.sidebar-media-item').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const found = getInterestedTitles().find(w => String(w.id) === String(id));
      if (found) {
        showItemDetailsModal(found);
      }
    });
  });
}

document.getElementById('clearInterestedBtn')?.addEventListener('click', () => {
  if (confirm('Clear all interested titles?')) {
    clearInterestedHistory();
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
    const res = await fetch(`${API_BASE_URL}/trending?mediaType=all&timeWindow=week`);
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
    const res = await fetch(`${API_BASE_URL}/discover?type=movie&sort_by=popularity.desc&vote_count.gte=100&page=1`);
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
    const rating = item.vote_average ? item.vote_average.toFixed(1) : (item.rating || 'NR');
    const poster = getPosterUrl(item);

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
  if (window.UserAdapter) {
    window.UserAdapter.migrateGuestData(tokenParam).then(() => {
      if (window.UserAdapter) window.UserAdapter.syncLibrary();
    });
  }
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

// ─── CHAT WINDOW CONTROLLER ───
const chatTriggerBtn = document.getElementById('chatTriggerBtn');
const chatWindow = document.getElementById('chatWindow');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const chatBody = document.getElementById('chatBody');

function toggleChat(forceOpen) {
  if (!chatWindow || !chatTriggerBtn) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !chatWindow.classList.contains('open');

  if (shouldOpen) {
    if (userBar) {
      userBar.classList.remove('open');
      userBarBtn?.setAttribute('aria-expanded', false);
    }
    chatWindow.classList.add('open');
    chatWindow.setAttribute('aria-hidden', 'false');
    chatTriggerBtn.classList.add('chat-open');
    chatTriggerBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      chatInput?.focus();
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
  } else {
    chatWindow.classList.remove('open');
    chatWindow.setAttribute('aria-hidden', 'true');
    chatTriggerBtn.classList.remove('chat-open');
    chatTriggerBtn.setAttribute('aria-expanded', 'false');
  }
}

if (chatTriggerBtn && chatWindow) {
  chatTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChat();
  });

  chatCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChat(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatWindow.classList.contains('open')) {
      toggleChat(false);
    }
  });

  // Sending messages (User-side only, no bot responses)
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const row = document.createElement('div');
    row.className = 'chat-msg-row';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-outgoing';
    bubble.textContent = text;

    const time = document.createElement('span');
    time.className = 'chat-msg-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.appendChild(bubble);
    row.appendChild(time);

    if (chatMessages) {
      chatMessages.appendChild(row);
    }

    chatInput.value = '';
    chatInput.focus();

    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  });
}

const userBar = document.getElementById('userBar');
const userBarBtn = document.getElementById('userBarBtn');
if (userBar && userBarBtn) {
  userBarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChat(false);
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
  let url = `${API_BASE_URL}/discover?type=${type}${provParam}&sort_by=popularity.desc&vote_count.gte=5&page=${page}`;

  try {
    let res = await fetch(url);
    let data = await res.json();
    let items = (data.results || []).filter(item => item && item.poster_path);

    // Reliable fallback: if random page yielded no items, always fallback to page 1
    if (!items.length) {
      url = `${API_BASE_URL}/discover?type=${type}${provParam}&sort_by=popularity.desc&page=1`;
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
    const res = await fetch(`${API_BASE_URL}/trailer?type=${type}&id=${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.trailerUrl) return data.trailerUrl;
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
  const interested = isInterested(item.id);

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
          <button type="button" class="btn-interested ${interested ? 'active' : ''}" id="toggleInterestedBtn">
            <span>${interested ? '★ Interested' : '+ Interested'}</span>
          </button>
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
        <div class="spotlight-user-rating" style="display: flex; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
          <span style="font-size: 0.85rem; color: var(--text-muted, #94a3b8);">Your Rating:</span>
          <select id="userRatingSelect" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 4px 8px; font-size: 0.85rem; cursor: pointer;">
            <option value="">Rate (1-10)</option>
            ${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => `<option value="${n}" ${(window.UserAdapter && window.UserAdapter.getRating(item.id) === n) ? 'selected' : ''}>⭐ ${n}/10</option>`).join('')}
          </select>
          ${(window.UserAdapter && window.UserAdapter.getRating(item.id)) ? `<button type="button" id="clearRatingBtn" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; text-decoration: underline;">Clear</button>` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('userRatingSelect')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (window.UserAdapter) {
      if (val) {
        window.UserAdapter.setRating(item, Number(val));
      } else {
        window.UserAdapter.removeRating(item.id, item.type);
      }
    }
  });

  document.getElementById('clearRatingBtn')?.addEventListener('click', () => {
    if (window.UserAdapter) {
      window.UserAdapter.removeRating(item.id, item.type);
      const sel = document.getElementById('userRatingSelect');
      if (sel) sel.value = '';
      const clr = document.getElementById('clearRatingBtn');
      if (clr) clr.remove();
    }
  });

  // Toggle Interested Button Handler
  document.getElementById('toggleInterestedBtn')?.addEventListener('click', () => {
    const isNowInterested = toggleInterested(item);
    const btn = document.getElementById('toggleInterestedBtn');
    if (btn) {
      btn.classList.toggle('active', isNowInterested);
      btn.innerHTML = `<span>${isNowInterested ? '★ Interested' : '+ Interested'}</span>`;
    }
  });

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
updateInterestedUI();