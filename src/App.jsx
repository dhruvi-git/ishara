import React, { useState, useEffect } from 'react';
import { socket, broadcastChannel } from './utils/socket';
import { BUS, DEFAULT_ZONE } from './constants/busData';
import PassengerView from './components/PassengerView';
import ConductorView from './components/ConductorView';
import DepotView from './components/DepotView';
import PairingModal from './components/PairingModal';
import StickerGenerator from './components/StickerGenerator';
import { QrCode, Printer, RotateCcw, Smartphone, Laptop, Radio, ExternalLink, Shield } from 'lucide-react';

export default function App() {
  const [urlParams, setUrlParams] = useState({ view: null, zone: DEFAULT_ZONE });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('p'); // 'p' | 'c' | 'd'

  // Incident state
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [isConductorBuzzing, setIsConductorBuzzing] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);

  // Parse URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const zone = params.get('zone') || DEFAULT_ZONE;
    setUrlParams({ view, zone });

    // Fetch network info for pairing QR
    fetch('/api/network-info')
      .then(r => r.json())
      .then(data => setNetworkInfo(data))
      .catch(err => {
        // Fallback for static Vercel deployment
        setNetworkInfo({
          localIp: window.location.hostname,
          port: window.location.port || '443',
          fullUrl: window.location.origin,
          bus: BUS
        });
      });
  }, []);

  // Handle incoming alert effects
  const handleIncomingAlert = (alert) => {
    setActiveAlerts(prev => {
      const filtered = prev.filter(a => a.id !== alert.id);
      return [...filtered, alert];
    });

    // Buzz conductor device
    setIsConductorBuzzing(true);
    setTimeout(() => setIsConductorBuzzing(false), 2000);

    // Try browser haptic vibration
    try {
      if (navigator.vibrate) {
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

  // Socket & BroadcastChannel listeners
  useEffect(() => {
    socket.on('state:init', (data) => {
      setActiveAlerts(data.activeAlerts || []);
      setIncidentHistory(data.history || []);
      if (data.network) {
        setNetworkInfo(prev => ({ ...prev, ...data.network }));
      }
    });

    socket.on('alert:new', (alert) => {
      handleIncomingAlert(alert);
    });

    socket.on('alert:updated', (updated) => {
      setActiveAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
    });

    socket.on('alert:closed', (closed) => {
      setActiveAlerts(prev => prev.filter(a => a.id !== closed.id));
      setIncidentHistory(prev => [closed, ...prev]);
    });

    socket.on('demo:reset_done', () => {
      setActiveAlerts([]);
      setIncidentHistory([]);
    });

    // Cross-tab synchronization via BroadcastChannel (works on Vercel without a backend)
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'alert:new') {
          handleIncomingAlert(data);
        } else if (type === 'alert:updated') {
          setActiveAlerts(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
        } else if (type === 'alert:closed') {
          setActiveAlerts(prev => prev.filter(a => a.id !== data.id));
          setIncidentHistory(prev => [data, ...prev]);
        } else if (type === 'demo:reset') {
          setActiveAlerts([]);
          setIncidentHistory([]);
        }
      };
    }

    return () => {
      socket.off('state:init');
      socket.off('alert:new');
      socket.off('alert:updated');
      socket.off('alert:closed');
      socket.off('demo:reset_done');
    };
  }, []);

  // Active alert for the current context
  const currentActiveAlert = activeAlerts[activeAlerts.length - 1] || null;

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

    if (socket && socket.connected) {
      socket.emit('alert:create', alert);
    } else {
      handleIncomingAlert(alert);
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'alert:new', data: alert });
      }
    }
  };

  const handleUpdateAlert = (updatedData) => {
    if (socket && socket.connected) {
      socket.emit('alert:update', updatedData);
    } else {
      setActiveAlerts(prev => prev.map(a => a.id === updatedData.id ? { ...a, ...updatedData, updatedAt: Date.now() } : a));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'alert:updated', data: updatedData });
      }
    }
  };

  const handleCloseAlert = (alert) => {
    if (socket && socket.connected) {
      socket.emit('alert:close', alert);
    } else {
      const closed = {
        ...alert,
        status: 'closed',
        closedAt: Date.now(),
        outcome: alert.status === 'safe' ? 'safe' : 'closed',
        updatedAt: Date.now()
      };
      setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
      setIncidentHistory(prev => [closed, ...prev]);
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'alert:closed', data: closed });
      }
    }
  };

  const handleResetDemo = () => {
    if (socket && socket.connected) {
      socket.emit('demo:reset');
    } else {
      setActiveAlerts([]);
      setIncidentHistory([]);
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'demo:reset' });
      }
    }
  };

  // If URL explicitly requests Standalone Views (e.g. on mobile phones)
  if (urlParams.view === 'passenger') {
    return (
      <div className="mobile-standalone">
        <div className="phone-sbar">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>4G · Seat {urlParams.zone}</span>
        </div>
        <div className="phone-scroll">
          <PassengerView
            zone={urlParams.zone}
            activeAlert={currentActiveAlert}
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
        <div className="phone-sbar">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>BEST Conductor On Duty</span>
        </div>
        <div className="phone-scroll">
          <ConductorView
            activeAlert={currentActiveAlert}
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
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
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
        onBack={() => setUrlParams({ view: null, zone: DEFAULT_ZONE })}
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
              A silent seat-to-conductor alert system for women facing harassment on public transit.
              Runs the full synchronized loop: passenger, conductor, and depot console.
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
              background: 'var(--ok)',
              boxShadow: '0 0 0 4px var(--ok-soft)'
            }} />
            <span>Live Multi-Device Relay</span>
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
            onClick={() => setUrlParams({ view: 'stickers', zone: DEFAULT_ZONE })}
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
            <b>Passenger signals silently.</b> Tap the seat NFC sticker, send an SMS from a ₹1,000 basic phone, or use the “Sakhi stop” code phrase.
          </span>
        </li>
        <li>
          <span className="num">2</span>
          <span>
            <b>Conductor device vibrates silently.</b> Displays her exact seat zone and a structured de-escalation script that looks like routine ticket inspection.
          </span>
        </li>
        <li>
          <span className="num">3</span>
          <span>
            <b>Depot detects incident patterns.</b> Logs every alert with zero personally identifiable data (Zero-PII), mapping hotspot stretches and peak hours.
          </span>
        </li>
      </ol>

      {/* Mobile Tab switcher (shown below 1100px) */}
      <div className="segmented-control no-print" style={{ display: 'none', marginBottom: 16 }} id="mobile-tabs">
        <button
          type="button"
          onClick={() => { setActiveTab('p'); setHasUnreadAlert(false); }}
          className={`seg-btn ${activeTab === 'p' ? 'active' : ''}`}
        >
          Passenger Phone
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('c'); setHasUnreadAlert(false); }}
          className={`seg-btn ${activeTab === 'c' ? 'active' : ''}`}
        >
          Conductor Phone {hasUnreadAlert && '🔴'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('d')}
          className={`seg-btn ${activeTab === 'd' ? 'active' : ''}`}
        >
          Depot Safety Console
        </button>
      </div>

      {/* Trio Simulator Stage */}
      <main className="stage-trio">
        {/* PASSENGER PHONE COLUMN */}
        <section className="col-pane">
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
                  activeAlert={currentActiveAlert}
                  onCreateAlert={handleCreateAlert}
                  onUpdateAlert={handleUpdateAlert}
                  onSwitchToConductor={() => setActiveTab('c')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONDUCTOR PHONE COLUMN */}
        <section className="col-pane">
          <div className="col-header">
            <h2>Conductor’s Device</h2>
            <span>Silent · Haptic only</span>
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
        <section className="col-pane" style={{ minWidth: 0 }}>
          <div className="col-header">
            <h2>Depot Safety Console</h2>
            <span>7-Day Pattern Intelligence</span>
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
      />
    </div>
  );
}
