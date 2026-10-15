const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const userDataController = require('../controllers/userData.controller');

// All routes require authentication via verifyToken
router.use(verifyToken);

// Unified user library
router.get('/library', userDataController.getLibrary);

// Watched collection
router.get('/watched', userDataController.getWatched);
router.post('/watched', userDataController.addWatched);
router.delete('/watched/:mediaId', userDataController.removeWatched);
router.delete('/watched', userDataController.clearWatched);

// Interested collection
router.get('/interested', userDataController.getInterested);
router.post('/interested', userDataController.addInterested);
router.delete('/interested/:mediaId', userDataController.removeInterested);
router.delete('/interested', userDataController.clearInterested);

// Ratings collection
router.get('/ratings', userDataController.getRatings);
router.post('/ratings', userDataController.setRating);
router.delete('/ratings/:mediaId', userDataController.removeRating);

// Guest-to-user migration
router.post('/migrate', userDataController.migrateGuestData);

module.exports = router;
