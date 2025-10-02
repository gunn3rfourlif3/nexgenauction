const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// Environment flags
const IS_DEV = (process.env.NODE_ENV === 'development');
const SKIP_DB = IS_DEV && process.env.FORCE_DB_CONNECTION !== 'true';
const HAS_GOOGLE = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const HAS_FACEBOOK = !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
const HAS_GITHUB = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

// JWT Strategy for API authentication
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    // In dev without DB, accept token and attach minimal user object
    if (SKIP_DB) {
      return done(null, {
        _id: payload.id,
        username: 'devuser',
        firstName: 'Dev',
        lastName: 'User',
        email: 'devuser@example.com',
        role: 'admin',
        isActive: true
      });
    }

    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy
// Google OAuth Strategy (only initialize if credentials provided)
if (HAS_GOOGLE) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user;
      if (SKIP_DB) {
        // Dev mode without DB: return a mock user
        user = {
          _id: 'mock_google_' + profile.id,
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profileImage: profile.photos[0].value,
          isVerified: true,
          username: profile.emails[0].value.split('@')[0] + '_' + Date.now()
        };
        return done(null, user);
      }

      // Check if user already exists with this Google ID
      user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      // Check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.isVerified = true;
        await user.save();
        return done(null, user);
      }

      // Create new user
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profileImage: profile.photos[0].value,
        isVerified: true,
        username: profile.emails[0].value.split('@')[0] + '_' + Date.now()
      });
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('Passport: Skipping Google OAuth strategy (credentials not provided)');
}

// Facebook OAuth Strategy
// Facebook OAuth Strategy (only initialize if credentials provided)
if (HAS_FACEBOOK) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'picture.type(large)']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      if (SKIP_DB) {
        user = {
          _id: 'mock_facebook_' + profile.id,
          facebookId: profile.id,
          email,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
          username: email ? email.split('@')[0] + '_' + Date.now() : 'facebook_' + profile.id
        };
        return done(null, user);
      }

      user = await User.findOne({ facebookId: profile.id });
      if (user) return done(null, user);

      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.facebookId = profile.id;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }
      }

      user = new User({
        facebookId: profile.id,
        email,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        isVerified: true,
        username: email ? email.split('@')[0] + '_' + Date.now() : 'facebook_' + profile.id
      });
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('Passport: Skipping Facebook OAuth strategy (credentials not provided)');
}

// GitHub OAuth Strategy
// GitHub OAuth Strategy (only initialize if credentials provided)
if (HAS_GITHUB) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      if (SKIP_DB) {
        user = {
          _id: 'mock_github_' + profile.id,
          githubId: profile.id,
          email,
          firstName: profile.displayName ? profile.displayName.split(' ')[0] : profile.username,
          lastName: profile.displayName ? profile.displayName.split(' ').slice(1).join(' ') : '',
          profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
          username: profile.username + '_' + Date.now()
        };
        return done(null, user);
      }

      user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);

      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.githubId = profile.id;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }
      }

      user = new User({
        githubId: profile.id,
        email,
        firstName: profile.displayName ? profile.displayName.split(' ')[0] : profile.username,
        lastName: profile.displayName ? profile.displayName.split(' ').slice(1).join(' ') : '',
        profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        isVerified: true,
        username: profile.username + '_' + Date.now()
      });
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('Passport: Skipping GitHub OAuth strategy (credentials not provided)');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id || user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    if (SKIP_DB) {
      // Dev mode without DB: attach a minimal user stub
      return done(null, {
        _id: id,
        username: 'devuser',
        role: 'admin',
        isActive: true
      });
    }
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;