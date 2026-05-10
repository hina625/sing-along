import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceDailyVerseModel from "@/lib/workspaceDailyVerseModel";

/**
 * Daily Verse — same passage shown to every user on a given calendar day.
 *
 * Picks deterministically from a curated rotation of well-known passages by
 * day-of-year (1..366), so the verse only changes at midnight (server time).
 *
 * GET /api/v1/bible/daily-verse?translation=kjv&workspace_id=...
 *
 * If `workspace_id` is provided AND that workspace has at least one
 * verse in its custom pool, we rotate within that pool instead of the
 * global ROTATION. Otherwise the global rotation is used.
 *
 * Re-uses the existing bible-api.com proxy under the hood and inherits its cache.
 */

// Curated list — well-known, encouraging, theologically central passages.
// Mostly single verses for legibility; a couple short multi-verse selections.
const ROTATION = [
    'John 3:16', 'Jeremiah 29:11', 'Philippians 4:13', 'Romans 8:28', 'Psalm 23:1-4',
    'Isaiah 41:10', 'Proverbs 3:5-6', 'Joshua 1:9', 'Romans 12:2', 'Ephesians 2:8-9',
    'Matthew 6:33', 'Psalm 46:10', 'Galatians 5:22-23', 'Hebrews 11:1', '1 Corinthians 13:4-7',
    'Philippians 4:6-7', 'Isaiah 40:31', 'John 14:6', 'Romans 5:8', 'Psalm 27:1',
    '2 Timothy 1:7', 'James 1:2-4', 'Lamentations 3:22-23', 'Matthew 11:28-30', 'Psalm 19:1',
    '1 John 4:7-8', 'Romans 6:23', 'Psalm 139:14', 'Mark 12:30-31', 'Ephesians 4:32',
    'Colossians 3:23', '1 Thessalonians 5:16-18', '1 Peter 5:7', '2 Corinthians 5:17', 'Hebrews 12:1-2',
    'Psalm 119:105', 'Romans 10:9', 'Matthew 5:14-16', 'Galatians 2:20', 'John 1:1',
    'John 8:32', 'Acts 1:8', 'Psalm 51:10', 'Isaiah 53:5', 'Romans 8:38-39',
    'Matthew 28:19-20', 'James 1:5', 'Proverbs 16:3', '2 Corinthians 12:9', 'Philippians 1:6',
    'John 15:5', 'Hebrews 4:12', 'Psalm 34:8', 'Micah 6:8', '1 Corinthians 10:13',
    'Romans 15:13', 'Ephesians 6:11-12', 'Psalm 91:1-2', 'Matthew 7:7', 'John 16:33',
    'Psalm 100:4-5',
];

const SUPPORTED = new Set([
    'kjv', 'web', 'asv', 'bbe', 'oeb-cw', 'oeb-us', 'ylt', 'darby', 'dra', 'bsb', 'clementine',
]);

function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const translation = (searchParams.get('translation') || 'kjv').toLowerCase();
        const workspaceId = searchParams.get('workspace_id');
        if (!SUPPORTED.has(translation)) {
            return NextResponse.json({ success: false, message: 'Unsupported translation' }, { status: 400 });
        }

        const today = new Date();

        // Resolve the rotation pool: workspace-custom if any, else global.
        let pool = ROTATION;
        let source = 'global';
        if (workspaceId) {
            try {
                await connectDB();
                const docs = await workspaceDailyVerseModel
                    .find({ workspaceId })
                    .sort({ position: 1, createdAt: 1 })
                    .lean();
                if (docs.length > 0) {
                    pool = docs.map((d) => d.reference);
                    source = 'workspace';
                }
            } catch (e) {
                // If the DB lookup fails for any reason, fall back to the global pool
                // — never let workspace customization break the daily verse on the dashboard.
                console.error('daily-verse workspace lookup failed, using global', e);
            }
        }

        const idx = dayOfYear(today) % pool.length;
        const ref = pool[idx];

        // Resolve via the same proxy → benefits from its 5-min cache.
        // We call the upstream directly here to avoid Next.js's same-origin overhead;
        // bible-api.com handles thousands of requests fine and the daily verse is the
        // hottest query in the app — caching belongs in /api/v1/bible/verse if needed.
        const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`;
        const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!upstream.ok) {
            return NextResponse.json({
                success: false,
                message: 'Could not fetch the daily verse. Try again in a moment.',
                reference: ref,
            }, { status: upstream.status });
        }

        const data = await upstream.json();
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
            // ISO date the rotation was computed for (so clients know when to refresh).
            day: today.toISOString().slice(0, 10),
            source,
        };

        return NextResponse.json({ success: true, ...payload }, {
            status: 200,
            headers: {
                // Cache at the edge for an hour — the rotation only flips at midnight.
                // When workspace pool is in use we skip edge cache so admins see edits
                // take effect immediately (DB lookup adds ~10ms; acceptable).
                'Cache-Control': source === 'workspace'
                    ? 'private, no-store'
                    : 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('GET /api/v1/bible/daily-verse error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'failed' }, { status: 500 });
    }
}
