import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/connnectDB";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import workspaceModel from "@/lib/workspaceModel";
import { resolveUserPlan } from "@/lib/planLimits";

/**
 * GET    ?workspace_id=...                       list memberships (with hydrated Clerk profiles)
 * POST   { workspace_id, user_id, addUserId, role? }   add member (admin only)
 * PATCH  { workspace_id, user_id, targetUserId, role } update role (admin only)
 * DELETE { workspace_id, user_id, targetUserId }     remove member (admin only)
 */

const ROLES = ['admin', 'host', 'cohost', 'member', 'guest'];

async function isAdmin(workspaceId, userId) {
    const m = await workspaceMemberModel.findOne({ workspaceId, userId }).lean();
    return m && m.role === 'admin';
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspace_id');
        if (!workspaceId) {
            return NextResponse.json({ success: false, message: 'workspace_id required' }, { status: 400 });
        }
        const memberships = await workspaceMemberModel.find({ workspaceId }).sort({ joinedAt: 1 }).lean();

        // Hydrate Clerk profile data so the members page can render names/avatars/emails.
        const userIds = memberships.map((m) => m.userId);
        let profileMap = new Map();
        if (userIds.length > 0) {
            try {
                const { data: users } = await clerkClient.users.getUserList({
                    userId: userIds,
                    limit: Math.min(userIds.length, 500),
                });
                profileMap = new Map(users.map((u) => [u.id, u]));
            } catch (e) {
                console.error('Clerk hydration failed:', e);
            }
        }
        const members = memberships.map((m) => {
            const u = profileMap.get(m.userId);
            return {
                _id: m._id,
                workspaceId: m.workspaceId,
                userId: m.userId,
                role: m.role,
                joinedAt: m.joinedAt,
                profile: u ? {
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.emailAddresses?.[0]?.emailAddress || null,
                    imageUrl: u.imageUrl,
                } : null,
            };
        });
        return NextResponse.json({ success: true, members }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, addUserId, role = 'member' } = await req.json();
        if (!workspace_id || !user_id || !addUserId) {
            return NextResponse.json({ success: false, message: 'workspace_id, user_id, addUserId required' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        const safeRole = ROLES.includes(role) ? role : 'member';
        try {
            const m = await workspaceMemberModel.create({
                workspaceId: workspace_id,
                userId: addUserId,
                role: safeRole,
            });
            return NextResponse.json({ success: true, member: m }, { status: 201 });
        } catch (e) {
            // Duplicate key → already a member; just return current.
            const existing = await workspaceMemberModel.findOne({ workspaceId: workspace_id, userId: addUserId }).lean();
            return NextResponse.json({ success: true, member: existing, alreadyExisted: true }, { status: 200 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, targetUserId, role } = await req.json();
        if (!workspace_id || !user_id || !targetUserId || !role) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        }
        if (!ROLES.includes(role)) {
            return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }

        // Promoting someone to admin requires the multipleAdmins plan flag
        // (Business+) — gated against the workspace owner's plan. Demoting to
        // a non-admin role is always allowed.
        if (role === 'admin') {
            const ws = await workspaceModel.findById(workspace_id, { ownerUserId: 1 }).lean();
            if (ws) {
                const ownerPlan = await resolveUserPlan(ws.ownerUserId);
                if (!ownerPlan.multipleAdmins) {
                    return NextResponse.json({
                        success: false,
                        code: 'plan_multiple_admins',
                        message: `Multiple admins are available on Business and above. Your ${ownerPlan.title} plan supports one admin.`,
                    }, { status: 402 });
                }
            }
        }

        const updated = await workspaceMemberModel.findOneAndUpdate(
            { workspaceId: workspace_id, userId: targetUserId },
            { role },
            { new: true }
        );
        return NextResponse.json({ success: true, member: updated }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, targetUserId } = await req.json();
        if (!workspace_id || !user_id || !targetUserId) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        // Don't let the last admin delete themselves out.
        if (user_id === targetUserId) {
            const adminCount = await workspaceMemberModel.countDocuments({ workspaceId: workspace_id, role: 'admin' });
            if (adminCount <= 1) {
                return NextResponse.json({ success: false, message: 'Cannot remove the last admin' }, { status: 400 });
            }
        }
        await workspaceMemberModel.deleteOne({ workspaceId: workspace_id, userId: targetUserId });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
