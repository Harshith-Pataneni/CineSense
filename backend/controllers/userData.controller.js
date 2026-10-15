const Watched = require('../models/Watched');
const Interested = require('../models/Interested');
const Rating = require('../models/Rating');

function resolvePosterUrl(poster, poster_path) {
  const raw = poster || poster_path || '';
  if (!raw || raw === 'null' || raw === 'undefined') return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

function formatMediaItem(doc, dateField) {
  const fullPoster = resolvePosterUrl(doc.poster, doc.poster_path);
  return {
    id: doc.mediaId,
    mediaId: doc.mediaId,
    title: doc.title,
    type: doc.mediaType,
    mediaType: doc.mediaType,
    poster: fullPoster,
    poster_path: fullPoster,
    rating: doc.rating || 'NR',
    year: doc.year || 'N/A',
    overview: doc.overview || '',
    [dateField]: doc[dateField] || doc.createdAt,
  };
}

// ─── WATCHED HANDLERS ───
exports.getWatched = async (req, res) => {
  try {
    const items = await Watched.find({ userId: req.user.id }).sort({ watchedAt: -1 });
    return res.json(items.map(item => formatMediaItem(item, 'watchedAt')));
  } catch (err) {
    console.error('Error fetching watched items:', err);
    return res.status(500).json({ error: 'Failed to fetch watched items' });
  }
};

exports.addWatched = async (req, res) => {
  try {
    const { id, mediaId, title, type, mediaType, poster, poster_path, rating, year, overview, watchedAt } = req.body;
    const mId = String(id || mediaId || '').trim();
    const mType = type || mediaType || 'movie';

    if (!mId || !title) {
      return res.status(400).json({ error: 'mediaId and title are required' });
    }

    const fullPoster = resolvePosterUrl(poster, poster_path);
    const doc = await Watched.findOneAndUpdate(
      { userId: req.user.id, mediaId: mId, mediaType: mType },
      {
        userId: req.user.id,
        mediaId: mId,
        mediaType: mType,
        title,
        poster: fullPoster,
        poster_path: fullPoster,
        rating: rating || 'NR',
        year: year || 'N/A',
        overview: overview || '',
        watchedAt: watchedAt ? new Date(watchedAt) : new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json(formatMediaItem(doc, 'watchedAt'));
  } catch (err) {
    console.error('Error adding watched item:', err);
    return res.status(500).json({ error: 'Failed to save watched item' });
  }
};

exports.removeWatched = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { mediaType } = req.query;
    const query = { userId: req.user.id, mediaId: String(mediaId) };
    if (mediaType) query.mediaType = mediaType;

    const result = await Watched.deleteMany(query);
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing watched item:', err);
    return res.status(500).json({ error: 'Failed to remove watched item' });
  }
};

exports.clearWatched = async (req, res) => {
  try {
    const result = await Watched.deleteMany({ userId: req.user.id });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error clearing watched list:', err);
    return res.status(500).json({ error: 'Failed to clear watched list' });
  }
};

// ─── INTERESTED HANDLERS ───
exports.getInterested = async (req, res) => {
  try {
    const items = await Interested.find({ userId: req.user.id }).sort({ interestedAt: -1 });
    return res.json(items.map(item => formatMediaItem(item, 'interestedAt')));
  } catch (err) {
    console.error('Error fetching interested items:', err);
    return res.status(500).json({ error: 'Failed to fetch interested items' });
  }
};

exports.addInterested = async (req, res) => {
  try {
    const { id, mediaId, title, type, mediaType, poster, poster_path, rating, year, overview, interestedAt } = req.body;
    const mId = String(id || mediaId || '').trim();
    const mType = type || mediaType || 'movie';

    if (!mId || !title) {
      return res.status(400).json({ error: 'mediaId and title are required' });
    }

    const fullPoster = resolvePosterUrl(poster, poster_path);
    const doc = await Interested.findOneAndUpdate(
      { userId: req.user.id, mediaId: mId, mediaType: mType },
      {
        userId: req.user.id,
        mediaId: mId,
        mediaType: mType,
        title,
        poster: fullPoster,
        poster_path: fullPoster,
        rating: rating || 'NR',
        year: year || 'N/A',
        overview: overview || '',
        interestedAt: interestedAt ? new Date(interestedAt) : new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json(formatMediaItem(doc, 'interestedAt'));
  } catch (err) {
    console.error('Error adding interested item:', err);
    return res.status(500).json({ error: 'Failed to save interested item' });
  }
};

exports.removeInterested = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { mediaType } = req.query;
    const query = { userId: req.user.id, mediaId: String(mediaId) };
    if (mediaType) query.mediaType = mediaType;

    const result = await Interested.deleteMany(query);
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing interested item:', err);
    return res.status(500).json({ error: 'Failed to remove interested item' });
  }
};

exports.clearInterested = async (req, res) => {
  try {
    const result = await Interested.deleteMany({ userId: req.user.id });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error clearing interested list:', err);
    return res.status(500).json({ error: 'Failed to clear interested list' });
  }
};

// ─── RATINGS HANDLERS ───
exports.getRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user.id }).sort({ ratedAt: -1 });
    return res.json(ratings.map(r => ({
      id: r.mediaId,
      mediaId: r.mediaId,
      type: r.mediaType,
      mediaType: r.mediaType,
      rating: r.rating,
      title: r.title,
      poster: r.poster || r.poster_path || '',
      ratedAt: r.ratedAt,
    })));
  } catch (err) {
    console.error('Error fetching ratings:', err);
    return res.status(500).json({ error: 'Failed to fetch ratings' });
  }
};

exports.setRating = async (req, res) => {
  try {
    const { id, mediaId, type, mediaType, rating, title, poster, poster_path } = req.body;
    const mId = String(id || mediaId || '').trim();
    const mType = type || mediaType || 'movie';
    const numRating = Number(rating);

    if (!mId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }
    if (isNaN(numRating) || numRating < 1 || numRating > 10) {
      return res.status(400).json({ error: 'Rating must be a valid number between 1 and 10' });
    }

    const doc = await Rating.findOneAndUpdate(
      { userId: req.user.id, mediaId: mId, mediaType: mType },
      {
        userId: req.user.id,
        mediaId: mId,
        mediaType: mType,
        rating: Math.round(numRating * 10) / 10,
        title: title || '',
        poster: poster || poster_path || '',
        poster_path: poster_path || poster || '',
        ratedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      id: doc.mediaId,
      mediaId: doc.mediaId,
      type: doc.mediaType,
      mediaType: doc.mediaType,
      rating: doc.rating,
      title: doc.title,
      poster: doc.poster,
      ratedAt: doc.ratedAt,
    });
  } catch (err) {
    console.error('Error setting rating:', err);
    return res.status(500).json({ error: 'Failed to save rating' });
  }
};

exports.removeRating = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { mediaType } = req.query;
    const query = { userId: req.user.id, mediaId: String(mediaId) };
    if (mediaType) query.mediaType = mediaType;

    const result = await Rating.deleteMany(query);
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing rating:', err);
    return res.status(500).json({ error: 'Failed to remove rating' });
  }
};

// ─── UNIFIED USER LIBRARY ───
exports.getLibrary = async (req, res) => {
  try {
    const [watchedDocs, interestedDocs, ratingDocs] = await Promise.all([
      Watched.find({ userId: req.user.id }).sort({ watchedAt: -1 }),
      Interested.find({ userId: req.user.id }).sort({ interestedAt: -1 }),
      Rating.find({ userId: req.user.id }).sort({ ratedAt: -1 }),
    ]);

    return res.json({
      watched: watchedDocs.map(w => formatMediaItem(w, 'watchedAt')),
      interested: interestedDocs.map(i => formatMediaItem(i, 'interestedAt')),
      ratings: ratingDocs.map(r => ({
        id: r.mediaId,
        mediaId: r.mediaId,
        type: r.mediaType,
        mediaType: r.mediaType,
        rating: r.rating,
        title: r.title,
        poster: r.poster || r.poster_path || '',
        ratedAt: r.ratedAt,
      })),
    });
  } catch (err) {
    console.error('Error fetching user library:', err);
    return res.status(500).json({ error: 'Failed to fetch user library' });
  }
};

// ─── GUEST MIGRATION ───
exports.migrateGuestData = async (req, res) => {
  try {
    const { watched = [], interested = [], ratings = [] } = req.body;
    let migratedWatched = 0;
    let migratedInterested = 0;
    let migratedRatings = 0;

    // 1. Migrate Watched items
    for (const item of watched) {
      const mId = String(item.id || item.mediaId || '').trim();
      const mType = item.type || item.mediaType || 'movie';
      if (!mId) continue;
      const fullPoster = resolvePosterUrl(item.poster, item.poster_path);

      await Watched.findOneAndUpdate(
        { userId: req.user.id, mediaId: mId, mediaType: mType },
        {
          $setOnInsert: {
            userId: req.user.id,
            mediaId: mId,
            mediaType: mType,
            title: item.title || 'Untitled',
            poster: fullPoster,
            poster_path: fullPoster,
            rating: item.rating || 'NR',
            year: item.year || 'N/A',
            overview: item.overview || '',
            watchedAt: item.watchedAt ? new Date(item.watchedAt) : new Date(),
          }
        },
        { upsert: true, new: true }
      );
      migratedWatched++;
    }

    // 2. Migrate Interested items
    for (const item of interested) {
      const mId = String(item.id || item.mediaId || '').trim();
      const mType = item.type || item.mediaType || 'movie';
      if (!mId) continue;
      const fullPoster = resolvePosterUrl(item.poster, item.poster_path);

      await Interested.findOneAndUpdate(
        { userId: req.user.id, mediaId: mId, mediaType: mType },
        {
          $setOnInsert: {
            userId: req.user.id,
            mediaId: mId,
            mediaType: mType,
            title: item.title || 'Untitled',
            poster: fullPoster,
            poster_path: fullPoster,
            rating: item.rating || 'NR',
            year: item.year || 'N/A',
            overview: item.overview || '',
            interestedAt: item.interestedAt ? new Date(item.interestedAt) : new Date(),
          }
        },
        { upsert: true, new: true }
      );
      migratedInterested++;
    }

    // 3. Migrate Ratings (prefer account data on conflict)
    for (const r of ratings) {
      const mId = String(r.id || r.mediaId || '').trim();
      const mType = r.type || r.mediaType || 'movie';
      const numRating = Number(r.rating);
      if (!mId || isNaN(numRating) || numRating < 1 || numRating > 10) continue;

      await Rating.findOneAndUpdate(
        { userId: req.user.id, mediaId: mId, mediaType: mType },
        {
          $setOnInsert: {
            userId: req.user.id,
            mediaId: mId,
            mediaType: mType,
            rating: Math.round(numRating * 10) / 10,
            title: r.title || '',
            poster: r.poster || r.poster_path || '',
            poster_path: r.poster_path || r.poster || '',
            ratedAt: r.ratedAt ? new Date(r.ratedAt) : new Date(),
          }
        },
        { upsert: true, new: true }
      );
      migratedRatings++;
    }

    return res.status(200).json({
      success: true,
      message: 'Guest data migrated successfully',
      count: {
        watched: migratedWatched,
        interested: migratedInterested,
        ratings: migratedRatings,
      }
    });
  } catch (err) {
    console.error('Error migrating guest data:', err);
    return res.status(500).json({ error: 'Failed to migrate guest data' });
  }
};
