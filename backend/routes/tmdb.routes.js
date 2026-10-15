const express = require('express');
const router = express.Router();
const tmdbController = require('../controllers/tmdb.controller');

// Discovery endpoints
router.get('/discover', tmdbController.discoverMedia);
router.get('/discover/:type', tmdbController.discoverMedia);

// Trailer endpoints
router.get('/trailer', tmdbController.getTrailer);
router.get('/trailer/:type/:id', tmdbController.getTrailer);

// Genres endpoints
router.get('/genres', tmdbController.getGenres);
router.get('/genres/:type', tmdbController.getGenres);
router.get('/genre/:type/list', tmdbController.getGenres);

// Trending endpoints
router.get('/trending', tmdbController.getTrending);
router.get('/trending/:mediaType/:timeWindow', tmdbController.getTrending);

module.exports = router;
