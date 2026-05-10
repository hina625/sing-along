'use client';

import { useMemo, useState } from 'react';
import { Phone, Plus, Send, Copy, Check, Trash2 } from 'lucide-react';

/**
 * WhatsApp invite block.
 *
 * Uses the public wa.me deep link — no API key required, no per-message cost.
 * Each "Send" opens WhatsApp (Web or app) with a pre-filled worship-friendly
 * message + invite URL. The user sends from their own WhatsApp account.
 *
 * For broadcast send (multiple numbers), we open one tab per number.
 * Browsers may block multi-tab opens after the first — we surface a fallback
 * list of clickable links so the host can tap each one.
 */
interface WhatsAppInviteProps {
  url: string;
  /**
   * Optional default message body. We append the URL automatically, so omit it here.
   */
  message?: string;
  className?: string;
}

const DEFAULT_MESSAGE =
  "🙌 You're invited to worship with us. Join the live service here:";

// Strip everything except digits. WhatsApp's wa.me expects E.164 without "+" or punctuation.
const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

const buildWaMeLink = (phoneDigits: string, text: string) => {
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
};

const WhatsAppInvite = ({ url, message = DEFAULT_MESSAGE, className = '' }: WhatsAppInviteProps) => {
  const [body, setBody] = useState(message);
  const [phoneInput, setPhoneInput] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fullText = useMemo(() => `${body.trim()}\n\n${url}`, [body, url]);

  const addPhone = () => {
    const digits = normalizePhone(phoneInput);
    if (digits.length < 6) return;
    if (phones.includes(digits)) {
      setPhoneInput('');
      return;
    }
    setPhones((cur) => [...cur, digits]);
    setPhoneInput('');
  };

  const removePhone = (digits: string) => {
    setPhones((cur) => cur.filter((p) => p !== digits));
  };

  const sendOne = (digits: string) => {
    if (typeof window !== 'undefined') {
      window.open(buildWaMeLink(digits, fullText), '_blank', 'noopener');
    }
  };

  const sendAll = () => {
    if (typeof window === 'undefined') return;
    if (phones.length === 0) {
      // No numbers entered → open the generic chooser.
      window.open(buildWaMeLink('', fullText), '_blank', 'noopener');
      return;
    }
    phones.forEach((p, i) => {
      // Stagger slightly to reduce popup-blocker hits.
      setTimeout(() => window.open(buildWaMeLink(p, fullText), '_blank', 'noopener'), i * 150);
    });
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`wa-invite ${className}`}>
      <div className="wa-invite-head">
        <span className="wa-invite-title">
          <Phone size={16} className="text-[#25D366]" /> Invite via WhatsApp
        </span>
        <span className="wa-invite-hint">Opens WhatsApp with a pre-filled message.</span>
      </div>

      <textarea
        className="wa-invite-message"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a personal note for your congregation…"
      />

      <div className="wa-invite-phone-row">
        <input
          type="tel"
          inputMode="tel"
          className="wa-invite-phone-input"
          placeholder="+1 555 123 4567"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPhone();
            }
          }}
        />
        <button
          type="button"
          className="wa-invite-add"
          onClick={addPhone}
          disabled={normalizePhone(phoneInput).length < 6}
          title="Add number"
        >
          <Plus size={16} />
        </button>
      </div>

      {phones.length > 0 && (
        <ul className="wa-invite-list">
          {phones.map((p) => (
            <li key={p} className="wa-invite-list-item">
              <span className="wa-invite-list-num">+{p}</span>
              <div className="wa-invite-list-actions">
                <button type="button" onClick={() => sendOne(p)} title="Send to this number" className="wa-invite-send-one">
                  <Send size={14} />
                </button>
                <button type="button" onClick={() => removePhone(p)} title="Remove" className="wa-invite-remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="wa-invite-actions">
        <button type="button" className="wa-invite-cta" onClick={sendAll}>
          <Send size={16} />
          {phones.length > 0
            ? phones.length === 1
              ? 'Send via WhatsApp'
              : `Send to ${phones.length} numbers`
            : 'Open WhatsApp'}
        </button>
        <button type="button" className="wa-invite-copy" onClick={copyText} title="Copy invite text">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      <p className="wa-invite-foot">
        Tip: paste the copied text into any WhatsApp chat or group.
      </p>
    </div>
  );
};

export default WhatsAppInvite;
