import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import { mergeWithDefaults, sanitizeRolePermissions } from "@/lib/rolePermissions";
import { resolveUserPlan } from "@/lib/planLimits";

/**
 * GET   ?workspace_id=...                              read the role × resource matrix
 * PATCH { workspace_id, user_id, rolePermissions }     replace the matrix (admin only)
 *
 * Admins implicitly have every permission, so they're not represented in the
 * stored shape. Stored layout is { [role]: { [resourceKey]: { view, manage } } }.
 */

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
        const ws = await workspaceModel.findById(workspaceId).lean();
        if (!ws) {
            return NextResponse.json({ success: false, message: 'Workspace not found' }, { status: 404 });
        }
        const rolePermissions = mergeWithDefaults(ws.rolePermissions);
        return NextResponse.json({ success: true, rolePermissions }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, rolePermissions } = await req.json();
        if (!workspace_id || !user_id || !rolePermissions) {
            return NextResponse.json({ success: false, message: 'workspace_id, user_id, rolePermissions required' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }

        // Plan gate: custom role-permission matrix is a Business+ feature.
        // Charged against the workspace owner's plan.
        const ws = await workspaceModel.findById(workspace_id, { ownerUserId: 1 }).lean();
        if (!ws) {
            return NextResponse.json({ success: false, message: 'Workspace not found' }, { status: 404 });
        }
        const ownerPlan = await resolveUserPlan(ws.ownerUserId);
        if (!ownerPlan.customRoles) {
            return NextResponse.json({
                success: false,
                code: 'plan_custom_roles',
                message: `Custom roles & permissions are available on Business and above. This workspace is on the ${ownerPlan.title} plan.`,
            }, { status: 402 });
        }

        const safe = sanitizeRolePermissions(rolePermissions);
        const updated = await workspaceModel.findByIdAndUpdate(
            workspace_id,
            { rolePermissions: safe },
            { new: true },
        ).lean();
        if (!updated) {
            return NextResponse.json({ success: false, message: 'Workspace not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, rolePermissions: safe }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
