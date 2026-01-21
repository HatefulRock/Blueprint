import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const DB_PATH = path.resolve(process.cwd(), 'server', 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

// ensure db exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Auth helpers ---
function issueToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization' });
  const [, token] = auth.split(' ');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Simple user registration/login to get a token (dev-only)
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  const db = readDB();
  const existing = Object.values(db.users || {}).find(u => u.username === username);
  if (existing) return res.status(409).json({ error: 'User exists' });
  const id = Date.now();
  const hashed = await bcrypt.hash(password, 8);
  db.users[String(id)] = { id, username, password: hashed, settings: { targetLanguage: 'Chinese', customTargetLanguages: [], readerSettings: {} } };
  writeDB(db);
  const token = issueToken(id);
  res.json({ id, username, token });
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  const db = readDB();
  const found = Object.values(db.users || {}).find(u => u.username === username);
  if (!found) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(password, found.password || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = issueToken(found.id);
  res.json({ id: found.id, username: found.username, token });
});

// Get user profile (protected)
app.get('/users/me', authMiddleware, (req, res) => {
  const sub = req.user && req.user.sub;
  const db = readDB();
  const user = db.users[sub] || null;
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { password, ...rest } = user;
  res.json({ ...rest });
});

// Helper to ensure user record exists
function ensureUserRecord(id) {
  const db = readDB();
  db.users[id] = db.users[id] || { id: Number(id), username: `user${id}`, settings: { targetLanguage: 'Chinese', customTargetLanguages: [], readerSettings: {} } };
  writeDB(db);
  return db;
}

// Get user settings (protected)
app.get('/users/:id/settings', authMiddleware, (req, res) => {
  const id = req.params.id;
  const db = ensureUserRecord(id);
  const user = db.users[id] || {};
  res.json(user.settings || { targetLanguage: 'Chinese', customTargetLanguages: [], readerSettings: {} });
});

// Update full settings (protected)
app.post('/users/:id/settings', authMiddleware, (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const db = ensureUserRecord(id);
  db.users[id].settings = { ...(db.users[id].settings || {}), ...payload };
  writeDB(db);
  res.json(db.users[id].settings);
});

// Add custom language (protected)
app.post('/users/:id/languages', authMiddleware, (req, res) => {
  const id = req.params.id;
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code+name required' });
  const db = ensureUserRecord(id);
  const settings = db.users[id].settings;
  settings.customTargetLanguages = settings.customTargetLanguages || [];
  if (!settings.customTargetLanguages.find(l => l.code === code)) settings.customTargetLanguages.push({ code, name });
  writeDB(db);
  res.json(settings.customTargetLanguages);
});

// Remove custom language (protected)
app.delete('/users/:id/languages/:code', authMiddleware, (req, res) => {
  const id = req.params.id;
  const code = decodeURIComponent(req.params.code);
  const db = ensureUserRecord(id);
  const settings = db.users[id].settings;
  settings.customTargetLanguages = (settings.customTargetLanguages || []).filter(l => l.code !== code);
  writeDB(db);
  res.json(settings.customTargetLanguages);
});

// Set default language (protected)
app.post('/users/:id/default-language', authMiddleware, (req, res) => {
  const id = req.params.id;
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  const db = ensureUserRecord(id);
  const settings = db.users[id].settings;
  settings.targetLanguage = code;
  writeDB(db);
  res.json({ targetLanguage: settings.targetLanguage });
});

// Update reader settings (protected)
app.post('/users/:id/reader-settings', authMiddleware, (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const db = ensureUserRecord(id);
  const settings = db.users[id].settings;
  settings.readerSettings = { ...(settings.readerSettings || {}), ...payload };
  writeDB(db);
  res.json(settings.readerSettings);
});

// Endpoint for checking in / heartbeat (keeps parity with frontend expectations)
app.post('/users/:id/check-in', authMiddleware, (req, res) => {
  const id = req.params.id;
  const db = ensureUserRecord(id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Settings server listening on http://localhost:${PORT}`);
});
