import React, { useMemo } from 'react';
import { SAMPLE_INCIDENTS, formatDuration, formatClock } from '../constants/busData';
import { Shield, Clock, BarChart3, TrendingUp, Download, Lock } from 'lucide-react';

export default function DepotView({
  liveAlerts = [],
  incidentHistory = []
}) {
  // Combine live session alerts with historical sample data
  const { allAlerts, kpis, hotspots, hourlyData, peakHour } = useMemo(() => {
    // Format live alerts
    const formattedLive = liveAlerts.map(a => ({
      ...a,
      stretch: "Andheri Stn → Chakala",
      isLive: true
    }));

    const formattedHistory = incidentHistory.map(a => ({
      ...a,
      stretch: "Andheri Stn → Chakala",
      isLive: true
    }));

    const all = [...formattedLive, ...formattedHistory, ...SAMPLE_INCIDENTS];

    // Compute KPIs
    const respTimes = all
      .filter(a => a.ackAt && a.createdAt)
      .map(a => a.ackAt - a.createdAt);

    // Median calculation
    let medianResp = null;
    if (respTimes.length > 0) {
      const sorted = [...respTimes].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianResp = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    const safeCount = all.filter(a => a.outcome === 'safe' || a.status === 'safe').length;
    const nonSmartShare = Math.round((all.filter(a => a.channel !== 'app').length / all.length) * 100);

    // Hotspot stretches
    const stretchCounts = {};
    all.forEach(a => {
      const key = `${a.route || 'A-202'}|${a.stretch || 'Andheri Stn → Chakala'}`;
      stretchCounts[key] = (stretchCounts[key] || 0) + 1;
    });

    const hsList = Object.entries(stretchCounts)
      .map(([k, count]) => {
        const [route, stretch] = k.split('|');
        return { route, stretch, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = hsList[0]?.count || 1;

    // Hourly distribution
    const hours = Array(24).fill(0);
    all.forEach(a => {
      const hr = new Date(a.createdAt).getHours();
      hours[hr]++;
    });

    const maxHr = Math.max(...hours, 1);
    const peak = hours.indexOf(maxHr);

    return {
      allAlerts: all,
      kpis: {
        total: all.length,
        medianResp,
        safePercent: Math.round((safeCount / all.length) * 100),
        nonSmartShare
      },
      hotspots: hsList.map(h => ({ ...h, pct: Math.round((h.count / maxCount) * 100) })),
      hourlyData: hours.map(val => ({ val, pct: Math.max(3, Math.round((val / maxHr) * 100)) })),
      peakHour: peak
    };
  }, [liveAlerts, incidentHistory]);

  // Export incident data to CSV
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Route", "Stretch", "Zone", "Channel", "ResponseSec", "Status"];
    const rows = allAlerts.map(a => [
      new Date(a.createdAt).toISOString(),
      a.route || "A-202",
      a.stretch || "Andheri Stn → Chakala",
      a.zone,
      a.channel,
      a.ackAt ? Math.round((a.ackAt - a.createdAt) / 1000) : "",
      a.outcome || a.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ishaara_depot_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="depot-console-container">
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 18, color: 'var(--ink)' }}>Depot dashboard</h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            Today's live alerts plus a week of sample data
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="btn-pill"
          style={{ fontSize: 12.5 }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="val">{kpis.total}</div>
          <div className="lbl">alerts in the last 7 days</div>
        </div>
        <div className="kpi-card">
          <div className="val">{formatDuration(kpis.medianResp)}</div>
          <div className="lbl">median time to conductor response</div>
        </div>
        <div className="kpi-card">
          <div className="val">{kpis.safePercent}%</div>
          <div className="lbl">ended with her marking herself safe</div>
        </div>
        <div className="kpi-card">
          <div className="val">{kpis.nonSmartShare}%</div>
          <div className="lbl">came by SMS or “Sakhi stop”</div>
        </div>
      </div>

      {/* Split Section: Hotspots & Time Distribution */}
      <div className="depot-split">
        {/* Hotspots */}
        <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14.5, color: 'var(--ink)' }}>Hotspot stretches</h4>
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Alerts</span>
          </div>
          <div>
            {hotspots.map((item) => (
              <div key={item.stretch} className="hotspot-row">
                <div className="name">
                  <b>{item.stretch}</b>
                  <small>Route {item.route}</small>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${item.pct}%` }} />
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, textAlign: 'right', fontWeight: 600 }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 24-Hour Timeline Distribution */}
        <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14.5, color: 'var(--ink)' }}>Time of day</h4>
            <span style={{ fontSize: 11.5, color: 'var(--saffron)', fontWeight: 700 }}>
              Peak: {String(peakHour).padStart(2, '0')}:00 – {String(peakHour + 1).padStart(2, '0')}:00
            </span>
          </div>

          <div className="hour-bars-container">
            {hourlyData.map((h, i) => (
              <div
                key={i}
                className={`hour-col ${i === peakHour ? 'peak' : ''}`}
                style={{ height: `${h.pct}%` }}
                title={`${String(i).padStart(2, '0')}:00: ${h.val} alerts`}
              />
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            fontSize: 10.5,
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            marginTop: 4
          }}>
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.35 }}>
            Use: send Nirbhaya squads to <b>{hotspots[0]?.stretch}</b> around {String(peakHour).padStart(2, '0')}:00.
          </p>
        </div>
      </div>

      {/* Live Stream Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h4 style={{ fontSize: 14.5, color: 'var(--ink)' }}>Recent alerts</h4>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Highlighted rows are live</span>
        </div>

        <div className="table-responsive">
          <table className="depot-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Route</th>
                <th>Stretch</th>
                <th>Zone</th>
                <th>Channel</th>
                <th>Response</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {allAlerts.slice(0, 8).map((a, idx) => {
                const dateObj = new Date(a.createdAt);
                const timeLabel = a.isLive
                  ? `LIVE · ${formatClock(a.createdAt)}`
                  : `${dateObj.toLocaleDateString("en-IN", { weekday: "short" })} ${formatClock(a.createdAt)}`;
                const isSafe = a.status === 'safe' || a.outcome === 'safe';
                const isOpen = a.status === 'new' || a.status === 'ack';

                return (
                  <tr key={a.id || idx} className={a.isLive ? 'highlight-new' : ''}>
                    <td style={{ fontWeight: a.isLive ? 700 : 500, color: a.isLive ? 'var(--alert)' : 'inherit' }}>
                      {timeLabel}
                    </td>
                    <td style={{ fontFamily: 'var(--f-mono)', whiteSpace: 'nowrap' }}>{a.route || "A-202"}</td>
                    <td>{a.stretch || "Andheri Stn → Chakala"}</td>
                    <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 700 }}>{a.zone}</td>
                    <td>
                      {a.channel === 'app' ? 'Sticker' : a.channel === 'sms' ? 'SMS' : 'Phrase'}
                    </td>
                    <td>
                      {a.ackAt ? formatDuration(a.ackAt - a.createdAt) : (isOpen ? 'Waiting' : '—')}
                    </td>
                    <td>
                      <span className={`badge-status ${isSafe ? 'safe' : isOpen ? 'open' : 'closed'}`}>
                        {isSafe ? 'Safe' : isOpen ? 'Active' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Guarantee Box */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        fontSize: 12.5,
        color: 'var(--ink-2)',
        border: '1px solid var(--line)'
      }}>
        <Lock size={18} color="var(--ok)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>No personal data.</strong> No names, phone numbers or photos are stored. Each record is only the route, seat zone, time, response time and outcome.
        </span>
      </div>
    </div>
  );
}
