const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const auth = require('./auth');
const { getDb } = require('./db');
const { syncAll } = require('./db/sync');
const {
  getOwners, getStages, getDealsByCloseDate, getDealsByCreateDate,
  getContactsByCreateDate, getSyncStatus,
} = require('./db/queries');
const { getPipelineVelocity } = require('./db/pipelineVelocity');

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

if (!TOKEN) {
  console.warn('\n\u26a0\ufe0f  WARNING: HUBSPOT_ACCESS_TOKEN is not set in backend/.env');
  console.warn('   Create backend/.env with your token. See .env.example for instructions.\n');
}

if (auth.isLoginEnabled()) {
  console.log('   App login: \u2713 enabled (set APP_LOGIN_USERNAME / APP_LOGIN_PASSWORD in .env)\n');
} else {
  console.log('   App login: \u2014 disabled (add APP_LOGIN_USERNAME + APP_LOGIN_PASSWORD to require sign-in)\n');
}

const db = getDb();
let syncInProgress = false;

// ──────── Public API (no app auth) ────────

app.get('/api/auth/config', (req, res) => {
  res.json({ loginRequired: auth.isLoginEnabled() });
});

app.post('/api/auth/login', (req, res) => {
  if (!auth.isLoginEnabled()) {
    return res.status(400).json({ error: 'App login is not configured on the server' });
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (!auth.credentialsMatch(username, password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = auth.createToken();
  res.json({
    token,
    displayName: process.env.APP_LOGIN_DISPLAY_NAME || String(username),
  });
});

app.get('/api/health', (req, res) => {
  const meta = getSyncStatus(db);
  res.json({
    status: 'ok',
    tokenConfigured: !!TOKEN,
    dbReady: true,
    lastSync: meta?.last_sync_completed_at || 'never',
    syncStatus: meta?.last_sync_status || 'never',
    loginRequired: auth.isLoginEnabled(),
  });
});

// ──────── Require app login for all other /api routes ────────
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  if (!auth.isLoginEnabled()) return next();
  const h = req.headers.authorization || '';
  const bearer = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!bearer || !auth.verifyToken(bearer)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ──────── Protected API ────────

app.get('/api/deals', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query params are required' });
  }
  try {
    const deals = getDealsByCloseDate(db, startDate, endDate);
    res.json(deals);
  } catch (err) {
    console.error('DB deals error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/owners', (req, res) => {
  try {
    res.json(getOwners(db));
  } catch (err) {
    console.error('DB owners error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deals/created', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query params are required' });
  }
  try {
    const deals = getDealsByCreateDate(db, startDate, endDate);
    res.json(deals);
  } catch (err) {
    console.error('DB deals/created error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stages', (req, res) => {
  try {
    const stages = getStages(db);
    stages.sort((a, b) => a.displayOrder - b.displayOrder);
    res.json(stages);
  } catch (err) {
    console.error('DB stages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/created', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query params are required' });
  }
  try {
    const contacts = getContactsByCreateDate(db, startDate, endDate);
    res.json(contacts);
  } catch (err) {
    console.error('DB contacts/created error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pipeline-velocity', (req, res) => {
  try {
    res.json(getPipelineVelocity(db));
  } catch (err) {
    console.error('Pipeline velocity error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync', (req, res) => {
  if (!TOKEN) {
    return res.status(500).json({ error: 'HUBSPOT_ACCESS_TOKEN not configured' });
  }
  if (syncInProgress) {
    return res.json({ status: 'already_running' });
  }

  syncInProgress = true;
  res.json({ status: 'started' });

  syncAll(db, TOKEN)
    .finally(() => { syncInProgress = false; });
});

app.get('/api/sync/status', (req, res) => {
  try {
    const meta = getSyncStatus(db);
    res.json({
      lastSyncAt: meta?.last_sync_completed_at || null,
      status: syncInProgress ? 'running' : (meta?.last_sync_status || 'never'),
      error: meta?.last_sync_error || null,
      counts: {
        deals: meta?.deals_count || 0,
        contacts: meta?.contacts_count || 0,
        owners: meta?.owners_count || 0,
        stages: meta?.stages_count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n\u2705 Sales Calendar backend running on http://localhost:${PORT}`);
  console.log(`   HubSpot token: ${TOKEN ? '\u2713 configured' : '\u2717 MISSING \u2014 add to backend/.env'}`);
  console.log(`   Database: \u2713 SQLite ready`);

  const meta = getSyncStatus(db);
  if (!meta?.last_sync_completed_at && TOKEN) {
    console.log('   No previous sync found \u2014 starting initial sync...');
    syncInProgress = true;
    syncAll(db, TOKEN).finally(() => { syncInProgress = false; });
  } else if (meta?.last_sync_completed_at) {
    console.log(`   Last sync: ${meta.last_sync_completed_at}`);
    console.log(`   Cached: ${meta.deals_count} deals, ${meta.contacts_count} contacts, ${meta.owners_count} owners\n`);
  }
});
