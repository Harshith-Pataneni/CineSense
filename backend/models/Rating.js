const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  title: {
    type: String,
    default: '',
  },
  poster: {
    type: String,
    default: '',
  },
  poster_path: {
    type: String,
    default: '',
  },
  ratedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

ratingSchema.index({ userId: 1, mediaId: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
