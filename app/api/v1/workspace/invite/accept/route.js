import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import workspaceInvitationModel from "@/lib/workspaceInvitationModel";

/**
 * GET  ?token=...   public preview of an invite (workspace name, role, invitee email, status)
 * POST { token }    accept invite — must be signed in with the matching email
 */

async function loadInvite(token) {
    const invite = await workspaceInvitationModel.findOne({ token });
    if (!invite) return { error: 'Invitation not found', status: 404 };
    if (invite.status === 'accepted') return { error: 'This invitation has already been accepted', status: 410 };
    if (invite.status === 'revoked') return { error: 'This invitation was revoked', status: 410 };
    if (invite.expiresAt < new Date()) {
        if (invite.status === 'pending') {
            invite.status = 'expired';
            await invite.save();
        }
        return { error: 'This invitation has expired', status: 410 };
    }
    return { invite };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        if (!token) {
            return NextResponse.json({ success: false, message: 'token required' }, { status: 400 });
        }
        const { invite, error, status } = await loadInvite(token);
        if (error) return NextResponse.json({ success: false, message: error }, { status });

        const workspace = await workspaceModel.findById(invite.workspaceId).lean();
        if (!workspace) {
            return NextResponse.json({ success: false, message: 'Workspace no longer exists' }, { status: 404 });
        }

        let inviterName = null;
        try {
            const inviter = await clerkClient.users.getUser(invite.invitedByUserId);
            inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim()
                || inviter.emailAddresses?.[0]?.emailAddress
                || null;
        } catch { /* ignore */ }

        return NextResponse.json({
            success: true,
            invite: {
                email: invite.email,
                role: invite.role,
                expiresAt: invite.expiresAt,
            },
            workspace: {
                _id: workspace._id,
                name: workspace.name,
                slug: workspace.slug,
                mode: workspace.mode,
                branding: workspace.branding,
            },
            inviterName,
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        // Browser callers use the Clerk session cookie. Mobile callers (no
        // cookie) pass `user_id` in the body — same trust model as the rest
        // of the /api/v1/workspace/* endpoints. Email-match below still
        // prevents anyone from accepting an invite that wasn't sent to them.
        const body = await req.json();
        const { token, user_id: bodyUserId } = body || {};

        let userId = null;
        try {
            const sessionAuth = auth();
            userId = sessionAuth?.userId || null;
        } catch {
            // auth() can throw in some edge contexts — fall through to body.
        }
        if (!userId && bodyUserId) userId = String(bodyUserId);

        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'Sign in required (or pass user_id from a mobile client).' },
                { status: 401 }
            );
        }
        if (!token) {
            return NextResponse.json({ success: false, message: 'token required' }, { status: 400 });
        }

        const { invite, error, status } = await loadInvite(token);
        if (error) return NextResponse.json({ success: false, message: error }, { status });

        // Email-binding check: caller's primary email must match the invited email.
        const user = await clerkClient.users.getUser(userId);
        const userEmails = (user.emailAddresses || []).map((e) => e.emailAddress.toLowerCase());
        if (!userEmails.includes(invite.email.toLowerCase())) {
            return NextResponse.json({
                success: false,
                message: `This invitation was sent to ${invite.email}. Sign in with that email to accept.`,
            }, { status: 403 });
        }

        // Idempotent: if already a member, just mark invite accepted and return.
        const existing = await workspaceMemberModel.findOne({
            workspaceId: invite.workspaceId,
            userId,
        });
        if (!existing) {
            await workspaceMemberModel.create({
                workspaceId: invite.workspaceId,
                userId,
                role: invite.role,
            });
        }

        invite.status = 'accepted';
        invite.acceptedByUserId = userId;
        await invite.save();

        const workspace = await workspaceModel.findById(invite.workspaceId).lean();

        return NextResponse.json({
            success: true,
            workspace,
            role: invite.role,
        }, { status: 200 });
    } catch (error) {
        console.error('POST /api/v1/workspace/invite/accept error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
