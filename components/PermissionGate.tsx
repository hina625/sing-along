'use client';

import React, { useContext } from 'react';
import { Lock } from 'lucide-react';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import Loader from './Loader';

interface PermissionGateProps {
  resource: string;
  action: 'view' | 'manage';
  children: React.ReactNode;
  /** Optional fallback when access is denied; defaults to a friendly empty state. */
  fallback?: React.ReactNode;
}

/**
 * Wraps a page or section. While the workspace is still loading we show the
 * loader; if the user lacks the required permission we render the fallback
 * (or a default "no access" panel). Otherwise children render unchanged.
 *
 * Server-side enforcement still lives in lib/permissions.js — this gate is the
 * UI mirror of that, so unauthorized users don't see broken pages.
 */
const PermissionGate = ({ resource, action, children, fallback }: PermissionGateProps) => {
  const { activeWorkspace, loading, can } = useContext(WorkspaceContext);

  if (loading) return <Loader />;

  if (!activeWorkspace) {
    return (
      <section className="flex size-full flex-col items-center justify-center text-white/70">
        <p className="text-lg">No active workspace.</p>
      </section>
    );
  }

  if (!can(resource, action)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <section className="flex size-full flex-col items-center justify-center text-white/70 px-4">
        <div className="rounded-2xl border border-white/10 bg-background-3/30 backdrop-blur-xl p-8 text-center max-w-md">
          <Lock className="mx-auto mb-3 text-white/40" size={36} />
          <h2 className="text-2xl font-bold text-white mb-2">No access</h2>
          <p className="text-sm text-white/60">
            Your role doesn&apos;t have permission to {action === 'manage' ? 'manage' : 'view'} this section.
            Ask a workspace admin if you need access.
          </p>
        </div>
      </section>
    );
  }

  return <>{children}</>;
};

export default PermissionGate;
