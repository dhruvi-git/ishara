import React from 'react';
import { ZONE_ROWS } from '../constants/busData';

export default function BusLayoutMap({
  activeZone = null,
  selectedZone = null,
  onSelectZone = null,
  reg = "MH01-4471"
}) {
  return (
    <div className="bus-map-card" aria-label="Bus seat layout map">
      <div className="map-label">
        <span>Driver · Front Door</span>
        <span>{reg}</span>
      </div>

      <div className="zone-grid-wrapper">
        {ZONE_ROWS.map((row, ri) => (
          <React.Fragment key={ri}>
            {ri === 4 && <div className="bus-door-indicator" title="Middle exit/entry door" />}
            <div className="zone-grid" style={{ marginBottom: 4 }}>
              {row.map((z) => {
                const isAisle = z[2] === 'C';
                const isHot = z === activeZone;
                const isSelected = z === selectedZone && !activeZone;

                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => onSelectZone && onSelectZone(z)}
                    className={`zone-cell ${isAisle ? 'aisle' : ''} ${isHot ? 'hot' : ''} ${isSelected ? 'selected' : ''}`}
                    title={`Zone ${z} ${isAisle ? '(Standing Aisle)' : ''}`}
                  >
                    {z}
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="map-label" style={{ marginTop: 2 }}>
        <span>Rear</span>
        <span>Aisle = Standing</span>
      </div>
    </div>
  );
}
