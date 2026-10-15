const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getApiKey() {
  return process.env.TMDB_API_KEY;
}

function validateApiKey(res) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_tmdb_api_key_here' || apiKey.trim() === '') {
    res.status(500).json({
      error: 'TMDB_API_KEY is not configured on the server. Please set a valid TMDB_API_KEY in backend/.env'
    });
    return null;
  }
  return apiKey.trim();
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
    params.set('api_key', apiKey);

    const tmdbUrl = `${TMDB_BASE_URL}/discover/${type}?${params.toString()}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in discoverMedia:', err.message);
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

    const tmdbUrl = `${TMDB_BASE_URL}/${type}/${id}/videos?api_key=${apiKey}&language=en-US`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const yt = (data.results || []).filter(v => v.site === 'YouTube' && v.key);
    const match = yt.find(v => v.type === 'Trailer' && v.official)
               || yt.find(v => v.type === 'Trailer')
               || yt[0];
    const trailerUrl = match ? `https://www.youtube.com/watch?v=${match.key}` : null;

    return res.json({
      id,
      type,
      trailerUrl,
      results: data.results || []
    });
  } catch (err) {
    console.error('Error in getTrailer:', err.message);
    return res.status(500).json({ error: 'Failed to fetch trailer from TMDB' });
  }
};

// GET /api/genres or GET /api/genres/:type or GET /api/genre/:type/list
exports.getGenres = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  try {
    const type = req.params.type || req.query.type || 'movie';
    const tmdbUrl = `${TMDB_BASE_URL}/genre/${type}/list?api_key=${apiKey}&language=en`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in getGenres:', err.message);
    return res.status(500).json({ error: 'Failed to fetch genres from TMDB' });
  }
};

// GET /api/trending or GET /api/trending/:mediaType/:timeWindow
exports.getTrending = async (req, res) => {
  const apiKey = validateApiKey(res);
  if (!apiKey) return;

  try {
    const mediaType = req.params.mediaType || req.query.mediaType || 'all';
    const timeWindow = req.params.timeWindow || req.query.timeWindow || 'week';

    const tmdbUrl = `${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${apiKey}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in getTrending:', err.message);
    return res.status(500).json({ error: 'Failed to fetch trending from TMDB' });
  }
};
