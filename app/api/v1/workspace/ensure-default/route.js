import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";

/**
 * POST /api/v1/workspace/ensure-default
 * Body: { user_id, firstName?, mode? }
 *
 * Idempotently makes sure the user has at least one workspace + membership.
 * Used by the migration path: existing users get a default Worship workspace
 * the first time they hit any workspace-aware endpoint.
 *
 * Returns: { workspace, created: boolean }
 */
export async function POST(req) {
    try {
        await connectDB();
        const { user_id, firstName, mode = 'worship' } = await req.json();
        if (!user_id) {
            return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
        }

        // Already have a workspace? Return the most recent one.
        const existing = await workspaceMemberModel
            .findOne({ userId: user_id })
            .sort({ joinedAt: -1 })
            .lean();
        if (existing) {
            const ws = await workspaceModel.findById(existing.workspaceId).lean();
            return NextResponse.json({ success: true, workspace: ws, created: false }, { status: 200 });
        }

        // None — create the default.
        const baseName = firstName ? `${firstName}'s Worship` : 'My Worship Space';
        const slugBase = (baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'worship') + `-${user_id.slice(-6)}`;

        const ws = await workspaceModel.create({
            name: baseName,
            slug: slugBase,
            mode: ['worship', 'business', 'community', 'hybrid'].includes(mode) ? mode : 'worship',
            ownerUserId: user_id,
        });

        await workspaceMemberModel.create({
            workspaceId: ws._id,
            userId: user_id,
            role: 'admin',
        });

        return NextResponse.json({ success: true, workspace: ws, created: true }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/workspace/ensure-default error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
