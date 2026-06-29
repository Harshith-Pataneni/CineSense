const passport = require('passport');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
        });
        await user.save();
      } else {
        user.googleId = profile.id;
        await user.save();
      }
    }

    const displayName = user.name || user.email.split('@')[0];
    const token = jwt.sign(
      { id: user._id, email: user.email, name: displayName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return done(null, { user, token });
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((data, done) => done(null, data));

module.exports = passport;