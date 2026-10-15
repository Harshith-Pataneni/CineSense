process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();   // ✅ FIXED POSITION

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const tmdbRoutes = require('./routes/tmdb.routes');
const userDataRoutes = require('./routes/userData.routes');

const app = express();

app.use(cors());
app.use(express.json());
const session = require('express-session');

app.use(session({
  secret: process.env.JWT_SECRET || 'decider_session_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());   // add this too

mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

app.use('/auth', authRoutes);
app.use('/api', tmdbRoutes);
app.use('/api/user', userDataRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));