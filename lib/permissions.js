// Server-side permission gate used by API routes. Pure logic lives in
// lib/rolePermissions.js so the client can share `canForRole`.

import { NextResponse } from "next/server";
import connectDB from "./connnectDB";
import workspaceModel from "./workspaceModel";
import workspaceMemberModel from "./workspaceMemberModel";
import { canForRole } from "./rolePermissions";

/**
 * Returns true if (userId) has (action) on (resource) within (workspaceId).
 * Admins always pass. Non-members always fail.
 */
export async function hasPermission({ workspaceId, userId, resource, action }) {
    if (!workspaceId || !userId || !resource || !action) return false;
    await connectDB();
    const member = await workspaceMemberModel.findOne({ workspaceId, userId }).lean();
    if (!member) return false;
    if (member.role === 'admin') return true;
    const ws = await workspaceModel.findById(workspaceId).lean();
    if (!ws) return false;
    return canForRole(ws.rolePermissions, member.role, resource, action);
}

/**
 * Same as hasPermission but returns a 403 NextResponse if denied, or null if
 * allowed. Use it at the top of route handlers:
 *
 *   const denied = await requirePermission({ ... });
 *   if (denied) return denied;
 */
export async function requirePermission({ workspaceId, userId, resource, action }) {
    const ok = await hasPermission({ workspaceId, userId, resource, action });
    if (ok) return null;
    return NextResponse.json(
        { success: false, message: 'Forbidden — your role does not allow this action' },
        { status: 403 },
    );
}
