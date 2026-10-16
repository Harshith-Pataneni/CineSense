const https = require('https');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Reusable HTTPS agent with connection pooling and keepAlive to prevent socket exhaustion and TLS resets
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 40,
  maxFreeSockets: 10,
  keepAliveMsecs: 20000,
  timeout: 10000,
});

// In-memory cache for TMDB API calls
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.payload;
}

function setCached(key, payload, ttlMs) {
  // Evict oldest entries if cache grows past 500 items
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
}

// Fallback genres if TMDB network fails completely
const FALLBACK_GENRES = {
  movie: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' },
  ],
};

function getApiKey() {
  return process.env.TMDB_API_KEY;
}

function validateApiKey(res) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_tmdb_api_key_here' || apiKey.trim() === '') {
    res.status(500).json({
      error: 'TMDB_API_KEY is not configured on the server. Please set a valid TMDB_API_KEY in backend/.env',
    });
    return null;
  }
  return apiKey.trim();
}

/**
 * Resilient TMDB request runner using native https with keepAlive, timeout & automatic retries
 */
function requestTMDB(url, { retries = 2, delayMs = 250 } = {}) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const req = https.get(
        url,
        {
          agent: httpsAgent,
          headers: {
            'User-Agent': 'CineSense-App/1.0',
            Accept: 'application/json',
          },
          timeout: 10000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            let data = null;
            try {
              data = JSON.parse(body);
            } catch {
              data = { raw: body };
            }

            // Retry on TMDB rate limit (429) or transient 5xx server errors
            if ((res.statusCode === 429 || res.statusCode >= 500) && remaining > 0) {
              return setTimeout(() => attempt(remaining - 1), delayMs);
            }

            return resolve({ status: res.statusCode, data });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error('Connection timed out'));
      });

      req.on('error', (err) => {
        if (remaining > 0) {
          const backoff = delayMs * (3 - remaining);
          return setTimeout(() => attempt(remaining - 1), backoff);
        }
        return reject(err);
      });
    };

    attempt(retries);
  });
}

// GET /api/discover or GET /api/discover/:type
exports.discoverMedia = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  try {
    const type = req.params.type || req.query.type || 'movie';
    const params = new URLSearchParams();

    // Forward allowed query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'type' && key !== 'api_key' && value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    const queryString = params.toString();
    const cacheKey = `discover_${type}_${queryString}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(cached.status).json(cached.data);
    }

    params.set('api_key', apiKey);
    const tmdbUrl = `${TMDB_BASE_URL}/discover/${type}?${params.toString()}`;

    const result = await requestTMDB(tmdbUrl, { retries: 2 });
    if (result.status === 200) {
      setCached(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
    }

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Error in discoverMedia:', err.message || err);
    return res.status(500).json({ error: 'Failed to discover media from TMDB' });
  }
};

// GET /api/trailer or GET /api/trailer/:type/:id
exports.getTrailer = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  try {
    const type = req.params.type || req.query.type || 'movie';
    const id = req.params.id || req.query.id;

    if (!id) {
      return res.status(400).json({ error: 'Media id is required' });
    }

    const cacheKey = `trailer_${type}_${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(cached.status).json(cached.data);
    }

    const tmdbUrl = `${TMDB_BASE_URL}/${type}/${id}/videos?api_key=${apiKey}&language=en-US`;
    const result = await requestTMDB(tmdbUrl, { retries: 2 });
    const { status, data } = result;

    if (status !== 200) {
      return res.status(status).json(data);
    }

    const yt = (data?.results || []).filter((v) => v.site === 'YouTube' && v.key);
    const match =
      yt.find((v) => v.type === 'Trailer' && v.official) ||
      yt.find((v) => v.type === 'Trailer') ||
      yt[0];
    const trailerUrl = match ? `https://www.youtube.com/watch?v=${match.key}` : null;

    const payload = {
      id,
      type,
      trailerUrl,
      results: data?.results || [],
    };

    setCached(cacheKey, { status: 200, data: payload }, 60 * 60 * 1000); // Cache for 1 hour
    return res.json(payload);
  } catch (err) {
    console.error('Error in getTrailer:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch trailer from TMDB' });
  }
};

// GET /api/genres or GET /api/genres/:type or GET /api/genre/:type/list
exports.getGenres = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  const type = req.params.type || req.query.type || 'movie';
  const cacheKey = `genres_${type}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(cached.status).json(cached.data);
  }

  try {
    const tmdbUrl = `${TMDB_BASE_URL}/genre/${type}/list?api_key=${apiKey}&language=en`;
    const result = await requestTMDB(tmdbUrl, { retries: 2 });

    if (result.status === 200 && Array.isArray(result.data?.genres)) {
      setCached(cacheKey, result, 24 * 60 * 60 * 1000); // Cache for 24 hours
      return res.status(200).json(result.data);
    }

    // Fallback if status is non-200
    const fallbackList = FALLBACK_GENRES[type] || FALLBACK_GENRES.movie;
    const fallbackPayload = { genres: fallbackList };
    return res.status(200).json(fallbackPayload);
  } catch (err) {
    console.warn(`Warning in getGenres (${type}): ${err.message || err}. Using fallback genres.`);
    const fallbackList = FALLBACK_GENRES[type] || FALLBACK_GENRES.movie;
    const fallbackPayload = { genres: fallbackList };
    setCached(cacheKey, { status: 200, data: fallbackPayload }, 60 * 60 * 1000);
    return res.status(200).json(fallbackPayload);
  }
};

// GET /api/trending or GET /api/trending/:mediaType/:timeWindow
exports.getTrending = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  try {
    const mediaType = req.params.mediaType || req.query.mediaType || 'all';
    const timeWindow = req.params.timeWindow || req.query.timeWindow || 'week';
    const cacheKey = `trending_${mediaType}_${timeWindow}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(cached.status).json(cached.data);
    }

    const tmdbUrl = `${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${apiKey}`;
    const result = await requestTMDB(tmdbUrl, { retries: 2 });

    if (result.status === 200) {
      setCached(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
    }

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Error in getTrending:', err.message || err);
    return res.status(500).json({ error: 'Failed to fetch trending from TMDB' });
  }
};
