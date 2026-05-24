import { NextResponse } from "next/server";
import crypto from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import connectDB from "@/lib/connnectDB";
import workspaceModel from "@/lib/workspaceModel";
import workspaceMemberModel from "@/lib/workspaceMemberModel";
import workspaceInvitationModel from "@/lib/workspaceInvitationModel";
import sendEmail from "@/lib/sendEmail";
import { resolveUserPlan } from "@/lib/planLimits";

/**
 * POST   { workspace_id, user_id, email, role? }   create invite (admin only)
 * GET    ?workspace_id=...&user_id=...             list pending invites (admin only)
 * DELETE { workspace_id, user_id, invite_id }      revoke invite (admin only)
 */

const ROLES = ['admin', 'host', 'cohost', 'member', 'guest'];
const INVITE_TTL_DAYS = 7;

async function isAdmin(workspaceId, userId) {
    const m = await workspaceMemberModel.findOne({ workspaceId, userId }).lean();
    return m && m.role === 'admin';
}

async function findClerkUserByEmail(email) {
    try {
        const { data } = await clerkClient.users.getUserList({
            emailAddress: [email],
            limit: 1,
        });
        return data?.[0] || null;
    } catch {
        return null;
    }
}

function buildInviteEmail({ workspaceName, inviterName, role, acceptUrl }) {
    const text = `Hello,

${inviterName || 'A teammate'} has invited you to join the workspace "${workspaceName}" on Singalong as a ${role}.

Accept your invitation here:
${acceptUrl}

If you don't have a Singalong account yet, you'll be prompted to sign up first — use this same email address so the invite can attach to your account.

This invitation expires in ${INVITE_TTL_DAYS} days.

Be blessed,
The Singalong team
`;
    const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1A1A1A">
            <h2 style="color:#5A2D82;margin:0 0 12px">You're invited to ${workspaceName}</h2>
            <p>${inviterName || 'A teammate'} has invited you to join the <strong>${workspaceName}</strong> workspace on Singalong as a <strong>${role}</strong>.</p>
            <p style="margin:24px 0">
                <a href="${acceptUrl}"
                   style="background:linear-gradient(90deg,#5A2D82,#D4AF37);color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:600">
                    Accept invitation
                </a>
            </p>
            <p style="font-size:13px;color:#555">
                Or paste this link into your browser:<br/>
                <a href="${acceptUrl}" style="color:#5A2D82;word-break:break-all">${acceptUrl}</a>
            </p>
            <p style="font-size:12px;color:#888;margin-top:24px">
                If you don't have a Singalong account yet, you'll be prompted to sign up — use this same email so the invite attaches to your account. This invitation expires in ${INVITE_TTL_DAYS} days.
            </p>
        </div>
    `;
    return { text, html };
}

export async function POST(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, email, role = 'member' } = await req.json();
        if (!workspace_id || !user_id || !email) {
            return NextResponse.json({ success: false, message: 'workspace_id, user_id, email required' }, { status: 400 });
        }
        const cleanEmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        const safeRole = ROLES.includes(role) ? role : 'member';

        const workspace = await workspaceModel.findById(workspace_id).lean();
        if (!workspace) {
            return NextResponse.json({ success: false, message: 'Workspace not found' }, { status: 404 });
        }

        // Plan gate (member management is Pro+). Bill against the workspace
        // OWNER's plan — even a Pro admin can't invite into a workspace
        // owned by a free user, since the owner is the one paying.
        const ownerPlan = await resolveUserPlan(workspace.ownerUserId);
        if (!ownerPlan.memberManagement) {
            return NextResponse.json({
                success: false,
                code: 'plan_member_management',
                message: `Member invites are available on Professional and above. This workspace is on the ${ownerPlan.title} plan.`,
            }, { status: 402 });
        }

        // Promotion to admin requires multipleAdmins (Business+). The
        // workspace creator's seat counts as "the one admin" for Starter/Pro.
        if (safeRole === 'admin' && !ownerPlan.multipleAdmins) {
            return NextResponse.json({
                success: false,
                code: 'plan_multiple_admins',
                message: `Multiple admins are available on Business and above. Your ${ownerPlan.title} plan supports one admin.`,
            }, { status: 402 });
        }

        // If a Clerk user with that email already exists AND is already a member → short-circuit.
        const existingClerk = await findClerkUserByEmail(cleanEmail);
        if (existingClerk) {
            const already = await workspaceMemberModel.findOne({
                workspaceId: workspace_id,
                userId: existingClerk.id,
            }).lean();
            if (already) {
                return NextResponse.json({
                    success: false,
                    message: 'That user is already a member of this workspace',
                }, { status: 409 });
            }
        }

        // Reuse a pending invite if one exists; otherwise create new.
        const existingInvite = await workspaceInvitationModel.findOne({
            workspaceId: workspace_id,
            email: cleanEmail,
            status: 'pending',
        });

        const token = existingInvite?.token || crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

        let invite;
        if (existingInvite) {
            existingInvite.role = safeRole;
            existingInvite.expiresAt = expiresAt;
            existingInvite.invitedByUserId = user_id;
            await existingInvite.save();
            invite = existingInvite;
        } else {
            invite = await workspaceInvitationModel.create({
                workspaceId: workspace_id,
                email: cleanEmail,
                role: safeRole,
                token,
                invitedByUserId: user_id,
                expiresAt,
            });
        }

        const inviter = await clerkClient.users.getUser(user_id).catch(() => null);
        const inviterName = inviter
            ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.emailAddresses?.[0]?.emailAddress
            : null;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        const acceptUrl = `${baseUrl}/workspace/invite/${token}`;
        const { text, html } = buildInviteEmail({
            workspaceName: workspace.name,
            inviterName,
            role: safeRole,
            acceptUrl,
        });

        try {
            await sendEmail(cleanEmail, `You're invited to ${workspace.name} on Singalong`, text, html);
        } catch (mailErr) {
            console.error('Invite email failed:', mailErr);
            // Keep the invite row — admin can resend or copy the link.
            return NextResponse.json({
                success: true,
                invite,
                acceptUrl,
                emailSent: false,
                message: 'Invite created but email failed. Share the link manually.',
            }, { status: 201 });
        }

        return NextResponse.json({
            success: true,
            invite,
            acceptUrl,
            emailSent: true,
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/workspace/invite error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspace_id');
        const userId = searchParams.get('user_id');
        if (!workspaceId || !userId) {
            return NextResponse.json({ success: false, message: 'workspace_id and user_id required' }, { status: 400 });
        }
        if (!(await isAdmin(workspaceId, userId))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        const now = new Date();
        // Lazy-expire stale pending invites.
        await workspaceInvitationModel.updateMany(
            { workspaceId, status: 'pending', expiresAt: { $lt: now } },
            { status: 'expired' }
        );
        const invites = await workspaceInvitationModel
            .find({ workspaceId, status: 'pending' })
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ success: true, invites }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const { workspace_id, user_id, invite_id } = await req.json();
        if (!workspace_id || !user_id || !invite_id) {
            return NextResponse.json({ success: false, message: 'workspace_id, user_id, invite_id required' }, { status: 400 });
        }
        if (!(await isAdmin(workspace_id, user_id))) {
            return NextResponse.json({ success: false, message: 'Forbidden — admin only' }, { status: 403 });
        }
        await workspaceInvitationModel.findOneAndUpdate(
            { _id: invite_id, workspaceId: workspace_id, status: 'pending' },
            { status: 'revoked' }
        );
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
