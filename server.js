import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import passport from 'passport';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Initialize Database Layer Securely
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new Low(adapter, { users: [], items: [] });
await db.read();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Local Testing Friendly Sessions
app.use(session({
  secret: 'resist-absolute-clean-reset-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 Week
    secure: false, // Set to false so localhost HTTP session tracking never drops
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.read().then(() => {
    const user = db.data.users.find(u => u.id === id);
    done(null, user || false);
  }).catch(err => done(err, null));
});

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized.' });
};

/* ==================== AUTHENTICATION API CORRIDORS ==================== */

app.get('/api/auth/me', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name } });
  }
  res.status(401).json({ error: 'No active session.' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields are required.' });

    const cleanEmail = email.trim().toLowerCase();
    await db.read();

    if (db.data.users.find(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), email: cleanEmail, name: name.trim(), password: hash, createdAt: new Date().toISOString() };

    db.data.users.push(user);
    await db.write();

    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Auto-login session failed.' });
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server registration error.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    await db.read();
    const user = db.data.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    req.login(user, err => {
      if (err) return res.status(500).json({ error: 'Session mounting failure.' });
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server authentication exception.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

app.get('/api/auth/config', (req, res) => res.json({ googleAvailable: false }));

/* ==================== TRACKER LIST DATA ENDPOINTS ==================== */

app.get('/api/items', requireAuth, async (req, res) => {
  await db.read();
  res.json(db.data.items.filter(i => i.userId === req.user.id));
});

app.post('/api/items', requireAuth, async (req, res) => {
  const { name, price, category } = req.body;
  await db.read();
  const item = { id: crypto.randomUUID(), userId: req.user.id, name, price: parseFloat(price), category, bought: false, addedAt: new Date().toISOString() };
  db.data.items.push(item);
  await db.write();
  res.json(item);
});

app.delete('/api/items/:id', requireAuth, async (req, res) => {
  await db.read();
  db.data.items = db.data.items.filter(i => !(i.id === req.params.id && i.userId === req.user.id));
  await db.write();
  res.json({ ok: true });
});

// Serve UI Static Workspace Files
app.use(express.static(join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

app.listen(3000, () => console.log('🚀 Resist App Core Running smoothly at http://localhost:3000'));