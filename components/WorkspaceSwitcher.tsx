'use client';

import Link from 'next/link';
import { useContext, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Check, Mic2, Briefcase, Users } from 'lucide-react';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

const MODE_ICON: Record<string, React.ReactNode> = {
  worship: <Mic2 size={14} />,
  business: <Briefcase size={14} />,
  community: <Users size={14} />,
  hybrid: <Mic2 size={14} />,
};

const MODE_LABEL: Record<string, string> = {
  worship: 'Worship',
  business: 'Business',
  community: 'Community',
  hybrid: 'Hybrid',
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, setActive, loading } = useContext(WorkspaceContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          <span className="ws-switcher-mode">
            {MODE_ICON[display.mode]} {MODE_LABEL[display.mode]}
          </span>
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
                      <span className="ws-switcher-item-mode">
                        {MODE_ICON[w.mode]} {MODE_LABEL[w.mode]}
                        {w.myRole && w.myRole !== 'member' && (
                          <span className="ws-switcher-item-role">· {w.myRole}</span>
                        )}
                      </span>
                    </span>
                    {active && <Check size={16} className="ws-switcher-item-check" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ws-switcher-menu-foot">
            <Link href="/welcome?new=1" className="ws-switcher-add" onClick={() => setOpen(false)}>
              <Plus size={14} /> New workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
