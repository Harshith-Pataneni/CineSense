const mongoose = require('mongoose');

const watchedSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  mediaId: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['movie', 'tv'],
    required: true,
    default: 'movie',
  },
  title: {
    type: String,
    required: true,
  },
  poster: {
    type: String,
    default: '',
  },
  poster_path: {
    type: String,
    default: '',
  },
  rating: {
    type: String,
    default: 'NR',
  },
  year: {
    type: String,
    default: 'N/A',
  },
  overview: {
    type: String,
    default: '',
  },
  watchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

watchedSchema.index({ userId: 1, mediaId: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model('Watched', watchedSchema);
