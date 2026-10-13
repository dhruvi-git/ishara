import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to find local LAN IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const BASE_URL = `http://${localIp}:${PORT}`;

// Bus defaults
const BUS = {
  reg: "MH01-4471",
  route: "A-202",
  from: "Andheri Stn (W)",
  to: "Marol Naka"
};

// In-memory state for the active bus session
let activeAlerts = [];
let incidentHistory = [];

// API to query network info & generate QR code for pairing
app.get('/api/network-info', async (req, res) => {
  const fullUrl = `${BASE_URL}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(fullUrl, {
      margin: 2,
      width: 280,
      color: { dark: '#1b2a5c', light: '#ffffff' }
    });
  } catch (err) {
    console.error('QR generation error:', err);
  }

  res.json({
    localIp,
    port: PORT,
    fullUrl,
    qrDataUrl,
    bus: BUS
  });
});

// API endpoint to generate QR code for any custom seat URL
app.get('/api/qr', async (req, res) => {
  const text = req.query.text || BASE_URL;
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      color: { dark: '#16204a', light: '#ffffff' }
    });
    res.json({ qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// Simulated SMS Shortcode Gateway (e.g. 56161 or 139)
app.post('/api/sms', (req, res) => {
  const { from = '98200XXXXX', text = '' } = req.body;
  const clean = text.trim().toUpperCase();
  const match = clean.match(/^([FR][1-4][LCR])\s*([0-3])?$/);

  const activeAlert = activeAlerts.find(a => a.status !== 'closed' && a.channel === 'sms');

  if (clean === 'OK' && activeAlert) {
    activeAlert.status = 'safe';
    activeAlert.safeAt = Date.now();
    activeAlert.updatedAt = Date.now();
    io.emit('alert:updated', activeAlert);
    return res.json({
      success: true,
      reply: 'Marked safe. Thank you for notifying us.'
    });
  }

  if (!match) {
    return res.json({
      success: false,
      reply: 'Invalid code. Send 3-character seat code from sticker (e.g. R4C) + optional type 1/2/3.'
    });
  }

  const zone = match[1];
  const type = match[2] ? Number(match[2]) : 0;

  const newAlert = {
    id: 'sms_' + Math.random().toString(36).slice(2, 9),
    bus: BUS.reg,
    route: BUS.route,
    zone,
    channel: 'sms',
    type,
    createdAt: Date.now(),
    status: 'new',
    steps: [false, false, false, false],
    ackAt: null,
    safeAt: null,
    closedAt: null,
    updatedAt: Date.now()
  };

  activeAlerts.push(newAlert);
  io.emit('alert:new', newAlert);

  res.json({
    success: true,
    reply: `Received. Conductor alerted silently to zone ${zone}. Help is arriving as a routine check. Reply OK when safe.`
  });
});

// Socket.io Real-time Bus Relay
io.on('connection', (socket) => {
  // Sync state on connection
  socket.emit('state:init', {
    bus: BUS,
    activeAlerts,
    history: incidentHistory,
    network: {
      localIp,
      port: PORT,
      fullUrl: BASE_URL
    }
  });

  // Passenger or conductor triggers alert
  socket.on('alert:create', (alertData) => {
    const alert = {
      id: alertData.id || 'alt_' + Math.random().toString(36).slice(2, 9),
      bus: BUS.reg,
      route: BUS.route,
      zone: alertData.zone || 'R4C',
      channel: alertData.channel || 'app',
      type: alertData.type || 0,
      createdAt: Date.now(),
      status: 'new',
      steps: [false, false, false, false],
      ackAt: null,
      safeAt: null,
      closedAt: null,
      updatedAt: Date.now()
    };

    activeAlerts.push(alert);
    io.emit('alert:new', alert);
  });

  // Conductor ticks de-escalation step, marks ack, or passenger marks safe
  socket.on('alert:update', (updatedAlert) => {
    const index = activeAlerts.findIndex(a => a.id === updatedAlert.id);
    if (index >= 0) {
      activeAlerts[index] = {
        ...activeAlerts[index],
        ...updatedAlert,
        updatedAt: Date.now()
      };
      io.emit('alert:updated', activeAlerts[index]);
    }
  });

  // Conductor finishes and closes alert
  socket.on('alert:close', (closeData) => {
    const index = activeAlerts.findIndex(a => a.id === closeData.id);
    if (index >= 0) {
      const finished = {
        ...activeAlerts[index],
        status: 'closed',
        closedAt: Date.now(),
        outcome: activeAlerts[index].status === 'safe' ? 'safe' : 'closed',
        updatedAt: Date.now()
      };
      activeAlerts.splice(index, 1);
      incidentHistory.unshift(finished);
      io.emit('alert:closed', finished);
    }
  });

  // Demo reset
  socket.on('demo:reset', () => {
    activeAlerts = [];
    io.emit('demo:reset_done');
  });
});

// Serve frontend via Vite middleware (dev) or dist static files (prod)
const isProd = process.env.NODE_ENV === 'production';
const distPath = path.join(rootDir, 'dist');

if (!isProd && !fs.existsSync(distPath)) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    root: rootDir,
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.clear();
  console.log('='.repeat(65));
  console.log('  ISHAARA (इशारा) — Transit Safety Alert Server Running');
  console.log('='.repeat(65));
  console.log(`\n  ▸ Laptop/Local URL:  http://localhost:${PORT}`);
  console.log(`  ▸ Phone Wi-Fi URL:   ${BASE_URL}`);
  console.log(`\n  Scan this QR code with your mobile phone connected to the`);
  console.log(`  same Wi-Fi network to test the Passenger seat sticker demo:\n`);

  try {
    const asciiQr = await QRCode.toString(BASE_URL, { type: 'terminal', small: true });
    console.log(asciiQr);
  } catch (err) {
    // ignore
  }

  console.log(`\n  Routes available:`);
  console.log(`   - All-in-One Trio View:    ${BASE_URL}`);
  console.log(`   - Passenger Mobile Screen: ${BASE_URL}?view=passenger&zone=R4C`);
  console.log(`   - Conductor Mobile Screen: ${BASE_URL}?view=conductor`);
  console.log(`   - Depot Safety Console:    ${BASE_URL}?view=depot`);
  console.log(`   - Printable Seat Stickers: ${BASE_URL}?view=stickers`);
  console.log('='.repeat(65) + '\n');
});
