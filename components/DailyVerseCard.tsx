'use client';

import { useContext, useEffect, useState } from 'react';
import { BookOpen, RefreshCw, Share2, Check } from 'lucide-react';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

interface VerseLine { book: string; chapter: number; verse: number; text: string }
interface DailyVerse {
  reference: string;
  text: string;
  translation: string;
  translationName: string;
  verses: VerseLine[];
  day: string;
  source?: 'global' | 'workspace';
}

const TRANSLATIONS = [
  { id: 'kjv',  short: 'KJV' },
  { id: 'web',  short: 'WEB' },
  { id: 'asv',  short: 'ASV' },
  { id: 'bsb',  short: 'BSB' },
];

const STORAGE_KEY = 'singalong.dailyVerseTranslation';

const DailyVerseCard = () => {
  const { activeWorkspace } = useContext(WorkspaceContext);
  const [translation, setTranslation] = useState<string>('kjv');
  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [hasVerses, setHasVerses] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const [dateLabel, setDateLabel] = useState<string>('');

  // Restore preferred translation.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && TRANSLATIONS.some((t) => t.id === saved)) setTranslation(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ translation });
        if (activeWorkspace?._id) params.set('workspace_id', activeWorkspace._id);
        const res = await fetch(`/api/v1/bible/daily-verse?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data?.hasVerses) {
          setVerse(data);
          setHasVerses(true);
        } else {
          setVerse(null);
          setHasVerses(false);
        }
      } catch (e) {
        console.error('daily verse fetch failed', e);
        setHasVerses(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [translation, activeWorkspace?._id]);

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    );
  }, []);

  const onPickTranslation = (id: string) => {
    setTranslation(id);
    try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  const share = async () => {
    if (!verse) return;
    const text = `"${verse.text.replace(/\s+/g, ' ').trim()}" — ${verse.reference} (${verse.translationName})`;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Daily Verse', text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  };

  // Opt-in: card stays hidden until an admin curates verses for this workspace.
  if (!loading && !hasVerses) return null;

  return (
    <div className="px-4 max-w-6xl mx-auto w-full"><div className="daily-verse-card">
      <div className="daily-verse-rays" aria-hidden />
      <div className="daily-verse-body">
        <div className="daily-verse-head">
          <div className="daily-verse-eyebrow">
            <BookOpen size={12} /> Daily Verse
          </div>
          <span className="daily-verse-date" suppressHydrationWarning>{dateLabel}</span>
        </div>

        {loading && !verse ? (
          <p className="daily-verse-loading">Loading today's verse…</p>
        ) : verse ? (
          <>
            <blockquote className="daily-verse-text">
              {verse.verses && verse.verses.length > 1 ? (
                verse.verses.map((v) => (
                  <p key={`${v.chapter}-${v.verse}`} className="daily-verse-line">
                    <span className="daily-verse-num">{v.verse}</span>
                    <span>{v.text}</span>
                  </p>
                ))
              ) : (
                <p className="daily-verse-line"><span>{verse.text}</span></p>
              )}
            </blockquote>
            <div className="daily-verse-foot">
              <span className="daily-verse-ref">— {verse.reference}</span>
              <div className="daily-verse-controls">
                <div className="daily-verse-translation-picker" role="group" aria-label="Translation">
                  {TRANSLATIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onPickTranslation(t.id)}
                      className={`daily-verse-trans ${translation === t.id ? 'is-active' : ''}`}
                    >
                      {t.short}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={share} className="daily-verse-share" title="Share">
                  {shared ? <Check size={14} /> : <Share2 size={14} />}
                  {shared ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="daily-verse-loading">Could not load today's verse. Refresh to try again.</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default DailyVerseCard;
