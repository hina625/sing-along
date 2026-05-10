import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import workspaceDailyVerseModel from "@/lib/workspaceDailyVerseModel";
import { canForRole } from "@/lib/rolePermissions";

/**
 * Workspace-owned daily verse pool.
 *
 * GET    ?workspace_id=...&user_id=...      → list all verses (members can read)
 * POST   { workspace_id, user_id, reference, note? }
 *                                            → add (admin / owner only)
 * PATCH  { id, workspace_id, user_id, reference?, note?, position? }
 *                                            → edit (admin / owner only)
 * DELETE ?id=...&workspace_id=...&user_id=... → remove (admin / owner only)
 *
 * "Owner" check: user is the workspace.ownerUserId OR has role 'admin'.
 * Members and below get read-only.
 */

const REF_RE = /^[1-3]?\s?[A-Za-z][A-Za-z\s]{1,30}\s\d{1,3}(:\d{1,3}(-\d{1,3})?)?$/;

function isValidReference(ref) {
    if (typeof ref !== 'string') return false;
    const trimmed = ref.trim();
    if (trimmed.length < 5 || trimmed.length > 80) return false;
    return REF_RE.test(trimmed);
}

async function authorize(workspaceId, userId, requireWrite = false) {
    if (!workspaceId || !userId) {
        return { ok: false, status: 400, message: 'workspace_id and user_id required' };
    }
    const ws = await workspaceModel.findById(workspaceId).lean();
    if (!ws) return { ok: false, status: 404, message: 'Workspace not found' };

    const member = await workspaceMemberModel.findOne({ workspaceId, userId }).lean();
    if (!member) return { ok: false, status: 403, message: 'Not a member of this workspace' };

    const isOwner = ws.ownerUserId === userId;
    const action = requireWrite ? 'manage' : 'view';
    const allowed = isOwner || canForRole(ws.rolePermissions, member.role, 'dailyVerses', action);
    if (!allowed) {
        return { ok: false, status: 403, message: `Your role does not allow ${action} on daily verses` };
    }
    return { ok: true, workspace: ws, member, isOwner };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspace_id');
        const userId = searchParams.get('user_id');

        const auth = await authorize(workspaceId, userId, false);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        const verses = await workspaceDailyVerseModel
            .find({ workspaceId })
            .sort({ position: 1, createdAt: 1 })
            .lean();

        const canEdit = auth.isOwner
            || canForRole(auth.workspace.rolePermissions, auth.member.role, 'dailyVerses', 'manage');

        return NextResponse.json({ success: true, verses, canEdit }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/workspace/daily-verses error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, reference, note } = await req.json();

        const auth = await authorize(workspace_id, user_id, true);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        if (!isValidReference(reference)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid reference. Use formats like "John 3:16" or "Psalm 23:1-4".',
            }, { status: 400 });
        }

        const trimmedRef = reference.trim();

        // Don't allow exact-duplicate references in the same workspace pool.
        const existing = await workspaceDailyVerseModel.findOne({
            workspaceId: workspace_id,
            reference: trimmedRef,
        }).lean();
        if (existing) {
            return NextResponse.json({
                success: false,
                message: 'That verse is already in the rotation.',
            }, { status: 409 });
        }

        // Append at the end by giving it max(position) + 1.
        const last = await workspaceDailyVerseModel
            .findOne({ workspaceId: workspace_id })
            .sort({ position: -1 })
            .lean();
        const position = last ? (last.position || 0) + 1 : 0;

        const doc = await workspaceDailyVerseModel.create({
            workspaceId: workspace_id,
            reference: trimmedRef,
            note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 240) : null,
            addedByUserId: user_id,
            position,
        });

        return NextResponse.json({ success: true, verse: doc }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/workspace/daily-verses error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { id, workspace_id, user_id, reference, note, position } = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, message: 'id required' }, { status: 400 });
        }
        const auth = await authorize(workspace_id, user_id, true);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        const update = {};
        if (typeof reference === 'string') {
            if (!isValidReference(reference)) {
                return NextResponse.json({
                    success: false,
                    message: 'Invalid reference. Use formats like "John 3:16" or "Psalm 23:1-4".',
                }, { status: 400 });
            }
            update.reference = reference.trim();
        }
        if (note !== undefined) {
            update.note = typeof note === 'string' && note.trim() ? note.trim().slice(0, 240) : null;
        }
        if (typeof position === 'number' && Number.isFinite(position)) {
            update.position = Math.max(0, Math.floor(position));
        }

        const updated = await workspaceDailyVerseModel.findOneAndUpdate(
            { _id: id, workspaceId: workspace_id },
            update,
            { new: true }
        );
        if (!updated) {
            return NextResponse.json({ success: false, message: 'Verse not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, verse: updated }, { status: 200 });
    } catch (error) {
        console.error('PATCH /api/v1/workspace/daily-verses error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const workspaceId = searchParams.get('workspace_id');
        const userId = searchParams.get('user_id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'id required' }, { status: 400 });
        }
        const auth = await authorize(workspaceId, userId, true);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        const deleted = await workspaceDailyVerseModel.findOneAndDelete({
            _id: id,
            workspaceId,
        });
        if (!deleted) {
            return NextResponse.json({ success: false, message: 'Verse not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/v1/workspace/daily-verses error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
