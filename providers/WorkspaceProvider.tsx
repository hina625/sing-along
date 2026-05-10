'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { canForRole } from '@/lib/rolePermissions';

type Role = 'admin' | 'host' | 'cohost' | 'member' | 'guest';
type PermissionAction = 'view' | 'manage';

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  mode: 'worship' | 'business' | 'community' | 'hybrid';
  ownerUserId: string;
  branding: { logoUrl: string | null; primaryColor: string; accentColor: string };
  createdAt: string;
  myRole?: Role;
  rolePermissions?: Record<string, Record<string, { view: boolean; manage: boolean }>>;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  setActive: (id: string) => void;
  refresh: () => Promise<void>;
  needsOnboarding: boolean;
  /** True if the current user can perform `action` on `resource` in the active workspace. */
  can: (resource: string, action: PermissionAction) => boolean;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  setActive: () => {},
  refresh: async () => {},
  needsOnboarding: false,
  can: () => false,
});

const ACTIVE_KEY = 'singalong.activeWorkspaceId';

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`/api/v1/workspace?user_id=${user.id}`);
      const list: Workspace[] = res.data?.workspaces || [];
      setWorkspaces(list);

      // Pick the active one: stored preference if still valid, else first.
      let stored: string | null = null;
      try { stored = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_KEY) : null; } catch { /* ignore */ }
      const found = list.find((w) => w._id === stored);
      const next = found?._id || list[0]?._id || null;
      setActiveId(next);
    } catch (err) {
      console.error('Workspace refresh failed', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setWorkspaces([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [isLoaded, user, refresh]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    try { window.localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w._id === activeId) || null,
    [workspaces, activeId]
  );

  // Reflect the active workspace mode on <html> so CSS can theme the dashboard
  // (sidebar bg, card palette, dialog tint) per worship/business/hybrid.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const mode = activeWorkspace?.mode || 'worship';
    root.setAttribute('data-ws-mode', mode);
    return () => { root.removeAttribute('data-ws-mode'); };
  }, [activeWorkspace?.mode]);

  const needsOnboarding = !!user && !loading && workspaces.length === 0;

  const can = useCallback(
    (resource: string, action: PermissionAction) => {
      if (!activeWorkspace) return false;
      const role = activeWorkspace.myRole || 'member';
      return canForRole(activeWorkspace.rolePermissions, role, resource, action);
    },
    [activeWorkspace]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspaces, activeWorkspace, loading, setActive, refresh, needsOnboarding, can }),
    [workspaces, activeWorkspace, loading, setActive, refresh, needsOnboarding, can]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
