import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BUS, ZONE_ROWS, zoneName } from '../constants/busData';
import { Printer, ArrowLeft, Check, Sparkles } from 'lucide-react';

export default function StickerGenerator({ networkInfo, onBack }) {
  const [selectedZones, setSelectedZones] = useState(["R4C", "R4R", "F1L", "F2C"]);

  const baseOrigin = networkInfo?.fullUrl || window.location.origin;

  const allZones = ZONE_ROWS.flat();

  const toggleZone = (z) => {
    if (selectedZones.includes(z)) {
      if (selectedZones.length > 1) {
        setSelectedZones(selectedZones.filter(item => item !== z));
      }
    } else {
      setSelectedZones([...selectedZones, z]);
    }
  };

  const selectAll = () => {
    setSelectedZones([...allZones]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '10px 16px' }}>
      {/* Controls Bar (hidden during print) */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        background: 'var(--surface)',
        padding: '16px 20px',
        borderRadius: 16,
        border: '1px solid var(--line)',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-pill"
              style={{ padding: '6px 12px' }}
            >
              <ArrowLeft size={16} />
              Back to Simulator
            </button>
          )}
          <div>
            <h2 style={{ fontSize: 18, color: 'var(--ink)' }}>Printable Bus Seat Stickers</h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              Print these stickers on paper or adhesive sheets for your college presentation &amp; live demo.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={selectAll}
            className="btn-pill"
            style={{ fontSize: 12.5 }}
          >
            Select All ({allZones.length} seats)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-pill primary"
            style={{ fontSize: 13 }}
          >
            <Printer size={16} />
            Print Stickers (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Zone Selector Chips (hidden during print) */}
      <div className="no-print" style={{
        background: 'var(--surface)',
        padding: '14px 18px',
        borderRadius: 14,
        border: '1px solid var(--line)',
        marginBottom: 20
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: 8 }}>
          Toggle zones to include on sticker sheet:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allZones.map((z) => {
            const isSelected = selectedZones.includes(z);
            return (
              <button
                key={z}
                type="button"
                onClick={() => toggleZone(z)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 600,
                  border: '1px solid ' + (isSelected ? 'var(--navy)' : 'var(--line)'),
                  background: isSelected ? 'var(--navy)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--navy-ink)' : 'var(--ink-2)'
                }}
              >
                {isSelected && <Check size={12} style={{ display: 'inline', marginRight: 3 }} />}
                {z}
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="printable-sticker-sheet" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20
      }}>
        {selectedZones.map((z) => {
          const seatUrl = `${baseOrigin}/?view=passenger&zone=${z}`;

          return (
            <div
              key={z}
              style={{
                background: '#ffffff',
                border: '2px solid #16204a',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 100px',
                gap: 14,
                alignItems: 'center',
                position: 'relative',
                pageBreakInside: 'avoid'
              }}
            >
              {/* Left Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#f28c28',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: 'var(--f-body)'
                  }}>
                    इ
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#16204a', lineHeight: 1.1 }}>
                      ISHAARA <span style={{ color: '#f28c28' }}>इशारा</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#7b83a3', letterSpacing: '0.04em' }}>
                      SILENT SEAT SAFETY ALERT
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: '#16204a', marginTop: 2 }}>
                  Feeling unsafe? Signal conductor silently.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 700,
                    fontSize: 14,
                    background: '#1b2a5c',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 6
                  }}>
                    SEAT {z}
                  </span>
                  <span style={{ fontSize: 11, color: '#4b5478' }}>
                    {BUS.reg} · R-{BUS.route}
                  </span>
                </div>

                <div style={{ fontSize: 10, color: '#4b5478', lineHeight: 1.3, marginTop: 2 }}>
                  <strong>How to use:</strong> Touch phone here (NFC) or scan QR. No app needed.<br />
                  <strong>Basic phone:</strong> SMS <code>{z}</code> to <code>56161</code>.
                </div>
              </div>

              {/* Right: Dynamic QR Code */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}>
                <div style={{
                  padding: 6,
                  border: '1px solid #d9dcea',
                  borderRadius: 10,
                  background: '#fff'
                }}>
                  <QRCodeSVG
                    value={seatUrl}
                    size={88}
                    level="M"
                    fgColor="#16204a"
                    bgColor="#ffffff"
                  />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#16204a', letterSpacing: '0.05em' }}>
                  SCAN TO ALERT
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
