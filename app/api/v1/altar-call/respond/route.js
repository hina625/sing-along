import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import altarCallModel from "@/lib/altarCallModel";
import { notify } from "@/lib/notify";

/**
 * Participant responds to an altar call.
 *
 * POST { id, userId?, name, note? }
 *
 * - One response per (call, userId) when signed in (de-duped); guests can respond
 *   multiple times only by entering different names — acceptable for an MVP.
 * - Pings the host with the new responder name so they see it without polling.
 */
export async function POST(req) {
    try {
        await connectDB();
        const { id, userId, name, note } = await req.json();
        if (!id || !name?.trim()) {
            return NextResponse.json({ success: false, message: 'id and name are required' }, { status: 400 });
        }

        const call = await altarCallModel.findById(id);
        if (!call) return NextResponse.json({ success: false, message: 'Altar call not found' }, { status: 404 });
        if (call.status !== 'active') {
            return NextResponse.json({ success: false, message: 'This altar call has closed.' }, { status: 410 });
        }

        // De-dupe by userId for signed-in responders.
        if (userId) {
            const already = (call.responders || []).some((r) => r.userId === userId);
            if (already) {
                return NextResponse.json({ success: true, alreadyResponded: true, call }, { status: 200 });
            }
        }

        const responder = {
            userId: userId || null,
            name: name.trim().slice(0, 80),
            note: (note || '').trim().slice(0, 300),
            respondedAt: new Date(),
        };

        const updated = await altarCallModel.findByIdAndUpdate(
            id,
            { $push: { responders: responder } },
            { new: true }
        );

        // Notify the host so they see the response in the bell even if they're not on the panel.
        try {
            await notify({
                userId: call.hostUserId,
                type: 'system',
                title: '✝️ Altar call response',
                body: `${responder.name} responded — ${call.type}`,
                link: `/meeting/${call.roomId}`,
                icon: '✝️',
            });
        } catch (e) {
            console.error('altar.response notify failed:', e?.message);
        }

        return NextResponse.json({ success: true, responder, call: updated }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/altar-call/respond error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
