import { NextResponse } from "next/server";

/**
 * Bible verse proxy — wraps bible-api.com (public, no key required).
 *
 * GET /api/v1/bible/verse?ref=John+3:16&translation=kjv
 *
 * Translations supported by bible-api.com (subset of common ones):
 *   kjv, web, asv, bbe, oeb-cw, oeb-us, ylt, darby, dra, bsb, clementine
 *   plus many other-language editions (e.g. cherokee, almeida, rccv).
 *
 * We add a small in-memory cache (5-minute TTL) so a worship room hammering
 * the same verse for everyone doesn't burn external requests.
 */

const cache = new Map(); // key → { fetchedAt, payload }
const TTL_MS = 5 * 60 * 1000;

const SUPPORTED = new Set([
    'kjv', 'web', 'asv', 'bbe', 'oeb-cw', 'oeb-us', 'ylt', 'darby', 'dra', 'bsb', 'clementine',
    'cherokee', 'almeida', 'rccv',
]);

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const ref = (searchParams.get('ref') || '').trim();
        const translation = (searchParams.get('translation') || 'kjv').toLowerCase();

        if (!ref) {
            return NextResponse.json({ success: false, message: 'ref is required (e.g. "John 3:16")' }, { status: 400 });
        }
        if (!SUPPORTED.has(translation)) {
            return NextResponse.json({ success: false, message: `Unsupported translation. Try: ${Array.from(SUPPORTED).slice(0, 6).join(', ')}…` }, { status: 400 });
        }

        const key = `${translation}::${ref.toLowerCase()}`;
        const cached = cache.get(key);
        if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
            return NextResponse.json({ success: true, cached: true, ...cached.payload }, { status: 200 });
        }

        const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`;
        const upstream = await fetch(url, { headers: { Accept: 'application/json' } });

        if (!upstream.ok) {
            // bible-api.com returns 404 with JSON error body for missing references.
            const text = await upstream.text();
            return NextResponse.json({ success: false, message: text || 'Verse not found' }, { status: upstream.status });
        }

        const data = await upstream.json();
        // Normalize to a stable shape so the client doesn't depend on upstream's exact keys.
        const payload = {
            reference: data.reference || ref,
            text: (data.text || '').trim(),
            translation: data.translation_id || translation,
            translationName: data.translation_name || translation.toUpperCase(),
            verses: Array.isArray(data.verses)
                ? data.verses.map((v) => ({
                    book: v.book_name,
                    chapter: v.chapter,
                    verse: v.verse,
                    text: (v.text || '').trim(),
                }))
                : [],
        };

        cache.set(key, { fetchedAt: Date.now(), payload });
        // Bound the cache so a misbehaving caller can't OOM us.
        if (cache.size > 500) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return NextResponse.json({ success: true, cached: false, ...payload }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/bible/verse error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Bible lookup failed' }, { status: 500 });
    }
}
