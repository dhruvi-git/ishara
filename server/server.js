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
// Prefers the Wi-Fi adapter over virtual ones (WSL, Hyper-V, VirtualBox)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ name, address: iface.address });
      }
    }
  }
  const isVirtual = (n) => /vethernet|virtual|vmware|wsl|hyper-v|docker|loopback/i.test(n);
  const wifi = candidates.find(c => /wi-?fi|wlan|wireless/i.test(c.name));
  const real = candidates.find(c => !isVirtual(c.name));
  return (wifi || real || candidates[0] || { address: 'localhost' }).address;
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

  const activeAlert = [...activeAlerts].reverse().find(a => a.channel === 'sms' && a.status !== 'safe');

  if (clean === 'OK' && activeAlert) {
    activeAlert.status = 'safe';
    activeAlert.safeAt = Date.now();
    activeAlert.updatedAt = Date.now();
    io.emit('alert:updated', activeAlert);
    return res.json({
      success: true,
      reply: 'Marked safe. Thank you.'
    });
  }

  if (!match) {
    return res.json({
      success: false,
      reply: 'Code not recognised. Send the seat code from the sticker, e.g. R4C.'
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
    reply: `Got it. The conductor has been alerted to seat ${zone}. Reply OK when you are safe.`
  });
});

// Socket.io Real-time Bus Relay
// Event names mirror the client's realtime.send() calls. The sender already
// applied the event locally, so we relay to everyone else.
const broadcastPresence = () => io.emit('presence', { devices: io.engine.clientsCount });

io.on('connection', (socket) => {
  // Sync state so a phone joining mid-demo sees the live alert
  socket.emit('state:init', {
    bus: BUS,
    activeAlerts,
    history: incidentHistory
  });
  broadcastPresence();
  socket.on('disconnect', broadcastPresence);

  // Passenger or conductor triggers alert
  socket.on('alert:new', (alert) => {
    if (!alert || !alert.id || activeAlerts.some(a => a.id === alert.id)) return;
    activeAlerts.push(alert);
    socket.broadcast.emit('alert:new', alert);
  });

  // Conductor ticks de-escalation step, or passenger marks safe
  socket.on('alert:updated', (patch) => {
    const index = activeAlerts.findIndex(a => a.id === patch?.id);
    if (index < 0) return;
    activeAlerts[index] = { ...activeAlerts[index], ...patch, updatedAt: Date.now() };
    socket.broadcast.emit('alert:updated', activeAlerts[index]);
  });

  // Conductor finishes and closes alert
  socket.on('alert:closed', (closed) => {
    const index = activeAlerts.findIndex(a => a.id === closed?.id);
    if (index < 0) return;
    const finished = { ...activeAlerts[index], ...closed };
    activeAlerts.splice(index, 1);
    incidentHistory.unshift(finished);
    socket.broadcast.emit('alert:closed', finished);
  });

  // Demo reset
  socket.on('demo:reset_done', () => {
    activeAlerts = [];
    incidentHistory = [];
    socket.broadcast.emit('demo:reset_done');
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

// A second `npm start` would otherwise crash with a bare EADDRINUSE stack trace
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
  Port ${PORT} is already in use: Ishaara is probably already running.`);
    console.error(`  Open http://localhost:${PORT}, or close the other terminal and run npm start again.
`);
    process.exit(1);
  }
  throw err;
});

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
