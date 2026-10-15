/**
 * CineSense User Data Adapter (Dual-Mode: Guest localStorage & Authenticated MongoDB)
 */
(function(window) {
  const WATCHED_STORAGE_KEY = 'decider_watched_titles';
  const INTERESTED_STORAGE_KEY = 'decider_interested_titles';
  const RATINGS_STORAGE_KEY = 'decider_user_ratings';

  const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes(':5000'))
    ? '/api'
    : 'http://localhost:5000/api';

  function getAuthToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token || token.startsWith('guest-token-') || token === 'guest') {
        return null;
      }
      return token;
    } catch (e) {
      return null;
    }
  }

  function isGuest() {
    return !getAuthToken();
  }

  // In-memory cache for synchronous checks
  let watchedCache = null;
  let interestedCache = null;
  let ratingsCache = null;
  let isInitializing = false;
  const changeListeners = new Set();

  function notifyChange() {
    changeListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('Listener error:', e); }
    });
  }

  // --- Local Storage Helpers (Guest Mode & Offline) ---
  function getLocalWatched() {
    try { return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setLocalWatched(list) {
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(list));
  }
  function getLocalInterested() {
    try { return JSON.parse(localStorage.getItem(INTERESTED_STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setLocalInterested(list) {
    localStorage.setItem(INTERESTED_STORAGE_KEY, JSON.stringify(list));
  }
  function getLocalRatings() {
    try { return JSON.parse(localStorage.getItem(RATINGS_STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setLocalRatings(list) {
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(list));
  }

  // --- Helper to build clean item payload ---
  function resolvePosterUrl(poster, poster_path) {
    const raw = poster || poster_path || '';
    if (!raw || raw === 'null' || raw === 'undefined') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  function sanitizeItem(item) {
    const mId = String(item.id || item.mediaId || '');
    const mType = item.type || item.mediaType || (item.title ? 'movie' : 'tv');
    const fullPoster = resolvePosterUrl(item.poster, item.poster_path);
    return {
      id: mId,
      mediaId: mId,
      type: mType,
      mediaType: mType,
      title: item.title || item.name || 'Untitled',
      poster: fullPoster,
      poster_path: fullPoster,
      rating: item.rating || (item.vote_average ? item.vote_average.toFixed(1) : 'NR'),
      year: item.year || (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A',
      overview: item.overview || '',
    };
  }

  // --- Guest Migration to Authenticated Account ---
  async function migrateGuestData(token) {
    const authToken = token || getAuthToken();
    if (!authToken) return false;

    const guestWatched = getLocalWatched();
    const guestInterested = getLocalInterested();
    const guestRatings = getLocalRatings();

    if (guestWatched.length === 0 && guestInterested.length === 0 && guestRatings.length === 0) {
      return true;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/user/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          watched: guestWatched,
          interested: guestInterested,
          ratings: guestRatings,
        }),
      });

      if (res.ok) {
        // Safe to clear guest localStorage ONLY when confirmed 200 OK by backend
        setLocalWatched([]);
        setLocalInterested([]);
        setLocalRatings([]);
        console.log('Guest collections successfully migrated to authenticated account.');
        return true;
      }
    } catch (err) {
      console.warn('Guest migration deferred due to network error:', err);
    }
    return false;
  }

  // --- Library Synchronization (Load from backend on startup) ---
  async function syncLibrary() {
    if (isGuest()) {
      watchedCache = getLocalWatched();
      interestedCache = getLocalInterested();
      ratingsCache = getLocalRatings();
      notifyChange();
      return;
    }

    const token = getAuthToken();
    try {
      // If guest data exists in localStorage, migrate first
      await migrateGuestData(token);

      const res = await fetch(`${API_BASE_URL}/user/library`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        watchedCache = data.watched || [];
        interestedCache = data.interested || [];
        ratingsCache = data.ratings || [];
        notifyChange();
      } else if (res.status === 401) {
        console.warn('Session expired. Switching to guest view.');
        localStorage.removeItem('token');
        watchedCache = getLocalWatched();
        interestedCache = getLocalInterested();
        ratingsCache = getLocalRatings();
        notifyChange();
      }
    } catch (err) {
      console.error('Failed to sync library from backend, using local fallback:', err);
      if (watchedCache === null) watchedCache = getLocalWatched();
      if (interestedCache === null) interestedCache = getLocalInterested();
      if (ratingsCache === null) ratingsCache = getLocalRatings();
      notifyChange();
    }
  }

  // --- Public API ---
  const UserAdapter = {
    isGuest,
    getAuthToken,
    migrateGuestData,
    syncLibrary,

    onLibraryChange(fn) {
      changeListeners.add(fn);
      return () => changeListeners.delete(fn);
    },

    // Watched
    getWatchedTitles() {
      const list = watchedCache !== null ? watchedCache : getLocalWatched();
      return list.map(item => ({
        ...item,
        poster: resolvePosterUrl(item.poster, item.poster_path),
        poster_path: resolvePosterUrl(item.poster_path, item.poster),
      }));
    },

    isWatched(id) {
      if (!id) return false;
      return this.getWatchedTitles().some(item => String(item.id) === String(id));
    },

    async toggleWatched(rawItem) {
      if (!rawItem || (!rawItem.id && !rawItem.mediaId)) return false;
      const item = sanitizeItem(rawItem);
      item.watchedAt = new Date().toISOString();

      let list = [...this.getWatchedTitles()];
      const exists = list.some(w => String(w.id) === String(item.id));

      if (exists) {
        list = list.filter(w => String(w.id) !== String(item.id));
      } else {
        list.unshift(item);
      }

      // Optimistic update
      watchedCache = list;
      if (isGuest()) {
        setLocalWatched(list);
      }
      notifyChange();

      // Backend sync if logged in
      if (!isGuest()) {
        const token = getAuthToken();
        try {
          if (exists) {
            await fetch(`${API_BASE_URL}/user/watched/${item.id}?mediaType=${item.type}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
          } else {
            await fetch(`${API_BASE_URL}/user/watched`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(item),
            });
          }
        } catch (err) {
          console.error('Failed to sync watched state with backend:', err);
        }
      }

      return !exists;
    },

    async removeWatched(id, type = 'movie') {
      let list = this.getWatchedTitles().filter(w => String(w.id) !== String(id));
      watchedCache = list;
      if (isGuest()) {
        setLocalWatched(list);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/watched/${id}?mediaType=${type}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          });
        } catch (err) {
          console.error('Failed to remove watched item from backend:', err);
        }
      }
    },

    async clearWatchedHistory() {
      watchedCache = [];
      if (isGuest()) {
        setLocalWatched([]);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/watched`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          });
        } catch (err) {
          console.error('Failed to clear watched history from backend:', err);
        }
      }
    },

    // Interested
    getInterestedTitles() {
      const list = interestedCache !== null ? interestedCache : getLocalInterested();
      return list.map(item => ({
        ...item,
        poster: resolvePosterUrl(item.poster, item.poster_path),
        poster_path: resolvePosterUrl(item.poster_path, item.poster),
      }));
    },

    isInterested(id) {
      if (!id) return false;
      return this.getInterestedTitles().some(item => String(item.id) === String(id));
    },

    async toggleInterested(rawItem) {
      if (!rawItem || (!rawItem.id && !rawItem.mediaId)) return false;
      const item = sanitizeItem(rawItem);
      item.interestedAt = new Date().toISOString();

      let list = [...this.getInterestedTitles()];
      const exists = list.some(w => String(w.id) === String(item.id));

      if (exists) {
        list = list.filter(w => String(w.id) !== String(item.id));
      } else {
        list.unshift(item);
      }

      // Optimistic update
      interestedCache = list;
      if (isGuest()) {
        setLocalInterested(list);
      }
      notifyChange();

      // Backend sync if logged in
      if (!isGuest()) {
        const token = getAuthToken();
        try {
          if (exists) {
            await fetch(`${API_BASE_URL}/user/interested/${item.id}?mediaType=${item.type}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
          } else {
            await fetch(`${API_BASE_URL}/user/interested`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(item),
            });
          }
        } catch (err) {
          console.error('Failed to sync interested state with backend:', err);
        }
      }

      return !exists;
    },

    async removeInterested(id, type = 'movie') {
      let list = this.getInterestedTitles().filter(w => String(w.id) !== String(id));
      interestedCache = list;
      if (isGuest()) {
        setLocalInterested(list);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/interested/${id}?mediaType=${type}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          });
        } catch (err) {
          console.error('Failed to remove interested item from backend:', err);
        }
      }
    },

    async clearInterestedHistory() {
      interestedCache = [];
      if (isGuest()) {
        setLocalInterested([]);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/interested`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          });
        } catch (err) {
          console.error('Failed to clear interested history from backend:', err);
        }
      }
    },

    // Ratings
    getRatings() {
      if (ratingsCache !== null) return ratingsCache;
      return getLocalRatings();
    },

    getRating(mediaId) {
      if (!mediaId) return null;
      const found = this.getRatings().find(r => String(r.id || r.mediaId) === String(mediaId));
      return found ? found.rating : null;
    },

    async setRating(rawItem, ratingValue) {
      if (!rawItem) return;
      const item = sanitizeItem(rawItem);
      const num = Number(ratingValue);
      if (isNaN(num) || num < 1 || num > 10) return;

      const ratingObj = {
        id: item.id,
        mediaId: item.id,
        type: item.type,
        mediaType: item.type,
        title: item.title,
        poster: item.poster,
        rating: Math.round(num * 10) / 10,
        ratedAt: new Date().toISOString(),
      };

      let list = [...this.getRatings()].filter(r => String(r.id || r.mediaId) !== String(item.id));
      list.unshift(ratingObj);
      ratingsCache = list;
      if (isGuest()) {
        setLocalRatings(list);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/ratings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify(ratingObj),
          });
        } catch (err) {
          console.error('Failed to sync rating with backend:', err);
        }
      }
    },

    async removeRating(mediaId, type = 'movie') {
      let list = this.getRatings().filter(r => String(r.id || r.mediaId) !== String(mediaId));
      ratingsCache = list;
      if (isGuest()) {
        setLocalRatings(list);
      }
      notifyChange();

      if (!isGuest()) {
        try {
          await fetch(`${API_BASE_URL}/user/ratings/${mediaId}?mediaType=${type}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          });
        } catch (err) {
          console.error('Failed to remove rating from backend:', err);
        }
      }
    },
  };

  window.UserAdapter = UserAdapter;

  // Auto-sync on page load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => UserAdapter.syncLibrary());
    } else {
      UserAdapter.syncLibrary();
    }
  }
})(window);
