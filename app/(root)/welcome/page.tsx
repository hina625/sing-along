'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { Mic2, Briefcase, Users, ArrowRight, Check, Sparkles } from 'lucide-react';
import Loader from '@/components/Loader';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { useToast } from '@/components/ui/use-toast';

type Mode = 'worship' | 'business' | 'community';

interface ModeCard {
  mode: Mode;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  pitch: string;
  forList: string[];
  defaultName: (firstName?: string | null) => string;
}

const MODE_CARDS: ModeCard[] = [
  {
    mode: 'worship',
    emoji: '🎶',
    icon: <Mic2 size={28} />,
    title: 'Worship & Church',
    pitch: 'Lyrics, prayer requests, donations, scheduled services.',
    forList: ['Churches', 'Ministries', 'Online congregations'],
    defaultName: (n) => (n ? `${n}'s Worship` : 'My Worship Space'),
  },
  {
    mode: 'business',
    emoji: '💼',
    icon: <Briefcase size={26} />,
    title: 'Business Meetings',
    pitch: 'Whiteboard, notes, calendar, task & file sharing.',
    forList: ['Teams', 'Coaching', 'Clients', 'Companies'],
    defaultName: (n) => (n ? `${n}'s Team` : 'My Team Space'),
  },
  {
    mode: 'community',
    emoji: '🌍',
    icon: <Users size={26} />,
    title: 'Community & Groups',
    pitch: 'Chat-first rooms with light moderation and RSVPs.',
    forList: ['Online communities', 'Classes', 'Friend groups', 'Events'],
    defaultName: (n) => (n ? `${n}'s Community` : 'My Community'),
  },
];

const WelcomePage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddingAnother = searchParams?.get('new') === '1';
  const { toast } = useToast();
  const { workspaces, loading, refresh, setActive } = useContext(WorkspaceContext);

  const [selected, setSelected] = useState<Mode>('worship');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Pre-fill the workspace name from the active card whenever it changes
  // (unless the user has typed their own).
  useEffect(() => {
    if (touchedName) return;
    const card = MODE_CARDS.find((c) => c.mode === selected);
    if (card) setName(card.defaultName(user?.firstName));
  }, [selected, user?.firstName, touchedName]);

  // If they already have workspaces, kick them to the dashboard — Welcome is for first-timers.
  // Skip when `?new=1` so the switcher's "New workspace" entry can reuse this page.
  useEffect(() => {
    if (!isLoaded || loading || isAddingAnother) return;
    if (workspaces.length > 0) router.replace('/dashboard');
  }, [isLoaded, loading, workspaces, router, isAddingAnother]);

  const submit = async () => {
    if (!user?.id || creating) return;
    if (!name.trim()) {
      toast({ title: 'Give your space a name', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post('/api/v1/workspace', {
        user_id: user.id,
        name: name.trim(),
        mode: selected,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not create workspace');
      toast({
        title: '✨ Your space is ready',
        description: 'Welcome to Singalong.',
        className: 'bg-white/10 border-none text-white',
      });
      // Set active BEFORE refresh so refresh's localStorage-based pick lands
      // on the new workspace (avoiding a flash of the previously-active one).
      const newId = res.data?.workspace?._id;
      if (newId) setActive(newId);
      await refresh();
      router.replace('/dashboard');
    } catch (e: any) {
      toast({ title: 'Could not create workspace', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded || loading) return <Loader />;

  return (
    <div className="welcome-page">
      <div className="light-ray-container" aria-hidden />

      <div className="welcome-inner">
        <div className="welcome-head">
          <span className="welcome-eyebrow">
            <Sparkles size={14} /> {isAddingAnother ? 'New workspace' : 'Step 1 of 1'}
          </span>
          <h1 className="welcome-title">
            {isAddingAnother
              ? 'Create another space'
              : `Welcome${user?.firstName ? `, ${user.firstName}` : ''}`}
          </h1>
          <p className="welcome-subtitle">
            {isAddingAnother
              ? <>Pick a mode and name for your new <strong>Singalong</strong> space.</>
              : <>What would you like to use <strong>Singalong</strong> for?</>}
          </p>
          <p className="welcome-foot-hint">You can switch modes or add more spaces later.</p>
        </div>

        {/* Mode picker */}
        <div className="welcome-cards">
          {MODE_CARDS.map((card) => {
            const active = selected === card.mode;
            return (
              <button
                key={card.mode}
                type="button"
                className={`welcome-card ${active ? 'is-active' : ''}`}
                onClick={() => setSelected(card.mode)}
                aria-pressed={active}
              >
                <div className="welcome-card-emoji">{card.emoji}</div>
                <h3 className="welcome-card-title">{card.title}</h3>
                <p className="welcome-card-pitch">{card.pitch}</p>
                <ul className="welcome-card-for">
                  {card.forList.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {active && <span className="welcome-card-check"><Check size={14} /> Selected</span>}
              </button>
            );
          })}
        </div>

        {/* Name + create */}
        <div className="welcome-name-row">
          <label htmlFor="ws-name" className="welcome-name-label">Name your space</label>
          <input
            id="ws-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setTouchedName(true); }}
            placeholder="e.g. Grace Church"
            className="welcome-name-input"
            maxLength={80}
          />
        </div>

        <div className="welcome-actions">
          <button type="button" onClick={submit} disabled={creating || !name.trim()} className="hero-start-worship welcome-cta">
            {creating
              ? 'Creating…'
              : isAddingAnother ? 'Create workspace' : 'Create my space'} <ArrowRight size={20} />
          </button>
          {/* First-time onboarding: "Skip" auto-creates a default workspace so the
              dashboard isn't gated forever by WorkspaceGate.
              Adding-another flow: just cancel back to the dashboard. */}
          <button
            type="button"
            disabled={creating}
            onClick={async () => {
              if (isAddingAnother) {
                router.replace('/dashboard');
                return;
              }
              if (!user?.id) return;
              setCreating(true);
              try {
                await axios.post('/api/v1/workspace/ensure-default', {
                  user_id: user.id,
                  firstName: user.firstName || null,
                  mode: selected,
                });
                await refresh();
                router.replace('/dashboard');
              } finally {
                setCreating(false);
              }
            }}
            className="welcome-skip"
          >
            {isAddingAnother ? 'Cancel' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
