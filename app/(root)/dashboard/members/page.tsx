'use client';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Copy, Loader2, Lock, Mail, Phone, Shield, Trash2, UserPlus, X } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  ACTIONS,
  EDITABLE_ROLES,
  RESOURCES,
  defaultRolePermissions,
  mergeWithDefaults,
} from '@/lib/rolePermissions';

type Action = (typeof ACTIONS)[number];
type EditableRole = (typeof EDITABLE_ROLES)[number];
type RolePermissions = Record<EditableRole, Record<string, Record<Action, boolean>>>;

type Role = 'admin' | 'host' | 'cohost' | 'member' | 'guest';

const ROLES: Role[] = ['admin', 'host', 'cohost', 'member', 'guest'];
const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  host: 'Host',
  cohost: 'Co-host',
  member: 'Member',
  guest: 'Guest',
};
const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-[#5A2D82]/30 text-[#D4AF37] border-[#D4AF37]/40',
  host: 'bg-[#F57C00]/15 text-orange-300 border-orange-400/30',
  cohost: 'bg-[#2CA6A4]/15 text-teal-300 border-teal-400/30',
  member: 'bg-white/5 text-white/70 border-white/10',
  guest: 'bg-white/5 text-white/50 border-white/10',
};

interface Member {
  _id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  profile: { firstName: string | null; lastName: string | null; email: string | null; imageUrl: string | null } | null;
}

interface Invite {
  _id: string;
  workspaceId: string;
  email: string;
  role: Role;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}

const MembersPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace, loading: wsLoading } = useContext(WorkspaceContext);
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  const myMembership = useMemo(
    () => members.find((m) => m.userId === user?.id) || null,
    [members, user?.id]
  );
  const isAdmin = myMembership?.role === 'admin';
  // Plan-feature gates billed against the workspace owner, not the viewer.
  const canInvite = activeWorkspace?.ownerPlan?.memberManagement !== false; // default permissive while loading
  const canEditRoles = activeWorkspace?.ownerPlan?.customRoles !== false;
  const canMultipleAdmins = activeWorkspace?.ownerPlan?.multipleAdmins !== false;
  const ownerPlanTitle = activeWorkspace?.ownerPlan?.title || 'Starter';
  const adminUpsellTitle = `Multiple admins are available on Business and above. This workspace is on ${ownerPlanTitle}.`;

  const refresh = useCallback(async () => {
    if (!activeWorkspace?._id || !user?.id) return;
    setLoading(true);
    try {
      const memberRes = await axios.get(`/api/v1/workspace/members?workspace_id=${activeWorkspace._id}`);
      if (memberRes.data?.success) setMembers(memberRes.data.members || []);

      // Pending invites are admin-only — silently skip on 403.
      try {
        const inviteRes = await axios.get(
          `/api/v1/workspace/invite?workspace_id=${activeWorkspace._id}&user_id=${user.id}`
        );
        if (inviteRes.data?.success) setInvites(inviteRes.data.invites || []);
      } catch {
        setInvites([]);
      }
    } catch (err) {
      console.error('Members load failed', err);
      toast({ title: 'Could not load team', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?._id, user?.id, toast]);

  useEffect(() => {
    if (isLoaded && !wsLoading) refresh();
  }, [isLoaded, wsLoading, refresh]);

  const changeRole = async (target: Member, role: Role) => {
    if (!activeWorkspace?._id || !user?.id || target.role === role) return;
    try {
      const res = await axios.patch('/api/v1/workspace/members', {
        workspace_id: activeWorkspace._id,
        user_id: user.id,
        targetUserId: target.userId,
        role,
      });
      if (res.data?.success) {
        setMembers((prev) => prev.map((m) => (m.userId === target.userId ? { ...m, role } : m)));
        toast({ title: `Role updated to ${ROLE_LABEL[role]}` });
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (err: any) {
      toast({
        title: 'Could not update role',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (target: Member) => {
    if (!activeWorkspace?._id || !user?.id) return;
    const name = target.profile?.firstName || target.profile?.email || 'this member';
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${name} from ${activeWorkspace.name}?`)) return;
    try {
      const res = await axios.delete('/api/v1/workspace/members', {
        data: {
          workspace_id: activeWorkspace._id,
          user_id: user.id,
          targetUserId: target.userId,
        },
      });
      if (res.data?.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== target.userId));
        toast({ title: 'Member removed' });
      } else {
        throw new Error(res.data?.message || 'Remove failed');
      }
    } catch (err: any) {
      toast({
        title: 'Could not remove member',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    }
  };

  const revokeInvite = async (invite: Invite) => {
    if (!activeWorkspace?._id || !user?.id) return;
    try {
      const res = await axios.delete('/api/v1/workspace/invite', {
        data: {
          workspace_id: activeWorkspace._id,
          user_id: user.id,
          invite_id: invite._id,
        },
      });
      if (res.data?.success) {
        setInvites((prev) => prev.filter((i) => i._id !== invite._id));
        toast({ title: 'Invitation revoked' });
      }
    } catch (err: any) {
      toast({
        title: 'Could not revoke invite',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    }
  };

  const copyInviteLink = (invite: Invite) => {
    const url = `${window.location.origin}/workspace/invite/${invite.token}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'Invite link copied' }),
      () => toast({ title: 'Could not copy link', variant: 'destructive' })
    );
  };

  // Open WhatsApp (Web or app) with a pre-filled message containing the
  // accept link. The recipient must still sign in with the invited email.
  const shareInviteOnWhatsApp = (invite: Invite) => {
    const url = `${window.location.origin}/workspace/invite/${invite.token}`;
    const wsName = activeWorkspace?.name || 'our workspace';
    const text = `🙌 You're invited to join ${wsName} on Singalong as a ${ROLE_LABEL[invite.role]}.\n\nAccept here (sign in with ${invite.email}):\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  if (wsLoading || (loading && members.length === 0)) return <Loader />;

  if (!activeWorkspace) {
    return (
      <section className="flex size-full flex-col items-center justify-center text-white/70">
        <p className="text-lg">No active workspace.</p>
      </section>
    );
  }

  return (
    <section className="flex size-full flex-col gap-8 text-white pb-12">
      <div className="flex items-start justify-between flex-wrap gap-4 mt-12">
        <div>
          <h2 className="text-4xl sm:text-5xl font-bold">Team</h2>
          <p className="text-white/60 mt-2">
            People with access to <span className="text-white">{activeWorkspace.name}</span>
            {isAdmin && ' — invite teammates and manage roles below.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {canEditRoles ? (
              <button
                onClick={() => setShowRoles(true)}
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                <Shield size={18} /> Manage roles
              </button>
            ) : (
              <Link
                href="/plans"
                title={`Custom roles & permissions are available on Business and above. This workspace is on ${ownerPlanTitle}.`}
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 font-semibold text-white/60 hover:bg-white/10"
              >
                <Lock size={16} /> Manage roles
              </Link>
            )}
            {canInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] px-5 py-2.5 font-semibold text-white shadow-lg"
              >
                <UserPlus size={18} /> Invite people
              </button>
            ) : (
              <Link
                href="/plans"
                title={`Member invites are available on Professional and above. This workspace is on ${ownerPlanTitle}.`}
                className="flex items-center gap-2 rounded-lg border border-deep-gold/50 bg-deep-gold/10 px-5 py-2.5 font-semibold text-deep-gold hover:bg-deep-gold/20"
              >
                <Lock size={16} /> Upgrade to invite teammates
              </Link>
            )}
          </div>
        )}
      </div>

      {isAdmin && invites.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-background-3/30 backdrop-blur-xl p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail size={18} /> Pending invitations <span className="text-white/40 text-sm">({invites.length})</span>
          </h3>
          <ul className="divide-y divide-white/5">
            {invites.map((inv) => (
              <li key={inv._id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate">{inv.email}</p>
                  <p className="text-xs text-white/50">
                    Invited as {ROLE_LABEL[inv.role]} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(inv)}
                    className="flex items-center gap-1 text-xs text-white/70 hover:text-white border border-white/15 rounded-md px-2.5 py-1.5"
                    title="Copy invite link"
                  >
                    <Copy size={14} /> Copy link
                  </button>
                  <button
                    onClick={() => shareInviteOnWhatsApp(inv)}
                    className="flex items-center gap-1 text-xs text-[#25D366] hover:text-[#1ebe5d] border border-[#25D366]/40 rounded-md px-2.5 py-1.5"
                    title="Share invite on WhatsApp"
                  >
                    <Phone size={14} /> WhatsApp
                  </button>
                  <button
                    onClick={() => revokeInvite(inv)}
                    className="text-xs text-red-300 hover:text-red-200 border border-red-400/30 rounded-md px-2.5 py-1.5"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-background-3/30 backdrop-blur-xl p-5">
        <h3 className="text-lg font-semibold mb-4">
          Team <span className="text-white/40 text-sm">({members.length})</span>
        </h3>
        {members.length === 0 ? (
          <p className="text-white/50 py-8 text-center">No team members yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {members.map((m) => {
              const name = `${m.profile?.firstName || ''} ${m.profile?.lastName || ''}`.trim()
                || m.profile?.email
                || m.userId;
              const isSelf = m.userId === user?.id;
              return (
                <li key={m._id} className="flex items-center gap-4 py-3 flex-wrap">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                    <Image
                      src={m.profile?.imageUrl || '/images/avatar-1.jpeg'}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white truncate">
                      {name} {isSelf && <span className="text-xs text-white/40">(you)</span>}
                    </p>
                    {m.profile?.email && (
                      <p className="text-xs text-white/50 truncate">{m.profile.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && !isSelf ? (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as Role)}
                        className="bg-background-3/60 border border-white/15 rounded-md text-sm px-2.5 py-1.5 text-white focus:outline-none focus:border-[#D4AF37]"
                        title={!canMultipleAdmins ? adminUpsellTitle : undefined}
                      >
                        {ROLES.map((r) => {
                          const lockAdmin = r === 'admin' && !canMultipleAdmins;
                          return (
                            <option
                              key={r}
                              value={r}
                              disabled={lockAdmin}
                              className="bg-[#1A1A1A]"
                            >
                              {ROLE_LABEL[r]}{lockAdmin ? ' 🔒' : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className={`text-xs uppercase tracking-widest font-bold border rounded-full px-3 py-1 ${ROLE_BADGE[m.role]}`}>
                        {ROLE_LABEL[m.role]}
                      </span>
                    )}
                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => removeMember(m)}
                        className="text-red-300 hover:text-red-200 p-1.5 rounded-md hover:bg-red-500/10"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showInvite && (
        <InviteModal
          workspaceId={activeWorkspace._id}
          workspaceName={activeWorkspace.name}
          userId={user!.id}
          canMultipleAdmins={canMultipleAdmins}
          adminUpsellTitle={adminUpsellTitle}
          onClose={() => setShowInvite(false)}
          onSent={() => {
            setShowInvite(false);
            refresh();
          }}
        />
      )}

      {showRoles && (
        <ManageRolesModal
          workspaceId={activeWorkspace._id}
          workspaceName={activeWorkspace.name}
          userId={user!.id}
          onClose={() => setShowRoles(false)}
        />
      )}
    </section>
  );
};

interface InviteModalProps {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  canMultipleAdmins: boolean;
  adminUpsellTitle: string;
  onClose: () => void;
  onSent: () => void;
}

const InviteModal = ({ workspaceId, workspaceName, userId, canMultipleAdmins, adminUpsellTitle, onClose, onSent }: InviteModalProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [submitting, setSubmitting] = useState(false);
  const [sentInvite, setSentInvite] = useState<{ acceptUrl: string; emailSent: boolean } | null>(null);

  const shareOnWhatsApp = () => {
    if (!sentInvite) return;
    const text = `🙌 You're invited to join ${workspaceName} on Singalong as a ${ROLE_LABEL[role]}.\n\nAccept here (sign in with ${email.trim()}):\n${sentInvite.acceptUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const copyLink = () => {
    if (!sentInvite) return;
    navigator.clipboard.writeText(sentInvite.acceptUrl).then(
      () => toast({ title: 'Invite link copied' }),
      () => toast({ title: 'Could not copy link', variant: 'destructive' })
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/v1/workspace/invite', {
        workspace_id: workspaceId,
        user_id: userId,
        email: email.trim(),
        role,
      });
      if (res.data?.success) {
        setSentInvite({ acceptUrl: res.data.acceptUrl, emailSent: !!res.data.emailSent });
        if (res.data.emailSent) {
          toast({ title: `Invitation sent to ${email.trim()}` });
        } else {
          toast({
            title: 'Invite created',
            description: 'Email failed — copy the link or share via WhatsApp.',
            variant: 'destructive',
          });
        }
      } else {
        throw new Error(res.data?.message || 'Failed');
      }
    } catch (err: any) {
      toast({
        title: 'Could not send invitation',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // After a successful send, dismissing the modal should refresh the parent's
  // pending-invite list — otherwise the new invite never shows up until reload.
  const dismiss = sentInvite ? onSent : onClose;

  return (
    <div className="zeeshan fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={dismiss}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Invite to {workspaceName}</h3>
          <button onClick={dismiss} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {sentInvite ? (
          <div className="space-y-4">
            <div className={`rounded-lg border p-3 text-sm ${
              sentInvite.emailSent
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}>
              {sentInvite.emailSent
                ? `Invitation emailed to ${email.trim()}. Share the link below too if you'd like.`
                : `Invite created but email delivery failed. Share the link below with ${email.trim()}.`}
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1.5">Invite link</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate bg-black/40 rounded px-2 py-2 text-xs text-white/80">
                  {sentInvite.acceptUrl}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center gap-1 text-xs text-white/80 hover:text-white border border-white/15 rounded-md px-2.5 py-1.5"
                  title="Copy invite link"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1.5">
                Recipient must sign in with <strong className="text-white/60">{email.trim()}</strong> to accept.
              </p>
            </div>

            <button
              type="button"
              onClick={shareOnWhatsApp}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] px-5 py-2.5 font-semibold text-white"
            >
              <Phone size={16} /> Share via WhatsApp
            </button>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSentInvite(null);
                  setEmail('');
                  setRole('member');
                }}
                className="px-4 py-2 rounded-lg border border-white/15 text-white/80"
              >
                Send another
              </button>
              <button
                type="button"
                onClick={onSent}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full bg-background-3/60 border border-white/15 rounded-lg px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-background-3/60 border border-white/15 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                title={!canMultipleAdmins ? adminUpsellTitle : undefined}
              >
                {ROLES.map((r) => {
                  const lockAdmin = r === 'admin' && !canMultipleAdmins;
                  return (
                    <option
                      key={r}
                      value={r}
                      disabled={lockAdmin}
                      className="bg-[#1A1A1A]"
                    >
                      {ROLE_LABEL[r]}{lockAdmin ? ' 🔒' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-white/40 mt-1.5">
                {role === 'admin' && 'Full control — can invite, remove, and change roles.'}
                {role === 'host' && 'Can run sessions and lead meetings.'}
                {role === 'cohost' && 'Assists hosts with moderation in sessions.'}
                {role === 'member' && 'Standard access to workspace content.'}
                {role === 'guest' && 'Limited, one-off attendee access.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-white/15 text-white/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] font-semibold disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface ManageRolesModalProps {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  onClose: () => void;
}

const ManageRolesModal = ({ workspaceId, workspaceName, userId, onClose }: ManageRolesModalProps) => {
  const { toast } = useToast();
  const [perms, setPerms] = useState<RolePermissions>(() => defaultRolePermissions() as RolePermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/api/v1/workspace/role-permissions?workspace_id=${workspaceId}`);
        if (cancelled) return;
        if (res.data?.success) {
          setPerms(mergeWithDefaults(res.data.rolePermissions) as RolePermissions);
        }
      } catch (err) {
        console.error('role permissions load failed', err);
        toast({ title: 'Could not load role permissions', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId, toast]);

  // Toggling "manage" on implies "view" — you can't manage what you can't see.
  const toggle = (role: EditableRole, resourceKey: string, action: Action) => {
    setPerms((prev) => {
      const cell = prev[role]?.[resourceKey] || { view: false, manage: false };
      const next: Record<Action, boolean> = { ...cell, [action]: !cell[action] };
      if (action === 'manage' && next.manage) next.view = true;
      if (action === 'view' && !next.view) next.manage = false;
      return {
        ...prev,
        [role]: { ...prev[role], [resourceKey]: next },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.patch('/api/v1/workspace/role-permissions', {
        workspace_id: workspaceId,
        user_id: userId,
        rolePermissions: perms,
      });
      if (res.data?.success) {
        toast({ title: 'Role permissions saved' });
        onClose();
      } else {
        throw new Error(res.data?.message || 'Save failed');
      }
    } catch (err: any) {
      toast({
        title: 'Could not save role permissions',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPerms(defaultRolePermissions() as RolePermissions);
  };

  return (
    <div className="zeeshan fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-2 py-4 sm:px-4 sm:py-8" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-full overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1A] text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold">Manage roles</h3>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Choose what each role can do in <span className="text-white">{workspaceName}</span>. Admins always have full access.
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-white/60" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-auto px-3 sm:px-6 py-4">
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="text-left text-white/60 font-medium pb-2 pr-4 sticky left-0 bg-[#1A1A1A]">Feature</th>
                    {EDITABLE_ROLES.map((role) => (
                      <th key={role} colSpan={2} className="text-center text-white/60 font-medium pb-2 px-2">
                        {ROLE_LABEL[role as Role]}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-[#1A1A1A]" />
                    {EDITABLE_ROLES.map((role) => (
                      <React.Fragment key={role}>
                        <th className="text-[10px] uppercase tracking-wider text-white/40 font-normal pb-2 px-1 text-center">View</th>
                        <th className="text-[10px] uppercase tracking-wider text-white/40 font-normal pb-2 px-1 text-center">Manage</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => (
                    <tr key={resource.key} className="bg-white/[0.02] hover:bg-white/[0.04]">
                      <td className="py-2 pl-3 pr-4 rounded-l-md sticky left-0 bg-inherit text-white/90 whitespace-nowrap">
                        {resource.label}
                      </td>
                      {EDITABLE_ROLES.map((role, ri) => {
                        const cell = perms[role as EditableRole]?.[resource.key] || { view: false, manage: false };
                        const isLast = ri === EDITABLE_ROLES.length - 1;
                        return (
                          <React.Fragment key={role}>
                            <td className="py-2 px-1 text-center">
                              <PermToggle
                                checked={cell.view}
                                onChange={() => toggle(role as EditableRole, resource.key, 'view')}
                                ariaLabel={`${resource.label} — ${role} view`}
                              />
                            </td>
                            <td className={`py-2 px-1 text-center ${isLast ? 'rounded-r-md' : ''}`}>
                              <PermToggle
                                checked={cell.manage}
                                onChange={() => toggle(role as EditableRole, resource.key, 'manage')}
                                ariaLabel={`${resource.label} — ${role} manage`}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-white/40 mt-3">
                Turning on <span className="text-white/70">Manage</span> automatically enables <span className="text-white/70">View</span>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 flex-wrap">
              <button
                onClick={resetToDefaults}
                className="text-sm text-white/60 hover:text-white whitespace-nowrap"
              >
                Reset to defaults
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={onClose}
                  className="px-3 sm:px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] font-semibold disabled:opacity-60 text-sm whitespace-nowrap"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface PermToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}

const PermToggle = ({ checked, onChange, ariaLabel }: PermToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      checked ? 'bg-[#D4AF37]' : 'bg-white/15'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export default function MembersPageGated() {
  return (
    <PermissionGate resource="members" action="view">
      <MembersPage />
    </PermissionGate>
  );
}
