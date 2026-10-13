import React from 'react';
import { STOPS, BUS, formatClock } from '../constants/busData';
import { CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function GlanceTimetable({ alert, onMarkSafe, onReset }) {
  const isSafe = alert?.status === 'safe';
  const isSeen = alert?.ackAt != null;
  const createdAt = alert?.createdAt || Date.now();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Route header */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 700 }}>
            Route {BUS.route}
          </div>
          <b style={{ fontSize: 16, color: 'var(--ink)' }}>Next Stops &amp; Schedule</b>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--ok)',
          background: 'var(--ok-soft)',
          padding: '4px 10px',
          borderRadius: 999
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)' }}></span>
          LIVE
        </div>
      </div>

      {/* Disguised Timetable list */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: '8px 14px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {STOPS.map((stop, i) => (
          <div
            key={stop.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < STOPS.length - 1 ? '1px solid var(--line)' : 'none'
            }}
          >
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid ' + (i === 1 ? 'var(--navy)' : 'var(--ink-3)'),
              background: i === 1 ? 'var(--navy)' : 'transparent',
              justifySelf: 'center'
            }} />
            <span style={{ fontWeight: i === 1 ? 700 : 500, color: i === 1 ? 'var(--ink)' : 'var(--ink-2)' }}>
              {stop.name} {i === 1 && <span style={{ fontSize: 11, color: 'var(--saffron)', fontWeight: 700 }}>(Next)</span>}
            </span>
            <time style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, color: 'var(--ink-3)' }}>
              {formatClock(createdAt + (i * 4 - 4) * 60000)}
            </time>
          </div>
        ))}
      </div>

      {/* Subtle discreet status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13.5,
        fontWeight: 600,
        color: isSafe ? 'var(--ok)' : 'var(--navy)',
        background: isSafe ? 'var(--ok-soft)' : 'var(--surface-2)',
        borderRadius: 12,
        padding: '12px 14px',
        border: '1px solid ' + (isSafe ? 'var(--ok)' : 'var(--line)')
      }}>
        {isSafe ? (
          <>
            <ShieldCheck size={20} color="var(--ok)" />
            <span>Marked safe. Conductor notified.</span>
          </>
        ) : isSeen ? (
          <>
            <Clock size={18} color="var(--navy)" />
            <span>Conductor acknowledged. Help is approaching routine check.</span>
          </>
        ) : (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--alert)', animation: 'pulse-danger 1.2s infinite' }}></span>
            <span>Silent signal transmitted. Keep phone idle.</span>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', margin: '2px 0' }}>
        This disguised screen looks like an ordinary transit timetable to anyone nearby.
      </p>

      {/* Action buttons */}
      {isSafe ? (
        <button
          type="button"
          onClick={onReset}
          className="btn-big ghost"
          style={{ marginTop: 4 }}
        >
          Return to home screen
        </button>
      ) : (
        <button
          type="button"
          onClick={onMarkSafe}
          className="btn-big ok"
          style={{ marginTop: 4 }}
        >
          <CheckCircle2 size={18} />
          I’m safe now
        </button>
      )}
    </div>
  );
}
