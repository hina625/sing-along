import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceDailyVerseModel from "@/lib/workspaceDailyVerseModel";

/**
 * Daily Verse — opt-in per workspace.
 *
 * Only returns a verse when the active workspace has its own curated pool
 * (added by the user or a workspace admin). There is no global/default
 * rotation: if no `workspace_id` is provided, or the workspace has no
 * verses configured, the response is `{ success: true, hasVerses: false }`
 * and the UI hides the card entirely.
 *
 * GET /api/v1/bible/daily-verse?translation=kjv&workspace_id=...
 */

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

        // Opt-in only: the verse appears solely when a workspace has its own
        // curated pool. No workspace context → nothing to show.
        if (!workspaceId) {
            return NextResponse.json({ success: true, hasVerses: false }, {
                status: 200,
                headers: { 'Cache-Control': 'public, s-maxage=3600' },
            });
        }

        let pool = [];
        try {
            await connectDB();
            const docs = await workspaceDailyVerseModel
                .find({ workspaceId })
                .sort({ position: 1, createdAt: 1 })
                .lean();
            pool = docs.map((d) => d.reference);
        } catch (e) {
            console.error('daily-verse workspace lookup failed', e);
            return NextResponse.json({ success: true, hasVerses: false }, { status: 200 });
        }

        if (pool.length === 0) {
            return NextResponse.json({ success: true, hasVerses: false }, {
                status: 200,
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }

        const source = 'workspace';
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

        return NextResponse.json({ success: true, hasVerses: true, ...payload }, {
            status: 200,
            // Workspace-scoped pool — skip edge cache so admin edits take effect immediately.
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        console.error('GET /api/v1/bible/daily-verse error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'failed' }, { status: 500 });
    }
}
