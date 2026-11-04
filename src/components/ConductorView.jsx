import React, { useState, useEffect } from 'react';
import { BUS, SCRIPT, TYPES, zoneName, formatDuration } from '../constants/busData';
import BusLayoutMap from './BusLayoutMap';
import { AlertTriangle, CheckCircle, ShieldAlert, Clock, Check, BellOff } from 'lucide-react';

export default function ConductorView({
  activeAlert: latestAlert = null,
  alerts = [],
  onUpdateAlert,
  onCloseAlert,
  onCreateAlert,
  isBuzzing = false
}) {
  const [selectedZone, setSelectedZone] = useState("R4C");
  const [elapsed, setElapsed] = useState("0s");
  const [focusId, setFocusId] = useState(null);
  const [closedNote, setClosedNote] = useState(null);

  // Newest alert by default; the conductor can switch to another open one
  const activeAlert = alerts.find(a => a.id === focusId) || latestAlert;

  // A brand-new alert takes focus so the buzz always matches the screen
  useEffect(() => {
    if (latestAlert) setFocusId(latestAlert.id);
  }, [latestAlert?.id]);

  // Update timer every second when an alert is active
  useEffect(() => {
    if (!activeAlert) {
      setElapsed("0s");
      return;
    }

    const updateTimer = () => {
      const ms = (activeAlert.safeAt || Date.now()) - activeAlert.createdAt;
      setElapsed(formatDuration(ms));
    };

    updateTimer();
    // Clock stops once she marks herself safe
    if (activeAlert.safeAt) return;
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeAlert?.id, activeAlert?.createdAt, activeAlert?.safeAt]);

  useEffect(() => {
    if (!closedNote) return;
    const t = setTimeout(() => setClosedNote(null), 5000);
    return () => clearTimeout(t);
  }, [closedNote]);

  const isSafe = activeAlert?.status === 'safe';
  const hotZone = activeAlert ? activeAlert.zone : null;

  // Toggle protocol script step
  const handleToggleStep = (index) => {
    if (!activeAlert || !onUpdateAlert) return;
    const nextSteps = [...(activeAlert.steps || [false, false, false, false])];
    nextSteps[index] = !nextSteps[index];

    onUpdateAlert({
      id: activeAlert.id,
      steps: nextSteps,
      ackAt: activeAlert.ackAt || Date.now(),
      status: activeAlert.status === 'new' ? 'ack' : activeAlert.status
    });
  };

  const handleLogPhrase = () => {
    if (onCreateAlert) {
      onCreateAlert({
        zone: selectedZone,
        channel: 'phrase',
        type: 0
      });
    }
  };

  const handleClose = () => {
    if (activeAlert && onCloseAlert) {
      const end = activeAlert.safeAt || Date.now();
      setClosedNote(`Zone ${activeAlert.zone} logged anonymously · resolved in ${formatDuration(end - activeAlert.createdAt)}`);
      onCloseAlert(activeAlert);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Conductor Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 0'
      }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>
            Route {BUS.route}
          </div>
          <b style={{ fontSize: 14.5 }}>{BUS.from} → {BUS.to}</b>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 999,
          padding: '3px 10px',
          background: activeAlert ? (isSafe ? 'var(--ok-soft)' : 'var(--alert-soft)') : 'var(--ok-soft)',
          color: activeAlert ? (isSafe ? 'var(--ok)' : 'var(--alert)') : 'var(--ok)'
        }}>
          {activeAlert ? (
            isSafe ? <CheckCircle size={14} /> : <ShieldAlert size={14} />
          ) : (
            <BellOff size={14} />
          )}
          {activeAlert ? (isSafe ? 'Passenger Safe' : 'Silent Alert!') : 'On duty'}
        </div>
      </div>

      {closedNote && (
        <div className="closed-note" role="status">
          <CheckCircle size={16} />
          <span>{closedNote}</span>
        </div>
      )}

      {/* When NO alert is active */}
      {!activeAlert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Interactive Bus Seat Map */}
          <BusLayoutMap
            activeZone={null}
            selectedZone={selectedZone}
            onSelectZone={(z) => setSelectedZone(z)}
            reg={BUS.reg}
          />

          {/* Sakhi Stop Verbal logger */}
          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 14,
            padding: '12px 14px',
            border: '1px solid var(--line)'
          }}>
            <b style={{ fontSize: 13.5, color: 'var(--ink)' }}>
              Passenger asked for “Sakhi stop”?
            </b>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '4px 0 10px' }}>
              Tap her seat on the map, then log it. Selected: <b style={{ fontFamily: 'var(--f-mono)' }}>{selectedZone}</b>
            </div>
            <button
              type="button"
              onClick={handleLogPhrase}
              className="btn-big saffron"
              style={{ fontSize: 13.5, padding: '10px' }}
            >
              Log Sakhi stop at {selectedZone}
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
            No sound. The phone vibrates when a passenger signals.
          </p>
        </div>
      ) : (
        /* When an ALERT IS ACTIVE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                {alerts.length} open
              </span>
              {alerts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setFocusId(a.id)}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid ' + (a.id === activeAlert.id ? 'var(--alert)' : 'var(--line)'),
                    background: a.status === 'safe' ? 'var(--ok-soft)' : a.id === activeAlert.id ? 'var(--alert-soft)' : 'var(--surface)',
                    color: a.status === 'safe' ? 'var(--ok)' : a.id === activeAlert.id ? 'var(--alert)' : 'var(--ink-2)'
                  }}
                >
                  {a.zone} · {a.channel === 'app' ? 'NFC' : a.channel === 'sms' ? 'SMS' : 'Sakhi'}
                </button>
              ))}
            </div>
          )}

          {/* Pulsing Active Alert Card */}
          <div className={`alert-card-hot ${isSafe ? 'safe' : ''} ${isBuzzing ? 'buzz' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="zone-big">{activeAlert.zone}</span>
              <span style={{
                fontFamily: 'var(--f-mono)',
                fontWeight: 700,
                fontSize: 14,
                color: isSafe ? 'var(--ok)' : 'var(--alert)'
              }}>
                <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                {isSafe ? `Resolved in ${elapsed}` : elapsed}
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: 14.5 }}>
              {zoneName(activeAlert.zone)}
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              {(TYPES.find(t => t.id === activeAlert.type) || TYPES[3]).label} · {
                activeAlert.channel === 'app' ? 'Seat sticker (NFC / Web)' :
                activeAlert.channel === 'sms' ? 'SMS from basic phone' :
                'Verbal code phrase'
              }
            </div>

            {activeAlert.ackAt && (
              <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
                Conductor responded in {formatDuration(activeAlert.ackAt - activeAlert.createdAt)}
              </div>
            )}

            {isSafe && (
              <div style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 700, marginTop: 2 }}>
                She has marked herself safe. Close the alert when you're done.
              </div>
            )}
          </div>

          {/* Interactive Bus Seat Map showing hot zone */}
          <BusLayoutMap
            activeZone={hotZone}
            selectedZone={null}
            reg={BUS.reg}
          />

          {/* De-escalation Protocol Script */}
          <div>
            <div style={{
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 6
            }}>
              Respond as routine duty
            </div>

            <ul className="script-list">
              {SCRIPT.map((item, idx) => {
                const isChecked = activeAlert.steps && activeAlert.steps[idx];
                return (
                  <li key={item.lv}>
                    <button
                      type="button"
                      onClick={() => handleToggleStep(idx)}
                      className={`script-item-btn ${isChecked ? 'checked' : ''}`}
                    >
                      <span className="level-tag">
                        {isChecked ? <Check size={14} color="#fff" style={{ margin: '0 auto' }} /> : item.lv}
                      </span>
                      <span>
                        <b style={{ color: item.esc ? 'var(--alert)' : 'var(--ink)' }}>{item.t}</b>
                        <small>{item.d}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Close Alert Button */}
          <button
            type="button"
            onClick={handleClose}
            className={`btn-big ${isSafe ? 'ok' : 'ghost'}`}
            style={{ marginTop: 4 }}
          >
            {isSafe ? 'Close alert' : 'Close alert (resolved)'}
          </button>

          <p style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>
            Don't confront anyone loudly or point her out. Every step should look like normal ticket checking.
          </p>
        </div>
      )}
    </div>
  );
}
