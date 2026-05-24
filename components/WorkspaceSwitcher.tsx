'use client';

import Link from 'next/link';
import { useContext, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ChevronDown, Plus, Check, Lock } from 'lucide-react';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { getPlan } from '@/constants';

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, setActive, loading } = useContext(WorkspaceContext);
  const { subscription } = useContext(subscriptionContext) as { subscription: string };
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const plan = getPlan(subscription);
  // Count workspaces the current user *owns* — being a teammate elsewhere
  // doesn't burn their own plan slot. Mirrors canCreateWorkspace server-side.
  const ownedCount = workspaces.filter((w) => w.ownerUserId === user?.id).length;
  const atWorkspaceCap = plan.maxWorkspaces > 0 && ownedCount >= plan.maxWorkspaces;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Hide entirely when there are no workspaces (Welcome will handle the empty state).
  if (loading || workspaces.length === 0) return null;

  const display = activeWorkspace || workspaces[0];

  return (
    <div className="ws-switcher" ref={ref}>
      <button type="button" className="ws-switcher-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="ws-switcher-avatar" aria-hidden>{initials(display.name)}</span>
        <span className="ws-switcher-name">
          <span className="ws-switcher-name-text">{display.name}</span>
        </span>
        <ChevronDown size={16} className="ws-switcher-chev" />
      </button>

      {open && (
        <div className="ws-switcher-menu" role="menu">
          <div className="ws-switcher-menu-head">Your spaces</div>
          <ul className="ws-switcher-list">
            {workspaces.map((w) => {
              const active = w._id === display._id;
              return (
                <li key={w._id}>
                  <button
                    type="button"
                    className={`ws-switcher-item ${active ? 'is-active' : ''}`}
                    onClick={() => { setActive(w._id); setOpen(false); }}
                  >
                    <span className="ws-switcher-item-avatar">{initials(w.name)}</span>
                    <span className="ws-switcher-item-text">
                      <span className="ws-switcher-item-name">{w.name}</span>
                      {w.myRole && w.myRole !== 'member' && (
                        <span className="ws-switcher-item-mode">
                          <span className="ws-switcher-item-role">{w.myRole}</span>
                        </span>
                      )}
                    </span>
                    {active && <Check size={16} className="ws-switcher-item-check" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ws-switcher-menu-foot">
            {atWorkspaceCap ? (
              <Link
                href="/plans"
                className="ws-switcher-add"
                onClick={() => setOpen(false)}
                title={`Your ${plan.title} plan includes ${plan.maxWorkspaces} workspace${plan.maxWorkspaces === 1 ? '' : 's'}. Upgrade for more.`}
              >
                <Lock size={14} /> Upgrade for more workspaces
              </Link>
            ) : (
              <Link href="/welcome?new=1" className="ws-switcher-add" onClick={() => setOpen(false)}>
                <Plus size={14} /> New workspace
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
