import React, { useState, useEffect } from 'react';
import { realtime } from './utils/realtime';
import { BUS, DEFAULT_ZONE } from './constants/busData';
import PassengerView from './components/PassengerView';
import ConductorView from './components/ConductorView';
import DepotView from './components/DepotView';
import PairingModal from './components/PairingModal';
import StickerGenerator from './components/StickerGenerator';
import { QrCode, Printer, RotateCcw, Smartphone, Laptop, Radio, ExternalLink, Shield } from 'lucide-react';

export default function App() {
  const [urlParams, setUrlParams] = useState({ view: null, zone: DEFAULT_ZONE, room: 'bus4471' });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('p'); // 'p' | 'c' | 'd'

  // Incident state
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [isConductorBuzzing, setIsConductorBuzzing] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);

  // Connection state
  const [peerCount, setPeerCount] = useState(0);
  const [connStatus, setConnStatus] = useState('ready');

  // Handle incoming alert effects
  const handleIncomingAlert = (alert) => {
    setActiveAlerts(prev => {
      const filtered = prev.filter(a => a.id !== alert.id);
      return [...filtered, alert];
    });

    // Buzz conductor device
    setIsConductorBuzzing(true);
    setTimeout(() => setIsConductorBuzzing(false), 2000);

    // Real haptics only on the conductor's device (or the laptop trio view)
    const view = new URLSearchParams(window.location.search).get('view');
    try {
      if (navigator.vibrate && (!view || view === 'conductor')) {
        navigator.vibrate([180, 90, 180, 90, 300]);
      }
    } catch (e) {}

    // Subtle audio chime
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}

    setHasUnreadAlert(true);
  };

  // Initialize URL & Realtime Manager
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const zone = params.get('zone') || DEFAULT_ZONE;
    const room = params.get('room') || 'bus4471';
    setUrlParams({ view, zone, room });

    // Host is the main dashboard; standalone views act as clients
    const isHost = !view;

    // Initialize unified realtime manager (WebRTC P2P + Socket.io + BroadcastChannel)
    realtime.init({ roomId: room, isHost });

    const unsubStatus = realtime.onStatusChange(({ status, peerCount }) => {
      setPeerCount(peerCount || 0);
      setConnStatus(status);
    });

    const unsubAlertNew = realtime.on('alert:new', (alert) => {
      handleIncomingAlert(alert);
    });

    const unsubAlertUpd = realtime.on('alert:updated', (updated) => {
      setActiveAlerts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    });

    const unsubAlertClose = realtime.on('alert:closed', (closed) => {
      setActiveAlerts(prev => prev.filter(a => a.id !== closed.id));
      setIncidentHistory(prev => [closed, ...prev.filter(a => a.id !== closed.id)]);
    });

    // Server snapshot when this device connects (e.g. phone joining mid-demo)
    const unsubInit = realtime.on('state:init', ({ activeAlerts: live = [], history = [] }) => {
      setActiveAlerts(live);
      setIncidentHistory(history);
    });

    const unsubReset = realtime.on('demo:reset_done', () => {
      setActiveAlerts([]);
      setIncidentHistory([]);
    });

    // Fetch network info for pairing QR (if local backend is running)
    fetch('/api/network-info')
      .then(r => r.json())
      .then(data => setNetworkInfo(data))
      .catch(() => {
        // Fallback for static Vercel deployment
        setNetworkInfo({
          localIp: window.location.hostname,
          port: window.location.port || '443',
          fullUrl: window.location.origin,
          bus: BUS
        });
      });

    return () => {
      unsubStatus();
      unsubAlertNew();
      unsubAlertUpd();
      unsubAlertClose();
      unsubReset();
      unsubInit();
    };
  }, []);

  // Active alert for current context
  const isOffline = connStatus === 'socket_disconnected';
  const currentActiveAlert = activeAlerts[activeAlerts.length - 1] || null;
  // The passenger's phone only reacts to the alert it sent from its own seat
  const passengerAlert = [...activeAlerts].reverse()
    .find(a => a.zone === urlParams.zone && a.channel === 'app') || null;

  // Actions
  const handleCreateAlert = (alertData) => {
    const alert = {
      id: alertData.id || 'alt_' + Math.random().toString(36).slice(2, 9),
      bus: BUS.reg,
      route: BUS.route,
      zone: alertData.zone || DEFAULT_ZONE,
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

    realtime.send('alert:new', alert);
  };

  const handleUpdateAlert = (updatedData) => {
    realtime.send('alert:updated', updatedData);
  };

  const handleCloseAlert = (alert) => {
    const closed = {
      ...alert,
      status: 'closed',
      closedAt: Date.now(),
      outcome: alert.status === 'safe' ? 'safe' : 'closed',
      updatedAt: Date.now()
    };
    realtime.send('alert:closed', closed);
  };

  const handleResetDemo = () => {
    realtime.send('demo:reset_done', null);
  };

  // If URL explicitly requests Standalone Views (e.g. on mobile phones)
  if (urlParams.view === 'passenger') {
    return (
      <div className="mobile-standalone">
        <header className="app-header">
          <div className="brand"><span className="brand-mark-sm">इ</span>Ishaara</div>
          <div className="meta">
            <span className={`live-dot ${isOffline ? 'off' : ''}`} />
            Seat {urlParams.zone} · {BUS.reg}
          </div>
        </header>
        <div className="phone-scroll">
          <PassengerView
            zone={urlParams.zone}
            activeAlert={passengerAlert}
            onCreateAlert={handleCreateAlert}
            onUpdateAlert={handleUpdateAlert}
            isStandalone={true}
          />
        </div>
      </div>
    );
  }

  if (urlParams.view === 'conductor') {
    return (
      <div className="mobile-standalone">
        {isConductorBuzzing && <div className="flash-overlay" aria-hidden="true" />}
        <header className="app-header">
          <div className="brand"><span className="brand-mark-sm">इ</span>Conductor</div>
          <div className="meta">
            <span className={`live-dot ${isOffline ? 'off' : ''}`} />
            {isOffline ? 'Offline' : `On duty · ${BUS.reg}`}
          </div>
        </header>
        <div className="phone-scroll">
          <ConductorView
            activeAlert={currentActiveAlert}
            alerts={activeAlerts}
            onUpdateAlert={handleUpdateAlert}
            onCloseAlert={handleCloseAlert}
            onCreateAlert={handleCreateAlert}
            isBuzzing={isConductorBuzzing}
          />
        </div>
      </div>
    );
  }

  if (urlParams.view === 'depot') {
    return (
      <div className="wrap">
        <DepotView
          liveAlerts={activeAlerts}
          incidentHistory={incidentHistory}
        />
      </div>
    );
  }

  if (urlParams.view === 'stickers') {
    return (
      <StickerGenerator
        networkInfo={networkInfo}
        roomId={urlParams.room}
        onBack={() => setUrlParams(prev => ({ ...prev, view: null }))}
      />
    );
  }

  // DEFAULT VIEW: Full Trio Presentation Dashboard (Laptop / Presentation mode)
  return (
    <div className="wrap">
      {/* Top Header */}
      <header className="top-bar">
        <div className="brand-section">
          <div className="brand-mark" aria-hidden="true">
            इ
          </div>
          <div className="brand-title">
            <h1>
              Ishaara <span>इशारा</span>
            </h1>
            <p>
              A silent alert from a bus seat to the conductor's phone.
              Help arrives looking like a routine ticket check.
            </p>
          </div>
        </div>

        <div className="nav-actions">
          {/* Live indicator */}
          <div className="btn-pill" style={{ cursor: 'default' }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connStatus === 'socket_disconnected' ? 'var(--alert)' : peerCount > 0 ? 'var(--ok)' : 'var(--saffron)',
              boxShadow: connStatus === 'socket_disconnected' ? '0 0 0 4px var(--alert-soft)' : peerCount > 0 ? '0 0 0 4px var(--ok-soft)' : '0 0 0 4px var(--saffron-soft)'
            }} />
            <span>
              {connStatus === 'socket_disconnected'
                ? 'Server offline: run npm start'
                : peerCount > 0
                  ? `Live: ${peerCount} other device${peerCount === 1 ? '' : 's'} linked`
                  : `Bus ${BUS.reg} · waiting for phones`}
            </span>
          </div>

          {/* Pairing QR Button */}
          <button
            type="button"
            onClick={() => setIsPairModalOpen(true)}
            className="btn-pill primary"
          >
            <QrCode size={15} />
            Scan Phone QR
          </button>

          {/* Seat Stickers Button */}
          <button
            type="button"
            onClick={() => setUrlParams(prev => ({ ...prev, view: 'stickers' }))}
            className="btn-pill"
          >
            <Printer size={15} />
            Seat Stickers
          </button>

          {/* Reset Demo */}
          <button
            type="button"
            onClick={handleResetDemo}
            className="btn-pill"
            title="Clear active demo alerts"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </header>

      {/* 3-Step Educational Strip */}
      <ol className="steps-strip">
        <li>
          <span className="num">1</span>
          <span>
            <b>She signals from her seat.</b> Tap or scan the seat sticker, SMS the seat code from any phone, or ask the conductor for “Sakhi stop”.
          </span>
        </li>
        <li>
          <span className="num">2</span>
          <span>
            <b>Only the conductor's phone vibrates.</b> It shows her seat zone and four steps that look like normal duty: ticket check, re-seating, stop call.
          </span>
        </li>
        <li>
          <span className="num">3</span>
          <span>
            <b>The depot sees where and when.</b> Each alert is logged by route, seat zone and time. No names or phone numbers.
          </span>
        </li>
      </ol>

      {/* Mobile Tab switcher (shown below 1100px) */}
      <div className="segmented-control mobile-tabs no-print">
        <button
          type="button"
          onClick={() => { setActiveTab('p'); setHasUnreadAlert(false); }}
          className={`seg-btn ${activeTab === 'p' ? 'active' : ''}`}
        >
          Passenger
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('c'); setHasUnreadAlert(false); }}
          className={`seg-btn ${activeTab === 'c' ? 'active' : ''}`}
        >
          Conductor {hasUnreadAlert && <span className="unread-dot" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('d')}
          className={`seg-btn ${activeTab === 'd' ? 'active' : ''}`}
        >
          Depot
        </button>
      </div>

      {/* Trio Simulator Stage */}
      <main className="stage-trio">
        {/* PASSENGER PHONE COLUMN */}
        <section className={`col-pane ${activeTab === 'p' ? 'is-active' : ''}`}>
          <div className="col-header">
            <h2>Passenger’s Phone</h2>
            <span>Seat {urlParams.zone}</span>
          </div>

          <div className="phone-frame">
            <div className="phone-screen">
              <div className="phone-sbar">
                <span>18:42</span>
                <span>4G ▮▮▮</span>
              </div>
              <div className="phone-scroll">
                <PassengerView
                  zone={urlParams.zone}
                  activeAlert={passengerAlert}
                  onCreateAlert={handleCreateAlert}
                  onUpdateAlert={handleUpdateAlert}
                  onSwitchToConductor={() => setActiveTab('c')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONDUCTOR PHONE COLUMN */}
        <section className={`col-pane ${activeTab === 'c' ? 'is-active' : ''}`}>
          <div className="col-header">
            <h2>Conductor’s Device</h2>
            <span>Vibrates only</span>
          </div>

          <div className={`phone-frame ${isConductorBuzzing ? 'buzz' : ''}`}>
            <div className="phone-screen">
              <div className="phone-sbar">
                <span>18:42</span>
                <span>BEST On Duty</span>
              </div>
              <div className="phone-scroll">
                <ConductorView
                  activeAlert={currentActiveAlert}
                  alerts={activeAlerts}
                  onUpdateAlert={handleUpdateAlert}
                  onCloseAlert={handleCloseAlert}
                  onCreateAlert={handleCreateAlert}
                  isBuzzing={isConductorBuzzing}
                />
              </div>
            </div>
          </div>
        </section>

        {/* DEPOT SAFETY CONSOLE COLUMN */}
        <section className={`col-pane ${activeTab === 'd' ? 'is-active' : ''}`} style={{ minWidth: 0 }}>
          <div className="col-header">
            <h2>Depot</h2>
            <span>Last 7 days</span>
          </div>

          <DepotView
            liveAlerts={activeAlerts}
            incidentHistory={incidentHistory}
          />
        </section>
      </main>

      {/* Live Phone Pairing Modal */}
      <PairingModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        networkInfo={networkInfo}
        currentZone={urlParams.zone}
        roomId={urlParams.room}
      />
    </div>
  );
}
