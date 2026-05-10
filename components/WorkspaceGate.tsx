'use client';

import { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

/**
 * Soft gate: when the signed-in user has no workspaces, push them to /welcome.
 * Lives inside the dashboard layout so the rest of the app renders normally.
 * Skips the redirect if we're already on /welcome.
 */
const WorkspaceGate = ({ children }: { children: React.ReactNode }) => {
  const { needsOnboarding } = useContext(WorkspaceContext);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (needsOnboarding && pathname !== '/welcome') {
      router.replace('/welcome');
    }
  }, [needsOnboarding, pathname, router]);

  return <>{children}</>;
};

export default WorkspaceGate;
