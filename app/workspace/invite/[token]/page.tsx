'use client';

import axios from 'axios';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Loader from '@/components/Loader';

interface InvitePreview {
  invite: { email: string; role: string; expiresAt: string };
  workspace: { _id: string; name: string; slug: string; mode: string; branding: any };
  inviterName: string | null;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get(`/api/v1/workspace/invite/accept?token=${encodeURIComponent(token)}`);
        if (res.data?.success) setPreview(res.data);
        else setLoadError(res.data?.message || 'Invitation could not be loaded');
      } catch (err: any) {
        setLoadError(err?.response?.data?.message || 'Invitation could not be loaded');
      }
    })();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await axios.post('/api/v1/workspace/invite/accept', { token });
      if (res.data?.success) {
        try {
          window.localStorage.setItem('singalong.activeWorkspaceId', res.data.workspace._id);
        } catch { /* ignore */ }
        router.push('/dashboard');
      } else {
        setAcceptError(res.data?.message || 'Failed to accept');
      }
    } catch (err: any) {
      setAcceptError(err?.response?.data?.message || 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background-3/40 p-8 text-center text-white">
          <h1 className="text-2xl font-bold mb-3">Invitation unavailable</h1>
          <p className="text-white/70 mb-6">{loadError}</p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] px-5 py-2.5 font-semibold text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!preview || !isLoaded) return <Loader label="Loading invitation…" />;

  const emailMismatch =
    !!user
    && !user.emailAddresses?.some((e) => e.emailAddress.toLowerCase() === preview.invite.email.toLowerCase());

  const returnPath = `/workspace/invite/${token}`;
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(returnPath)}`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(returnPath)}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-background-3/40 backdrop-blur-xl p-8 text-white">
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm uppercase tracking-widest">You're invited</p>
          <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] bg-clip-text text-transparent">
            {preview.workspace.name}
          </h1>
          {preview.inviterName && (
            <p className="mt-3 text-white/70">
              {preview.inviterName} invited you to join as a <strong className="text-white">{preview.invite.role}</strong>.
            </p>
          )}
          {!preview.inviterName && (
            <p className="mt-3 text-white/70">
              You've been invited to join as a <strong className="text-white">{preview.invite.role}</strong>.
            </p>
          )}
          <p className="mt-2 text-xs text-white/50">
            Sent to {preview.invite.email} · expires {new Date(preview.invite.expiresAt).toLocaleDateString()}
          </p>
        </div>

        {!user && (
          <div className="space-y-3">
            <p className="text-sm text-white/70 text-center">
              Sign in or create an account with <strong>{preview.invite.email}</strong> to accept.
            </p>
            <Link
              href={signInHref}
              className="block w-full text-center rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] px-5 py-2.5 font-semibold text-white"
            >
              Sign in to accept
            </Link>
            <Link
              href={signUpHref}
              className="block w-full text-center rounded-lg border border-[#D4AF37] px-5 py-2.5 font-semibold text-[#D4AF37]"
            >
              Create an account
            </Link>
          </div>
        )}

        {user && emailMismatch && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              You're signed in as <strong>{user.emailAddresses?.[0]?.emailAddress}</strong>, but this invite was sent to <strong>{preview.invite.email}</strong>.
              Sign out and use the invited email to accept.
            </div>
            <Link
              href={signInHref}
              className="block w-full text-center rounded-lg border border-white/20 px-5 py-2.5 font-semibold text-white"
            >
              Sign in with a different account
            </Link>
          </div>
        )}

        {user && !emailMismatch && (
          <div className="space-y-3">
            {acceptError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {acceptError}
              </div>
            )}
            <button
              onClick={accept}
              disabled={accepting}
              className="block w-full rounded-lg bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {accepting ? 'Joining…' : `Join ${preview.workspace.name}`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
