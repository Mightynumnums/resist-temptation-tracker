import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// DB setup
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new Low(adapter, { users: [], items: [] });
try {
  await db.read();
} catch (err) {
  console.error("Database read error initialization failure:", err);
}

// Mailer with error safety fallback
let mailer;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'resist-fallback-unsecure-session-string-value-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production', // Security enhancement
    httpOnly: true
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Config
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.read()
    .then(() => {
      const user = db.data.users.find(u => u.id === id);
      done(null, user || false);
    })
    .catch(err => done(err, null));
});

// Explicitly tracking configuration setup
const isGoogleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (isGoogleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await db.read();
      let user = db.data.users.find(u => u.googleId === profile.id);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          createdAt: new Date().toISOString(),
        };
        db.data.users.push(user);
        await db.write();
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));
}

// Authentication Guard Middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required. Please log in or register.' });
};

// --- AUTH STATUS API (Tells UI if Google is alive) ---
app.get('/api/auth/config', (req, res) => {
  res.json({ googleAvailable: isGoogleConfigured });
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields are required.' });

    await db.read();
    if (db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), email, name, password: hash, createdAt: new Date().toISOString() };
    db.data.users.push(user);
    await db.write();

    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Registration succeeded, but auto-login failed.' });
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal system error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid email or password combination.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password combination.' });

    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Login verification failed on host.' });
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while evaluating authentication requests.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name } });
});

// Google OAuth Wrapper Guards
app.get('/auth/google', (req, res, next) => {
  if (!isGoogleConfigured) return res.status(501).send("OAuth service unconfigured on this deployment configuration environment instance.");
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!isGoogleConfigured) return res.status(501).send("OAuth setup unconfigured.");
  passport.authenticate('google', { failureRedirect: '/?error=google' })(req, res, next);
}, (req, res) => res.redirect('/'));

// Password Reset Handling
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!mailer) return res.status(503).json({ error: 'Email services are currently offline.' });

    await db.read();
    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.json({ ok: true }); // Prevent scraping valid accounts

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetExpires = Date.now() + 3600000;
    await db.write();

    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await mailer.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@resist.app',
      to: email,
      subject: 'Reset your Resist password',
      html: `<p>Hi ${user.name},</p><p>Reset link (expires in 1 hour):</p><a href="${resetUrl}">${resetUrl}</a>`,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to process email dispatch request parameters smoothly.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.resetToken === token && u.resetExpires > Date.now());
    if (!user) return res.status(400).json({ error: 'Invalid or expired secure reset link token credentials.' });

    user.password = await bcrypt.hash(password, 10);
    delete user.resetToken;
    delete user.resetExpires;
    await db.write();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'DB system error handling updating credentials settings safely.' });
  }
});

// --- ITEMS ROUTING API ---
app.get('/api/items', requireAuth, async (req, res) => {
  try {
    await db.read();
    res.json(db.data.items.filter(i => i.userId === req.user.id));
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch saved list assets details cleanly.' });
  }
});

app.post('/api/items', requireAuth, async (req, res) => {
  try {
    const { name, price, category, color } = req.body;
    if (!name || price == null || isNaN(parseFloat(price))) return res.status(400).json({ error: 'Valid name and numerical cost are required metrics.' });

    await db.read();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      name,
      price: parseFloat(price),
      category: category || 'other',
      color: color || '#C0DD97',
      bought: false,
      addedAt: new Date().toISOString(),
    };
    db.data.items.push(item);
    await db.write();
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: 'Internal Error processing save file arrays gracefully.' });
  }
});

app.patch('/api/items/:id', requireAuth, async (req, res) => {
  try {
    await db.read();
    const item = db.data.items.find(i => i.id === req.params.id && i.userId === req.user.id);
    if (!item) return res.status(404).json({ error: 'Target list entry item reference missing from profile history indexes.' });

    const allowed = ['name', 'price', 'category', 'color', 'bought'];
    allowed.forEach(k => { if (req.body[k] !== undefined) item[k] = req.body[k]; });
    if (req.body.bought === true && !item.boughtAt) item.boughtAt = new Date().toISOString();

    await db.write();
    res.json(item);
  } catch(e) {
    res.status(500).json({ error: 'Cannot update parameters cleanly.' });
  }
});

app.delete('/api/items/:id', requireAuth, async (req, res) => {
  try {
    await db.read();
    const idx = db.data.items.findIndex(i => i.id === req.params.id && i.userId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Target tracking ID node entry item missing.' });

    db.data.items.splice(idx, 1);
    await db.write();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Unable to remove record indexes from active state tables array layers safely.' });
  }
});

app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Resist listening safely at http://localhost:${PORT}`));