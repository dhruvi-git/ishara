import React, { useState, useRef, useEffect } from 'react';
import { BUS, DEFAULT_ZONE, TYPES } from '../constants/busData';
import GlanceTimetable from './GlanceTimetable';
import FeaturePhoneSimulator from './FeaturePhoneSimulator';
import { Shield, Smartphone, MessageSquare, Volume2, ArrowLeft, Radio } from 'lucide-react';

export default function PassengerView({
  zone = DEFAULT_ZONE,
  activeAlert = null,
  onCreateAlert,
  onUpdateAlert,
  onSwitchToConductor = null,
  isStandalone = false
}) {
  const [mode, setMode] = useState('app'); // 'app' | 'sms' | 'phrase'
  const [step, setStep] = useState('sticker'); // 'sticker' | 'form' | 'sent'
  const [selectedType, setSelectedType] = useState(0);

  // Press & hold animation state
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef(0);
  const rafRef = useRef(null);
  const DUR_MS = 1000;

  // Check if there is an active alert for this passenger's zone
  const hasMyAlert = activeAlert && activeAlert.zone === zone && activeAlert.channel !== 'phrase';

  useEffect(() => {
    if (hasMyAlert && hasMyAlert.status !== 'closed') {
      setStep('sent');
    } else if (!hasMyAlert && step === 'sent') {
      setStep('sticker');
    }
  }, [hasMyAlert]);

  // Press-and-hold handling
  const startHold = (e) => {
    e.preventDefault();
    setHolding(true);
    holdStartRef.current = performance.now();

    const loop = (now) => {
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(1, elapsed / DUR_MS);
      setHoldProgress(progress);

      if (progress >= 1) {
        completeHold();
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const cancelHold = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setHoldProgress(0);
  };

  const completeHold = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setHoldProgress(0);

    // Haptic vibration feedback if supported
    try {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
    } catch (e) {}

    // Emit alert
    if (onCreateAlert) {
      onCreateAlert({
        zone,
        channel: 'app',
        type: selectedType
      });
    }

    setStep('sent');
  };

  const handleMarkSafe = () => {
    if (activeAlert && onUpdateAlert) {
      onUpdateAlert({
        id: activeAlert.id,
        status: 'safe',
        safeAt: Date.now()
      });
    }
  };

  const handleReset = () => {
    setStep('sticker');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Mode Switcher */}
      <div className="segmented-control" role="group" aria-label="Signal method">
        <button
          type="button"
          onClick={() => setMode('app')}
          className={`seg-btn ${mode === 'app' ? 'active' : ''}`}
        >
          Smartphone (NFC)
        </button>
        <button
          type="button"
          onClick={() => setMode('sms')}
          className={`seg-btn ${mode === 'sms' ? 'active' : ''}`}
        >
          Basic Phone (SMS)
        </button>
        <button
          type="button"
          onClick={() => setMode('phrase')}
          className={`seg-btn ${mode === 'phrase' ? 'active' : ''}`}
        >
          No Phone (Phrase)
        </button>
      </div>

      {/* Mode: Smartphone NFC/Web */}
      {mode === 'app' && (
        <>
          {step === 'sent' && hasMyAlert ? (
            <GlanceTimetable
              alert={activeAlert}
              onMarkSafe={handleMarkSafe}
              onReset={handleReset}
            />
          ) : step === 'sticker' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'var(--surface-2)',
                borderRadius: 14,
                padding: '12px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--ink-2)'
              }}>
                Sticker placed on the seat back directly in front of you:
              </div>

              {/* Physical Seat Sticker Simulation */}
              <div className="sticker-mockup">
                <div className="sticker-left">
                  <div className="hi">इशारा</div>
                  <div className="en">ISHAARA</div>
                </div>
                <div className="sticker-right">
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
                    Feeling unsafe? Signal silently.
                  </div>
                  <div>
                    Seat <span className="zone-badge">{zone}</span> · Bus {BUS.reg}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.4 }}>
                In real use, the passenger taps her phone to the seat NFC sticker or scans its QR code. Zero apps to download.
              </p>

              <button
                type="button"
                onClick={() => setStep('form')}
                className="btn-big navy"
                style={{ marginTop: 4 }}
              >
                <Radio size={18} />
                Tap phone on seat sticker
              </button>
            </div>
          ) : (
            /* Step: Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'var(--surface-2)',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Bus Route
                  </div>
                  <b>{BUS.reg} · {BUS.route}</b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Your Zone
                  </div>
                  <b className="zone-badge">{zone}</b>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase' }}>
                  What is happening? (Optional)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 600,
                        border: '1px solid ' + (selectedType === t.id ? 'var(--navy)' : 'var(--line)'),
                        background: selectedType === t.id ? 'var(--navy)' : 'var(--surface)',
                        color: selectedType === t.id ? 'var(--navy-ink)' : 'var(--ink-2)'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-Second Press & Hold Button */}
              <button
                type="button"
                className="btn-hold"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Press and hold for 1 second to alert conductor"
              >
                <div
                  className="fill-progress"
                  style={{ transform: `scaleX(${holdProgress})` }}
                />
                <div className="btn-content">
                  <span>Press &amp; hold for 1s to alert conductor</span>
                  <small>Completely silent. Nobody around you is alerted.</small>
                </div>
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Holding 1s prevents accidental presses
                </span>
                <button
                  type="button"
                  onClick={() => setStep('sticker')}
                  style={{ fontSize: 12.5, color: 'var(--ink-3)', textDecoration: 'underline' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mode: SMS Feature Phone */}
      {mode === 'sms' && (
        <FeaturePhoneSimulator
          activeZone={zone}
          isAlertActive={!!hasMyAlert}
          onSendSMS={() => {}}
        />
      )}

      {/* Mode: Spoken Code Phrase */}
      {mode === 'phrase' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 14,
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              If phone battery died or user has no phone
            </div>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-2)' }}>
              Passenger casually steps up to the conductor as if asking for her stop and says:
            </p>
          </div>

          <div style={{
            background: 'var(--saffron-soft)',
            border: '1px solid var(--saffron)',
            borderRadius: 16,
            padding: '14px 16px',
            color: 'var(--saffron-ink)'
          }}>
            <div style={{
              fontFamily: 'var(--f-display)',
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.3
            }}>
              “भैया, सखी स्टॉप कब आएगा?”
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              “Sakhi stop kab aayega?”
            </div>
            <div style={{ fontSize: 12.5, marginTop: 6, opacity: 0.9 }}>
              (There is no stop named Sakhi. To any harasser or bystander, it sounds like an ordinary route question.)
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            The conductor answers politely without causing alarm, notes her seat zone on his device, and executes the safety ticket-check protocol.
          </p>

          {onSwitchToConductor && (
            <button
              type="button"
              onClick={onSwitchToConductor}
              className="btn-big navy"
            >
              Show Conductor's Logging Screen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
