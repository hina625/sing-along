import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import roomModel from "@/lib/roomModel";
import recordingModel from "@/lib/recordingModel";
import prayerRequestModel from "@/lib/prayerRequestModel";
import donationModel from "@/lib/donationModel";
import { mergeWithDefaults } from "@/lib/rolePermissions";

const VALID_MODES = ['worship', 'business', 'community', 'hybrid'];

function makeSlug(name) {
    return (name || 'workspace')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'workspace';
}

async function uniqueSlug(base) {
    let slug = base;
    let n = 0;
    // Add a numeric suffix until we find a free slug.
    while (await workspaceModel.findOne({ slug })) {
        n += 1;
        slug = `${base}-${n}`;
        if (n > 200) {
            slug = `${base}-${Date.now()}`;
            break;
        }
    }
    return slug;
}

/**
 * GET /api/v1/workspace?user_id=...
 *   List all workspaces the user belongs to (via WorkspaceMember).
 *
 * POST { user_id, name, mode?, branding? }
 *   Create a new workspace and auto-add the creator as admin.
 *
 * PATCH { id, user_id, name?, mode?, branding? }
 *   Update workspace (admin only).
 */
export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('user_id');
        if (!userId) {
            return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
        }
        const memberships = await workspaceMemberModel.find({ userId }).lean();
        if (memberships.length === 0) {
            return NextResponse.json({ success: true, workspaces: [] }, { status: 200 });
        }
        const ids = memberships.map((m) => m.workspaceId);
        const workspaces = await workspaceModel.find({ _id: { $in: ids } }).lean();
        // Decorate with the user's role + the role-permission matrix so the client
        // can gate UI without a second round-trip per workspace.
        const roleMap = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));
        const decorated = workspaces.map((w) => ({
            ...w,
            myRole: roleMap.get(String(w._id)) || 'member',
            rolePermissions: mergeWithDefaults(w.rolePermissions),
        }));
        return NextResponse.json({ success: true, workspaces: decorated }, { status: 200 });
    } catch (error) {
        console.error('GET /api/v1/workspace error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const { user_id, name, mode = 'worship', branding } = await req.json();
        if (!user_id || !name?.trim()) {
            return NextResponse.json({ success: false, message: 'user_id and name are required' }, { status: 400 });
        }
        const safeMode = VALID_MODES.includes(mode) ? mode : 'worship';
        const slug = await uniqueSlug(makeSlug(name));

        // Detect first-workspace before we create.
        const memberCount = await workspaceMemberModel.countDocuments({ userId: user_id });
        const isFirst = memberCount === 0;

        const ws = await workspaceModel.create({
            name: name.trim().slice(0, 80),
            slug,
            mode: safeMode,
            ownerUserId: user_id,
            branding: branding || undefined,
        });

        await workspaceMemberModel.create({
            workspaceId: ws._id,
            userId: user_id,
            role: 'admin',
        });

        // Lazy migration: claim the user's orphan data for this first workspace
        // so the dashboard isn't empty after onboarding.
        let backfill = null;
        if (isFirst) {
            const [r1, r2, r3, r4] = await Promise.all([
                roomModel.updateMany(
                    { user_id, $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] },
                    { workspaceId: ws._id }
                ),
                recordingModel.updateMany(
                    { hostUserId: user_id, $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] },
                    { workspaceId: ws._id }
                ),
                donationModel.updateMany(
                    { donorUserId: user_id, $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] },
                    { workspaceId: ws._id }
                ),
                // Prayer requests don't carry the host id directly; resolve via the user's rooms.
                (async () => {
                    const rooms = await roomModel.find({ user_id }, { room_id: 1 }).lean();
                    const roomIds = rooms.map((r) => r.room_id);
                    if (roomIds.length === 0) return { modifiedCount: 0 };
                    return prayerRequestModel.updateMany(
                        { roomId: { $in: roomIds }, $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] },
                        { workspaceId: ws._id }
                    );
                })(),
            ]);
            backfill = {
                rooms: r1.modifiedCount || 0,
                recordings: r2.modifiedCount || 0,
                donations: r3.modifiedCount || 0,
                prayerRequests: r4.modifiedCount || 0,
            };
        }

        return NextResponse.json({ success: true, workspace: ws, backfill }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/workspace error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { id, user_id, name, mode, branding } = await req.json();
        if (!id || !user_id) {
            return NextResponse.json({ success: false, message: 'id and user_id required' }, { status: 400 });
        }
        // Authorize: user must be admin of the workspace.
        const membership = await workspaceMemberModel.findOne({ workspaceId: id, userId: user_id }).lean();
        if (!membership || membership.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        const update = {};
        if (typeof name === 'string' && name.trim()) update.name = name.trim().slice(0, 80);
        if (mode && VALID_MODES.includes(mode)) update.mode = mode;
        if (branding && typeof branding === 'object') update.branding = { ...branding };

        const updated = await workspaceModel.findByIdAndUpdate(id, update, { new: true });
        return NextResponse.json({ success: true, workspace: updated }, { status: 200 });
    } catch (error) {
        console.error('PATCH /api/v1/workspace error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
