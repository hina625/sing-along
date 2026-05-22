import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/connnectDB";
import roomModel from "@/lib/roomModel";
import waitingRoomModel from "@/lib/waitingRoomModel";
import { notify } from "@/lib/notify";

/**
 * Waiting room — guest knock + status polling, plus host listing.
 *
 * POST { room_id, displayName, userId? }
 *   Guest knocks. Returns { key, status }. If the caller is the room
 *   creator we short-circuit to status='admitted' so hosts never wait
 *   on themselves.
 *
 * GET  ?room_id=&key=                       → { status }
 * GET  ?room_id=&host=1&user_id=<clerk>     → { entries: [...] }   (host only)
 */

function makeKey() {
    return crypto.randomBytes(16).toString('hex');
}

// Breakout child rooms follow the pattern `<parent>-bo-<index>` (see
// /api/v1/breakout). They have no independent host gate — admission was
// already granted at the parent level, so we never make participants knock
// twice.
const BREAKOUT_CHILD_RE = /-bo-\d+$/;

export async function POST(req) {
    try {
        const body = await req.json();
        const room_id = (body?.room_id || '').toString().trim();
        const displayName = (body?.displayName || '').toString().trim();
        const userId = body?.userId ? body.userId.toString() : null;
        const passcode = (body?.passcode ?? '').toString();

        if (!room_id || !displayName) {
            return NextResponse.json(
                { success: false, message: 'room_id and displayName are required' },
                { status: 400 }
            );
        }

        await connectDB();
        const room = await roomModel.findOne(
            { room_id },
            { user_id: 1, allowAnyone: 1, passcodeEnabled: 1, passcode: 1 }
        ).lean();
        if (!room) {
            return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
        }

        const isHostKnocking = !!(userId && room.user_id && userId === room.user_id);
        const isBreakoutChild = BREAKOUT_CHILD_RE.test(room_id);
        // Host can flip room.allowAnyone to skip the admission gate entirely.
        // Breakout children inherit admission from their parent room.
        const autoAdmit = isHostKnocking || !!room.allowAnyone || isBreakoutChild;

        // Idempotent re-knock: if this signed-in user was already admitted to
        // this room and the entry hasn't expired (1h TTL), reuse it. Without
        // this, returning from a breakout — or any page refresh — drops the
        // participant back into the waiting queue even though they were
        // already approved. Already-admitted users skip the passcode re-prompt.
        if (userId) {
            const existingAdmitted = await waitingRoomModel
                .findOne({ room_id, userId, status: 'admitted' })
                .sort({ decidedAt: -1 })
                .lean();
            if (existingAdmitted) {
                return NextResponse.json(
                    { success: true, key: existingAdmitted.key, status: 'admitted' },
                    { status: 200 }
                );
            }
        }

        // Passcode gate — the host and breakout children bypass. Verified here so
        // an admission entry only ever exists for callers with the right code;
        // the token route then trusts that entry (see livekit/token).
        if (room.passcodeEnabled && !isHostKnocking && !isBreakoutChild) {
            if (!passcode) {
                return NextResponse.json(
                    { success: false, message: 'A passcode is required to join.', code: 'passcode_required' },
                    { status: 403 }
                );
            }
            if (passcode !== (room.passcode || '')) {
                return NextResponse.json(
                    { success: false, message: 'Incorrect passcode.', code: 'passcode_invalid' },
                    { status: 403 }
                );
            }
        }

        const key = makeKey();
        await waitingRoomModel.create({
            room_id,
            key,
            displayName,
            userId,
            status: autoAdmit ? 'admitted' : 'waiting',
            decidedAt: autoAdmit ? new Date() : null,
        });

        // Notify the host both when someone is waiting AND when allow-anyone
        // auto-admits — they still want to know who's arriving. Breakout
        // children skip the notification: the host already knows their group
        // assignments and would just see noise as everyone moves in.
        if (!isHostKnocking && !isBreakoutChild) {
            await notify({
                userId: room.user_id,
                type: 'meeting.invite',
                title: room.allowAnyone ? '👋 Guest joined' : '👋 Someone is waiting to join',
                body: room.allowAnyone
                    ? `${displayName} just joined the room.`
                    : `${displayName} is in the waiting room.`,
                link: `/meeting/${room_id}`,
                icon: '👋',
            });
        }

        return NextResponse.json(
            { success: true, key, status: autoAdmit ? 'admitted' : 'waiting' },
            { status: 200 }
        );
    } catch (error) {
        console.error('POST /api/v1/waiting-room error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const room_id = searchParams.get('room_id');
        const host = searchParams.get('host');
        const user_id = searchParams.get('user_id');
        const key = searchParams.get('key');

        if (!room_id) {
            return NextResponse.json({ success: false, message: 'room_id is required' }, { status: 400 });
        }

        await connectDB();

        if (host === '1') {
            if (!user_id) {
                return NextResponse.json(
                    { success: false, message: 'user_id is required for host listing' },
                    { status: 400 }
                );
            }
            const room = await roomModel.findOne({ room_id }, { user_id: 1 }).lean();
            if (!room) {
                return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
            }
            if (room.user_id !== user_id) {
                return NextResponse.json({ success: false, message: 'Forbidden — host only' }, { status: 403 });
            }
            const entries = await waitingRoomModel
                .find({ room_id, status: 'waiting' }, { key: 1, displayName: 1, userId: 1, createdAt: 1 })
                .sort({ createdAt: 1 })
                .lean();
            return NextResponse.json({ success: true, entries }, { status: 200 });
        }

        if (!key) {
            return NextResponse.json({ success: false, message: 'key is required' }, { status: 400 });
        }
        const entry = await waitingRoomModel.findOne({ room_id, key }, { status: 1 }).lean();
        if (!entry) {
            return NextResponse.json({ success: false, message: 'Entry not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, status: entry.status }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/waiting-room error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
