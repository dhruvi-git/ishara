import React, { useState } from 'react';
import { BUS, DEFAULT_ZONE } from '../constants/busData';
import { Send, Smartphone } from 'lucide-react';

export default function FeaturePhoneSimulator({ onSendSMS, activeZone = DEFAULT_ZONE, isAlertActive = false }) {
  const [inputText, setInputText] = useState(`${activeZone} 2`);
  const [messages, setMessages] = useState([
    {
      out: false,
      text: "Ishaara Helpline: Type your 3-character seat code from sticker (e.g. R4C), then optional reason: 1 staring, 2 touching, 3 following."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    // Add user message
    const newMsgList = [...messages, { out: true, text: clean }];
    setMessages(newMsgList);
    setInputText("");
    setLoading(true);

    try {
      // Call simulated SMS endpoint
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: '9820012345', text: clean })
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { out: false, text: data.reply || "Message received." }
      ]);

      if (onSendSMS) {
        onSendSMS(clean);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { out: false, text: "Network error sending SMS. Conductor notified via local bridge." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Retro Nokia / Feature Phone Container */}
      <div className="feature-phone-body">
        <div className="feature-phone-header">
          <span>SMS · Shortcode 56161</span>
          <span>No Data Required</span>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 280,
          overflowY: 'auto'
        }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`sms-bubble ${m.out ? 'sent' : ''}`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="sms-bubble">
              Sending via cellular SMS tower...
            </div>
          )}
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.toUpperCase())}
              placeholder="e.g. R4C 2 or OK"
              maxLength={14}
              className="feature-phone-input"
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#2d3448',
                color: '#fff',
                borderRadius: 4,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Send size={12} />
              Send
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#3c4a22' }}>
            Tip: Type "OK" after help arrives to mark safe.
          </div>
        </form>
      </div>

      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 12.5,
        color: 'var(--ink-2)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8
      }}>
        <Smartphone size={16} color="var(--navy)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Inclusivity for all passengers:</strong> Works on any basic ₹1,000 feature phone over standard GSM SMS without requiring 4G/5G data or smartphones.
        </span>
      </div>
    </div>
  );
}
