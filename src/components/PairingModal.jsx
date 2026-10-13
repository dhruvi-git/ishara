import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Laptop, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

export default function PairingModal({ isOpen, onClose, networkInfo, currentZone = "R4C" }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseOrigin = networkInfo?.fullUrl || window.location.origin;
  const passengerUrl = `${baseOrigin}/?view=passenger&zone=${currentZone}`;
  const conductorUrl = `${baseOrigin}/?view=conductor`;
  const depotUrl = `${baseOrigin}/?view=depot`;

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 51, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 20,
        maxWidth: 520,
        width: '100%',
        padding: 24,
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink)'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--saffron)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center'
          }}>
            <QrCode size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, color: 'var(--ink)' }}>Live Multi-Device Pairing</h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              Connect your physical smartphone over local Wi-Fi
            </p>
          </div>
        </div>

        {/* QR Code Section */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          border: '1px solid var(--line)'
        }}>
          <div style={{
            background: '#ffffff',
            padding: 12,
            borderRadius: 12,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
          }}>
            <QRCodeSVG
              value={passengerUrl}
              size={180}
              level="M"
              fgColor="#1b2a5c"
              bgColor="#ffffff"
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 13.5, color: 'var(--ink)' }}>
              Scan with your phone's camera
            </b>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
              Ensure your phone is on the same Wi-Fi network as this laptop
            </p>
          </div>
        </div>

        {/* Direct Links */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
            Quick Links (Open in new tabs or copy URL)
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} color="var(--navy)" />
              <span><strong>Passenger:</strong> Zone {currentZone}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => handleCopy(passengerUrl)}
                className="btn-pill"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={passengerUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-pill primary"
                style={{ padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                Open
              </a>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} color="var(--saffron)" />
              <span><strong>Conductor:</strong> On-duty Device</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <a
                href={conductorUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-pill"
                style={{ padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                Open
              </a>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Laptop size={16} color="var(--ok)" />
              <span><strong>Depot Console:</strong> Analytics</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <a
                href={depotUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-pill"
                style={{ padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                Open
              </a>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-big ghost"
            style={{ padding: '10px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
